export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { notifySlack } from '@/lib/slack';
import { logger } from '@/lib/logger';

/**
 * POST /api/tracking
 * Tracks visitor page views. Called from a lightweight client-side script.
 * When a visitor hits /pricing, triggers:
 *   1. Slack notification (hot lead alert)
 *   2. If lead identified (by email cookie/fingerprint), auto-email within 5 min
 *   3. Behavioral score update
 *
 * Body: { page, fingerprint, referrer?, email?, metadata? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page, fingerprint, referrer, email, metadata } = body as {
      page: string;
      fingerprint: string;
      referrer?: string;
      email?: string;
      metadata?: Record<string, unknown>;
    };

    if (!page || !fingerprint) {
      return NextResponse.json({ error: 'Missing page or fingerprint' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    const now = Date.now();
    const id = `ve_${now}_${Math.random().toString(36).substr(2, 9)}`;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const ua = request.headers.get('user-agent') || '';

    // Try to match fingerprint to an existing lead
    let leadId: string | null = null;
    if (email) {
      const lead = rawDb.prepare('SELECT id FROM leads WHERE email = ? LIMIT 1').get(email) as { id: string } | undefined;
      if (lead) leadId = lead.id;
    }

    // Insert event
    rawDb.prepare(`
      INSERT INTO visitor_events (id, fingerprint, lead_id, event_type, page, referrer, ip, user_agent, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, fingerprint, leadId, getEventType(page), page, referrer || null, ip, ua, metadata ? JSON.stringify(metadata) : null, now);

    // Update lead behavioral score if matched
    if (leadId) {
      const scoreBoost = getPageScoreBoost(page);
      rawDb.prepare(`
        UPDATE leads SET
          behavioral_score = COALESCE(behavioral_score, 0) + ?,
          last_page_visit = ?,
          total_page_views = COALESCE(total_page_views, 0) + 1,
          visited_pricing = CASE WHEN ? = 1 THEN 1 ELSE COALESCE(visited_pricing, 0) END,
          updated_at = ?
        WHERE id = ?
      `).run(scoreBoost, page, page.includes('pricing') ? 1 : 0, now, leadId);
    }

    // Trigger outreach for high-intent pages
    const isHighIntent = page.includes('pricing') || page.includes('services') || page.includes('contact');
    if (isHighIntent) {
      // Count visits from this fingerprint in last 24h
      const recentVisits = rawDb.prepare(`
        SELECT COUNT(*) as cnt FROM visitor_events
        WHERE fingerprint = ? AND created_at > ? AND event_type = 'high_intent'
      `).get(fingerprint, now - 86_400_000) as { cnt: number };

      // Only alert on first high-intent visit per 24h to avoid spam
      if (recentVisits.cnt <= 1) {
        const leadInfo = leadId
          ? rawDb.prepare('SELECT name, company, email FROM leads WHERE id = ?').get(leadId) as { name: string; company: string | null; email: string } | undefined
          : null;

        // Slack alert
        await notifySlack('hot_visitor', {
          Page: page,
          Visiteur: leadInfo ? `${leadInfo.name} (${leadInfo.company || 'N/A'})` : `Anonyme (${fingerprint.slice(0, 8)})`,
          Email: leadInfo?.email || email || 'Inconnu',
          IP: ip.split(',')[0]?.trim() || 'N/A',
        });

        // Auto-email if lead identified and has email
        if (leadInfo?.email && page.includes('pricing')) {
          const CAL_LINK = 'https://cal.com/altctrllab/discovery';
          const emailBody = `Bonjour ${leadInfo.name},

Nous avons remarqué votre intérêt pour nos services. C'est le bon moment pour en discuter !

En 15 minutes, nous pouvons identifier les quick wins pour votre projet digital.

Réservez un créneau : ${CAL_LINK}

Cordialement,
Alt Ctrl Lab`;

          await sendEmail(
            leadInfo.email,
            leadInfo.name,
            'Parlons de votre projet — Alt Ctrl Lab',
            emailBody,
          );

          logger.info('tracking', 'Auto-email sent to pricing visitor', { leadId, email: leadInfo.email });
        }
      }
    }

    return NextResponse.json({ success: true, eventId: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('tracking', 'Failed to track event', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/tracking?fingerprint=xxx
 * Returns visitor history for a fingerprint (internal use).
 */
export async function GET(request: NextRequest) {
  const fp = request.nextUrl.searchParams.get('fingerprint');
  const leadId = request.nextUrl.searchParams.get('lead_id');

  if (!fp && !leadId) {
    return NextResponse.json({ error: 'Missing fingerprint or lead_id' }, { status: 400 });
  }

  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;

  const events = fp
    ? rawDb.prepare('SELECT * FROM visitor_events WHERE fingerprint = ? ORDER BY created_at DESC LIMIT 50').all(fp)
    : rawDb.prepare('SELECT * FROM visitor_events WHERE lead_id = ? ORDER BY created_at DESC LIMIT 50').all(leadId);

  return NextResponse.json({ success: true, data: events });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventType(page: string): string {
  if (page.includes('pricing') || page.includes('services') || page.includes('contact')) {
    return 'high_intent';
  }
  if (page.includes('blog') || page.includes('case-study')) {
    return 'content';
  }
  return 'page_view';
}

function getPageScoreBoost(page: string): number {
  if (page.includes('pricing')) return 15;
  if (page.includes('contact')) return 10;
  if (page.includes('services')) return 8;
  if (page.includes('case-study')) return 5;
  if (page.includes('blog')) return 2;
  return 1;
}
