export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * AltCtrl SEO Pilot — Automated SEO monitoring product for clients.
 *
 * Features:
 * - Daily Lighthouse-style audits stored in history
 * - Score trends over time (regression detection)
 * - Monthly PDF reports auto-generated
 * - Alerts on score drops
 *
 * Pricing: 299€/audit or 99€/mois
 *
 * POST /api/products/seo-pilot — Run audit or manage config
 * GET /api/products/seo-pilot — Get client dashboard data
 */

// ─── GET: Client dashboard ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const action = request.nextUrl.searchParams.get('action');

  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
  }

  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureTables(rawDb);

  if (action === 'history') {
    // Score history for charts
    const history = rawDb.prepare(`
      SELECT score_overall, score_performance, score_seo, score_accessibility, score_security, created_at
      FROM seo_pilot_audits
      WHERE client_id = ? ORDER BY created_at DESC LIMIT 90
    `).all(clientId);

    return NextResponse.json({ success: true, data: history });
  }

  if (action === 'report') {
    // Latest monthly report
    const report = rawDb.prepare(`
      SELECT * FROM seo_pilot_reports WHERE client_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(clientId);

    return NextResponse.json({ success: true, data: report || null });
  }

  // Default: latest audit + config
  const config = rawDb.prepare(
    'SELECT * FROM seo_pilot_configs WHERE client_id = ?',
  ).get(clientId) as SeoConfig | undefined;

  const latestAudit = rawDb.prepare(
    'SELECT * FROM seo_pilot_audits WHERE client_id = ? ORDER BY created_at DESC LIMIT 1',
  ).get(clientId);

  const auditCount = rawDb.prepare(
    'SELECT COUNT(*) as cnt FROM seo_pilot_audits WHERE client_id = ?',
  ).get(clientId) as { cnt: number };

  return NextResponse.json({
    success: true,
    data: { config: config || null, latestAudit, totalAudits: auditCount.cnt },
  });
}

// ─── POST: Run audit or manage ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, clientId } = body as { action: string; clientId: string };

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureTables(rawDb);
    const now = Date.now();

    // ─── Create/update config ─────────────────────────────────────────
    if (action === 'configure') {
      const { url, alertThreshold, alertEmail, monitoringEnabled } = body as {
        url: string;
        alertThreshold?: number;
        alertEmail?: string;
        monitoringEnabled?: boolean;
      };

      if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

      const id = `seocfg_${now}_${Math.random().toString(36).substr(2, 6)}`;
      rawDb.prepare(`
        INSERT OR REPLACE INTO seo_pilot_configs (id, client_id, url, alert_threshold, alert_email, monitoring_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, clientId, url, alertThreshold || 70, alertEmail || null, monitoringEnabled !== false ? 1 : 0, now, now);

      return NextResponse.json({ success: true, configId: id });
    }

    // ─── Run audit ────────────────────────────────────────────────────
    if (action === 'audit') {
      const config = rawDb.prepare(
        'SELECT * FROM seo_pilot_configs WHERE client_id = ?',
      ).get(clientId) as SeoConfig | undefined;

      if (!config) {
        return NextResponse.json({ error: 'Configure the client first' }, { status: 400 });
      }

      // Call our own SEO audit API
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
        || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000');

      const auditRes = await fetch(`${baseUrl}/api/ai/seo-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: config.url, deep: false }),
      });

      if (!auditRes.ok) {
        return NextResponse.json({ error: 'Audit failed' }, { status: 500 });
      }

      const auditData = await auditRes.json();
      if (!auditData.success) {
        return NextResponse.json({ error: 'Audit returned error' }, { status: 500 });
      }

      const audit = auditData.data;

      // Save audit
      const auditId = `seoaudit_${now}_${Math.random().toString(36).substr(2, 6)}`;
      rawDb.prepare(`
        INSERT INTO seo_pilot_audits (id, client_id, url, score_overall, score_performance, score_seo, score_accessibility, score_security, issues_json, recommendations_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId, clientId, config.url,
        audit.score,
        audit.performance?.score || 0,
        audit.seo?.score || 0,
        audit.accessibility?.score || 0,
        audit.security?.score || 0,
        JSON.stringify({ performance: audit.performance?.issues, seo: audit.seo?.issues, accessibility: audit.accessibility?.issues, security: audit.security?.issues }),
        JSON.stringify(audit.recommendations || []),
        now,
      );

      // Check for regression alert
      const previousAudit = rawDb.prepare(
        'SELECT score_overall FROM seo_pilot_audits WHERE client_id = ? AND id != ? ORDER BY created_at DESC LIMIT 1',
      ).get(clientId, auditId) as { score_overall: number } | undefined;

      let alert: string | null = null;
      if (previousAudit && audit.score < previousAudit.score_overall - 5) {
        alert = `Score drop: ${previousAudit.score_overall} → ${audit.score} (-${previousAudit.score_overall - audit.score} points)`;
      }
      if (audit.score < (config.alert_threshold || 70)) {
        alert = (alert || '') + ` Score below threshold (${config.alert_threshold || 70})`;
      }

      logger.info('seo-pilot', 'Audit completed', { clientId, score: audit.score, alert });

      return NextResponse.json({
        success: true,
        data: { auditId, score: audit.score, alert, audit },
      });
    }

    // ─── Generate monthly report ──────────────────────────────────────
    if (action === 'report') {
      const config = rawDb.prepare(
        'SELECT * FROM seo_pilot_configs WHERE client_id = ?',
      ).get(clientId) as SeoConfig | undefined;

      if (!config) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

      // Get last 30 days of audits
      const thirtyDaysAgo = now - 30 * 86_400_000;
      const audits = rawDb.prepare(`
        SELECT score_overall, score_performance, score_seo, score_accessibility, score_security, recommendations_json, created_at
        FROM seo_pilot_audits WHERE client_id = ? AND created_at > ? ORDER BY created_at ASC
      `).all(clientId, thirtyDaysAgo) as Array<{
        score_overall: number;
        score_performance: number;
        score_seo: number;
        score_accessibility: number;
        score_security: number;
        recommendations_json: string;
        created_at: number;
      }>;

      if (audits.length === 0) {
        return NextResponse.json({ error: 'No audits found in last 30 days' }, { status: 404 });
      }

      // Calculate trends
      const firstScore = audits[0].score_overall;
      const lastScore = audits[audits.length - 1].score_overall;
      const avgScore = Math.round(audits.reduce((s, a) => s + a.score_overall, 0) / audits.length);
      const trend = lastScore - firstScore;

      // Generate report content via Kimi
      const reportContent = await generateReport(config.url, audits, trend, avgScore);

      // Save report
      const reportId = `seoreport_${now}_${Math.random().toString(36).substr(2, 6)}`;
      rawDb.prepare(`
        INSERT INTO seo_pilot_reports (id, client_id, period, html_content, avg_score, trend, audit_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reportId, clientId,
        new Date().toISOString().slice(0, 7), // YYYY-MM
        reportContent,
        avgScore, trend, audits.length, now,
      );

      return NextResponse.json({
        success: true,
        data: { reportId, period: new Date().toISOString().slice(0, 7), avgScore, trend, auditCount: audits.length },
      });
    }

    // ─── Cron: batch audit all clients ────────────────────────────────
    if (action === 'cron_batch') {
      const auth = request.headers.get('authorization');
      if (auth !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const configs = rawDb.prepare(
        'SELECT client_id FROM seo_pilot_configs WHERE monitoring_enabled = 1',
      ).all() as Array<{ client_id: string }>;

      const results = { audited: 0, errors: 0 };

      for (const cfg of configs) {
        try {
          // Self-call audit for each client
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
            || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000');

          const res = await fetch(`${baseUrl}/api/products/seo-pilot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'audit', clientId: cfg.client_id }),
          });

          if (res.ok) results.audited++;
          else results.errors++;
        } catch {
          results.errors++;
        }
      }

      return NextResponse.json({ success: true, data: results });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('seo-pilot', 'Failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoConfig {
  id: string;
  client_id: string;
  url: string;
  alert_threshold: number;
  alert_email: string | null;
  monitoring_enabled: number;
}

// ─── DB setup ─────────────────────────────────────────────────────────────────

function ensureTables(rawDb: import('better-sqlite3').Database) {
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS seo_pilot_configs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      alert_threshold INTEGER NOT NULL DEFAULT 70,
      alert_email TEXT,
      monitoring_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seo_pilot_audits (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      url TEXT NOT NULL,
      score_overall INTEGER NOT NULL,
      score_performance INTEGER NOT NULL,
      score_seo INTEGER NOT NULL,
      score_accessibility INTEGER NOT NULL,
      score_security INTEGER NOT NULL,
      issues_json TEXT,
      recommendations_json TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_spa_client ON seo_pilot_audits(client_id);
    CREATE INDEX IF NOT EXISTS idx_spa_created ON seo_pilot_audits(created_at DESC);

    CREATE TABLE IF NOT EXISTS seo_pilot_reports (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      period TEXT NOT NULL,
      html_content TEXT,
      avg_score INTEGER,
      trend INTEGER,
      audit_count INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_spr_client ON seo_pilot_reports(client_id);
  `);
}

// ─── Report generation ────────────────────────────────────────────────────────

async function generateReport(
  url: string,
  audits: Array<{ score_overall: number; score_performance: number; score_seo: number; score_accessibility: number; score_security: number; recommendations_json: string; created_at: number }>,
  trend: number,
  avgScore: number,
): Promise<string> {
  const latestRecommendations = (() => {
    try { return JSON.parse(audits[audits.length - 1].recommendations_json); } catch { return []; }
  })();

  const trendEmoji = trend > 0 ? 'en hausse' : trend < 0 ? 'en baisse' : 'stable';

  // Try Kimi
  if (KIMI_API_KEY) {
    try {
      const prompt = `Génère un rapport SEO mensuel HTML professionnel pour un client.

URL: ${url}
Période: ${new Date().toISOString().slice(0, 7)}
Nombre d'audits: ${audits.length}
Score moyen: ${avgScore}/100
Tendance: ${trendEmoji} (${trend > 0 ? '+' : ''}${trend} points)

Scores dernière mesure:
- Performance: ${audits[audits.length - 1].score_performance}/100
- SEO: ${audits[audits.length - 1].score_seo}/100
- Accessibilité: ${audits[audits.length - 1].score_accessibility}/100
- Sécurité: ${audits[audits.length - 1].score_security}/100

Recommandations prioritaires:
${(latestRecommendations as string[]).slice(0, 5).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

Génère un rapport HTML (pas de balise html/head/body, juste le contenu) avec :
- Titre et date
- Résumé exécutif (3 lignes)
- Tableau des scores par catégorie
- Section tendances
- Top 5 recommandations
- Signature "Rapport généré par AltCtrl SEO Pilot"

Style professionnel, tailwind classes pour le styling.`;

      const res = await fetch(KIMI_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
        body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.3 }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      }
    } catch { /* fallback */ }
  }

  // Fallback template
  return `<div style="font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 24px;">
<h1 style="color: #6366f1;">Rapport SEO Mensuel</h1>
<p><strong>Site:</strong> ${url} | <strong>Période:</strong> ${new Date().toISOString().slice(0, 7)}</p>
<h2>Score Global: ${avgScore}/100 (${trendEmoji}, ${trend > 0 ? '+' : ''}${trend} pts)</h2>
<table style="width: 100%; border-collapse: collapse;">
<tr><th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Catégorie</th><th style="padding: 8px; border-bottom: 1px solid #ddd;">Score</th></tr>
<tr><td style="padding: 8px;">Performance</td><td style="padding: 8px; text-align: center;">${audits[audits.length - 1].score_performance}/100</td></tr>
<tr><td style="padding: 8px;">SEO</td><td style="padding: 8px; text-align: center;">${audits[audits.length - 1].score_seo}/100</td></tr>
<tr><td style="padding: 8px;">Accessibilité</td><td style="padding: 8px; text-align: center;">${audits[audits.length - 1].score_accessibility}/100</td></tr>
<tr><td style="padding: 8px;">Sécurité</td><td style="padding: 8px; text-align: center;">${audits[audits.length - 1].score_security}/100</td></tr>
</table>
<h3>Recommandations prioritaires</h3>
<ol>${(latestRecommendations as string[]).slice(0, 5).map((r: string) => `<li>${r}</li>`).join('')}</ol>
<hr><p style="color: #666; font-size: 12px;">Rapport généré par AltCtrl SEO Pilot — ${new Date().toLocaleDateString('fr-FR')}</p>
</div>`;
}
