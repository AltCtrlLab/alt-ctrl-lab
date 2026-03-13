import { NextRequest, NextResponse } from 'next/server';
import { getDb, createFollowup, updateFollowup, getFollowups, deleteFollowup } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
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
    const body = await request.json();
    const id = await createFollowup(body);
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    const body = await request.json();
    await updateFollowup(id, body);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    await deleteFollowup(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
