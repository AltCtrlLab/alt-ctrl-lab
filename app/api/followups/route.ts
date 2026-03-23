export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, createFollowup, updateFollowup, getFollowups, deleteFollowup } from '@/lib/db';
import { validateBody, followupCreateSchema, followupUpdateSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRateLimit(`followups:get:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';
    const rawDb = (getDb() as any).$client;

    if (statsOnly) {
      const now = Date.now();
      const aFaire: number = rawDb.prepare("SELECT COUNT(*) as c FROM followups WHERE status='À faire'").get().c;
      const scoreNpsMoyen: number | null = rawDb.prepare("SELECT AVG(score_nps) as avg FROM followups WHERE score_nps IS NOT NULL").get().avg;
      const overdueCount: number = rawDb.prepare("SELECT COUNT(*) as c FROM followups WHERE status='À faire' AND scheduled_at IS NOT NULL AND scheduled_at < ?").get(now).c;
      const upsellsIdentifies: number = rawDb.prepare("SELECT COUNT(*) as c FROM followups WHERE type='Upsell' AND status='À faire'").get().c;

      return NextResponse.json({ success: true, data: {
        aFaire,
        scoreNpsMoyen: scoreNpsMoyen ? +scoreNpsMoyen.toFixed(1) : null,
        overdueCount,
        upsellsIdentifies
      }});
    }

    const status = searchParams.get('status') ?? undefined;
    const type = searchParams.get('type') ?? undefined;
    const items = await getFollowups({ status, type });
    return NextResponse.json({ success: true, data: { followups: items } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`followups:post:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const v = validateBody(body, followupCreateSchema);
    if (!v.success) return v.response;
    const id = await createFollowup(v.data as Parameters<typeof createFollowup>[0]);
    auditCreate(request, 'followup', id, { type: (v.data as Record<string, unknown>).type, clientName: (v.data as Record<string, unknown>).clientName });
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = checkRateLimit(`followups:patch:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    const body = await request.json();
    const v = validateBody(body, followupUpdateSchema);
    if (!v.success) return v.response;
    await updateFollowup(id, v.data as Partial<import('@/lib/db/schema_postvente').Followup>);
    auditUpdate(request, 'followup', id, v.data as Record<string, unknown>);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = checkRateLimit(`followups:delete:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    await deleteFollowup(id);
    auditDelete(request, 'followup', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
