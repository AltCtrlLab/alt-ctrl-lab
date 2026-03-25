export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/webhooks/email-engagement
 * Receives email open/click events from Mailjet webhooks.
 * Updates lead behavioral scoring (email_opened_count, email_clicked_count).
 *
 * Mailjet webhook payload:
 * { event: 'open'|'click', email, MessageID, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const events = await request.json();
    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    const now = Date.now();
    let opens = 0;
    let clicks = 0;

    // Mailjet sends array of events or single event
    const eventList = Array.isArray(events) ? events : [events];

    for (const evt of eventList) {
      const email = evt.email || evt.Email || evt.recipient;
      const eventType = evt.event || evt.Event;

      if (!email || !eventType) continue;

      // Find lead by email
      const lead = rawDb.prepare('SELECT id FROM leads WHERE email = ? LIMIT 1').get(email) as { id: string } | undefined;
      if (!lead) continue;

      if (eventType === 'open' || eventType === 'opened') {
        rawDb.prepare(`
          UPDATE leads SET
            email_opened_count = COALESCE(email_opened_count, 0) + 1,
            behavioral_score = COALESCE(behavioral_score, 0) + 2,
            updated_at = ?
          WHERE id = ?
        `).run(now, lead.id);
        opens++;
      } else if (eventType === 'click' || eventType === 'clicked') {
        rawDb.prepare(`
          UPDATE leads SET
            email_clicked_count = COALESCE(email_clicked_count, 0) + 1,
            behavioral_score = COALESCE(behavioral_score, 0) + 5,
            updated_at = ?
          WHERE id = ?
        `).run(now, lead.id);
        clicks++;
      }
    }

    // Record engagement timing for send time optimization
    for (const evt of eventList) {
      const evtEmail = evt.email || evt.Email || evt.recipient;
      const evtType = evt.event || evt.Event;
      if (!evtEmail || !evtType) continue;

      const evtTime = evt.time ? new Date(evt.time * 1000) : new Date();
      const ceId = `ce_${now}_${Math.random().toString(36).substr(2, 9)}`;
      const lead = rawDb.prepare('SELECT id FROM leads WHERE email = ? LIMIT 1').get(evtEmail) as { id: string } | undefined;

      try {
        rawDb.prepare(`
          INSERT OR IGNORE INTO contact_engagement (id, email, lead_id, open_hour, open_day, event_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(ceId, evtEmail, lead?.id || null, evtTime.getUTCHours(), evtTime.getUTCDay(), evtType, now);
      } catch { /* table may not exist yet — ignore */ }
    }

    logger.info('email-engagement', 'Webhook processed', { events: eventList.length, opens, clicks });
    return NextResponse.json({ success: true, processed: { opens, clicks } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('email-engagement', 'Webhook failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
