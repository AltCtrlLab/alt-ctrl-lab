import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    // Fetch from n8n API
    let n8nData: any[] = [];
    if (N8N_API_KEY) {
      try {
        const res = await fetch(`${N8N_BASE_URL}/api/v1/executions?limit=50`, {
          headers: { 'X-N8N-API-KEY': N8N_API_KEY },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const json = await res.json();
          n8nData = json.data ?? [];
        }
      } catch (_) {
        // n8n not reachable — fall through to local data
      }
    }

    // Always also return local automation records
    const db = getDb();
    const rawDb = (db as any).$client;
    const localAutomations = rawDb.prepare(
      "SELECT id, name, status, n8n_workflow_id, last_run_at, run_count, error_count FROM automations WHERE n8n_workflow_id IS NOT NULL ORDER BY last_run_at DESC"
    ).all();

    // If we have n8n data, merge it
    if (n8nData.length > 0) {
      // Group by workflowId
      const byWorkflow: Record<string, any[]> = {};
      for (const exec of n8nData) {
        const wid = exec.workflowId ?? exec.workflow?.id;
        if (!wid) continue;
        if (!byWorkflow[wid]) byWorkflow[wid] = [];
        byWorkflow[wid].push(exec);
      }

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      const enriched = localAutomations.map((auto: any) => {
        const execs = byWorkflow[auto.n8n_workflow_id] ?? [];
        const lastExec = execs[0] ?? null;
        const last7d = execs.filter((e: any) => new Date(e.startedAt ?? e.stoppedAt ?? 0).getTime() > sevenDaysAgo).length;
        return {
          ...auto,
          lastExec: lastExec ? {
            status: lastExec.status,
            startedAt: lastExec.startedAt,
            stoppedAt: lastExec.stoppedAt,
            duration: lastExec.stoppedAt && lastExec.startedAt
              ? new Date(lastExec.stoppedAt).getTime() - new Date(lastExec.startedAt).getTime()
              : null,
          } : null,
          runsLast7d: last7d,
        };
      });

      return NextResponse.json({ success: true, data: { automations: enriched, source: 'n8n' } });
    }

    // Return local data only
    return NextResponse.json({
      success: true,
      data: {
        automations: localAutomations.map((a: any) => ({ ...a, lastExec: null, runsLast7d: 0 })),
        source: 'local',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
