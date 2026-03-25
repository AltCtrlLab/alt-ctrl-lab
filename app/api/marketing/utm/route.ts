export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * UTM Builder & Campaign Tracker
 *
 * POST /api/marketing/utm — Create a campaign with UTM link
 * GET  /api/marketing/utm — List campaigns + stats
 * PATCH /api/marketing/utm — Update campaign (track click, attribute lead, etc.)
 */

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── GET: List campaigns ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureCampaignTables(rawDb);

  const status = request.nextUrl.searchParams.get('status');
  const source = request.nextUrl.searchParams.get('source');

  let query = 'SELECT * FROM campaigns WHERE 1=1';
  const params: unknown[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (source) {
    query += ' AND source = ?';
    params.push(source);
  }

  query += ' ORDER BY created_at DESC';
  const campaigns = rawDb.prepare(query).all(...params);

  // Compute aggregate stats
  const stats = rawDb.prepare(`
    SELECT
      COUNT(*) as total_campaigns,
      SUM(clicks) as total_clicks,
      SUM(leads_generated) as total_leads,
      SUM(revenue_attributed) as total_revenue,
      SUM(budget) as total_budget
    FROM campaigns
  `).get() as Record<string, number>;

  return NextResponse.json({ success: true, data: { campaigns, stats } });
}

// ─── POST: Create campaign ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, source, medium, content, term, baseUrl, budget, startDate, endDate } = body as {
      name: string;
      source: string;
      medium: string;
      content?: string;
      term?: string;
      baseUrl: string;
      budget?: number;
      startDate?: string;
      endDate?: string;
    };

    if (!name || !source || !medium || !baseUrl) {
      return NextResponse.json({ error: 'Missing name, source, medium, or baseUrl' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureCampaignTables(rawDb);

    const now = Date.now();
    const id = `camp_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // Build UTM URL
    const url = new URL(baseUrl);
    url.searchParams.set('utm_source', source);
    url.searchParams.set('utm_medium', medium);
    url.searchParams.set('utm_campaign', name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    if (content) url.searchParams.set('utm_content', content);
    if (term) url.searchParams.set('utm_term', term);
    const utmUrl = url.toString();

    rawDb.prepare(`
      INSERT INTO campaigns (id, name, source, medium, content, term, base_url, budget, start_date, end_date, clicks, leads_generated, revenue_attributed, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'active', ?, ?)
    `).run(id, name, source, medium, content || null, term || null, baseUrl, budget || 0, startDate || null, endDate || null, now, now);

    logger.info('marketing', 'Campaign created', { id, name, source });

    return NextResponse.json({
      success: true,
      id,
      utmUrl,
      shortParams: `utm_source=${escapeHtml(source)}&utm_medium=${escapeHtml(medium)}&utm_campaign=${escapeHtml(name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── PATCH: Update campaign (track events) ──────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, data } = body as { id: string; action: string; data?: Record<string, unknown> };

    if (!id) {
      return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureCampaignTables(rawDb);
    const now = Date.now();

    if (action === 'click') {
      rawDb.prepare('UPDATE campaigns SET clicks = clicks + 1, updated_at = ? WHERE id = ?').run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'lead') {
      rawDb.prepare('UPDATE campaigns SET leads_generated = leads_generated + 1, updated_at = ? WHERE id = ?').run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'revenue') {
      const amount = (data?.amount as number) || 0;
      rawDb.prepare('UPDATE campaigns SET revenue_attributed = revenue_attributed + ?, updated_at = ? WHERE id = ?').run(amount, now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'update') {
      const allowedFields = ['name', 'status', 'budget', 'start_date', 'end_date'];
      const updates = Object.entries(data || {}).filter(([k]) => allowedFields.includes(k));
      if (updates.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

      const setClause = updates.map(([k]) => `${k} = ?`).join(', ');
      const values = updates.map(([, v]) => v);
      rawDb.prepare(`UPDATE campaigns SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values, now, id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _campaignTablesCreated = false;
function ensureCampaignTables(rawDb: import('better-sqlite3').Database) {
  if (_campaignTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      medium TEXT NOT NULL,
      content TEXT,
      term TEXT,
      base_url TEXT NOT NULL,
      budget REAL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      clicks INTEGER DEFAULT 0,
      leads_generated INTEGER DEFAULT 0,
      revenue_attributed REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_camp_status ON campaigns(status);
  `);
  _campaignTablesCreated = true;
}
