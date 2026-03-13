export const dynamic = 'force-dynamic';
// /app/api/agents/activity/route.ts
// GET /api/agents/activity?agent_id=matin&limit=50&offset=0
// GET /api/agents/activity?agent_id=matin&timeframe=24h (hourly aggregation)

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { agentActivities, agentMetrics } from '@/lib/db/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agent_id');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const timeframe = searchParams.get('timeframe'); // '1h', '24h', '7d', '30d'
  
  try {
    const db = getDb();
    
    // 1. Métriques en temps réel
    const metrics = await db.select()
      .from(agentMetrics)
      .where(agentId ? eq(agentMetrics.agentId, agentId) : undefined)
      .limit(1);
    
    // 2. Activités récentes
    const activities = await db.select()
      .from(agentActivities)
      .where(agentId ? eq(agentActivities.agentId, agentId) : undefined)
      .orderBy(desc(agentActivities.startedAt))
      .limit(limit)
      .offset(offset);
    
    // 3. Stats agrégées par timeframe
    let hourlyStats = null;
    if (timeframe) {
      const hours = timeframe === '1h' ? 1 : timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      hourlyStats = await db.select({
        hour: sql`strftime('%Y-%m-%d %H:00:00', ${agentActivities.startedAt} / 1000, 'unixepoch')`,
        count: sql`count(*)`,
        avgExecutionTime: sql`avg(${agentActivities.executionTimeMs})`,
        successRate: sql`100.0 * sum(case when ${agentActivities.status} = 'SUCCESS' then 1 else 0 end) / count(*)`,
      })
      .from(agentActivities)
      .where(and(
        agentId ? eq(agentActivities.agentId, agentId) : undefined,
        gte(agentActivities.startedAt, since)
      ))
      .groupBy(sql`strftime('%Y-%m-%d %H', ${agentActivities.startedAt} / 1000, 'unixepoch')`)
      .orderBy(desc(sql`hour`));
    }
    
    return NextResponse.json({
      success: true,
      data: {
        metrics: metrics[0] || null,
        activities,
        hourlyStats,
        pagination: { limit, offset, hasMore: activities.length === limit }
      }
    });
    
  } catch (error) {
    console.error('[API] Error fetching agent activity:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch activity'
    }, { status: 500 });
  }
}

// POST /api/agents/activity - Pour logger une activité (appelé par le worker)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getDb();
    
    await db.insert(agentActivities).values({
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      startedAt: new Date(body.startedAt),
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
    });
    
    // Mise à jour des métriques cumulatives
    await updateAgentMetrics(body.agentId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error logging activity:', error);
    return NextResponse.json({ success: false, error: 'Failed to log' }, { status: 500 });
  }
}

async function updateAgentMetrics(agentId: string) {
  const db = getDb();
  
  // Recalcule les métriques agrégées
  const stats = await db.select({
    total: sql`count(*)`,
    success: sql`sum(case when ${agentActivities.status} = 'SUCCESS' then 1 else 0 end)`,
    failed: sql`sum(case when ${agentActivities.status} = 'FAILED' then 1 else 0 end)`,
    rejected: sql`sum(case when ${agentActivities.qaResult} = 'REJECTED' then 1 else 0 end)`,
    tokensIn: sql`sum(${agentActivities.tokensInput})`,
    tokensOut: sql`sum(${agentActivities.tokensOutput})`,
    avgTime: sql`avg(${agentActivities.executionTimeMs})`,
  })
  .from(agentActivities)
  .where(eq(agentActivities.agentId, agentId));
  
  const s = stats[0];
  const successRate = Number(s.total) > 0 ? (Number(s.success) / Number(s.total)) * 100 : 0;
  
  await db.insert(agentMetrics)
    .values({
      agentId,
      totalTasks: Number(s.total),
      successfulTasks: Number(s.success),
      failedTasks: Number(s.failed),
      qaRejections: Number(s.rejected),
      totalTokensIn: Number(s.tokensIn) || 0,
      totalTokensOut: Number(s.tokensOut) || 0,
      avgExecutionTimeMs: Number(s.avgTime) || 0,
      successRate,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: agentMetrics.agentId,
      set: {
        totalTasks: Number(s.total),
        successfulTasks: Number(s.success),
        failedTasks: Number(s.failed),
        qaRejections: Number(s.rejected),
        totalTokensIn: Number(s.tokensIn) || 0,
        totalTokensOut: Number(s.tokensOut) || 0,
        avgExecutionTimeMs: Number(s.avgTime) || 0,
        successRate,
        updatedAt: new Date(),
      }
    });
}
