export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { validateBody, slackNotifySchema } from '@/lib/validation';
import { notifySlack, type SlackEvent } from '@/lib/slack';

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'default');
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  try {
    const body = await req.json();
    const v = validateBody(body, slackNotifySchema);
    if (!v.success) return v.response;

    await notifySlack(v.data.event as SlackEvent, v.data.data as Record<string, string>);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
