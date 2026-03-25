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
 * POST /api/cron/churn-detection
 * Weekly cron — Scores churn risk per client, triggers win-back for at-risk clients.
 *
 * Churn signals:
 * - No invoice paid in 60+ days
 * - No project activity in 30+ days
 * - NPS <= 6
 * - Overdue invoices
 * - No communication in 45+ days
 */

interface ClientRisk {
  clientName: string;
  email: string | null;
  riskScore: number;
  signals: string[];
  lastInvoicePaid: number | null;
  lastProjectActivity: number | null;
  nps: number | null;
  overdueInvoices: number;
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const results = { analyzed: 0, atRisk: 0, winBackSent: 0, errors: [] as string[] };

  try {
    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;

    // Get unique clients from projects
    const clients = rawDb.prepare(`
      SELECT DISTINCT client_name, client_email
      FROM projects
      WHERE status NOT IN ('Annulé')
      ORDER BY client_name
    `).all() as Array<{ client_name: string; client_email: string | null }>;

    const atRiskClients: ClientRisk[] = [];

    for (const client of clients) {
      results.analyzed++;
      let riskScore = 0;
      const signals: string[] = [];

      // Signal 1: No invoice paid recently (0-25 pts)
      const lastPaid = rawDb.prepare(`
        SELECT MAX(paid_at) as last_paid FROM invoices
        WHERE client_name = ? AND status = 'Payée'
      `).get(client.client_name) as { last_paid: number | null };

      if (!lastPaid.last_paid) {
        riskScore += 15;
        signals.push('Aucune facture payee');
      } else {
        const daysSincePaid = Math.floor((now - lastPaid.last_paid) / DAY_MS);
        if (daysSincePaid > 90) { riskScore += 25; signals.push(`Dernier paiement il y a ${daysSincePaid}j`); }
        else if (daysSincePaid > 60) { riskScore += 15; signals.push(`Dernier paiement il y a ${daysSincePaid}j`); }
      }

      // Signal 2: No project activity (0-25 pts)
      const lastActivity = rawDb.prepare(`
        SELECT MAX(updated_at) as last_act FROM projects WHERE client_name = ?
      `).get(client.client_name) as { last_act: number | null };

      if (lastActivity.last_act) {
        const daysSinceActivity = Math.floor((now - lastActivity.last_act) / DAY_MS);
        if (daysSinceActivity > 60) { riskScore += 25; signals.push(`Aucune activite projet depuis ${daysSinceActivity}j`); }
        else if (daysSinceActivity > 30) { riskScore += 15; signals.push(`Projet inactif depuis ${daysSinceActivity}j`); }
      }

      // Signal 3: Low NPS (0-20 pts)
      const nps = rawDb.prepare(`
        SELECT AVG(score_nps) as avg_nps FROM followups
        WHERE client_name = ? AND score_nps IS NOT NULL
      `).get(client.client_name) as { avg_nps: number | null };

      if (nps.avg_nps !== null && nps.avg_nps <= 6) {
        riskScore += 20;
        signals.push(`NPS faible : ${Math.round(nps.avg_nps)}/10`);
      }

      // Signal 4: Overdue invoices (0-20 pts)
      const overdue = (rawDb.prepare(`
        SELECT COUNT(*) as c FROM invoices
        WHERE client_name = ? AND status = 'En retard'
      `).get(client.client_name) as { c: number }).c;

      if (overdue > 0) {
        riskScore += Math.min(20, overdue * 10);
        signals.push(`${overdue} facture(s) en retard`);
      }

      // Signal 5: No followup scheduled (0-10 pts)
      const pendingFollowups = (rawDb.prepare(`
        SELECT COUNT(*) as c FROM followups
        WHERE client_name = ? AND status = 'À faire'
      `).get(client.client_name) as { c: number }).c;

      if (pendingFollowups === 0) {
        riskScore += 10;
        signals.push('Aucun suivi planifie');
      }

      if (riskScore >= 40) {
        atRiskClients.push({
          clientName: client.client_name,
          email: client.client_email,
          riskScore: Math.min(100, riskScore),
          signals,
          lastInvoicePaid: lastPaid.last_paid,
          lastProjectActivity: lastActivity.last_act,
          nps: nps.avg_nps,
          overdueInvoices: overdue,
        });
        results.atRisk++;

        // Send win-back email for high-risk clients with email
        if (riskScore >= 60 && client.client_email) {
          try {
            const emailBody = await generateWinBackEmail(client.client_name, signals);
            await sendEmail(client.client_email, client.client_name, `${client.client_name}, on aimerait avoir de vos nouvelles`, emailBody);
            results.winBackSent++;
          } catch (err) {
            results.errors.push(`Win-back ${client.client_name}: ${err instanceof Error ? err.message : 'Failed'}`);
          }
        }
      }
    }

    // Save report to business_insights
    const reportId = `churn_${now}`;
    rawDb.prepare(`
      INSERT OR REPLACE INTO business_insights (id, topic, source, insight, recommendation, priority, status, created_at)
      VALUES (?, 'Churn Detection', 'cron', ?, ?, ?, 'active', ?)
    `).run(
      reportId,
      JSON.stringify(atRiskClients),
      `${results.atRisk} clients a risque sur ${results.analyzed} analyses. ${results.winBackSent} emails win-back envoyes.`,
      results.atRisk > 3 ? 'high' : results.atRisk > 0 ? 'medium' : 'low',
      now,
    );

    logger.info('churn', 'Detection completed', results);
    return NextResponse.json({ success: true, results, atRiskClients });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('churn', 'Detection failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Win-back email ─────────────────────────────────────────────────────────

async function generateWinBackEmail(clientName: string, signals: string[]): Promise<string> {
  if (KIMI_API_KEY) {
    try {
      const prompt = `Redige un email de reactivation client COURT (max 100 mots) pour ${clientName}.
Contexte : agence digitale premium. Signaux de risque : ${signals.join(', ')}.
Ton : chaleureux, pas vendeur. Propose un appel de 15 min pour faire le point.
Ne mentionne PAS les signaux de risque explicitement. Commence par "Bonjour ${clientName},"`;

      const res = await fetch(KIMI_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
        body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.5, max_tokens: 300 }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch { /* fallback */ }
  }

  return `Bonjour ${clientName},\n\nCela fait un moment que nous n'avons pas echange et nous aimerions prendre de vos nouvelles.\n\nComment se passent les choses de votre cote ? Y a-t-il un sujet sur lequel nous pourrions vous accompagner ?\n\nN'hesitez pas a bloquer un creneau pour un point rapide de 15 minutes.\n\nA bientot,\nL'equipe AltCtrl.Lab`;
}
