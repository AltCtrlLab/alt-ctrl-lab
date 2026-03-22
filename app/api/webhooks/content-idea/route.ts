export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createContentItem } from '@/lib/db';
import { verifyWebhookAuth } from '@/lib/webhook-auth';
import { validateBody, contentIdeaSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`webhook:content-idea:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const rawBody = await request.text();
    if (!verifyWebhookAuth(request, 'n8n', rawBody)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const v = validateBody(body, contentIdeaSchema);
    if (!v.success) return v.response;

    const id = await createContentItem({
      title: v.data.title,
      type: 'Post LinkedIn',
      platform: (v.data.platform as string) ?? 'LinkedIn',
      status: 'Idée',
      agent: 'manuel',
      hook: v.data.hook ?? null,
      body: v.data.body ?? null,
      tags: v.data.tags ? (Array.isArray(v.data.tags) ? JSON.stringify(v.data.tags) : v.data.tags) : null,
      scheduledAt: body.scheduledFor ? new Date(body.scheduledFor).getTime() : null,
    } as Parameters<typeof createContentItem>[0]);

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
