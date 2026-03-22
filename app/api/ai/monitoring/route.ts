export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAgentExecutionStats, getRecentExecutions } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';

/**
 * GET /api/ai/monitoring
 *
 * Query params:
 *   - timeframe: '1h' | '24h' | '7d' | '30d' (default: '24h')
 *   - agentId: filter by agent (optional)
 *   - limit: number of recent executions to return (default: 10)
 */
export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`ai-monitoring:${ip}`, 'default');
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Rate limited' }, { status: 429 });
  }

  const url = new URL(request.url);
  const timeframe = url.searchParams.get('timeframe') || '24h';
  const agentId = url.searchParams.get('agentId') || undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);

  const timeframeMap: Record<string, number> = {
    '1h': 3_600_000,
    '24h': 86_400_000,
    '7d': 7 * 86_400_000,
    '30d': 30 * 86_400_000,
  };

  const timeframeMs = timeframeMap[timeframe] || timeframeMap['24h'];

  const stats = getAgentExecutionStats(agentId, timeframeMs);
  const recent = getRecentExecutions(limit);

  // Aggregated summary
  const totalExecs = stats.reduce((s, a) => s + a.totalExecutions, 0);
  const totalSuccess = stats.reduce((s, a) => s + a.successCount, 0);
  const totalFail = stats.reduce((s, a) => s + a.failCount, 0);
  const globalSuccessRate = totalExecs > 0 ? Math.round((totalSuccess / totalExecs) * 100) : 0;
  const avgDuration = totalExecs > 0
    ? Math.round(stats.reduce((s, a) => s + a.avgDurationMs * a.totalExecutions, 0) / totalExecs)
    : 0;
  const totalTokens = stats.reduce((s, a) => s + a.totalTokenInput + a.totalTokenOutput, 0);

  // Most active agent
  const mostActive = stats.length > 0
    ? stats.reduce((prev, curr) => curr.totalExecutions > prev.totalExecutions ? curr : prev)
    : null;

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalExecutions: totalExecs,
        successRate: globalSuccessRate,
        avgDurationMs: avgDuration,
        totalTokens,
        mostActiveAgent: mostActive?.agentId ?? null,
        totalFailed: totalFail,
        timeframe,
      },
      byAgent: stats,
      recent,
    },
  });
}
