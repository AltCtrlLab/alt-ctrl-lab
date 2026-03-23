export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuditTrail } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

/**
 * GET /api/audit
 * Query: ?entityType=lead&entityId=xxx, ?action=create, ?limit=50
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`audit:get:${ip}`, 'default');
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const action = searchParams.get('action') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const entries = getAuditTrail({
      entityType,
      entityId,
      action,
      limit: Math.min(limit, 200),
    });

    return NextResponse.json({ success: true, data: { entries } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('audit-api', 'GET failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
