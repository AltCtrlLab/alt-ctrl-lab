export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Client Real-Time Alerts
 *
 * POST   /api/alerts — Create alert configuration
 * GET    /api/alerts — List alert configs + recent triggers
 * PATCH  /api/alerts — Update config, trigger check, or acknowledge
 * DELETE /api/alerts — Delete alert config
 */

// ─── POST: Create alert config ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, alertType, channel, threshold, webhookUrl, emailTo, message } = body as {
      clientId?: string;
      alertType: string;
      channel: string;
      threshold?: number;
      webhookUrl?: string;
      emailTo?: string;
      message?: string;
    };

    const validTypes = ['new_lead', 'site_down', 'kpi_reached', 'invoice_overdue', 'project_milestone', 'nps_response', 'budget_exceeded', 'custom'];
    const validChannels = ['email', 'slack', 'webhook'];

    if (!validTypes.includes(alertType)) {
      return NextResponse.json({ error: `Invalid alertType. Valid: ${validTypes.join(', ')}` }, { status: 400 });
    }
    if (!validChannels.includes(channel)) {
      return NextResponse.json({ error: `Invalid channel. Valid: ${validChannels.join(', ')}` }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureAlertTables(rawDb);
    const now = Date.now();
    const id = `alert_${now}_${Math.random().toString(36).substr(2, 9)}`;

    rawDb.prepare(`
      INSERT INTO client_alerts (id, client_id, alert_type, channel, threshold, webhook_url, email_to, custom_message, enabled, triggers_count, last_triggered, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)
    `).run(id, clientId || null, alertType, channel, threshold || 0, webhookUrl || null, emailTo || null, message || null, now, now);

    logger.info('alerts', 'Config created', { id, alertType, channel });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: List alerts ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureAlertTables(rawDb);

  const clientId = request.nextUrl.searchParams.get('clientId');
  const alertType = request.nextUrl.searchParams.get('alertType');
  const id = request.nextUrl.searchParams.get('id');

  // Single alert with trigger history
  if (id) {
    const alert = rawDb.prepare('SELECT * FROM client_alerts WHERE id = ?').get(id);
    if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const triggers = rawDb.prepare(
      'SELECT * FROM alert_triggers WHERE alert_id = ? ORDER BY triggered_at DESC LIMIT 20'
    ).all(id);

    return NextResponse.json({ success: true, data: { alert, triggers } });
  }

  // List with filters
  let query = 'SELECT * FROM client_alerts WHERE 1=1';
  const params: unknown[] = [];

  if (clientId) { query += ' AND client_id = ?'; params.push(clientId); }
  if (alertType) { query += ' AND alert_type = ?'; params.push(alertType); }

  query += ' ORDER BY created_at DESC';

  const alerts = rawDb.prepare(query).all(...params);

  // Recent triggers (last 50)
  const recentTriggers = rawDb.prepare(
    'SELECT * FROM alert_triggers ORDER BY triggered_at DESC LIMIT 50'
  ).all();

  const stats = rawDb.prepare(`
    SELECT COUNT(*) as total_configs,
           SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as active_configs,
           SUM(triggers_count) as total_triggers
    FROM client_alerts
  `).get() as Record<string, number>;

  return NextResponse.json({ success: true, data: { alerts, recentTriggers, stats } });
}

// ─── PATCH: Update, trigger, or acknowledge ─────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, data } = body as {
      id: string;
      action: string;
      data?: Record<string, unknown>;
    };

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureAlertTables(rawDb);
    const now = Date.now();

    if (action === 'enable') {
      rawDb.prepare('UPDATE client_alerts SET enabled = 1, updated_at = ? WHERE id = ?').run(now, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'disable') {
      rawDb.prepare('UPDATE client_alerts SET enabled = 0, updated_at = ? WHERE id = ?').run(now, id);
      return NextResponse.json({ success: true });
    }

    // Trigger an alert (called by other systems or crons)
    if (action === 'trigger') {
      const alert = rawDb.prepare('SELECT * FROM client_alerts WHERE id = ? AND enabled = 1').get(id) as Record<string, unknown> | undefined;
      if (!alert) return NextResponse.json({ error: 'Alert not found or disabled' }, { status: 404 });

      const triggerId = `trig_${now}_${Math.random().toString(36).substr(2, 9)}`;
      const payload = JSON.stringify(data || {});

      rawDb.prepare(`
        INSERT INTO alert_triggers (id, alert_id, payload, delivered, triggered_at)
        VALUES (?, ?, ?, 0, ?)
      `).run(triggerId, id, payload, now);

      // Deliver notification
      let delivered = false;
      const channel = alert.channel as string;
      const customMessage = (alert.custom_message as string) || `Alert triggered: ${alert.alert_type}`;

      try {
        if (channel === 'slack') {
          const { notifySlack } = await import('@/lib/slack');
          await notifySlack('client-alert', {
            alertType: alert.alert_type,
            clientId: alert.client_id,
            message: customMessage,
            data,
          });
          delivered = true;
        } else if (channel === 'email' && alert.email_to) {
          const { sendEmail } = await import('@/lib/email');
          await sendEmail(
            alert.email_to as string,
            'Client',
            `[AltCtrl] Alert: ${alert.alert_type}`,
            `<h2>Alert Triggered</h2><p>${escapeHtml(customMessage)}</p><pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`
          );
          delivered = true;
        } else if (channel === 'webhook' && alert.webhook_url) {
          const res = await fetch(alert.webhook_url as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alertType: alert.alert_type, message: customMessage, data, triggeredAt: now }),
          });
          delivered = res.ok;
        }
      } catch (err) {
        logger.error('alerts', 'Delivery failed', { alertId: id, channel, error: String(err) });
      }

      // Update delivery status
      rawDb.prepare('UPDATE alert_triggers SET delivered = ? WHERE id = ?').run(delivered ? 1 : 0, triggerId);
      rawDb.prepare('UPDATE client_alerts SET triggers_count = triggers_count + 1, last_triggered = ?, updated_at = ? WHERE id = ?').run(now, now, id);

      logger.info('alerts', 'Triggered', { alertId: id, channel, delivered });
      return NextResponse.json({ success: true, triggerId, delivered });
    }

    if (action === 'acknowledge') {
      const triggerId = data?.triggerId as string;
      if (triggerId) {
        rawDb.prepare('UPDATE alert_triggers SET acknowledged = 1 WHERE id = ?').run(triggerId);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureAlertTables(rawDb);

  rawDb.prepare('DELETE FROM alert_triggers WHERE alert_id = ?').run(id);
  rawDb.prepare('DELETE FROM client_alerts WHERE id = ?').run(id);

  return NextResponse.json({ success: true });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _alertTablesCreated = false;
function ensureAlertTables(rawDb: import('better-sqlite3').Database) {
  if (_alertTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS client_alerts (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      alert_type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'slack',
      threshold REAL DEFAULT 0,
      webhook_url TEXT,
      email_to TEXT,
      custom_message TEXT,
      enabled INTEGER DEFAULT 1,
      triggers_count INTEGER DEFAULT 0,
      last_triggered INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_alert_client ON client_alerts(client_id);
    CREATE INDEX IF NOT EXISTS idx_alert_type ON client_alerts(alert_type);
    CREATE INDEX IF NOT EXISTS idx_alert_enabled ON client_alerts(enabled);

    CREATE TABLE IF NOT EXISTS alert_triggers (
      id TEXT PRIMARY KEY,
      alert_id TEXT NOT NULL,
      payload TEXT,
      delivered INTEGER DEFAULT 0,
      acknowledged INTEGER DEFAULT 0,
      triggered_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_atrig_alert ON alert_triggers(alert_id);
    CREATE INDEX IF NOT EXISTS idx_atrig_date ON alert_triggers(triggered_at DESC);
  `);
  _alertTablesCreated = true;
}
