import { NextRequest, NextResponse } from 'next/server';
import { createContentItem } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, platform, hook, body: contentBody, tags, scheduledFor } = body;
    if (!title) return NextResponse.json({ success: false, error: 'title requis' }, { status: 400 });

    const id = await createContentItem({
      title,
      type: 'Post LinkedIn',
      platform: (platform as any) ?? 'LinkedIn',
      status: 'Idée',
      agent: 'manuel',
      hook: hook ?? null,
      body: contentBody ?? null,
      tags: tags ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) : null,
      scheduledAt: scheduledFor ? new Date(scheduledFor).getTime() : null,
    } as any);

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
