export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, workflowName, status, duration, executedAt } = body;
    if (!workflowId) return NextResponse.json({ success: false, error: 'workflowId requis' }, { status: 400 });

    const db = getDb();
    const rawDb = (db as any).$client;
    const now = Date.now();
    const execAt = executedAt ? new Date(executedAt).getTime() : now;

    // Find automation by n8n_workflow_id
    const existing = rawDb.prepare('SELECT id, run_count, error_count FROM automations WHERE n8n_workflow_id = ?').get(workflowId);

    if (existing) {
      const newRunCount = (existing.run_count ?? 0) + 1;
      const newErrorCount = (existing.error_count ?? 0) + (status === 'error' ? 1 : 0);
      const newStatus = status === 'error' ? 'Erreur' : 'Actif';
      rawDb.prepare(`
        UPDATE automations SET last_run_at = ?, run_count = ?, error_count = ?, status = ?, updated_at = ? WHERE id = ?
      `).run(execAt, newRunCount, newErrorCount, newStatus, now, existing.id);
    } else if (workflowName) {
      // Create the automation entry if not exists
      const id = `auto_n8n_${workflowId}`;
      rawDb.prepare(`
        INSERT OR IGNORE INTO automations (id, name, tool, status, n8n_workflow_id, run_count, error_count, last_run_at, created_at, updated_at)
        VALUES (?, ?, 'n8n', ?, ?, 1, ?, ?, ?, ?)
      `).run(id, workflowName, status === 'error' ? 'Erreur' : 'Actif', workflowId, status === 'error' ? 1 : 0, execAt, now, now);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
