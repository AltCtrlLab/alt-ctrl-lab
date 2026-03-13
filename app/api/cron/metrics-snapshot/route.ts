export const dynamic = 'force-dynamic';
// GET /api/cron/metrics-snapshot — Crée un snapshot des métriques actuelles
// Peut être appelé par un cron job ou manuellement
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { tasks, agentMetrics, agentActivities, metricsSnapshots } from '@/lib/db/schema';
import { sql, gte } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();

    // Agréger les métriques actuelles
    const taskStats = await db.select({
      total: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${tasks.status} = 'COMPLETED' then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${tasks.status} in ('FAILED', 'FAILED_QA') then 1 else 0 end)`,
    }).from(tasks);

    const tokenStats = await db.select({
      total: sql<number>`coalesce(sum(${agentMetrics.totalTokensIn}) + sum(${agentMetrics.totalTokensOut}), 0)`,
    }).from(agentMetrics);

    const since1h = new Date(Date.now() - 3600_000);
    const activeStats = await db.select({
      count: sql<number>`count(distinct ${agentActivities.agentId})`,
    }).from(agentActivities).where(gte(agentActivities.startedAt, since1h));

    const t = taskStats[0];
    const total = Number(t.total) || 0;
    const completed = Number(t.completed) || 0;
    const failed = Number(t.failed) || 0;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    await db.insert(metricsSnapshots).values({
      id: `snap_${Date.now()}`,
      totalTasks: total,
      completedTasks: completed,
      failedTasks: failed,
      totalTokens: Number(tokenStats[0]?.total) || 0,
      successRate,
      activeAgents: Number(activeStats[0]?.count) || 0,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Snapshot créé' });
  } catch (error) {
    console.error('[CRON] Erreur snapshot métriques:', error);
    return NextResponse.json({ success: false, error: 'Échec du snapshot' }, { status: 500 });
  }
}
