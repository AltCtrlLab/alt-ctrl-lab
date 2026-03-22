export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { updateContentItem, getDb } from '@/lib/db';
import { verifyWebhookAuth } from '@/lib/webhook-auth';
import { validateBody, contentDraftSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`webhook:content-draft:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const rawBody = await request.text();
    if (!verifyWebhookAuth(request, 'n8n', rawBody)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const v = validateBody(body, contentDraftSchema);
    if (!v.success) return v.response;

    if (v.data.id) {
      await updateContentItem(v.data.id, {
        hook: body.hook ?? undefined,
        body: v.data.body ?? undefined,
        cta: body.cta ?? undefined,
        status: 'Brouillon',
      });
      return NextResponse.json({ success: true });
    }

    // If no ID, find by title
    if (v.data.title) {
      const db = getDb();
      const rawDb = (db as Record<string, unknown>).$client as { prepare: (sql: string) => { get: (...args: string[]) => Record<string, string> | undefined } };
      const item = rawDb.prepare('SELECT id FROM content_items WHERE title = ? LIMIT 1').get(v.data.title);
      if (item) {
        await updateContentItem(item.id, {
          hook: body.hook ?? undefined,
          body: v.data.body ?? undefined,
          cta: body.cta ?? undefined,
          status: 'Brouillon',
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
