export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const DAY_MS = 86_400_000;

/**
 * Client Health Score Dashboard
 *
 * GET /api/analytics/client-health — All clients with health scores
 * GET /api/analytics/client-health?client=xxx — Specific client breakdown
 *
 * Score 0-100 based on:
 * - Payment health (0-25): invoices paid on time vs overdue
 * - Project health (0-25): active projects, delivery success
 * - Engagement (0-25): communication frequency, portal access
 * - Satisfaction (0-25): NPS, testimonials
 */

interface ClientHealth {
  clientName: string;
  email: string | null;
  totalScore: number;
  tier: 'healthy' | 'watch' | 'at-risk' | 'critical';
  breakdown: {
    payment: number;
    project: number;
    engagement: number;
    satisfaction: number;
  };
  details: {
    totalRevenue: number;
    overdueInvoices: number;
    activeProjects: number;
    deliveredProjects: number;
    lastActivity: number | null;
    nps: number | null;
    daysSinceLastContact: number | null;
  };
}

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  const now = Date.now();

  const specificClient = request.nextUrl.searchParams.get('client');

  // Get all unique clients
  const clientQuery = specificClient
    ? 'SELECT DISTINCT client_name, client_email FROM projects WHERE client_name = ?'
    : 'SELECT DISTINCT client_name, client_email FROM projects ORDER BY client_name';
  const clients = (specificClient
    ? rawDb.prepare(clientQuery).all(specificClient)
    : rawDb.prepare(clientQuery).all()
  ) as Array<{ client_name: string; client_email: string | null }>;

  const results: ClientHealth[] = [];

  for (const client of clients) {
    const cn = client.client_name;

    // ── Payment Health (0-25) ─────────────────────────────────────────
    let paymentScore = 25;
    const totalRevenue = (rawDb.prepare("SELECT COALESCE(SUM(amount), 0) as v FROM invoices WHERE client_name = ? AND status = 'Payée'").get(cn) as { v: number }).v;
    const overdueCount = (rawDb.prepare("SELECT COUNT(*) as c FROM invoices WHERE client_name = ? AND status = 'En retard'").get(cn) as { c: number }).c;
    const pendingAmount = (rawDb.prepare("SELECT COALESCE(SUM(amount), 0) as v FROM invoices WHERE client_name = ? AND status IN ('Envoyée', 'En retard')").get(cn) as { v: number }).v;

    if (overdueCount > 0) paymentScore -= overdueCount * 8;
    if (pendingAmount > totalRevenue * 0.5) paymentScore -= 5;
    paymentScore = Math.max(0, paymentScore);

    // ── Project Health (0-25) ─────────────────────────────────────────
    let projectScore = 25;
    const activeProjects = (rawDb.prepare("SELECT COUNT(*) as c FROM projects WHERE client_name = ? AND status NOT IN ('Archivé', 'Annulé')").get(cn) as { c: number }).c;
    const deliveredProjects = (rawDb.prepare("SELECT COUNT(*) as c FROM projects WHERE client_name = ? AND status = 'Livré'").get(cn) as { c: number }).c;
    const cancelledProjects = (rawDb.prepare("SELECT COUNT(*) as c FROM projects WHERE client_name = ? AND status = 'Annulé'").get(cn) as { c: number }).c;

    if (cancelledProjects > 0) projectScore -= cancelledProjects * 10;
    if (activeProjects === 0 && deliveredProjects === 0) projectScore -= 15;
    projectScore = Math.max(0, projectScore);

    // ── Engagement (0-25) ─────────────────────────────────────────────
    let engagementScore = 25;
    const lastActivity = rawDb.prepare('SELECT MAX(updated_at) as last_act FROM projects WHERE client_name = ?').get(cn) as { last_act: number | null };
    const lastFollowup = rawDb.prepare('SELECT MAX(COALESCE(done_at, scheduled_at)) as last_fu FROM followups WHERE client_name = ?').get(cn) as { last_fu: number | null };
    const lastContact = Math.max(lastActivity.last_act || 0, lastFollowup.last_fu || 0) || null;
    const daysSinceContact = lastContact ? Math.floor((now - lastContact) / DAY_MS) : null;

    if (daysSinceContact === null) { engagementScore = 5; }
    else if (daysSinceContact > 90) { engagementScore = 0; }
    else if (daysSinceContact > 60) { engagementScore = 5; }
    else if (daysSinceContact > 30) { engagementScore = 15; }

    // ── Satisfaction (0-25) ───────────────────────────────────────────
    let satisfactionScore = 15; // default if no NPS data
    const nps = rawDb.prepare('SELECT AVG(score_nps) as avg_nps FROM followups WHERE client_name = ? AND score_nps IS NOT NULL').get(cn) as { avg_nps: number | null };

    if (nps.avg_nps !== null) {
      if (nps.avg_nps >= 9) satisfactionScore = 25;
      else if (nps.avg_nps >= 7) satisfactionScore = 20;
      else if (nps.avg_nps >= 5) satisfactionScore = 10;
      else satisfactionScore = 0;
    }

    // Check for testimonial
    const hasTestimonial = (rawDb.prepare("SELECT COUNT(*) as c FROM testimonials WHERE client_name = ? AND approved = 1").get(cn) as { c: number } | undefined)?.c || 0;
    if (hasTestimonial > 0) satisfactionScore = Math.min(25, satisfactionScore + 5);

    // ── Total ─────────────────────────────────────────────────────────
    const totalScore = paymentScore + projectScore + engagementScore + satisfactionScore;
    const tier = totalScore >= 75 ? 'healthy' : totalScore >= 50 ? 'watch' : totalScore >= 25 ? 'at-risk' : 'critical';

    results.push({
      clientName: cn,
      email: client.client_email,
      totalScore,
      tier,
      breakdown: {
        payment: paymentScore,
        project: projectScore,
        engagement: engagementScore,
        satisfaction: satisfactionScore,
      },
      details: {
        totalRevenue,
        overdueInvoices: overdueCount,
        activeProjects,
        deliveredProjects,
        lastActivity: lastContact,
        nps: nps.avg_nps ? Math.round(nps.avg_nps * 10) / 10 : null,
        daysSinceLastContact: daysSinceContact,
      },
    });
  }

  // Sort by score ascending (worst first)
  results.sort((a, b) => a.totalScore - b.totalScore);

  // Aggregate stats
  const summary = {
    totalClients: results.length,
    healthy: results.filter(r => r.tier === 'healthy').length,
    watch: results.filter(r => r.tier === 'watch').length,
    atRisk: results.filter(r => r.tier === 'at-risk').length,
    critical: results.filter(r => r.tier === 'critical').length,
    avgScore: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.totalScore, 0) / results.length) : 0,
  };

  logger.info('client-health', 'Health check', summary);

  return NextResponse.json({ success: true, data: { clients: results, summary } });
}
