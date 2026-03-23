export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadNotificationCount } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const notificationPatchSchema = z.union([
  z.object({ action: z.literal('readAll') }),
  z.object({ id: z.string().min(1) }),
]);

/**
 * GET /api/notifications
 * Query: ?unread=true, ?type=deadline, ?limit=20
 *
 * PATCH /api/notifications
 * Body: { id: string } or { action: 'readAll' }
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`notifications:get:${ip}`, 'default');
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const unread = searchParams.get('unread') === 'true';
    const type = searchParams.get('type') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const notifications = getNotifications({
      unreadOnly: unread,
      type,
      limit: Math.min(limit, 100),
    });

    const unreadCount = getUnreadNotificationCount();

    return NextResponse.json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('notifications-api', 'GET failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`notifications:patch:${ip}`, 'default');
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const raw = await request.json();
    const parsed = notificationPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Missing or invalid id/action', details: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;
    if ('action' in body) {
      markAllNotificationsRead();
      return NextResponse.json({ success: true });
    }

    markNotificationRead(body.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('notifications-api', 'PATCH failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
