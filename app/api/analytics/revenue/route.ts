import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const rawDb = (getDb() as any).$client;
    const now = Date.now();
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const monthStart = startOfMonth.getTime();

    // Pipeline value: leads with proposition en attente
    const pipeline: number = rawDb.prepare(`
      SELECT COALESCE(SUM(proposition_amount), 0) as v FROM leads
      WHERE status IN ('Proposition envoyée', 'Relance 1', 'Relance 2') AND proposition_amount IS NOT NULL
    `).get().v;

    // CA mois en cours
    const caMois: number = rawDb.prepare(`
      SELECT COALESCE(SUM(amount), 0) as v FROM invoices
      WHERE status = 'Payée' AND paid_at >= ?
    `).get(monthStart).v;

    // Leads signés ce mois
    const signedMois: number = rawDb.prepare(`
      SELECT COUNT(*) as c FROM leads WHERE status = 'Signé' AND signed_at >= ?
    `).get(monthStart).c;

    // Total leads ce mois
    const totalLeadsMois: number = rawDb.prepare(`
      SELECT COUNT(*) as c FROM leads WHERE created_at >= ?
    `).get(monthStart).c;

    // Taux conversion mois
    const tauxConversionMois = totalLeadsMois > 0
      ? +((signedMois / totalLeadsMois) * 100).toFixed(1)
      : 0;

    // Taux conversion historique (30 derniers jours)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const signedLast30: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM leads WHERE status = 'Signé' AND signed_at >= ?"
    ).get(thirtyDaysAgo).c;
    const totalLast30: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM leads WHERE created_at >= ?"
    ).get(thirtyDaysAgo).c;
    const tauxHistorique = totalLast30 > 0 ? signedLast30 / totalLast30 : 0;

    // Projection: pipeline × taux historique
    const projectionMensuelle = Math.round(pipeline * tauxHistorique);

    // Budget projets actifs
    const budgetProjects: number = rawDb.prepare(`
      SELECT COALESCE(SUM(budget), 0) as v FROM projects WHERE status = 'Actif' AND budget IS NOT NULL
    `).get().v;

    // CA total encaissé
    const caTotal: number = rawDb.prepare(
      "SELECT COALESCE(SUM(amount), 0) as v FROM invoices WHERE status = 'Payée'"
    ).get().v;

    // Invoices en retard
    const enRetard: number = rawDb.prepare(
      "SELECT COUNT(*) as c FROM invoices WHERE status IN ('Envoyée', 'En retard') AND due_date < ?"
    ).get(now).c;

    return NextResponse.json({
      success: true,
      data: {
        pipeline,
        caMois,
        caTotal,
        signedMois,
        totalLeadsMois,
        tauxConversionMois,
        projectionMensuelle,
        budgetProjects,
        enRetard,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
