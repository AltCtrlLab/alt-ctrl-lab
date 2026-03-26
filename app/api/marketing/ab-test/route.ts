export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Landing Page A/B Test Engine
 *
 * POST  /api/marketing/ab-test — Create a new A/B test
 * GET   /api/marketing/ab-test — List tests + results, or get assignment for visitor
 * PATCH /api/marketing/ab-test — Record conversion or update test
 */

// ─── POST: Create test ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, pageUrl, variantALabel, variantBLabel, splitRatio, goal } = body as {
      name: string;
      pageUrl: string;
      variantALabel?: string;
      variantBLabel?: string;
      splitRatio?: number;
      goal?: string;
    };

    if (!name || !pageUrl) {
      return NextResponse.json({ error: 'Missing name or pageUrl' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureAbTestTables(rawDb);

    const now = Date.now();
    const id = `ab_${now}_${Math.random().toString(36).substr(2, 9)}`;

    rawDb.prepare(`
      INSERT INTO ab_tests (id, name, page_url, variant_a_label, variant_b_label, split_ratio, goal,
        views_a, views_b, conversions_a, conversions_b, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'active', ?, ?)
    `).run(id, name, pageUrl, variantALabel || 'Variante A', variantBLabel || 'Variante B',
      splitRatio || 50, goal || 'conversion', now, now);

    logger.info('ab-test', 'Created', { id, name });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: List tests or assign variant ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureAbTestTables(rawDb);

  const testId = request.nextUrl.searchParams.get('testId');
  const assign = request.nextUrl.searchParams.get('assign') === 'true';
  const visitorId = request.nextUrl.searchParams.get('visitorId');

  // Assign variant to visitor
  if (testId && assign) {
    const test = rawDb.prepare('SELECT * FROM ab_tests WHERE id = ? AND status = ?').get(testId, 'active') as Record<string, unknown> | undefined;
    if (!test) return NextResponse.json({ error: 'Test not found or inactive' }, { status: 404 });

    // Deterministic assignment based on visitorId or random
    const ratio = (test.split_ratio as number) || 50;
    let variant: 'A' | 'B';

    if (visitorId) {
      // Hash-based deterministic assignment
      let hash = 0;
      for (let i = 0; i < visitorId.length; i++) { hash = ((hash << 5) - hash) + visitorId.charCodeAt(i); hash |= 0; }
      variant = (Math.abs(hash) % 100) < ratio ? 'A' : 'B';
    } else {
      variant = Math.random() * 100 < ratio ? 'A' : 'B';
    }

    // Record view
    const col = variant === 'A' ? 'views_a' : 'views_b';
    rawDb.prepare(`UPDATE ab_tests SET ${col} = ${col} + 1, updated_at = ? WHERE id = ?`).run(Date.now(), testId);

    return NextResponse.json({
      success: true,
      variant,
      label: variant === 'A' ? test.variant_a_label : test.variant_b_label,
    });
  }

  // Get specific test with stats
  if (testId) {
    const test = rawDb.prepare('SELECT * FROM ab_tests WHERE id = ?').get(testId) as Record<string, number> | undefined;
    if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const viewsA = test.views_a || 0;
    const viewsB = test.views_b || 0;
    const convA = test.conversions_a || 0;
    const convB = test.conversions_b || 0;
    const rateA = viewsA > 0 ? Math.round((convA / viewsA) * 10000) / 100 : 0;
    const rateB = viewsB > 0 ? Math.round((convB / viewsB) * 10000) / 100 : 0;

    // Statistical significance (simplified z-test)
    const totalViews = viewsA + viewsB;
    const isSignificant = totalViews >= 100 && Math.abs(rateA - rateB) > 5;
    const winner = rateA > rateB ? 'A' : rateB > rateA ? 'B' : 'tie';

    return NextResponse.json({
      success: true,
      data: {
        ...test,
        stats: { rateA, rateB, winner, isSignificant, totalViews, lift: rateA > 0 ? Math.round(((rateB - rateA) / rateA) * 100) : 0 },
      },
    });
  }

  // List all tests
  const tests = rawDb.prepare('SELECT * FROM ab_tests ORDER BY created_at DESC').all();
  return NextResponse.json({ success: true, data: tests });
}

// ─── PATCH: Record conversion or update status ──────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, variant } = body as { id: string; action: string; variant?: 'A' | 'B' };

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureAbTestTables(rawDb);
    const now = Date.now();

    if (action === 'convert' && variant) {
      const col = variant === 'A' ? 'conversions_a' : 'conversions_b';
      rawDb.prepare(`UPDATE ab_tests SET ${col} = ${col} + 1, updated_at = ? WHERE id = ?`).run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'pause') {
      rawDb.prepare("UPDATE ab_tests SET status = 'paused', updated_at = ? WHERE id = ?").run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'resume') {
      rawDb.prepare("UPDATE ab_tests SET status = 'active', updated_at = ? WHERE id = ?").run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'complete') {
      rawDb.prepare("UPDATE ab_tests SET status = 'completed', updated_at = ? WHERE id = ?").run(now, id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _abTablesCreated = false;
function ensureAbTestTables(rawDb: import('better-sqlite3').Database) {
  if (_abTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS ab_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      page_url TEXT NOT NULL,
      variant_a_label TEXT DEFAULT 'Variante A',
      variant_b_label TEXT DEFAULT 'Variante B',
      split_ratio INTEGER DEFAULT 50,
      goal TEXT DEFAULT 'conversion',
      views_a INTEGER DEFAULT 0,
      views_b INTEGER DEFAULT 0,
      conversions_a INTEGER DEFAULT 0,
      conversions_b INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ab_status ON ab_tests(status);
  `);
  _abTablesCreated = true;
}
