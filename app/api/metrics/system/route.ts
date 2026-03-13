// GET /api/metrics/system — Métriques système réelles
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { agentActivities } from '@/lib/db/schema';
import { gte, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();
    const since = new Date(Date.now() - 60_000); // dernières 60 secondes

    // Tokens traités dans la dernière minute
    const tokenStats = await db.select({
      totalTokensIn: sql<number>`coalesce(sum(${agentActivities.tokensInput}), 0)`,
      totalTokensOut: sql<number>`coalesce(sum(${agentActivities.tokensOutput}), 0)`,
      activeCount: sql<number>`count(*)`,
    })
    .from(agentActivities)
    .where(gte(agentActivities.startedAt, since));

    const s = tokenStats[0];
    const totalTokens = Number(s.totalTokensIn) + Number(s.totalTokensOut);
    const tokensPerSecond = (totalTokens / 60).toFixed(1);

    // SSE clients connectés
    const g = globalThis as Record<string, unknown>;
    const sseClients = Array.isArray(g.__sseClients) ? g.__sseClients.length : 0;

    // Events en buffer
    const eventBuffer = Array.isArray(g.__sseEventHistory) ? g.__sseEventHistory.length : 0;

    return NextResponse.json({
      success: true,
      data: {
        tokensPerSecond: `${tokensPerSecond} T/s`,
        totalTokensLastMinute: totalTokens,
        activeTasksLastMinute: Number(s.activeCount),
        sseClients,
        eventBuffer,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        tokensPerSecond: '0.0 T/s',
        totalTokensLastMinute: 0,
        activeTasksLastMinute: 0,
        sseClients: 0,
        eventBuffer: 0,
      },
    });
  }
}
