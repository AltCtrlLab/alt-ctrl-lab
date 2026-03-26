export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { validateBody, reportGenerateSchema } from '@/lib/validation';
import { getProjectById, getTimeEntriesForProject, getInvoicesByProjectId, getFollowups, createClientReport, getClientReportsForProject } from '@/lib/db';
import { logger } from '@/lib/logger';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import path from 'path';
import os from 'os';
import fs from 'fs';

const REPORTS_DIR = path.join(os.homedir(), '.openclaw', 'reports');

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'default');
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  try {
    const body = await req.json();
    const v = validateBody(body, reportGenerateSchema);
    if (!v.success) return v.response;

    const project = await getProjectById(v.data.projectId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const timeEntries = await getTimeEntriesForProject(v.data.projectId);
    const invoices = getInvoicesByProjectId(v.data.projectId);
    const followupsList = await getFollowups({ type: undefined, status: undefined });
    const projectFollowups = followupsList.filter(f => f.projectId === v.data.projectId);

    const period = v.data.period ?? new Date().toISOString().slice(0, 7);
    const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidAmount = invoices.filter(i => i.status === 'Payée').reduce((sum, inv) => sum + inv.amount, 0);

    // Try to generate prose with Khatib agent
    let proseContent = '';
    try {
      const prompt = `Generate a professional client report summary in French for project "${project.clientName}" (${project.projectType}).
Phase: ${project.phase}. Status: ${project.status}.
Hours consumed: ${totalHours}h / ${project.hoursEstimated ?? 0}h estimated.
Budget: ${totalInvoiced}€ invoiced, ${paidAmount}€ paid.
Upcoming followups: ${projectFollowups.filter(f => f.status === 'À faire').length}.
Write 3-4 paragraphs: project progress, key milestones, and next steps. Be concise and professional.`;
      const result = await executeOpenClawAgent('khatib', prompt, 60000);
      proseContent = typeof result === 'string' ? result : (result as { output?: string })?.output ?? '';
    } catch (err) {
      logger.warn(`[reports] Khatib agent failed, using static template: ${err instanceof Error ? err.message : err}`);
    }

    // Fallback static template
    if (!proseContent) {
      proseContent = `## Rapport Mensuel — ${project.clientName}

### Avancement du Projet
Le projet "${project.clientName}" (${project.projectType}) est actuellement en phase **${project.phase}** avec un statut **${project.status}**.

### Heures et Budget
- Heures consommées : **${totalHours}h** / ${project.hoursEstimated ?? 0}h estimées
- Montant facturé : **${totalInvoiced}€** dont ${paidAmount}€ payés

### Prochaines Étapes
- ${projectFollowups.filter(f => f.status === 'À faire').length} actions de suivi planifiées
- Phase suivante prévue selon le planning défini

*Rapport généré depuis template statique*`;
    }

    // Resolve white-label branding from brand_kits if client has one
    let brandConfig: { company: string; logo: string; primary: string; footer: string } | null = null;
    if (v.data.brandKitId || v.data.whiteLabel) {
      try {
        const { getDb: getDbFn } = await import('@/lib/db');
        const rawDb = (getDbFn() as unknown as { $client: import('better-sqlite3').Database }).$client;
        const kitQuery = v.data.brandKitId
          ? rawDb.prepare('SELECT * FROM brand_kits WHERE id = ?').get(v.data.brandKitId)
          : rawDb.prepare('SELECT * FROM brand_kits WHERE client_id = ?').get(v.data.projectId);
        if (kitQuery) {
          const kit = kitQuery as Record<string, string>;
          brandConfig = {
            company: kit.company_name || project.clientName,
            logo: kit.logo_url || '',
            primary: kit.primary_color || '#d946ef',
            footer: kit.company_name ? `${kit.company_name}` : 'AltCtrl.Lab',
          };
        }
      } catch (_) { /* brand kit optional */ }
    }

    // Generate HTML report
    const htmlContent = generateHtmlReport({
      clientName: project.clientName,
      projectType: project.projectType,
      phase: project.phase,
      period,
      totalHours,
      hoursEstimated: project.hoursEstimated ?? 0,
      totalInvoiced,
      paidAmount,
      prose: proseContent,
      brandConfig,
    });

    // Save report
    const projectDir = path.join(REPORTS_DIR, v.data.projectId);
    fs.mkdirSync(projectDir, { recursive: true });
    const htmlPath = path.join(projectDir, `report-${period}.html`);
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

    const reportId = createClientReport({
      projectId: v.data.projectId,
      period,
      htmlContent,
      pdfPath: htmlPath, // HTML file path — PDF generation via @react-pdf/renderer if needed
    });

    logger.info(`[reports] Generated report ${reportId} for project ${v.data.projectId}`);

    return NextResponse.json({
      success: true,
      reportId,
      downloadUrl: `/api/reports/download?id=${reportId}`,
    });
  } catch (err) {
    logger.error(`[reports] Error: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'default');
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const reports = getClientReportsForProject(projectId);
  return NextResponse.json({ success: true, reports: reports.map(r => ({ id: r.id, period: r.period, generatedAt: r.generatedAt })) });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateHtmlReport(data: {
  clientName: string;
  projectType: string;
  phase: string;
  period: string;
  totalHours: number;
  hoursEstimated: number;
  totalInvoiced: number;
  paidAmount: number;
  prose: string;
  brandConfig?: { company: string; logo: string; primary: string; footer: string } | null;
}): string {
  const safeClient = escapeHtml(data.clientName);
  const safeType = escapeHtml(data.projectType);
  const safePhase = escapeHtml(data.phase);
  const safePeriod = escapeHtml(data.period);
  const safeProse = escapeHtml(data.prose).replace(/\n/g, '<br>');

  const brand = data.brandConfig || { company: 'AltCtrl.Lab', logo: '', primary: '#d946ef', footer: 'AltCtrl.Lab' };
  const logoHtml = brand.logo
    ? `<img src="${escapeHtml(brand.logo)}" alt="${escapeHtml(brand.company)}" style="max-height:36px;">`
    : `<div class="logo">${escapeHtml(brand.company)}</div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport Mensuel — ${safeClient}</title>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #18181b; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${brand.primary}; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 700; color: ${brand.primary}; }
    .meta { color: #71717a; font-size: 14px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
    .kpi { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; text-align: center; }
    .kpi-value { font-size: 24px; font-weight: 700; color: #18181b; }
    .kpi-label { font-size: 12px; color: #71717a; margin-top: 4px; }
    .content { line-height: 1.7; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e4e4e7; color: #a1a1aa; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="meta">
      <div>${safeClient} — ${safeType}</div>
      <div>Période : ${safePeriod}</div>
      <div>Phase : ${safePhase}</div>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-value">${data.totalHours}h</div><div class="kpi-label">Heures consommées</div></div>
    <div class="kpi"><div class="kpi-value">${data.hoursEstimated}h</div><div class="kpi-label">Heures estimées</div></div>
    <div class="kpi"><div class="kpi-value">${data.totalInvoiced}€</div><div class="kpi-label">Facturé</div></div>
    <div class="kpi"><div class="kpi-value">${data.paidAmount}€</div><div class="kpi-label">Payé</div></div>
  </div>
  <div class="content">${safeProse}</div>
  <div class="footer">
    Généré le ${new Date().toLocaleDateString('fr-FR')} par ${escapeHtml(brand.footer)}<br>
    ${data.brandConfig ? '' : 'contact@altctrl.lab'}
  </div>
</body>
</html>`;
}
