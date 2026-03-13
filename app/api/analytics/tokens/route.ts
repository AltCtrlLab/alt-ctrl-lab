// GET /api/analytics/tokens — Métriques tokens par agent
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { agentMetrics } from '@/lib/db/schema';

const AGENT_NAMES: Record<string, string> = {
  abdulhakim: 'Abdul Hakim (CEO)',
  musawwir: 'Al-Musawwir (DA)',
  matin: 'Al-Matin (CTO)',
  fatah: 'Al-Fatah (CMO)',
  hasib: 'Al-Hasib (CDO)',
  raqim: 'Ar-Raqim',
  banna: 'Al-Banna',
  khatib: 'Al-Khatib',
  sani: 'As-Sani',
};

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(agentMetrics);

    const agentData = rows.map(r => ({
      agentId: r.agentId,
      agentName: AGENT_NAMES[r.agentId] || r.agentId,
      tokensIn: r.totalTokensIn || 0,
      tokensOut: r.totalTokensOut || 0,
      taskCount: r.totalTasks || 0,
      successRate: r.successRate || 0,
      avgExecutionTime: r.avgExecutionTimeMs || 0,
    }));

    return NextResponse.json({
      success: true,
      data: { agentMetrics: agentData },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: { agentMetrics: [] },
    });
  }
}
