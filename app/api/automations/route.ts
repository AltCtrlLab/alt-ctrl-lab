export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, createAutomation, updateAutomation, getAutomations, deleteAutomation } from '@/lib/db';
import { validateBody, automationCreateSchema, automationUpdateSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRateLimit(`automations:get:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';
    const rawDb = (getDb() as any).$client;

    if (statsOnly) {
      const now = Date.now();
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
      const monthStart = startOfMonth.getTime();

      const totalActif: number = rawDb.prepare("SELECT COUNT(*) as c FROM automations WHERE status='Actif'").get().c;
      const enErreur: number = rawDb.prepare("SELECT COUNT(*) as c FROM automations WHERE status='Erreur'").get().c;
      const execsMoisRow = rawDb.prepare("SELECT COALESCE(SUM(run_count),0) as v FROM automations").get();
      const execsMois: number = execsMoisRow.v;
      const totalRuns: number = rawDb.prepare("SELECT COALESCE(SUM(run_count),0) as v FROM automations").get().v;
      const totalErrors: number = rawDb.prepare("SELECT COALESCE(SUM(error_count),0) as v FROM automations").get().v;
      const tauxSucces = totalRuns > 0 ? +(((totalRuns - totalErrors) / totalRuns) * 100).toFixed(1) : 100;

      return NextResponse.json({ success: true, data: { totalActif, tauxSucces, execsMois, enErreur } });
    }

    const status = searchParams.get('status') ?? undefined;
    const items = await getAutomations(status);
    return NextResponse.json({ success: true, data: { automations: items } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`automations:post:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const v = validateBody(body, automationCreateSchema);
    if (!v.success) return v.response;
    const id = await createAutomation(v.data as Parameters<typeof createAutomation>[0]);
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = checkRateLimit(`automations:patch:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    const body = await request.json();
    const v = validateBody(body, automationUpdateSchema);
    if (!v.success) return v.response;
    await updateAutomation(id, v.data as Partial<import('@/lib/db/schema_automations').Automation>);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = checkRateLimit(`automations:delete:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    await deleteAutomation(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
