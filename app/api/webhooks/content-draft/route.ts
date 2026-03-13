import { NextRequest, NextResponse } from 'next/server';
import { updateContentItem, getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, hook, body: contentBody, cta, platform } = body;
    if (!id && !title) return NextResponse.json({ success: false, error: 'id ou title requis' }, { status: 400 });

    if (id) {
      await updateContentItem(id, {
        hook: hook ?? undefined,
        body: contentBody ?? undefined,
        cta: cta ?? undefined,
        status: 'Brouillon',
      });
      return NextResponse.json({ success: true });
    }

    // If no ID, find by title
    const db = getDb();
    const rawDb = (db as any).$client;
    const item = rawDb.prepare('SELECT id FROM content_items WHERE title = ? LIMIT 1').get(title);
    if (item) {
      await updateContentItem(item.id, {
        hook: hook ?? undefined,
        body: contentBody ?? undefined,
        cta: cta ?? undefined,
        status: 'Brouillon',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
