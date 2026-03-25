export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * AI Sales Objection Handler
 *
 * POST /api/ai/objection-handler — Generate responses to a sales objection
 * Body: { objection, context?, leadId? }
 *
 * GET /api/ai/objection-handler — List saved objections + responses
 * PATCH /api/ai/objection-handler — Track usage/success
 */

// ─── POST: Handle objection ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { objection, context, leadId } = body as {
      objection: string;
      context?: string;
      leadId?: string;
    };

    if (!objection) {
      return NextResponse.json({ error: 'Missing objection' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureObjectionTables(rawDb);

    // Check if we already have a cached response
    const cached = rawDb.prepare(
      'SELECT id, responses FROM sales_objections WHERE objection LIKE ? ORDER BY usage_count DESC LIMIT 1',
    ).get(`%${objection.slice(0, 50)}%`) as { id: string; responses: string } | undefined;

    if (cached) {
      rawDb.prepare('UPDATE sales_objections SET usage_count = usage_count + 1 WHERE id = ?').run(cached.id);
      return NextResponse.json({
        success: true,
        cached: true,
        data: JSON.parse(cached.responses),
      });
    }

    // Generate with Kimi
    let responses: ObjectionResponses | null = null;

    if (KIMI_API_KEY) {
      try {
        const prompt = `Tu es un expert en vente pour une agence digitale premium (AltCtrl.Lab, Paris).

Le prospect dit : "${objection}"
${context ? `Contexte : ${context}` : ''}

Genere 3 reponses differentes en JSON :
{
  "empathetic": "Reponse empathique qui valide le ressenti (2-3 phrases)",
  "dataDriven": "Reponse basee sur des chiffres/preuves (2-3 phrases avec stats)",
  "reframe": "Reponse qui recadre l'objection en opportunite (2-3 phrases)",
  "category": "price|timing|trust|need|competition|internal",
  "severity": "low|medium|high",
  "suggestedAction": "Action concrete recommandee (1 phrase)"
}

Sois concret et specifique a une agence digitale. Pas de formules generiques.`;

        const res = await fetch(KIMI_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
          body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 800 }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content || '';
          const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          responses = JSON.parse(cleaned);
        }
      } catch { /* fallback */ }
    }

    // Fallback
    if (!responses) {
      responses = generateFallbackResponses(objection);
    }

    // Save to DB
    const now = Date.now();
    const id = `obj_${now}_${Math.random().toString(36).substr(2, 9)}`;
    rawDb.prepare(`
      INSERT INTO sales_objections (id, objection, responses, category, lead_id, usage_count, success_count, created_at)
      VALUES (?, ?, ?, ?, ?, 1, 0, ?)
    `).run(id, objection, JSON.stringify(responses), responses.category || 'other', leadId || null, now);

    logger.info('objection-handler', 'Handled', { id, category: responses.category });

    return NextResponse.json({ success: true, cached: false, data: responses });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: List objections ───────────────────────────────────────────────────

export async function GET() {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureObjectionTables(rawDb);

  const objections = rawDb.prepare(
    'SELECT id, objection, category, usage_count, success_count, created_at FROM sales_objections ORDER BY usage_count DESC LIMIT 50',
  ).all();

  const stats = rawDb.prepare(`
    SELECT category, COUNT(*) as count, SUM(usage_count) as total_uses, SUM(success_count) as total_successes
    FROM sales_objections GROUP BY category ORDER BY count DESC
  `).all();

  return NextResponse.json({ success: true, data: { objections, stats } });
}

// ─── PATCH: Track success ───────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, success: wasSuccessful } = body as { id: string; success: boolean };

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureObjectionTables(rawDb);

    if (wasSuccessful) {
      rawDb.prepare('UPDATE sales_objections SET success_count = success_count + 1 WHERE id = ?').run(id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _objTablesCreated = false;
function ensureObjectionTables(rawDb: import('better-sqlite3').Database) {
  if (_objTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS sales_objections (
      id TEXT PRIMARY KEY,
      objection TEXT NOT NULL,
      responses TEXT NOT NULL,
      category TEXT DEFAULT 'other',
      lead_id TEXT,
      usage_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_obj_category ON sales_objections(category);
    CREATE INDEX IF NOT EXISTS idx_obj_usage ON sales_objections(usage_count DESC);
  `);
  _objTablesCreated = true;
}

// ─── Fallback ───────────────────────────────────────────────────────────────

interface ObjectionResponses {
  empathetic: string;
  dataDriven: string;
  reframe: string;
  category: string;
  severity: string;
  suggestedAction: string;
}

function generateFallbackResponses(objection: string): ObjectionResponses {
  const lower = objection.toLowerCase();
  let category = 'other';

  if (/prix|cher|budget|cout|expensive/.test(lower)) category = 'price';
  else if (/temps|delai|urgent|quand/.test(lower)) category = 'timing';
  else if (/confiance|reference|preuve|garantie/.test(lower)) category = 'trust';
  else if (/besoin|necessaire|utile/.test(lower)) category = 'need';
  else if (/concurrent|autre agence|alternative/.test(lower)) category = 'competition';

  const responses: Record<string, ObjectionResponses> = {
    price: {
      empathetic: 'Je comprends tout a fait votre preoccupation budgetaire. Investir dans le digital est une decision importante et il est normal de vouloir s\'assurer du retour.',
      dataDriven: 'Nos clients constatent en moyenne un ROI de 3x dans les 6 premiers mois. Un site bien concu genere des leads 24/7 — le cout par lead baisse significativement vs la pub.',
      reframe: 'La vraie question n\'est pas combien ca coute, mais combien ca rapporte. Comparons le cout de ne PAS avoir un digital performant.',
      category: 'price',
      severity: 'high',
      suggestedAction: 'Proposer un phasage du projet pour repartir l\'investissement.',
    },
    timing: {
      empathetic: 'Le timing est effectivement un facteur cle. Chaque entreprise a son propre rythme.',
      dataDriven: 'Les entreprises qui repoussent leur transformation digitale perdent en moyenne 20% de parts de marche par an face a des concurrents digitalises.',
      reframe: 'Quand sera le "bon moment" ? Souvent, le meilleur moment c\'est maintenant car chaque mois d\'attente = des opportunites manquees.',
      category: 'timing',
      severity: 'medium',
      suggestedAction: 'Proposer de commencer par un audit gratuit pour poser les bases.',
    },
    trust: {
      empathetic: 'C\'est tout a fait legitime de vouloir des garanties avant de s\'engager. La confiance se construit.',
      dataDriven: 'Nous avons livre plus de 50 projets avec un taux de satisfaction de 95%. Nous pouvons vous mettre en contact avec des clients similaires.',
      reframe: 'Notre approche transparente (portail client, rapports hebdo, communication directe) est justement concue pour construire cette confiance des le jour 1.',
      category: 'trust',
      severity: 'medium',
      suggestedAction: 'Partager 2-3 case studies similaires et proposer un appel avec un client reference.',
    },
  };

  return responses[category] || {
    empathetic: 'Je comprends votre point de vue et c\'est une remarque pertinente.',
    dataDriven: 'Les donnees montrent que les entreprises qui investissent dans le digital surperforment de 2.5x leurs concurrents.',
    reframe: 'Voyons comment transformer cette preoccupation en avantage competitif pour votre entreprise.',
    category,
    severity: 'medium',
    suggestedAction: 'Planifier un appel de 15 minutes pour approfondir ce point specifique.',
  };
}
