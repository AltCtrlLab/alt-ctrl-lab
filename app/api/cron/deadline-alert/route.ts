export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, createNotification } from '@/lib/db';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const DAY_MS = 86_400_000;

/**
 * POST /api/cron/deadline-alert
 * Daily cron — Alertes deadline projets (T-3, T-1, T+0 dépassé).
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const results = { t3: 0, t1: 0, overdue: 0 };

  try {
    const rawDb = (getDb() as any).$client;

    const projects = rawDb.prepare(`
      SELECT id, client_name, project_type, deadline, phase
      FROM projects
      WHERE status = 'Actif'
        AND deadline IS NOT NULL
    `).all() as Array<{
      id: string;
      client_name: string;
      project_type: string;
      deadline: number;
      phase: string;
    }>;

    for (const project of projects) {
      const daysUntil = (project.deadline - now) / DAY_MS;

      let severity: 'warning' | 'critical' | null = null;
      let title = '';
      let message = '';

      if (daysUntil <= 0) {
        severity = 'critical';
        title = `DEADLINE DÉPASSÉE : ${project.client_name}`;
        message = `Le projet ${project.project_type} (${project.phase}) a dépassé sa deadline de ${Math.abs(Math.round(daysUntil))} jour(s).`;
        results.overdue++;
      } else if (daysUntil <= 1) {
        severity = 'critical';
        title = `Deadline DEMAIN : ${project.client_name}`;
        message = `Le projet ${project.project_type} (${project.phase}) arrive à échéance demain.`;
        results.t1++;
      } else if (daysUntil <= 3) {
        severity = 'warning';
        title = `Deadline J-${Math.round(daysUntil)} : ${project.client_name}`;
        message = `Le projet ${project.project_type} (${project.phase}) arrive à échéance dans ${Math.round(daysUntil)} jour(s).`;
        results.t3++;
      }

      if (!severity) continue;

      // Deduplication: skip if same notification exists within 24h
      const existing = rawDb.prepare(`
        SELECT id FROM notifications
        WHERE entity_id = ?
          AND type = 'deadline'
          AND created_at > ?
      `).get(project.id, now - DAY_MS) as { id: string } | undefined;

      if (existing) continue;

      createNotification({
        type: 'deadline',
        severity,
        title,
        message,
        entityType: 'project',
        entityId: project.id,
      });
    }

    logger.info('deadline-alert', 'Cron completed', results);
    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('deadline-alert', 'Cron failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
