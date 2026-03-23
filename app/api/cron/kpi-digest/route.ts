export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const CEO_EMAIL = process.env.CEO_EMAIL || '';
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

interface WeeklyKPIs {
  newLeads: number;
  leadsSignes: number;
  tauxConversion: number;
  revenuePaye: number;
  facturesEnAttente: number;
  projetsLivres: number;
  projetsActifs: number;
  contentPublished: number;
  aiExecutions: number;
  aiSuccessRate: number;
}

/**
 * POST /api/cron/kpi-digest
 * Weekly cron (Monday 7h UTC) — Compile les KPIs et envoie un digest au CEO.
 * Pipeline : Hasib (analyse) → Khatib (rédaction) → Email
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!CEO_EMAIL) {
    return NextResponse.json({ success: false, error: 'CEO_EMAIL not configured' }, { status: 400 });
  }

  try {
    const rawDb = (getDb() as any).$client;
    const now = Date.now();
    const weekAgo = now - WEEK_MS;

    // Compute KPIs
    const kpis = computeKPIs(rawDb, weekAgo, now);

    // Try AI analysis → AI email, fallback to template
    let emailBody = '';
    let isAiGenerated = false;

    try {
      // Step 1: Hasib analyses the KPIs
      const analysisPrompt = `Analyse ces KPIs hebdomadaires d'une agence digitale premium et donne exactement 3 insights actionables.

KPIs semaine :
- Nouveaux leads : ${kpis.newLeads}
- Leads signés : ${kpis.leadsSignes}
- Taux de conversion : ${kpis.tauxConversion}%
- CA encaissé : ${kpis.revenuePaye}€
- Factures en attente : ${kpis.facturesEnAttente}€
- Projets livrés : ${kpis.projetsLivres}
- Projets actifs : ${kpis.projetsActifs}
- Contenus publiés : ${kpis.contentPublished}
- Exécutions IA : ${kpis.aiExecutions} (taux succès : ${kpis.aiSuccessRate}%)

Format : 3 bullet points avec action concrète. En français.`;

      const analysisResult = await executeOpenClawAgent('hasib', analysisPrompt);
      const analysis = analysisResult.success ? analysisResult.stdout : 'Analyse non disponible';

      // Step 2: Khatib writes the email
      const emailPrompt = `Rédige un email digest professionnel pour le CEO d'une agence digitale. Résume les KPIs de la semaine et intègre les insights.

DONNÉES :
- Nouveaux leads : ${kpis.newLeads}
- Leads signés : ${kpis.leadsSignes} (conversion : ${kpis.tauxConversion}%)
- CA encaissé : ${kpis.revenuePaye}€
- Factures en attente : ${kpis.facturesEnAttente}€
- Projets livrés : ${kpis.projetsLivres} | Actifs : ${kpis.projetsActifs}
- Contenus publiés : ${kpis.contentPublished}
- IA : ${kpis.aiExecutions} exécutions (${kpis.aiSuccessRate}% succès)

INSIGHTS :
${analysis}

Format : sections claires avec titres. Chiffres en évidence. Termine par les 3 priorités de la semaine. En français.`;

      const emailResult = await executeOpenClawAgent('khatib', emailPrompt);
      if (emailResult.success && emailResult.stdout) {
        emailBody = emailResult.stdout;
        isAiGenerated = true;
      }
    } catch (err) {
      logger.warn('kpi-digest', 'AI generation failed, using template fallback', {
        error: err instanceof Error ? err.message : 'Unknown',
      });
    }

    // Fallback template
    if (!emailBody) {
      emailBody = buildTemplateEmail(kpis);
    }

    // Send email
    const subject = `[KPI Digest] Semaine du ${formatDate(new Date(now - WEEK_MS))} au ${formatDate(new Date(now))}`;
    await sendEmail(CEO_EMAIL, 'CEO', subject, emailBody);

    logger.info('kpi-digest', 'Digest sent', { aiGenerated: isAiGenerated, kpis });
    return NextResponse.json({ success: true, data: { kpis, aiGenerated: isAiGenerated } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('kpi-digest', 'Cron failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function computeKPIs(rawDb: ReturnType<typeof Object>, weekAgo: number, now: number): WeeklyKPIs {
  const db = rawDb as { prepare: (sql: string) => { get: (...args: unknown[]) => Record<string, number | null> } };

  const leadStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Signé' THEN 1 ELSE 0 END) as signes
    FROM leads WHERE created_at >= ?
  `).get(weekAgo);

  const newLeads = leadStats?.total ?? 0;
  const leadsSignes = leadStats?.signes ?? 0;

  const revenue = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as paid
    FROM invoices WHERE status = 'Payée' AND paid_at >= ?
  `).get(weekAgo);

  const pending = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as pending
    FROM invoices WHERE status IN ('Envoyée', 'En retard')
  `).get();

  const projetsLivres = db.prepare(`
    SELECT COUNT(*) as count
    FROM projects WHERE delivered_at >= ?
  `).get(weekAgo);

  const projetsActifs = db.prepare(`
    SELECT COUNT(*) as count
    FROM projects WHERE status = 'Actif'
  `).get();

  const contentPublished = db.prepare(`
    SELECT COUNT(*) as count
    FROM content_items WHERE status = 'Publié' AND published_at >= ?
  `).get(weekAgo);

  const aiStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success
    FROM agent_executions WHERE created_at >= ?
  `).get(weekAgo);

  const aiTotal = aiStats?.total ?? 0;
  const aiSuccess = aiStats?.success ?? 0;

  return {
    newLeads,
    leadsSignes,
    tauxConversion: newLeads > 0 ? Math.round((leadsSignes / newLeads) * 100) : 0,
    revenuePaye: (revenue?.paid ?? 0) as number,
    facturesEnAttente: (pending?.pending ?? 0) as number,
    projetsLivres: (projetsLivres?.count ?? 0) as number,
    projetsActifs: (projetsActifs?.count ?? 0) as number,
    contentPublished: (contentPublished?.count ?? 0) as number,
    aiExecutions: aiTotal,
    aiSuccessRate: aiTotal > 0 ? Math.round((aiSuccess / aiTotal) * 100) : 0,
  };
}

function buildTemplateEmail(kpis: WeeklyKPIs): string {
  return `DIGEST HEBDOMADAIRE — Alt Ctrl Lab

PIPELINE COMMERCIAL
• Nouveaux leads : ${kpis.newLeads}
• Leads signés : ${kpis.leadsSignes}
• Taux de conversion : ${kpis.tauxConversion}%

FINANCES
• CA encaissé cette semaine : ${kpis.revenuePaye}€
• Factures en attente : ${kpis.facturesEnAttente}€

PROJETS
• Projets livrés : ${kpis.projetsLivres}
• Projets actifs : ${kpis.projetsActifs}

CONTENU
• Contenus publiés : ${kpis.contentPublished}

INTELLIGENCE ARTIFICIELLE
• Exécutions IA : ${kpis.aiExecutions}
• Taux de succès : ${kpis.aiSuccessRate}%

---
Ce rapport est généré automatiquement chaque lundi.
Alt Ctrl Lab — Cockpit`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
