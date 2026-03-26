export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Referral / Affiliate Tracking
 *
 * POST  /api/marketing/referral — Create a referral code for a client
 * GET   /api/marketing/referral — List referral codes + stats
 * PATCH /api/marketing/referral — Track click, conversion, or payout
 */

// ─── POST: Create referral code ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referrerName, referrerEmail, referrerClientId, commissionPercent, expiresAt } = body as {
      referrerName: string;
      referrerEmail?: string;
      referrerClientId?: string;
      commissionPercent?: number;
      expiresAt?: string;
    };

    if (!referrerName) {
      return NextResponse.json({ error: 'Missing referrerName' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureReferralTables(rawDb);

    const now = Date.now();
    const id = `ref_${now}_${Math.random().toString(36).substr(2, 9)}`;
    const code = referrerName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) + Math.random().toString(36).substr(2, 4);
    const commission = Math.min(30, Math.max(0, commissionPercent || 10));

    rawDb.prepare(`
      INSERT INTO referral_codes (id, code, referrer_name, referrer_email, referrer_client_id, commission_percent,
        clicks, conversions, revenue_generated, commission_earned, commission_paid, expires_at, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, 1, ?, ?)
    `).run(id, code, referrerName, referrerEmail || null, referrerClientId || null, commission,
      expiresAt ? new Date(expiresAt).getTime() : null, now, now);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://altctrllab.com';

    logger.info('referral', 'Code created', { id, code, referrerName });

    return NextResponse.json({
      success: true,
      id,
      code,
      referralUrl: `${baseUrl}?ref=${code}`,
      commissionPercent: commission,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: List referrals ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureReferralTables(rawDb);

  const code = request.nextUrl.searchParams.get('code');

  if (code) {
    const ref = rawDb.prepare('SELECT * FROM referral_codes WHERE code = ? AND active = 1').get(code);
    if (!ref) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    return NextResponse.json({ success: true, data: ref });
  }

  const referrals = rawDb.prepare('SELECT * FROM referral_codes ORDER BY created_at DESC').all();

  const stats = rawDb.prepare(`
    SELECT SUM(clicks) as total_clicks, SUM(conversions) as total_conversions,
           SUM(revenue_generated) as total_revenue, SUM(commission_earned) as total_commission,
           SUM(commission_paid) as total_paid
    FROM referral_codes
  `).get() as Record<string, number>;

  return NextResponse.json({ success: true, data: { referrals, stats } });
}

// ─── PATCH: Track events ────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, action, data } = body as { code: string; action: string; data?: Record<string, unknown> };

    if (!code || !action) {
      return NextResponse.json({ error: 'Missing code or action' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureReferralTables(rawDb);
    const now = Date.now();

    const ref = rawDb.prepare('SELECT * FROM referral_codes WHERE code = ? AND active = 1').get(code) as Record<string, unknown> | undefined;
    if (!ref) return NextResponse.json({ error: 'Invalid code' }, { status: 404 });

    if (action === 'click') {
      rawDb.prepare('UPDATE referral_codes SET clicks = clicks + 1, updated_at = ? WHERE code = ?').run(now, code);
      return NextResponse.json({ success: true });
    }

    if (action === 'convert') {
      const revenue = (data?.revenue as number) || 0;
      const commission = revenue * ((ref.commission_percent as number) / 100);

      rawDb.prepare(`
        UPDATE referral_codes SET conversions = conversions + 1, revenue_generated = revenue_generated + ?,
          commission_earned = commission_earned + ?, updated_at = ? WHERE code = ?
      `).run(revenue, commission, now, code);

      return NextResponse.json({ success: true, commission });
    }

    if (action === 'payout') {
      const amount = (data?.amount as number) || 0;
      rawDb.prepare('UPDATE referral_codes SET commission_paid = commission_paid + ?, updated_at = ? WHERE code = ?').run(amount, now, code);
      return NextResponse.json({ success: true });
    }

    if (action === 'deactivate') {
      rawDb.prepare('UPDATE referral_codes SET active = 0, updated_at = ? WHERE code = ?').run(now, code);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _refTablesCreated = false;
function ensureReferralTables(rawDb: import('better-sqlite3').Database) {
  if (_refTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS referral_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      referrer_name TEXT NOT NULL,
      referrer_email TEXT,
      referrer_client_id TEXT,
      commission_percent REAL DEFAULT 10,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      revenue_generated REAL DEFAULT 0,
      commission_earned REAL DEFAULT 0,
      commission_paid REAL DEFAULT 0,
      expires_at INTEGER,
      active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ref_code ON referral_codes(code);
    CREATE INDEX IF NOT EXISTS idx_ref_active ON referral_codes(active);
  `);
  _refTablesCreated = true;
}
