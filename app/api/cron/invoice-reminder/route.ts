export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, createNotification } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const CEO_EMAIL = process.env.CEO_EMAIL || '';
const DAY_MS = 86_400_000;

/**
 * POST /api/cron/invoice-reminder
 * Daily cron — Rappels factures impayées avec escalade.
 *   J+15 → rappel poli (Khatib)
 *   J+30 → rappel ferme (Khatib)
 *   J+45 → alerte CEO + statut En retard
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const results = { j15: 0, j30: 0, j45: 0, errors: [] as string[] };

  try {
    const rawDb = (getDb() as any).$client;

    // Join with leads to get client email for reminders
    const invoices = rawDb.prepare(`
      SELECT i.id, i.client_name, i.amount, i.due_date, i.reminder_count, i.project_id,
             l.email as client_email
      FROM invoices i
      LEFT JOIN leads l ON LOWER(l.company) = LOWER(i.client_name) OR LOWER(l.name) = LOWER(i.client_name)
      WHERE i.status = 'Envoyée'
        AND i.due_date IS NOT NULL
        AND (i.reminder_count IS NULL OR i.reminder_count < 3)
      GROUP BY i.id
    `).all() as Array<{
      id: string;
      client_name: string;
      amount: number;
      due_date: number;
      reminder_count: number | null;
      project_id: string | null;
      client_email: string | null;
    }>;

    for (const inv of invoices) {
      const daysPastDue = (now - inv.due_date) / DAY_MS;
      const count = inv.reminder_count ?? 0;

      // J+45 — CEO alert
      if (daysPastDue >= 45 && count === 2) {
        createNotification({
          type: 'invoice',
          severity: 'critical',
          title: `Facture impayée J+45 : ${inv.client_name} (${inv.amount}€)`,
          message: `La facture ${inv.id} de ${inv.amount}€ est impayée depuis plus de 45 jours. Escalade CEO.`,
          entityType: 'invoice',
          entityId: inv.id,
        });

        if (CEO_EMAIL) {
          await sendEmail(
            CEO_EMAIL,
            'CEO',
            `[URGENT] Facture impayée — ${inv.client_name} (${inv.amount}€)`,
            `Alerte automatique : la facture de ${inv.amount}€ pour ${inv.client_name} est impayée depuis plus de 45 jours.\n\nAction requise : relance directe ou mise en demeure.\n\nID facture : ${inv.id}`,
          );
        }

        rawDb.prepare(`
          UPDATE invoices SET status = 'En retard', reminder_count = 3, reminder_sent_at = ?, updated_at = ? WHERE id = ?
        `).run(now, now, inv.id);

        results.j45++;
        continue;
      }

      // J+30 — firm reminder
      if (daysPastDue >= 30 && count === 1) {
        if (!inv.client_email) {
          results.errors.push(`J+30 skipped for ${inv.id}: no client email found`);
          rawDb.prepare(`UPDATE invoices SET reminder_count = 2, reminder_sent_at = ?, updated_at = ? WHERE id = ?`).run(now, now, inv.id);
          results.j30++;
          continue;
        }

        const prompt = `Rédige un email de relance ferme pour une facture de ${inv.amount}€ à ${inv.client_name}. Deuxième relance, facture envoyée il y a ${Math.round(daysPastDue)} jours. Mentionne les conditions générales de paiement. Ton professionnel mais direct. 3 paragraphes max, 120 mots max. En français.`;

        try {
          const result = await executeOpenClawAgent('khatib', prompt);
          if (result.success && result.stdout) {
            await sendEmail(
              inv.client_email,
              inv.client_name,
              `Relance — Facture ${inv.amount}€ en attente`,
              result.stdout,
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Agent error';
          results.errors.push(`J+30 agent error for ${inv.id}: ${msg}`);
          // Send template fallback
          await sendEmail(
            inv.client_email,
            inv.client_name,
            `Relance — Facture ${inv.amount}€ en attente`,
            `Bonjour,\n\nNous revenons vers vous concernant notre facture de ${inv.amount}€ qui reste en attente de règlement depuis ${Math.round(daysPastDue)} jours.\n\nConformément à nos conditions générales, nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\nCordialement,\nAlt Ctrl Lab`,
          );
        }

        rawDb.prepare(`
          UPDATE invoices SET reminder_count = 2, reminder_sent_at = ?, updated_at = ? WHERE id = ?
        `).run(now, now, inv.id);

        results.j30++;
        continue;
      }

      // J+15 — polite reminder
      if (daysPastDue >= 15 && count === 0) {
        if (!inv.client_email) {
          results.errors.push(`J+15 skipped for ${inv.id}: no client email found`);
          rawDb.prepare(`UPDATE invoices SET reminder_count = 1, reminder_sent_at = ?, updated_at = ? WHERE id = ?`).run(now, now, inv.id);
          results.j15++;
          continue;
        }

        const prompt = `Rédige un email de relance poli pour une facture de ${inv.amount}€ à ${inv.client_name}. Première relance, facture envoyée il y a ${Math.round(daysPastDue)} jours. Ton empathique et professionnel. 2 paragraphes max, 80 mots max. En français.`;

        try {
          const result = await executeOpenClawAgent('khatib', prompt);
          if (result.success && result.stdout) {
            await sendEmail(
              inv.client_email,
              inv.client_name,
              `Petit rappel — Facture ${inv.amount}€`,
              result.stdout,
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Agent error';
          results.errors.push(`J+15 agent error for ${inv.id}: ${msg}`);
          // Template fallback
          await sendEmail(
            inv.client_email,
            inv.client_name,
            `Petit rappel — Facture ${inv.amount}€`,
            `Bonjour,\n\nNous nous permettons de vous rappeler que notre facture de ${inv.amount}€ est en attente de règlement.\n\nN'hésitez pas à nous contacter si vous avez des questions.\n\nCordialement,\nAlt Ctrl Lab`,
          );
        }

        rawDb.prepare(`
          UPDATE invoices SET reminder_count = 1, reminder_sent_at = ?, updated_at = ? WHERE id = ?
        `).run(now, now, inv.id);

        results.j15++;
      }
    }

    logger.info('invoice-reminder', 'Cron completed', results);
    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('invoice-reminder', 'Cron failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message, data: results }, { status: 500 });
  }
}
