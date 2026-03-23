export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, createNotification, logAudit } from '@/lib/db';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const DAY_MS = 86_400_000;
const STALE_THRESHOLD_DAYS = 30;

/**
 * POST /api/cron/auto-archive
 * Daily cron — Archive les leads sans activité depuis 30 jours.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const cutoff = now - STALE_THRESHOLD_DAYS * DAY_MS;

  try {
    const rawDb = (getDb() as any).$client;

    const staleLeads = rawDb.prepare(`
      SELECT id, name, company, status
      FROM leads
      WHERE status NOT IN ('Signé', 'Perdu', 'Archivé')
        AND updated_at < ?
    `).all(cutoff) as Array<{
      id: string;
      name: string;
      company: string | null;
      status: string;
    }>;

    let archived = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const lead of staleLeads) {
      const archiveNote = `\nAuto-archivé le ${today} (${STALE_THRESHOLD_DAYS}j sans activité)`;
      rawDb.prepare(`
        UPDATE leads SET
          status = 'Archivé',
          notes = COALESCE(notes, '') || ?,
          updated_at = ?
        WHERE id = ?
      `).run(archiveNote, now, lead.id);

      createNotification({
        type: 'lead',
        severity: 'info',
        title: `Lead auto-archivé : ${lead.name}`,
        message: `${lead.company || lead.name} — statut "${lead.status}" inchangé depuis ${STALE_THRESHOLD_DAYS} jours.`,
        entityType: 'lead',
        entityId: lead.id,
      });

      logAudit({
        action: 'update',
        entityType: 'lead',
        entityId: lead.id,
        changesJson: JSON.stringify({ status: { old: lead.status, new: 'Archivé' }, reason: 'auto-archive-30d' }),
      });

      archived++;
    }

    logger.info('auto-archive', 'Cron completed', { archived, checked: staleLeads.length });
    return NextResponse.json({ success: true, data: { archived } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('auto-archive', 'Cron failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
