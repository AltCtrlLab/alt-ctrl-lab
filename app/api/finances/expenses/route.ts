export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Expense Analytics & Categorization
 *
 * GET /api/finances/expenses — Breakdown by category, vendor trends, monthly totals
 * POST /api/finances/expenses — AI-categorize expense description (suggest category)
 *
 * The basic CRUD lives in /api/finances (type=expense). This route adds analytics layer.
 */

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

// ─── GET: Expense analytics ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureExpenseColumns(rawDb);

  const period = request.nextUrl.searchParams.get('period'); // 'month' | 'quarter' | 'year' | 'all'
  const category = request.nextUrl.searchParams.get('category');

  const now = Date.now();
  const periodMs = {
    month: 30 * 24 * 60 * 60 * 1000,
    quarter: 90 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
    all: now,
  }[period || 'all'] || now;

  const since = now - periodMs;

  // Category breakdown
  let catQuery = 'SELECT category, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ?';
  const catParams: unknown[] = [since];
  if (category) {
    catQuery += ' AND category = ?';
    catParams.push(category);
  }
  catQuery += ' GROUP BY category ORDER BY total DESC';
  const byCategory = rawDb.prepare(catQuery).all(...catParams) as Array<{ category: string; count: number; total: number }>;

  // Vendor breakdown
  const byVendor = rawDb.prepare(`
    SELECT vendor, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE date >= ? AND vendor IS NOT NULL AND vendor != ''
    GROUP BY vendor ORDER BY total DESC LIMIT 20
  `).all(since) as Array<{ vendor: string; count: number; total: number }>;

  // Monthly trend (last 12 months)
  const monthlyTrend = rawDb.prepare(`
    SELECT
      strftime('%Y-%m', datetime(date / 1000, 'unixepoch')) as month,
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as count
    FROM expenses
    WHERE date >= ?
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `).all(now - 365 * 24 * 60 * 60 * 1000) as Array<{ month: string; total: number; count: number }>;

  // Recurring expenses
  const recurring = rawDb.prepare(`
    SELECT * FROM expenses WHERE recurring = 1 ORDER BY amount DESC
  `).all() as Array<Record<string, unknown>>;

  const monthlyRecurring = recurring.reduce((sum, e) => sum + ((e.amount as number) || 0), 0);

  // Revenue comparison
  const totalRevenue = (rawDb.prepare(
    "SELECT COALESCE(SUM(amount), 0) as v FROM invoices WHERE status = 'Payée' AND paid_at >= ?",
  ).get(since) as { v: number }).v;

  const totalExpenses = byCategory.reduce((s, c) => s + c.total, 0);

  return NextResponse.json({
    success: true,
    data: {
      byCategory,
      byVendor,
      monthlyTrend: monthlyTrend.reverse(),
      recurring,
      summary: {
        totalExpenses,
        totalRevenue,
        profitNet: totalRevenue - totalExpenses,
        marginPercent: totalRevenue > 0 ? Math.round((1 - totalExpenses / totalRevenue) * 100) : 0,
        monthlyRecurring,
        categoryCount: byCategory.length,
        topCategory: byCategory[0]?.category || 'N/A',
      },
    },
  });
}

// ─── POST: AI-categorize an expense ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, amount } = body as { description: string; amount?: number };

    if (!description) {
      return NextResponse.json({ error: 'Missing description' }, { status: 400 });
    }

    const categories = ['Outils', 'Freelance', 'Pub', 'Formation', 'Autre', 'API', 'Hosting', 'Abonnement', 'Materiel'];

    // Try AI categorization
    if (KIMI_API_KEY) {
      try {
        const prompt = `Categorise cette depense d'agence digitale. Description: "${description}"${amount ? ` — Montant: ${amount}EUR` : ''}.
Categories possibles: ${categories.join(', ')}.
Reponds UNIQUEMENT avec un JSON: {"category": "...", "vendor": "...", "recurring": true/false}
- category: la categorie la plus adaptee
- vendor: le nom du fournisseur si identifiable, sinon null
- recurring: true si c'est un abonnement/recurrent, false sinon`;

        const res = await fetch(KIMI_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
          body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 200 }),
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content || '';
          const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const suggestion = JSON.parse(cleaned) as { category: string; vendor: string | null; recurring: boolean };

          return NextResponse.json({
            success: true,
            suggestion: {
              category: categories.includes(suggestion.category) ? suggestion.category : 'Autre',
              vendor: suggestion.vendor,
              recurring: !!suggestion.recurring,
            },
          });
        }
      } catch {
        logger.warn('expenses', 'AI categorization failed, using keyword fallback');
      }
    }

    // Keyword-based fallback
    const lower = description.toLowerCase();
    let category = 'Autre';
    if (/api|openai|anthropic|kimi|gemini|stripe|twilio/.test(lower)) category = 'API';
    else if (/railway|vercel|heroku|aws|hosting|serveur|server|domain/.test(lower)) category = 'Hosting';
    else if (/figma|notion|slack|linear|github|canva|adobe|abonnement/.test(lower)) category = 'Outils';
    else if (/ads|pub|google ads|meta ads|facebook|linkedin ads|campaign/.test(lower)) category = 'Pub';
    else if (/freelance|sous-traitant|prestataire|designer|dev/.test(lower)) category = 'Freelance';
    else if (/formation|cours|training|conference|book/.test(lower)) category = 'Formation';

    return NextResponse.json({
      success: true,
      suggestion: { category, vendor: null, recurring: /abonnement|mensuel|monthly|annual/.test(lower) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DB migration ───────────────────────────────────────────────────────────

function ensureExpenseColumns(rawDb: import('better-sqlite3').Database) {
  const migrations = [
    'ALTER TABLE expenses ADD COLUMN vendor TEXT;',
    'ALTER TABLE expenses ADD COLUMN recurring INTEGER DEFAULT 0;',
  ];
  for (const sql of migrations) {
    try { rawDb.exec(sql); } catch { /* column already exists */ }
  }
}
