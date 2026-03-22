export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyWebhookAuth } from '@/lib/webhook-auth';
import { validateBody, n8nExecReportSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(`webhook:n8n-exec:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const rawBody = await request.text();
    if (!verifyWebhookAuth(request, 'n8n', rawBody)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const v = validateBody(body, n8nExecReportSchema);
    if (!v.success) return v.response;

    const db = getDb();
    const rawDb = (db as Record<string, unknown>).$client as {
      prepare: (sql: string) => {
        get: (...args: unknown[]) => Record<string, unknown> | undefined;
        run: (...args: unknown[]) => void;
      };
    };
    const now = Date.now();
    const execAt = body.executedAt ? new Date(body.executedAt).getTime() : now;

    // Find automation by n8n_workflow_id
    const existing = rawDb.prepare('SELECT id, run_count, error_count FROM automations WHERE n8n_workflow_id = ?').get(v.data.workflowId);

    if (existing) {
      const newRunCount = ((existing.run_count as number) ?? 0) + 1;
      const newErrorCount = ((existing.error_count as number) ?? 0) + (v.data.status === 'error' ? 1 : 0);
      const newStatus = v.data.status === 'error' ? 'Erreur' : 'Actif';
      rawDb.prepare(`
        UPDATE automations SET last_run_at = ?, run_count = ?, error_count = ?, status = ?, updated_at = ? WHERE id = ?
      `).run(execAt, newRunCount, newErrorCount, newStatus, now, existing.id);
    } else if (body.workflowName) {
      // Create the automation entry if not exists
      const id = `auto_n8n_${v.data.workflowId}`;
      rawDb.prepare(`
        INSERT OR IGNORE INTO automations (id, name, tool, status, n8n_workflow_id, run_count, error_count, last_run_at, created_at, updated_at)
        VALUES (?, ?, 'n8n', ?, ?, 1, ?, ?, ?, ?)
      `).run(id, body.workflowName, v.data.status === 'error' ? 'Erreur' : 'Actif', v.data.workflowId, v.data.status === 'error' ? 1 : 0, execAt, now, now);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
