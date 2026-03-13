import { NextRequest, NextResponse } from 'next/server';
import {
  getDb,
  createProject,
  updateProject,
  getProjects,
  deleteProject,
  getProjectById,
  createFollowup,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';
    const status = searchParams.get('status') ?? undefined;

    const db = getDb();
    const rawDb = (db as any).$client;

    if (statsOnly) {
      const revenueEnCours: number | null = rawDb.prepare(
        "SELECT SUM(budget) as total FROM projects WHERE status = 'Actif'"
      ).get().total;
      const heuresTotales: number | null = rawDb.prepare(
        "SELECT SUM(hours_actual) as total FROM projects WHERE status = 'Actif'"
      ).get().total;
      const projetsActifs: number = rawDb.prepare(
        "SELECT COUNT(*) as c FROM projects WHERE status = 'Actif'"
      ).get().c;
      const margeEstimee: number | null = rawDb.prepare(`
        SELECT AVG(CASE WHEN hours_estimated > 0
          THEN ((hours_estimated - hours_actual) / hours_estimated) * 100
          ELSE NULL END) as avg
        FROM projects WHERE status = 'Actif'
      `).get().avg;

      return NextResponse.json({
        success: true,
        data: {
          revenueEnCours: revenueEnCours ? Math.round(revenueEnCours) : 0,
          heuresTotales: heuresTotales ? +heuresTotales.toFixed(1) : 0,
          projetsActifs,
          margeEstimee: margeEstimee ? Math.round(margeEstimee) : null,
        },
      });
    }

    const allProjects = await getProjects(status);
    return NextResponse.json({ success: true, data: { projects: allProjects } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createProject({
      clientName: body.clientName,
      projectType: body.projectType,
      phase: body.phase,
      status: body.status,
      budget: body.budget ?? null,
      startDate: body.startDate ?? null,
      kickoffDate: body.kickoffDate ?? null,
      deadline: body.deadline ?? null,
      hoursEstimated: body.hoursEstimated ?? 0,
      notes: body.notes ?? null,
      teamAgents: body.teamAgents ? JSON.stringify(body.teamAgents) : null,
      leadId: body.leadId ?? null,
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
    if (body.teamAgents && Array.isArray(body.teamAgents)) {
      body.teamAgents = JSON.stringify(body.teamAgents);
    }
    await updateProject(id, body);

    // Auto-chain: Projet → "Livraison"
    const autoChainActions: string[] = [];
    if (body.phase === 'Livraison') {
      try {
        const project = await getProjectById(id);
        if (project) {
          await createFollowup({
            clientName: project.clientName,
            projectId: id,
            type: 'NPS',
            status: 'À faire',
            priority: 'Haute',
            scheduledAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
            notes: 'NPS automatique — projet en phase Livraison',
          });
          autoChainActions.push('Follow-up NPS J+3 planifié');
        }
      } catch (chainErr: any) {
        console.error('Auto-chain project→Livraison error:', chainErr.message);
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
    await deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
