export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * Competitor URLs to monitor.
 * Configurable via VEILLE_COMPETITORS env var (comma-separated URLs).
 */
const DEFAULT_COMPETITORS = [
  { name: 'Lunaweb', url: 'https://www.lunaweb.fr' },
  { name: 'Junto', url: 'https://junto.fr' },
  { name: 'Growth Room', url: 'https://www.growthroom.co' },
  { name: 'Agence Ideo', url: 'https://www.ideo-marketing.fr' },
  { name: 'Neads', url: 'https://www.neads.io' },
];

interface CompetitorSnapshot {
  name: string;
  url: string;
  title: string | null;
  description: string | null;
  services: string[];
  pricing: string | null;
  technologies: string[];
  fetchedAt: number;
  error?: string;
}

interface VeilleReport {
  date: string;
  competitors: CompetitorSnapshot[];
  changes: Change[];
  analysis: string;
}

interface Change {
  competitor: string;
  field: string;
  previous: string | null;
  current: string | null;
}

/**
 * POST /api/cron/veille-concurrentielle
 * Weekly cron — scrapes competitor websites, compares with previous snapshot,
 * detects changes, generates AI analysis.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    const now = Date.now();

    // Ensure veille_snapshots table exists
    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS veille_snapshots (
        id TEXT PRIMARY KEY,
        competitor_name TEXT NOT NULL,
        competitor_url TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_veille_name ON veille_snapshots(competitor_name);
      CREATE INDEX IF NOT EXISTS idx_veille_created ON veille_snapshots(created_at DESC);
    `);

    // Parse competitors from env or use defaults
    const competitors = parseCompetitors();

    // Scrape all competitors
    const snapshots: CompetitorSnapshot[] = [];
    for (const comp of competitors) {
      const snapshot = await scrapeCompetitor(comp.name, comp.url);
      snapshots.push(snapshot);
    }

    // Load previous snapshots for comparison
    const changes: Change[] = [];
    for (const snap of snapshots) {
      const previous = rawDb.prepare(`
        SELECT snapshot_json FROM veille_snapshots
        WHERE competitor_name = ?
        ORDER BY created_at DESC LIMIT 1
      `).get(snap.name) as { snapshot_json: string } | undefined;

      if (previous) {
        try {
          const prev = JSON.parse(previous.snapshot_json) as CompetitorSnapshot;
          // Detect changes
          if (prev.title !== snap.title && snap.title) {
            changes.push({ competitor: snap.name, field: 'title', previous: prev.title, current: snap.title });
          }
          if (prev.description !== snap.description && snap.description) {
            changes.push({ competitor: snap.name, field: 'description', previous: prev.description, current: snap.description });
          }
          if (prev.pricing !== snap.pricing && snap.pricing) {
            changes.push({ competitor: snap.name, field: 'pricing', previous: prev.pricing, current: snap.pricing });
          }
          // Check for new services
          const newServices = snap.services.filter(s => !prev.services.includes(s));
          if (newServices.length > 0) {
            changes.push({ competitor: snap.name, field: 'services', previous: null, current: newServices.join(', ') });
          }
        } catch { /* ignore parse error */ }
      }

      // Save new snapshot
      const id = `veille_${now}_${Math.random().toString(36).substr(2, 9)}`;
      rawDb.prepare(`
        INSERT INTO veille_snapshots (id, competitor_name, competitor_url, snapshot_json, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, snap.name, snap.url, JSON.stringify(snap), now);
    }

    // Generate AI analysis if there are changes
    let analysis = 'Aucun changement détecté cette semaine.';
    if (changes.length > 0) {
      analysis = await generateAnalysis(changes, snapshots) || analysis;
    }

    // Save report as business_insight
    const reportId = `veille_report_${now}`;
    const report: VeilleReport = {
      date: new Date().toISOString().split('T')[0],
      competitors: snapshots,
      changes,
      analysis,
    };

    rawDb.prepare(`
      INSERT INTO business_insights (id, topic, source, insight, recommendation, priority, status, created_at)
      VALUES (?, 'Veille Concurrentielle', 'cron', ?, ?, ?, 'active', ?)
    `).run(
      reportId,
      JSON.stringify(report),
      analysis.slice(0, 500),
      changes.length > 3 ? 'high' : changes.length > 0 ? 'medium' : 'low',
      now,
    );

    logger.info('veille', 'Cron completed', {
      competitors: snapshots.length,
      changes: changes.length,
      successful: snapshots.filter(s => !s.error).length,
    });

    return NextResponse.json({
      success: true,
      data: {
        competitors: snapshots.length,
        changes: changes.length,
        analysis: analysis.slice(0, 300),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('veille', 'Cron failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/cron/veille-concurrentielle
 * Returns the latest veille report.
 */
export async function GET() {
  try {
    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    const report = rawDb.prepare(`
      SELECT insight, created_at FROM business_insights
      WHERE topic = 'Veille Concurrentielle'
      ORDER BY created_at DESC LIMIT 1
    `).get() as { insight: string; created_at: number } | undefined;

    if (!report) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: { ...JSON.parse(report.insight), generatedAt: report.created_at },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Scraper ──────────────────────────────────────────────────────────────────

async function scrapeCompetitor(name: string, url: string): Promise<CompetitorSnapshot> {
  const now = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    });

    if (!res.ok) {
      return { name, url, title: null, description: null, services: [], pricing: null, technologies: [], fetchedAt: now, error: `HTTP ${res.status}` };
    }

    const html = await res.text();

    // Extract metadata
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null;
    const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim() || null;

    // Extract services (common patterns)
    const services: string[] = [];
    const serviceKeywords = /branding|web|seo|marketing|design|development|dev|IA|AI|automation|data|e-commerce|app|mobile/i;
    const serviceRegex = /<(?:h[2-3]|li)[^>]*>([^<]+)<\//g;
    let serviceMatch;
    while ((serviceMatch = serviceRegex.exec(html)) !== null) {
      const text = serviceMatch[1]?.trim();
      if (text && text.length < 100 && text.length > 3 && serviceKeywords.test(text)) {
        services.push(text);
      }
    }

    // Detect pricing mentions
    const pricingMatch = html.match(/(?:tarif|pricing|prix|à partir de|starting at)[^<]{0,200}/i);
    const pricing = pricingMatch?.[0]?.replace(/<[^>]+>/g, '').trim() || null;

    // Detect technologies
    const technologies: string[] = [];
    const techSignals: Record<string, RegExp> = {
      'Next.js': /next(?:js)?/i,
      'React': /react/i,
      'WordPress': /wp-content|wordpress/i,
      'Webflow': /webflow/i,
      'Shopify': /shopify/i,
      'HubSpot': /hubspot/i,
      'Google Analytics': /gtag|google-analytics|GA4/i,
      'Tailwind': /tailwind/i,
      'Framer': /framer/i,
    };
    for (const [tech, regex] of Object.entries(techSignals)) {
      if (regex.test(html)) technologies.push(tech);
    }

    return { name, url, title, description, services: [...new Set(services)].slice(0, 10), pricing, technologies, fetchedAt: now };
  } catch (err) {
    return {
      name, url, title: null, description: null, services: [], pricing: null, technologies: [],
      fetchedAt: now, error: err instanceof Error ? err.message : 'Fetch failed',
    };
  }
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

async function generateAnalysis(changes: Change[], snapshots: CompetitorSnapshot[]): Promise<string | null> {
  if (!KIMI_API_KEY) return null;

  const changesSummary = changes.map(c =>
    `- ${c.competitor}: ${c.field} changé${c.previous ? ` de "${c.previous.slice(0, 60)}"` : ''} → "${(c.current || '').slice(0, 60)}"`
  ).join('\n');

  const competitorSummary = snapshots.map(s =>
    `- ${s.name}: ${s.services.length} services, tech: ${s.technologies.join(', ') || 'N/A'}`
  ).join('\n');

  const prompt = `Tu es un analyste veille concurrentielle pour Alt Ctrl Lab (agence digitale premium, Paris).

CHANGEMENTS DÉTECTÉS CETTE SEMAINE :
${changesSummary}

ÉTAT ACTUEL DES CONCURRENTS :
${competitorSummary}

Analyse en 3-4 paragraphes (200 mots max) :
1. Que signifient ces changements pour le marché ?
2. Y a-t-il des menaces ou opportunités ?
3. Recommandations concrètes pour Alt Ctrl Lab

En français, ton analytique et stratégique.`;

  try {
    const res = await fetch(KIMI_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
      body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.5 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// ─── Config parser ────────────────────────────────────────────────────────────

function parseCompetitors(): Array<{ name: string; url: string }> {
  const envCompetitors = process.env.VEILLE_COMPETITORS;
  if (!envCompetitors) return DEFAULT_COMPETITORS;

  try {
    // Format: "Name1|url1,Name2|url2"
    return envCompetitors.split(',').map(entry => {
      const [name, url] = entry.trim().split('|');
      return { name: name.trim(), url: url.trim() };
    }).filter(c => c.name && c.url);
  } catch {
    return DEFAULT_COMPETITORS;
  }
}
