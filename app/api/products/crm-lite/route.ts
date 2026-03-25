export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * AltCtrl CRM Lite — Simplified multi-tenant CRM for SMB clients.
 *
 * Features:
 * - Contact management (CRUD)
 * - Deal pipeline (Nouveau → Qualifié → Proposition → Signé → Perdu)
 * - Automatic email reminders via cron
 * - Activity log
 * - Dashboard KPIs
 *
 * Multi-tenant: each client has their own data isolated by tenant_id.
 * Auth: API key per tenant (x-crm-key header).
 *
 * Pricing: 200€ setup + 79€/mois
 *
 * Routes:
 * GET  ?entity=contacts|deals|activities|dashboard
 * POST body: { entity, action, data }
 */

// ─── GET: Read data ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const tenantId = authenticateTenant(request);
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized. Set x-crm-key header.' }, { status: 401 });
  }

  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureTables(rawDb);

  const entity = request.nextUrl.searchParams.get('entity') || 'dashboard';
  const id = request.nextUrl.searchParams.get('id');
  const status = request.nextUrl.searchParams.get('status');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

  if (entity === 'contacts') {
    const contacts = id
      ? rawDb.prepare('SELECT * FROM crm_contacts WHERE tenant_id = ? AND id = ?').get(tenantId, id)
      : rawDb.prepare('SELECT * FROM crm_contacts WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?').all(tenantId, limit);
    return NextResponse.json({ success: true, data: contacts });
  }

  if (entity === 'deals') {
    let deals;
    if (id) {
      deals = rawDb.prepare('SELECT * FROM crm_deals WHERE tenant_id = ? AND id = ?').get(tenantId, id);
    } else if (status) {
      deals = rawDb.prepare('SELECT * FROM crm_deals WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?').all(tenantId, status, limit);
    } else {
      deals = rawDb.prepare('SELECT * FROM crm_deals WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?').all(tenantId, limit);
    }
    return NextResponse.json({ success: true, data: deals });
  }

  if (entity === 'activities') {
    const activities = rawDb.prepare(
      'SELECT * FROM crm_activities WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?',
    ).all(tenantId, limit);
    return NextResponse.json({ success: true, data: activities });
  }

  // Dashboard KPIs
  const totalContacts = (rawDb.prepare('SELECT COUNT(*) as cnt FROM crm_contacts WHERE tenant_id = ?').get(tenantId) as { cnt: number }).cnt;
  const totalDeals = (rawDb.prepare('SELECT COUNT(*) as cnt FROM crm_deals WHERE tenant_id = ?').get(tenantId) as { cnt: number }).cnt;
  const wonDeals = (rawDb.prepare("SELECT COUNT(*) as cnt FROM crm_deals WHERE tenant_id = ? AND status = 'Signé'").get(tenantId) as { cnt: number }).cnt;
  const revenue = (rawDb.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM crm_deals WHERE tenant_id = ? AND status = 'Signé'").get(tenantId) as { total: number }).total;
  const pipelineValue = (rawDb.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM crm_deals WHERE tenant_id = ? AND status NOT IN ('Perdu', 'Signé')").get(tenantId) as { total: number }).total;

  const dealsByStatus = rawDb.prepare(
    'SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as value FROM crm_deals WHERE tenant_id = ? GROUP BY status',
  ).all(tenantId);

  return NextResponse.json({
    success: true,
    data: {
      totalContacts,
      totalDeals,
      wonDeals,
      winRate: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
      revenue,
      pipelineValue,
      dealsByStatus,
    },
  });
}

// ─── POST: Create/Update/Delete ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const tenantId = authenticateTenant(request);
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { entity, action, data } = body as { entity: string; action: string; data: Record<string, unknown> };

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureTables(rawDb);
    const now = Date.now();

    // ─── Tenant management ────────────────────────────────────────────
    if (entity === 'tenant' && action === 'setup') {
      const { name, apiKey, email } = data as { name: string; apiKey: string; email?: string };
      if (!name || !apiKey) return NextResponse.json({ error: 'Missing name or apiKey' }, { status: 400 });

      const id = `tenant_${now}_${Math.random().toString(36).substr(2, 6)}`;
      rawDb.prepare(`
        INSERT OR REPLACE INTO crm_tenants (id, name, api_key, email, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).run(id, name, apiKey, email || null, now, now);

      return NextResponse.json({ success: true, tenantId: id });
    }

    // ─── Contacts ─────────────────────────────────────────────────────
    if (entity === 'contacts') {
      if (action === 'create') {
        const { name, email, phone, company, notes } = data as {
          name: string; email?: string; phone?: string; company?: string; notes?: string;
        };
        if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

        const id = `contact_${now}_${Math.random().toString(36).substr(2, 6)}`;
        rawDb.prepare(`
          INSERT INTO crm_contacts (id, tenant_id, name, email, phone, company, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, tenantId, name, email || null, phone || null, company || null, notes || null, now, now);

        logActivity(rawDb, tenantId, 'contact_created', `Contact créé: ${name}`, id, now);
        return NextResponse.json({ success: true, id });
      }

      if (action === 'update') {
        const { id, ...updates } = data as { id: string; [key: string]: unknown };
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const fields = Object.entries(updates)
          .filter(([k]) => ['name', 'email', 'phone', 'company', 'notes'].includes(k))
          .map(([k]) => `${k} = ?`);

        if (fields.length === 0) return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });

        const values = Object.entries(updates)
          .filter(([k]) => ['name', 'email', 'phone', 'company', 'notes'].includes(k))
          .map(([, v]) => v);

        rawDb.prepare(`UPDATE crm_contacts SET ${fields.join(', ')}, updated_at = ? WHERE id = ? AND tenant_id = ?`)
          .run(...values, now, id, tenantId);

        logActivity(rawDb, tenantId, 'contact_updated', `Contact mis à jour`, id, now);
        return NextResponse.json({ success: true });
      }

      if (action === 'delete') {
        const { id } = data as { id: string };
        rawDb.prepare('DELETE FROM crm_contacts WHERE id = ? AND tenant_id = ?').run(id, tenantId);
        return NextResponse.json({ success: true });
      }
    }

    // ─── Deals ────────────────────────────────────────────────────────
    if (entity === 'deals') {
      if (action === 'create') {
        const { title, contactId, amount, status: dealStatus, notes } = data as {
          title: string; contactId?: string; amount?: number; status?: string; notes?: string;
        };
        if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

        const id = `deal_${now}_${Math.random().toString(36).substr(2, 6)}`;
        rawDb.prepare(`
          INSERT INTO crm_deals (id, tenant_id, title, contact_id, amount, status, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, tenantId, title, contactId || null, amount || 0, dealStatus || 'Nouveau', notes || null, now, now);

        logActivity(rawDb, tenantId, 'deal_created', `Deal créé: ${title} (${amount || 0}€)`, id, now);
        return NextResponse.json({ success: true, id });
      }

      if (action === 'update') {
        const { id, ...updates } = data as { id: string; [key: string]: unknown };
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const allowedFields = ['title', 'contact_id', 'amount', 'status', 'notes'];
        const fields = Object.entries(updates)
          .filter(([k]) => allowedFields.includes(k))
          .map(([k]) => `${k} = ?`);

        if (fields.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

        const values = Object.entries(updates)
          .filter(([k]) => allowedFields.includes(k))
          .map(([, v]) => v);

        rawDb.prepare(`UPDATE crm_deals SET ${fields.join(', ')}, updated_at = ? WHERE id = ? AND tenant_id = ?`)
          .run(...values, now, id, tenantId);

        // Log status change
        if (updates.status) {
          logActivity(rawDb, tenantId, 'deal_status_changed', `Deal → ${updates.status}`, id, now);
        }

        return NextResponse.json({ success: true });
      }

      if (action === 'delete') {
        const { id } = data as { id: string };
        rawDb.prepare('DELETE FROM crm_deals WHERE id = ? AND tenant_id = ?').run(id, tenantId);
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'Unknown entity/action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('crm-lite', 'POST failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function authenticateTenant(request: NextRequest): string | null {
  const apiKey = request.headers.get('x-crm-key');
  if (!apiKey) return null;

  // Special admin key bypasses tenant lookup
  const adminKey = process.env.CRON_SECRET || 'altctrl-cron-secret';
  if (apiKey === adminKey) return 'admin';

  try {
    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureTables(rawDb);

    const tenant = rawDb.prepare(
      'SELECT id FROM crm_tenants WHERE api_key = ? AND active = 1',
    ).get(apiKey) as { id: string } | undefined;

    return tenant?.id || null;
  } catch {
    return null;
  }
}

// ─── DB setup ─────────────────────────────────────────────────────────────────

let _tablesCreated = false;

function ensureTables(rawDb: import('better-sqlite3').Database) {
  if (_tablesCreated) return;

  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS crm_tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      api_key TEXT NOT NULL UNIQUE,
      email TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_contacts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_crmc_tenant ON crm_contacts(tenant_id);

    CREATE TABLE IF NOT EXISTS crm_deals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      contact_id TEXT,
      amount REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Nouveau',
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_crmd_tenant ON crm_deals(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_crmd_status ON crm_deals(status);

    CREATE TABLE IF NOT EXISTS crm_activities (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT,
      entity_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_crma_tenant ON crm_activities(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_crma_created ON crm_activities(created_at DESC);
  `);

  _tablesCreated = true;
}

// ─── Activity log ─────────────────────────────────────────────────────────────

function logActivity(rawDb: import('better-sqlite3').Database, tenantId: string, action: string, description: string, entityId: string, now: number) {
  const id = `act_${now}_${Math.random().toString(36).substr(2, 6)}`;
  rawDb.prepare('INSERT INTO crm_activities (id, tenant_id, action, description, entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, tenantId, action, description, entityId, now);
}
