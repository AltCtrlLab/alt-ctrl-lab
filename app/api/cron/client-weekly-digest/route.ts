export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';
const DAY_MS = 86_400_000;

/**
 * POST /api/cron/client-weekly-digest
 * Weekly cron (Monday 8h) — Sends a recap email to each client with active projects.
 *
 * For each project with status != Archivé && clientEmail exists:
 * - Aggregate: tasks completed this week, upcoming deadlines, followups
 * - Kimi generates a short professional summary
 * - Email via Mailjet
 */

interface ProjectData {
  id: string;
  client_name: string;
  client_email: string;
  project_type: string;
  phase: string;
  status: string;
  hours_estimated: number | null;
  deadline: number | null;
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const weekAgo = now - 7 * DAY_MS;
  const results = { sent: 0, skipped: 0, errors: [] as string[] };

  try {
    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;

    // Add client_email column if missing
    try { rawDb.exec('ALTER TABLE projects ADD COLUMN client_email TEXT;'); } catch { /* exists */ }

    // Get active projects with client email
    const projects = rawDb.prepare(`
      SELECT id, client_name, client_email, project_type, phase, status, hours_estimated, deadline
      FROM projects
      WHERE status NOT IN ('Archivé', 'Annulé')
        AND client_email IS NOT NULL
        AND client_email != ''
    `).all() as ProjectData[];

    if (projects.length === 0) {
      return NextResponse.json({ success: true, message: 'No active projects with client emails', results });
    }

    for (const project of projects) {
      try {
        // Gather weekly data
        const timeThisWeek = (rawDb.prepare(`
          SELECT COALESCE(SUM(hours), 0) as h FROM time_entries
          WHERE project_id = ? AND created_at >= ?
        `).get(project.id, weekAgo) as { h: number }).h;

        const followups = rawDb.prepare(`
          SELECT type, status, scheduled_at, notes FROM followups
          WHERE project_id = ? AND (scheduled_at >= ? OR status = 'À faire')
          ORDER BY scheduled_at ASC LIMIT 5
        `).all(project.id) as Array<{ type: string; status: string; scheduled_at: number | null; notes: string | null }>;

        const recentInvoices = rawDb.prepare(`
          SELECT amount, status FROM invoices
          WHERE project_id = ? AND created_at >= ?
        `).all(project.id, weekAgo) as Array<{ amount: number; status: string }>;

        // Compute total hours
        const totalHours = (rawDb.prepare(`
          SELECT COALESCE(SUM(hours), 0) as h FROM time_entries WHERE project_id = ?
        `).get(project.id) as { h: number }).h;

        // Generate email content
        const emailContent = await generateDigestEmail(project, {
          timeThisWeek,
          totalHours,
          followups,
          recentInvoices,
          now,
        });

        // Send email
        const subject = `${project.client_name} — Recap hebdomadaire du ${new Date(now).toLocaleDateString('fr-FR')}`;
        const result = await sendEmail(project.client_email, project.client_name, subject, emailContent);

        if (result.success) {
          results.sent++;
          logger.info('weekly-digest', 'Digest sent', { project: project.id, client: project.client_name });
        } else {
          results.skipped++;
          results.errors.push(`${project.client_name}: ${result.error}`);
        }
      } catch (err) {
        results.errors.push(`${project.client_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    logger.info('weekly-digest', 'Cron completed', results);
    return NextResponse.json({ success: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('weekly-digest', 'Cron failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Email generation ───────────────────────────────────────────────────────

async function generateDigestEmail(
  project: ProjectData,
  data: {
    timeThisWeek: number;
    totalHours: number;
    followups: Array<{ type: string; status: string; scheduled_at: number | null; notes: string | null }>;
    recentInvoices: Array<{ amount: number; status: string }>;
    now: number;
  },
): Promise<string> {
  const progressPercent = project.hours_estimated
    ? Math.min(100, Math.round((data.totalHours / project.hours_estimated) * 100))
    : null;

  const daysToDeadline = project.deadline
    ? Math.ceil((project.deadline - data.now) / DAY_MS)
    : null;

  const pendingFollowups = data.followups.filter(f => f.status === 'À faire');
  const nextActions = pendingFollowups.map(f => `- ${f.type}: ${f.notes || 'En cours'}`).join('\n');

  // Try Kimi for polished version
  if (KIMI_API_KEY) {
    try {
      const prompt = `Redige un email recap hebdomadaire COURT (max 150 mots) pour un client d'agence digitale.
Projet: ${project.client_name} (${project.project_type})
Phase actuelle: ${project.phase} | Statut: ${project.status}
Heures cette semaine: ${data.timeThisWeek}h | Total: ${data.totalHours}h${project.hours_estimated ? ` / ${project.hours_estimated}h` : ''}
${progressPercent !== null ? `Progression: ${progressPercent}%` : ''}
${daysToDeadline !== null ? `Deadline dans ${daysToDeadline} jours` : ''}
Prochaines actions: ${nextActions || 'Aucune action en attente'}
Factures cette semaine: ${data.recentInvoices.length > 0 ? data.recentInvoices.map(i => `${i.amount}EUR (${i.status})`).join(', ') : 'Aucune'}

Format: email direct, professionnel, pas de formules creuses. Commence par "Bonjour,". Finis par "Bonne semaine, L'equipe AltCtrl.Lab".`;

      const res = await fetch(KIMI_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
        body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 500 }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const result = await res.json();
        const content = result.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch { /* fallback below */ }
  }

  // Static fallback
  const lines = [
    `Bonjour,`,
    ``,
    `Voici le recap hebdomadaire de votre projet ${project.project_type} :`,
    ``,
    `Phase actuelle : ${project.phase}`,
    `Heures cette semaine : ${data.timeThisWeek}h (total: ${data.totalHours}h${project.hours_estimated ? ` / ${project.hours_estimated}h` : ''})`,
  ];

  if (progressPercent !== null) {
    lines.push(`Progression : ${progressPercent}%`);
  }

  if (daysToDeadline !== null) {
    lines.push(`Deadline : dans ${daysToDeadline} jours`);
  }

  if (pendingFollowups.length > 0) {
    lines.push(``, `Prochaines etapes :`);
    for (const f of pendingFollowups) {
      lines.push(`- ${f.type}${f.notes ? ` : ${f.notes}` : ''}`);
    }
  }

  lines.push(``, `N'hesitez pas a nous contacter si vous avez des questions.`, ``, `Bonne semaine,`, `L'equipe AltCtrl.Lab`);

  return lines.join('\n');
}
