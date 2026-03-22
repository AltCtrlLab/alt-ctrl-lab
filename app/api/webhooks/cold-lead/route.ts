export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/db';
import { verifyWebhookAuth } from '@/lib/webhook-auth';
import { validateBody, coldLeadSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`webhook:gmb:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const rawBody = await request.text();
    if (!verifyWebhookAuth(request, 'gmb', rawBody)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const v = validateBody(body, coldLeadSchema);
    if (!v.success) return v.response;

    const result = await createLead({
      name: v.data.name,
      email: v.data.email ?? null,
      phone: v.data.phone ?? null,
      company: v.data.company ?? null,
      source: 'GMB',
      status: 'Nouveau',
      website: v.data.website ?? null,
      websiteScore: body.websiteScore ?? body.website_score ?? null,
      emailSentCount: 1,
      lastContactedAt: Date.now(),
      notes: [
        'Source: cold-email (Google Maps)',
        v.data.website ? `Site: ${v.data.website}` : null,
        v.data.address ? `Adresse: ${v.data.address}` : null,
        v.data.categories ? `Catégorie: ${v.data.categories}` : null,
        body.notes ?? null,
      ].filter(Boolean).join('\n') || null,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
