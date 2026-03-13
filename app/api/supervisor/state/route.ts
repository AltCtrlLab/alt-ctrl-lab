/**
 * GET /api/supervisor/state
 *
 * Endpoint d'état global pour hydratation initiale du frontend.
 * Inclut l'historique des events SSE pour remplir la timeline.
 */

import { NextResponse } from 'next/server';
import { getGlobalWarRoomState, getEventHistory } from '@/lib/warroom-state';

export async function GET() {
  const warRoomState = getGlobalWarRoomState();
  const eventHistory = getEventHistory();

  try {
    const { getRecentTasks } = await import('@/lib/db');
    const dbTasks = await getRecentTasks(10);

    return NextResponse.json({
      success: true,
      data: {
        warRoom: warRoomState,
        recentTasks: dbTasks,
        eventHistory,
        serverTime: Date.now(),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        warRoom: warRoomState,
        recentTasks: [],
        eventHistory,
        serverTime: Date.now(),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}
