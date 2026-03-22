export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/db';
import { verifyWebhookAuth } from '@/lib/webhook-auth';
import { validateBody, calBookingSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`webhook:cal:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const rawBody = await request.text();
    if (!verifyWebhookAuth(request, 'cal', rawBody)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const v = validateBody(body, calBookingSchema);
    if (!v.success) return v.response;

    const result = await createLead({
      name: v.data.name,
      email: v.data.email ?? null,
      source: 'Site',
      status: 'Qualifié',
      notes: [
        v.data.eventType ? `Type: ${v.data.eventType}` : null,
        v.data.scheduledAt ? `RDV: ${new Date(v.data.scheduledAt).toLocaleString('fr-FR')}` : null,
        v.data.notes ?? null,
      ].filter(Boolean).join('\n') || null,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
