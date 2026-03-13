export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { updateContentItem, getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, publishedAt } = body;
    if (!id && !title) return NextResponse.json({ success: false, error: 'id ou title requis' }, { status: 400 });

    const publishTs = publishedAt ? new Date(publishedAt).getTime() : Date.now();

    if (id) {
      await updateContentItem(id, { status: 'Publié', publishedAt: publishTs });
      return NextResponse.json({ success: true });
    }

    const db = getDb();
    const rawDb = (db as any).$client;
    const item = rawDb.prepare('SELECT id FROM content_items WHERE title = ? LIMIT 1').get(title);
    if (item) {
      await updateContentItem(item.id, { status: 'Publié', publishedAt: publishTs });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
