export const dynamic = 'force-dynamic';
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
import { validateBody, projectCreateSchema, projectUpdateSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';
import { notifySlack } from '@/lib/slack';
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRateLimit(`projects:get:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
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
    const rl = checkRateLimit(`projects:post:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const v = validateBody(body, projectCreateSchema);
    if (!v.success) return v.response;
    const result = await createProject({
      clientName: v.data.clientName,
      projectType: body.projectType,
      phase: body.phase,
      status: v.data.status,
      budget: v.data.budget ?? null,
      startDate: body.startDate ?? null,
      kickoffDate: body.kickoffDate ?? null,
      deadline: v.data.deadline ? new Date(v.data.deadline).getTime() : null,
      hoursEstimated: v.data.hoursEstimated ?? 0,
      notes: v.data.notes ?? null,
      teamAgents: body.teamAgents ? JSON.stringify(body.teamAgents) : null,
      leadId: v.data.leadId ?? null,
    });
    auditCreate(request, 'project', result.id, { clientName: v.data.clientName, type: body.projectType });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = checkRateLimit(`projects:patch:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
    const body = await request.json();
    const v = validateBody(body, projectUpdateSchema);
    if (!v.success) return v.response;
    const validatedData: Record<string, unknown> = { ...v.data };
    if (validatedData.teamAgents && Array.isArray(validatedData.teamAgents)) {
      validatedData.teamAgents = JSON.stringify(validatedData.teamAgents);
    }
    if (typeof validatedData.deadline === 'string') {
      validatedData.deadline = new Date(validatedData.deadline as string).getTime();
    }
    await updateProject(id, validatedData);
    auditUpdate(request, 'project', id, validatedData);

    // Auto-chain: Projet → "Livraison"
    const autoChainActions: string[] = [];
    if (v.data.phase === 'Livraison') {
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
          // Notify Slack
          notifySlack('project_delivered', { Client: project.clientName, Type: project.projectType }).catch(() => {});
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
    const rl = checkRateLimit(`projects:delete:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID requis' }, { status: 400 });
    await deleteProject(id);
    auditDelete(request, 'project', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
