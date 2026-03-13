import { NextRequest, NextResponse } from 'next/server';
import {
  getDb,
  computeLeadScore,
  createLead,
  updateLead,
  getLeads,
  deleteLead,
  getLeadById,
  createProject,
  createInvoice,
  createFollowup,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';
    const status = searchParams.get('status');

    const db = getDb();
    const rawDb = (db as any).$client;

    if (statsOnly) {
      const total: number = rawDb.prepare('SELECT COUNT(*) as c FROM leads').get().c;
      const signed: number = rawDb.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'Signé'").get().c;
      const avgBasket: number | null = rawDb.prepare(
        "SELECT AVG(proposition_amount) as avg FROM leads WHERE status = 'Signé' AND proposition_amount IS NOT NULL"
      ).get().avg;
      const avgDays: number | null = rawDb.prepare(
        "SELECT AVG(CAST((signed_at - created_at) AS REAL) / 86400000.0) as avg FROM leads WHERE status = 'Signé' AND signed_at IS NOT NULL"
      ).get().avg;
      const overdue: number = rawDb.prepare(`
        SELECT COUNT(*) as c FROM leads WHERE
          (status = 'Proposition envoyée' AND proposition_sent_at IS NOT NULL AND (? - proposition_sent_at) > 259200000)
          OR (status = 'Relance 1' AND relance1_sent_at IS NOT NULL AND (? - relance1_sent_at) > 604800000)
      `).get(Date.now(), Date.now()).c;

      return NextResponse.json({
        success: true,
        data: {
          totalLeads: total,
          tauxConversion: total > 0 ? +((signed / total) * 100).toFixed(1) : 0,
          panierMoyen: avgBasket ? Math.round(avgBasket) : 0,
          delaiMoyenJours: avgDays ? Math.round(avgDays) : 0,
          overdueRelances: overdue,
        },
      });
    }

    const allLeads = await getLeads(status ?? undefined);
    return NextResponse.json({ success: true, data: { leads: allLeads } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let score = body.score ?? 0;
    let scoreCriteriaStr: string | null = null;

    if (body.scoreCriteria && typeof body.scoreCriteria === 'object') {
      score = computeLeadScore(body.scoreCriteria);
      scoreCriteriaStr = JSON.stringify(body.scoreCriteria);
    }

    const result = await createLead({
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone,
      source: body.source,
      status: body.status,
      score,
      scoreCriteria: scoreCriteriaStr,
      budget: body.budget,
      propositionAmount: body.propositionAmount,
      timeline: body.timeline,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });

    const body = await request.json();
    const updateData: Record<string, unknown> = { ...body };

    // Recalcule le score si les critères changent
    if (body.scoreCriteria && typeof body.scoreCriteria === 'object') {
      updateData.score = computeLeadScore(body.scoreCriteria);
      updateData.scoreCriteria = JSON.stringify(body.scoreCriteria);
    }

    // Retire scoreCriteria objet s'il était passé (déjà sérialisé)
    if (updateData.scoreCriteria && typeof updateData.scoreCriteria === 'object') {
      delete updateData.scoreCriteria;
    }

    await updateLead(id, updateData);

    // Auto-chain: Lead → "Signé"
    const autoChainActions: string[] = [];
    if (body.status === 'Signé') {
      try {
        const lead = await getLeadById(id);
        if (lead) {
          // Create project
          const proj = await createProject({
            clientName: lead.name + (lead.company ? ` (${lead.company})` : ''),
            projectType: 'Web',
            phase: 'Onboarding',
            status: 'Actif',
            budget: lead.propositionAmount ?? null,
            leadId: id,
          });
          autoChainActions.push('Projet créé');

          // Create draft invoice
          await createInvoice({
            clientName: lead.name + (lead.company ? ` (${lead.company})` : ''),
            projectId: proj.id,
            amount: lead.propositionAmount ?? 0,
            status: 'Brouillon',
          });
          autoChainActions.push('Facture brouillon créée');

          // Create J+14 check-in followup
          await createFollowup({
            clientName: lead.name,
            leadId: id,
            type: 'Check-in',
            status: 'À faire',
            priority: 'Haute',
            scheduledAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
            notes: 'Follow-up automatique — lead signé',
          });
          autoChainActions.push('Follow-up J+14 planifié');
        }
      } catch (chainErr: any) {
        console.error('Auto-chain lead→Signé error:', chainErr.message);
      }
    }

    return NextResponse.json({ success: true, autoChain: autoChainActions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
    await deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
