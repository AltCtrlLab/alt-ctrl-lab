export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, createContentItem, updateContentItem, getContentItems, deleteContentItem } from '@/lib/db';
import { validateBody, contentCreateSchema, contentUpdateSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRateLimit(`content:get:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';
    const rawDb = (getDb() as any).$client;

    if (statsOnly) {
      const totalPublie: number = rawDb.prepare("SELECT COUNT(*) as c FROM content_items WHERE status='Publié'").get().c;
      const totalPlanifie: number = rawDb.prepare("SELECT COUNT(*) as c FROM content_items WHERE status='Planifié'").get().c;
      const totalIdees: number = rawDb.prepare("SELECT COUNT(*) as c FROM content_items WHERE status='Idée'").get().c;
      const total: number = rawDb.prepare("SELECT COUNT(*) as c FROM content_items").get().c;
      const tauxPublication = total > 0 ? +((totalPublie / total) * 100).toFixed(1) : 0;
      return NextResponse.json({ success: true, data: { totalPublie, totalPlanifie, totalIdees, tauxPublication } });
    }

    const status = searchParams.get('status') ?? undefined;
    const platform = searchParams.get('platform') ?? undefined;
    const agent = searchParams.get('agent') ?? undefined;
    const items = await getContentItems({ status, platform, agent });
    return NextResponse.json({ success: true, data: { items } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`content:post:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const v = validateBody(body, contentCreateSchema);
    if (!v.success) return v.response;
    const contentData = {
      ...v.data,
      scheduledAt: v.data.scheduledAt ? new Date(v.data.scheduledAt).getTime() : null,
    };
    const id = await createContentItem(contentData as Parameters<typeof createContentItem>[0]);
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = checkRateLimit(`content:patch:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    const body = await request.json();
    const v = validateBody(body, contentUpdateSchema);
    if (!v.success) return v.response;
    const updateData: Record<string, unknown> = { ...v.data };
    if (typeof updateData.scheduledAt === 'string') {
      updateData.scheduledAt = new Date(updateData.scheduledAt as string).getTime();
    }
    await updateContentItem(id, updateData as Partial<import('@/lib/db/schema_content').ContentItem>);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = checkRateLimit(`content:delete:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    await deleteContentItem(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
