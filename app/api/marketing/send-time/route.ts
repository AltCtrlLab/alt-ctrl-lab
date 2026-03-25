export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Smart Follow-up Timing (Send Time Optimization)
 *
 * Tracks when contacts open/click emails and computes optimal send times.
 *
 * POST /api/marketing/send-time — Record an engagement event (called from email-engagement webhook)
 * GET  /api/marketing/send-time?email=xxx — Get optimal send time for a contact
 * GET  /api/marketing/send-time?stats=true — Global send time heatmap data
 */

// ─── GET: Optimal send time ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureEngagementTables(rawDb);

  const email = request.nextUrl.searchParams.get('email');
  const leadId = request.nextUrl.searchParams.get('leadId');
  const stats = request.nextUrl.searchParams.get('stats') === 'true';

  if (stats) {
    // Global heatmap: engagement count by hour × day
    const heatmap = rawDb.prepare(`
      SELECT open_hour as hour, open_day as day, COUNT(*) as count
      FROM contact_engagement
      WHERE open_hour IS NOT NULL AND open_day IS NOT NULL
      GROUP BY open_hour, open_day
      ORDER BY count DESC
    `).all() as Array<{ hour: number; day: number; count: number }>;

    // Best global time
    const bestGlobal = rawDb.prepare(`
      SELECT open_hour as hour, open_day as day, COUNT(*) as count
      FROM contact_engagement
      WHERE open_hour IS NOT NULL
      GROUP BY open_hour
      ORDER BY count DESC
      LIMIT 1
    `).get() as { hour: number; day: number; count: number } | undefined;

    return NextResponse.json({
      success: true,
      data: {
        heatmap,
        bestGlobalHour: bestGlobal?.hour ?? 9,
        totalEvents: heatmap.reduce((s, h) => s + h.count, 0),
      },
    });
  }

  if (!email && !leadId) {
    return NextResponse.json({ error: 'Missing email or leadId' }, { status: 400 });
  }

  // Find best time for this specific contact
  const whereClause = email ? 'email = ?' : 'lead_id = ?';
  const param = email || leadId;

  const bestTime = rawDb.prepare(`
    SELECT open_hour as hour, COUNT(*) as count
    FROM contact_engagement
    WHERE ${whereClause} AND open_hour IS NOT NULL
    GROUP BY open_hour
    ORDER BY count DESC
    LIMIT 1
  `).get(param) as { hour: number; count: number } | undefined;

  const bestDay = rawDb.prepare(`
    SELECT open_day as day, COUNT(*) as count
    FROM contact_engagement
    WHERE ${whereClause} AND open_day IS NOT NULL
    GROUP BY open_day
    ORDER BY count DESC
    LIMIT 1
  `).get(param) as { day: number; count: number } | undefined;

  const totalEvents = (rawDb.prepare(`
    SELECT COUNT(*) as cnt FROM contact_engagement WHERE ${whereClause}
  `).get(param) as { cnt: number }).cnt;

  // Fallback to global best time if not enough data
  const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  if (totalEvents < 3) {
    // Not enough personal data — use global or default
    const globalBest = rawDb.prepare(`
      SELECT open_hour as hour, COUNT(*) as count
      FROM contact_engagement
      WHERE open_hour IS NOT NULL
      GROUP BY open_hour
      ORDER BY count DESC
      LIMIT 1
    `).get() as { hour: number } | undefined;

    return NextResponse.json({
      success: true,
      data: {
        bestHour: globalBest?.hour ?? 9,
        bestDay: 'Mardi',
        confidence: 'low',
        reason: `Seulement ${totalEvents} event(s) — utilisation du timing global`,
        totalEvents,
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      bestHour: bestTime?.hour ?? 9,
      bestDay: bestDay ? DAYS[bestDay.day] : 'Mardi',
      confidence: totalEvents >= 10 ? 'high' : 'medium',
      totalEvents,
    },
  });
}

// ─── POST: Record engagement event ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, leadId, eventType, timestamp } = body as {
      email: string;
      leadId?: string;
      eventType: string;
      timestamp?: number;
    };

    if (!email || !eventType) {
      return NextResponse.json({ error: 'Missing email or eventType' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureEngagementTables(rawDb);

    const eventTime = timestamp ? new Date(timestamp) : new Date();
    const now = Date.now();
    const id = `ce_${now}_${Math.random().toString(36).substr(2, 9)}`;

    rawDb.prepare(`
      INSERT INTO contact_engagement (id, email, lead_id, open_hour, open_day, event_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, email, leadId || null, eventTime.getUTCHours(), eventTime.getUTCDay(), eventType, now);

    logger.info('send-time', 'Engagement recorded', { email, eventType, hour: eventTime.getUTCHours() });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _engagementTablesCreated = false;
function ensureEngagementTables(rawDb: import('better-sqlite3').Database) {
  if (_engagementTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS contact_engagement (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      lead_id TEXT,
      open_hour INTEGER,
      open_day INTEGER,
      event_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ce_email ON contact_engagement(email);
    CREATE INDEX IF NOT EXISTS idx_ce_lead ON contact_engagement(lead_id);
  `);
  _engagementTablesCreated = true;
}
