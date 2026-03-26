export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * SLA Monitor & Breach Alerts
 *
 * POST  /api/cron/sla-monitor — Run SLA check (cron, daily 7h UTC)
 * GET   /api/cron/sla-monitor — List SLA configs + breach history
 * PATCH /api/cron/sla-monitor — Create/update SLA config or acknowledge breach
 */

// ─── POST: Run SLA check ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureSlaTables(rawDb);
  const now = Date.now();

  const configs = rawDb.prepare('SELECT * FROM sla_configs WHERE enabled = 1').all() as SlaConfig[];

  if (configs.length === 0) {
    return NextResponse.json({ success: true, message: 'No SLA configs' });
  }

  const breaches: BreachResult[] = [];
  const warnings: BreachResult[] = [];

  for (const sla of configs) {
    const check = checkSla(rawDb, sla, now);

    if (check.status === 'breach') {
      breaches.push(check);
      recordBreach(rawDb, sla, check, now);
    } else if (check.status === 'warning') {
      warnings.push(check);
    }

    // Update last checked
    rawDb.prepare('UPDATE sla_configs SET last_checked = ?, updated_at = ? WHERE id = ?').run(now, now, sla.id);
  }

  // Notify on breaches
  if (breaches.length > 0) {
    try {
      const { notifySlack } = await import('@/lib/slack');
      const lines = breaches.map(b =>
        `🚨 SLA breach: ${b.configName} — ${b.metric} (${b.currentValue}/${b.threshold} ${b.unit})`
      );
      await notifySlack('sla-breach', { message: lines.join('\n'), breachCount: breaches.length });
    } catch (_) { /* slack optional */ }

    // Send email alerts for breaches with alert_email
    for (const breach of breaches) {
      const sla = configs.find(c => c.id === breach.configId);
      if (sla?.alert_email) {
        try {
          const { sendEmail } = await import('@/lib/email');
          await sendEmail(
            sla.alert_email,
            sla.client_name || 'Client',
            `[SLA Alert] ${sla.name} — Breach Detected`,
            `<h2>SLA Breach Alert</h2>
            <p><strong>${escapeHtml(sla.name)}</strong> — ${escapeHtml(breach.metric)}</p>
            <p>Current: <strong>${breach.currentValue}</strong> / Threshold: <strong>${breach.threshold} ${escapeHtml(breach.unit)}</strong></p>
            <p>${escapeHtml(breach.details)}</p>
            <p style="color:#a1a1aa;font-size:12px;">AltCtrl.Lab SLA Monitor — ${new Date().toLocaleDateString('fr-FR')}</p>`,
          );
        } catch (_) { /* email optional */ }
      }
    }
  }

  // Notify warnings at 80%
  if (warnings.length > 0) {
    try {
      const { notifySlack } = await import('@/lib/slack');
      const lines = warnings.map(w =>
        `⚠️ SLA warning: ${w.configName} — ${w.metric} approaching threshold (${w.currentValue}/${w.threshold} ${w.unit})`
      );
      await notifySlack('sla-warning', { message: lines.join('\n') });
    } catch (_) { /* slack optional */ }
  }

  logger.info('sla-monitor', `Checked ${configs.length} SLAs`, { breaches: breaches.length, warnings: warnings.length });

  return NextResponse.json({
    success: true,
    checked: configs.length,
    breaches: breaches.length,
    warnings: warnings.length,
    details: { breaches, warnings },
  });
}

// ─── GET: List configs + breaches ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureSlaTables(rawDb);

  const clientId = request.nextUrl.searchParams.get('clientId');
  const configId = request.nextUrl.searchParams.get('configId');

  // Breach history for a specific config
  if (configId) {
    const config = rawDb.prepare('SELECT * FROM sla_configs WHERE id = ?').get(configId);
    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const breachHistory = rawDb.prepare(
      'SELECT * FROM sla_breaches WHERE config_id = ? ORDER BY detected_at DESC LIMIT 50'
    ).all(configId);

    return NextResponse.json({ success: true, data: { config, breachHistory } });
  }

  // List configs with optional client filter
  let query = 'SELECT * FROM sla_configs';
  const params: unknown[] = [];

  if (clientId) {
    query += ' WHERE client_id = ?';
    params.push(clientId);
  }

  query += ' ORDER BY created_at DESC';

  const configs = rawDb.prepare(query).all(...params);

  // Recent breaches (last 30 days)
  const recentBreaches = rawDb.prepare(
    'SELECT * FROM sla_breaches WHERE detected_at > ? ORDER BY detected_at DESC LIMIT 30'
  ).all(Date.now() - 30 * 86400000);

  // Stats
  const stats = rawDb.prepare(`
    SELECT
      COUNT(*) as total_configs,
      SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as active_configs,
      (SELECT COUNT(*) FROM sla_breaches WHERE detected_at > ?) as breaches_30d,
      (SELECT COUNT(*) FROM sla_breaches WHERE acknowledged = 0) as unacknowledged
    FROM sla_configs
  `).get(Date.now() - 30 * 86400000) as Record<string, number>;

  return NextResponse.json({ success: true, data: { configs, recentBreaches, stats } });
}

// ─── PATCH: Create/update config or acknowledge breach ──────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureSlaTables(rawDb);
    const now = Date.now();

    // Create SLA config
    if (action === 'create') {
      const { name, clientId, clientName, metric, thresholdHours, warningPercent, alertEmail } = body as {
        name: string;
        clientId?: string;
        clientName?: string;
        metric: string;
        thresholdHours: number;
        warningPercent?: number;
        alertEmail?: string;
      };

      const validMetrics = ['response_time', 'delivery', 'uptime', 'resolution', 'first_response'];
      if (!name || !validMetrics.includes(metric)) {
        return NextResponse.json({ error: `Missing name or invalid metric. Valid: ${validMetrics.join(', ')}` }, { status: 400 });
      }

      const id = `sla_${now}_${Math.random().toString(36).substr(2, 9)}`;
      rawDb.prepare(`
        INSERT INTO sla_configs (id, name, client_id, client_name, metric, threshold_hours, warning_percent,
          alert_email, enabled, last_checked, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
      `).run(id, name, clientId || null, clientName || null, metric,
        thresholdHours, warningPercent || 80, alertEmail || null, now, now);

      return NextResponse.json({ success: true, id });
    }

    // Update config
    if (action === 'update') {
      const { id, name, thresholdHours, warningPercent, alertEmail, enabled } = body as {
        id: string;
        name?: string;
        thresholdHours?: number;
        warningPercent?: number;
        alertEmail?: string;
        enabled?: boolean;
      };

      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

      const fields: string[] = [];
      const values: unknown[] = [];

      if (name !== undefined) { fields.push('name = ?'); values.push(name); }
      if (thresholdHours !== undefined) { fields.push('threshold_hours = ?'); values.push(thresholdHours); }
      if (warningPercent !== undefined) { fields.push('warning_percent = ?'); values.push(warningPercent); }
      if (alertEmail !== undefined) { fields.push('alert_email = ?'); values.push(alertEmail); }
      if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }

      if (fields.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });

      fields.push('updated_at = ?');
      values.push(now, id);

      rawDb.prepare(`UPDATE sla_configs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      return NextResponse.json({ success: true });
    }

    // Acknowledge breach
    if (action === 'acknowledge') {
      const { breachId } = body as { breachId: string };
      if (!breachId) return NextResponse.json({ error: 'Missing breachId' }, { status: 400 });

      rawDb.prepare('UPDATE sla_breaches SET acknowledged = 1, acknowledged_at = ? WHERE id = ?').run(now, breachId);
      return NextResponse.json({ success: true });
    }

    // Disable SLA
    if (action === 'disable') {
      const { id } = body as { id: string };
      rawDb.prepare('UPDATE sla_configs SET enabled = 0, updated_at = ? WHERE id = ?').run(now, id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── SLA Check Logic ────────────────────────────────────────────────────────

interface BreachResult {
  configId: string;
  configName: string;
  metric: string;
  status: 'ok' | 'warning' | 'breach';
  currentValue: number;
  threshold: number;
  unit: string;
  details: string;
}

function checkSla(rawDb: import('better-sqlite3').Database, sla: SlaConfig, now: number): BreachResult {
  const thresholdMs = sla.threshold_hours * 3600000;
  const warningMs = thresholdMs * (sla.warning_percent / 100);
  const base: Omit<BreachResult, 'status' | 'currentValue' | 'details'> = {
    configId: sla.id,
    configName: sla.name,
    metric: sla.metric,
    threshold: sla.threshold_hours,
    unit: 'heures',
  };

  if (sla.metric === 'response_time') {
    // Check oldest unanswered followup for this client
    const oldest = sla.client_id
      ? rawDb.prepare(`
          SELECT MIN(created_at) as oldest FROM followups
          WHERE status = 'À faire' AND type IN ('Email', 'Check-in', 'Relance')
          AND project_id IN (SELECT id FROM projects WHERE client_id = ?)
        `).get(sla.client_id) as { oldest: number | null }
      : rawDb.prepare(`
          SELECT MIN(created_at) as oldest FROM followups
          WHERE status = 'À faire' AND type IN ('Email', 'Check-in', 'Relance')
        `).get() as { oldest: number | null };

    if (!oldest?.oldest) {
      return { ...base, status: 'ok', currentValue: 0, details: 'No pending followups' };
    }

    const waitHours = Math.round((now - oldest.oldest) / 3600000 * 10) / 10;

    if ((now - oldest.oldest) > thresholdMs) {
      return { ...base, status: 'breach', currentValue: waitHours, details: `Followup pending since ${waitHours}h (threshold: ${sla.threshold_hours}h)` };
    }
    if ((now - oldest.oldest) > warningMs) {
      return { ...base, status: 'warning', currentValue: waitHours, details: `Followup approaching SLA at ${waitHours}h` };
    }
    return { ...base, status: 'ok', currentValue: waitHours, details: 'Within SLA' };
  }

  if (sla.metric === 'delivery') {
    // Check overdue project phases
    const query = sla.client_id
      ? rawDb.prepare(`
          SELECT name, phase, updated_at FROM projects
          WHERE phase NOT IN ('Livre', 'Annule', 'Archive') AND client_id = ?
          ORDER BY updated_at ASC LIMIT 1
        `).get(sla.client_id) as Record<string, unknown> | undefined
      : rawDb.prepare(`
          SELECT name, phase, updated_at FROM projects
          WHERE phase NOT IN ('Livre', 'Annule', 'Archive')
          ORDER BY updated_at ASC LIMIT 1
        `).get() as Record<string, unknown> | undefined;

    if (!query) {
      return { ...base, status: 'ok', currentValue: 0, details: 'No active projects' };
    }

    const staleDays = Math.round((now - (query.updated_at as number)) / 86400000 * 10) / 10;
    const staleHours = staleDays * 24;

    if (staleHours > sla.threshold_hours) {
      return { ...base, status: 'breach', currentValue: Math.round(staleHours), details: `Project "${query.name}" stale for ${staleDays} days` };
    }
    if (staleHours > sla.threshold_hours * (sla.warning_percent / 100)) {
      return { ...base, status: 'warning', currentValue: Math.round(staleHours), details: `Project "${query.name}" approaching delivery SLA` };
    }
    return { ...base, status: 'ok', currentValue: Math.round(staleHours), details: 'Projects on track' };
  }

  if (sla.metric === 'resolution') {
    // Check oldest open conversation
    const oldest = rawDb.prepare(`
      SELECT MIN(created_at) as oldest FROM conversations WHERE status = 'open'
    `).get() as { oldest: number | null };

    if (!oldest?.oldest) {
      return { ...base, status: 'ok', currentValue: 0, details: 'No open conversations' };
    }

    const waitHours = Math.round((now - oldest.oldest) / 3600000 * 10) / 10;

    if ((now - oldest.oldest) > thresholdMs) {
      return { ...base, status: 'breach', currentValue: waitHours, details: `Open conversation since ${waitHours}h` };
    }
    if ((now - oldest.oldest) > warningMs) {
      return { ...base, status: 'warning', currentValue: waitHours, details: 'Conversation approaching SLA' };
    }
    return { ...base, status: 'ok', currentValue: waitHours, details: 'Within SLA' };
  }

  // Default: uptime / first_response — simplified check
  return { ...base, status: 'ok', currentValue: 0, details: `Metric "${sla.metric}" check OK` };
}

function recordBreach(rawDb: import('better-sqlite3').Database, sla: SlaConfig, breach: BreachResult, now: number): void {
  const id = `breach_${now}_${Math.random().toString(36).substr(2, 9)}`;
  rawDb.prepare(`
    INSERT INTO sla_breaches (id, config_id, metric, current_value, threshold_value, details, acknowledged, detected_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, sla.id, breach.metric, breach.currentValue, breach.threshold, breach.details, now);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface SlaConfig {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string | null;
  metric: string;
  threshold_hours: number;
  warning_percent: number;
  alert_email: string | null;
  enabled: number;
  last_checked: number;
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _slaTablesCreated = false;
function ensureSlaTables(rawDb: import('better-sqlite3').Database) {
  if (_slaTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS sla_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_id TEXT,
      client_name TEXT,
      metric TEXT NOT NULL,
      threshold_hours REAL NOT NULL,
      warning_percent INTEGER DEFAULT 80,
      alert_email TEXT,
      enabled INTEGER DEFAULT 1,
      last_checked INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sla_client ON sla_configs(client_id);
    CREATE INDEX IF NOT EXISTS idx_sla_enabled ON sla_configs(enabled);

    CREATE TABLE IF NOT EXISTS sla_breaches (
      id TEXT PRIMARY KEY,
      config_id TEXT NOT NULL,
      metric TEXT NOT NULL,
      current_value REAL NOT NULL,
      threshold_value REAL NOT NULL,
      details TEXT,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at INTEGER,
      detected_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_breach_config ON sla_breaches(config_id);
    CREATE INDEX IF NOT EXISTS idx_breach_date ON sla_breaches(detected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_breach_ack ON sla_breaches(acknowledged);
  `);
  _slaTablesCreated = true;
}
