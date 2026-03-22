export const dynamic = 'force-dynamic';
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
import { validateBody, leadCreateSchema, leadUpdateSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRateLimit(`leads:get:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
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

    const email = searchParams.get('email');
    const source = searchParams.get('source');

    if (email) {
      const rawDb = (getDb() as any).$client;
      const rows = rawDb.prepare('SELECT * FROM leads WHERE email = ? COLLATE NOCASE').all(email);
      return NextResponse.json({ success: true, data: { leads: rows } });
    }

    if (source) {
      const rawDb = (getDb() as any).$client;
      let query = 'SELECT * FROM leads WHERE source = ?';
      const params: string[] = [source];
      if (status) { query += ' AND status = ?'; params.push(status); }
      query += ' ORDER BY created_at DESC';
      const rows = rawDb.prepare(query).all(...params);
      return NextResponse.json({ success: true, data: { leads: rows } });
    }

    const allLeads = await getLeads(status ?? undefined);
    return NextResponse.json({ success: true, data: { leads: allLeads } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`leads:post:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const v = validateBody(body, leadCreateSchema);
    if (!v.success) return v.response;
    let score = v.data.score ?? 0;
    let scoreCriteriaStr: string | null = null;

    if (body.scoreCriteria && typeof body.scoreCriteria === 'object') {
      score = computeLeadScore(body.scoreCriteria);
      scoreCriteriaStr = JSON.stringify(body.scoreCriteria);
    }

    const result = await createLead({
      name: v.data.name,
      company: v.data.company,
      email: v.data.email,
      phone: v.data.phone,
      source: v.data.source,
      status: v.data.status,
      score,
      scoreCriteria: scoreCriteriaStr,
      budget: v.data.budget,
      propositionAmount: body.propositionAmount,
      timeline: body.timeline,
      notes: v.data.notes,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = checkRateLimit(`leads:patch:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });

    const body = await request.json();
    const v = validateBody(body, leadUpdateSchema);
    if (!v.success) return v.response;
    const updateData: Record<string, unknown> = { ...v.data };

    // Recalcule le score si les critères changent
    if (v.data.scoreCriteria && typeof v.data.scoreCriteria === 'object') {
      updateData.score = computeLeadScore(v.data.scoreCriteria);
      updateData.scoreCriteria = JSON.stringify(v.data.scoreCriteria);
    }

    // Retire scoreCriteria objet s'il était passé (déjà sérialisé)
    if (updateData.scoreCriteria && typeof updateData.scoreCriteria === 'object') {
      delete updateData.scoreCriteria;
    }

    await updateLead(id, updateData);

    // Auto-chain: Lead → "Signé"
    const autoChainActions: string[] = [];
    if (v.data.status === 'Signé') {
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
    const rl = checkRateLimit(`leads:delete:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
    await deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
