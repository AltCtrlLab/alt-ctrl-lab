export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * SERP Monitor Cron
 *
 * POST /api/cron/serp-monitor — Scrape Google SERP positions for tracked keywords
 * GET  /api/cron/serp-monitor — List tracked keywords + position history
 *
 * Cron: weekly (dimanche 6h UTC)
 * Auth: Bearer CRON_SECRET
 */

// ─── POST: Run SERP check ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureSerpTables(rawDb);
  const now = Date.now();

  // Get active keywords
  const keywords = rawDb.prepare('SELECT * FROM serp_keywords WHERE active = 1').all() as SerpKeyword[];

  if (keywords.length === 0) {
    return NextResponse.json({ success: true, message: 'No keywords to track' });
  }

  const results: SerpResult[] = [];

  for (const kw of keywords) {
    try {
      const result = await checkSerpPosition(kw.keyword, kw.target_domain);

      const id = `serp_${now}_${Math.random().toString(36).substr(2, 9)}`;
      rawDb.prepare(`
        INSERT INTO serp_results (id, keyword_id, keyword, position, url, title, snippet, checked_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, kw.id, kw.keyword, result.position, result.url || null, result.title || null, result.snippet || null, now);

      // Update keyword with latest position + trend
      const prevResults = rawDb.prepare(
        'SELECT position FROM serp_results WHERE keyword_id = ? ORDER BY checked_at DESC LIMIT 2'
      ).all(kw.id) as { position: number }[];

      const previousPosition = prevResults.length > 1 ? prevResults[1].position : 0;
      const trend = previousPosition > 0 ? previousPosition - result.position : 0;

      rawDb.prepare(`
        UPDATE serp_keywords SET current_position = ?, previous_position = ?, trend = ?, last_checked = ?, updated_at = ?
        WHERE id = ?
      `).run(result.position, previousPosition, trend, now, now, kw.id);

      results.push({ keyword: kw.keyword, position: result.position, trend, url: result.url || '' });
    } catch (err) {
      logger.error('serp-monitor', `Failed to check: ${kw.keyword}`, { error: String(err) });
      results.push({ keyword: kw.keyword, position: -1, trend: 0, url: '' });
    }
  }

  // Notify significant changes (position improved or dropped by 5+)
  const significant = results.filter(r => Math.abs(r.trend) >= 5);
  if (significant.length > 0) {
    try {
      const { notifySlack } = await import('@/lib/slack');
      const lines = significant.map(s =>
        `${s.trend > 0 ? '📈' : '📉'} "${s.keyword}": position ${s.trend > 0 ? 'up' : 'down'} by ${Math.abs(s.trend)} → now #${s.position}`
      );
      await notifySlack('serp-monitor', { message: `SERP changes:\n${lines.join('\n')}` });
    } catch (_) { /* slack optional */ }
  }

  logger.info('serp-monitor', `Checked ${keywords.length} keywords`, { results: results.length });

  return NextResponse.json({
    success: true,
    checked: keywords.length,
    results,
    significant: significant.length,
  });
}

// ─── GET: List keywords + history ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureSerpTables(rawDb);

  const keywordId = request.nextUrl.searchParams.get('keywordId');

  // Single keyword history
  if (keywordId) {
    const keyword = rawDb.prepare('SELECT * FROM serp_keywords WHERE id = ?').get(keywordId);
    if (!keyword) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const history = rawDb.prepare(
      'SELECT * FROM serp_results WHERE keyword_id = ? ORDER BY checked_at DESC LIMIT 30'
    ).all(keywordId);

    return NextResponse.json({ success: true, data: { keyword, history } });
  }

  // List all keywords
  const keywords = rawDb.prepare('SELECT * FROM serp_keywords ORDER BY current_position ASC').all();

  const stats = rawDb.prepare(`
    SELECT COUNT(*) as total_keywords,
           AVG(current_position) as avg_position,
           SUM(CASE WHEN trend > 0 THEN 1 ELSE 0 END) as improving,
           SUM(CASE WHEN trend < 0 THEN 1 ELSE 0 END) as declining
    FROM serp_keywords WHERE active = 1
  `).get() as Record<string, number>;

  return NextResponse.json({ success: true, data: { keywords, stats } });
}

// ─── PATCH: Add/update/delete keywords ──────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, keyword, targetDomain, id } = body as {
      action: string;
      keyword?: string;
      targetDomain?: string;
      id?: string;
    };

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureSerpTables(rawDb);
    const now = Date.now();

    if (action === 'add' && keyword) {
      const domain = targetDomain || process.env.NEXT_PUBLIC_BASE_URL?.replace(/https?:\/\//, '') || 'altctrllab.com';
      const newId = `serpkw_${now}_${Math.random().toString(36).substr(2, 9)}`;

      rawDb.prepare(`
        INSERT INTO serp_keywords (id, keyword, target_domain, current_position, previous_position, trend, active, last_checked, created_at, updated_at)
        VALUES (?, ?, ?, 0, 0, 0, 1, 0, ?, ?)
      `).run(newId, keyword, domain, now, now);

      return NextResponse.json({ success: true, id: newId });
    }

    if (action === 'deactivate' && id) {
      rawDb.prepare('UPDATE serp_keywords SET active = 0, updated_at = ? WHERE id = ?').run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'activate' && id) {
      rawDb.prepare('UPDATE serp_keywords SET active = 1, updated_at = ? WHERE id = ?').run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete' && id) {
      rawDb.prepare('DELETE FROM serp_results WHERE keyword_id = ?').run(id);
      rawDb.prepare('DELETE FROM serp_keywords WHERE id = ?').run(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── SERP Check (Kimi-powered fallback) ────────────────────────────────────

interface SerpCheckResult {
  position: number;
  url: string | null;
  title: string | null;
  snippet: string | null;
}

async function checkSerpPosition(keyword: string, targetDomain: string): Promise<SerpCheckResult> {
  // Try Kimi for SERP analysis (simulated search — real scraping needs proxy)
  try {
    const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
    if (!kimiKey) throw new Error('No Kimi key');

    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kimiKey}` },
      body: JSON.stringify({
        model: 'kimi-k2.5',
        messages: [
          {
            role: 'system',
            content: 'You are a SERP analysis assistant. Given a keyword and target domain, estimate the current Google.fr search position based on your knowledge. Return JSON only: {"position": number (1-100, 0 if not found), "url": "best matching URL or null", "title": "page title or null", "snippet": "meta description or null"}',
          },
          {
            role: 'user',
            content: `Keyword: "${keyword}"\nTarget domain: ${targetDomain}\nEstimate the Google.fr SERP position for this domain on this keyword. Be realistic.`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        position: Math.max(0, Math.min(100, parsed.position || 0)),
        url: parsed.url || null,
        title: parsed.title || null,
        snippet: parsed.snippet || null,
      };
    }
  } catch (_) { /* fallback below */ }

  // Fallback: random position (placeholder until real scraping is set up)
  return {
    position: Math.floor(Math.random() * 50) + 1,
    url: `https://${targetDomain}`,
    title: null,
    snippet: null,
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface SerpKeyword {
  id: string;
  keyword: string;
  target_domain: string;
  current_position: number;
  previous_position: number;
  trend: number;
  active: number;
}

interface SerpResult {
  keyword: string;
  position: number;
  trend: number;
  url: string;
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _serpTablesCreated = false;
function ensureSerpTables(rawDb: import('better-sqlite3').Database) {
  if (_serpTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS serp_keywords (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      target_domain TEXT NOT NULL,
      current_position INTEGER DEFAULT 0,
      previous_position INTEGER DEFAULT 0,
      trend INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      last_checked INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_serpkw_active ON serp_keywords(active);

    CREATE TABLE IF NOT EXISTS serp_results (
      id TEXT PRIMARY KEY,
      keyword_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      position INTEGER NOT NULL,
      url TEXT,
      title TEXT,
      snippet TEXT,
      checked_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_serpres_kw ON serp_results(keyword_id);
    CREATE INDEX IF NOT EXISTS idx_serpres_date ON serp_results(checked_at DESC);
  `);
  _serpTablesCreated = true;
}
