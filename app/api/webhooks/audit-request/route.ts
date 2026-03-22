export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/db';
import { verifyWebhookAuth } from '@/lib/webhook-auth';
import { validateBody, auditRequestSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`webhook:audit:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const rawBody = await request.text();
    if (!verifyWebhookAuth(request, 'audit', rawBody)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const v = validateBody(body, auditRequestSchema);
    if (!v.success) return v.response;

    const result = await createLead({
      name: v.data.name,
      email: v.data.email ?? null,
      company: body.company ?? null,
      source: 'Site',
      status: 'Nouveau',
      notes: [
        'Audit demandé',
        v.data.url ? `Site: ${v.data.url}` : null,
      ].filter(Boolean).join('\n') || null,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
