export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { discoveries, innovations, detectedPatterns } from '@/lib/db/schema_rd';
import { sql } from 'drizzle-orm';

const VPS_BASE_URL = process.env.VPS_BASE_URL || '';
const DASH_KEY = process.env.CRON_SECRET || 'altctrl-cron-secret';

type LogLevel = 'info' | 'success' | 'warn' | 'error';

export async function POST(req: NextRequest) {
  const { action, payload } = await req.json();

  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const emit = async (type: string, data: Record<string, unknown>) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
    } catch { /* writer closed */ }
  };

  const log = (message: string, level: LogLevel = 'info') =>
    emit('log', { message, level, ts: Date.now() });

  const getStats = async () => {
    try {
      const db = getDb();
      const [dc, ic, pc] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(discoveries),
        db.select({ count: sql<number>`count(*)` }).from(innovations),
        db.select({ count: sql<number>`count(*)` }).from(detectedPatterns),
      ]);
      return {
        discoveries: Number(dc[0]?.count ?? 0),
        innovations: Number(ic[0]?.count ?? 0),
        patterns: Number(pc[0]?.count ?? 0),
      };
    } catch { return { discoveries: 0, innovations: 0, patterns: 0 }; }
  };

  // Proxy une action vers le serveur VPS (qui a openclaw installé)
  const proxyToVPS = async (vpsAction: string, vpsPayload: Record<string, unknown> = {}) => {
    if (!VPS_BASE_URL) throw new Error('VPS_BASE_URL non configuré');
    const res = await fetch(`${VPS_BASE_URL}/api/rd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dashboard-key': DASH_KEY },
      body: JSON.stringify({ action: vpsAction, payload: vpsPayload }),
      signal: AbortSignal.timeout(120000),
    });
    return res.json();
  };

  (async () => {
    try {
      await log(`🚀 Démarrage : ${action}`, 'info');

      // ─── Scout ─────────────────────────────────────────────────────
      if (action === 'scout' || action === 'pipeline') {
        await log('🔍 Scout — scraping ProductHunt, GitHub, HackerNews, ArXiv...', 'info');
        try {
          if (VPS_BASE_URL) {
            await log('🔌 Connexion au pipeline VPS...', 'info');
            const res = await proxyToVPS('scout');
            if (res.success) {
              const count = res.data?.discoveriesCreated ?? 0;
              await log(`✅ Scout terminé — ${count} nouvelles découvertes`, 'success');
              await emit('result', { action: 'scout', created: count });
            } else {
              await log(`⚠️ Scout (VPS) : ${res.error || 'erreur inconnue'}`, 'warn');
            }
          } else {
            const { abdulKhabir } = await import('@/lib/ai/agents/khabir');
            const results = await abdulKhabir.scout();
            const created = results.filter(r => r.success && !r.alreadyKnown).length;
            await log(`✅ Scout terminé — ${created} nouvelles découvertes`, 'success');
            await emit('result', { action: 'scout', created });
          }
        } catch (e: any) {
          await log(`⚠️ Scout indisponible : ${e.message}`, 'warn');
        }
      }

      // ─── Élever ────────────────────────────────────────────────────
      if (action === 'elevate' || action === 'pipeline') {
        await log('⬆️ Élévation — analyse IA des découvertes en attente...', 'info');
        try {
          if (VPS_BASE_URL) {
            const res = await proxyToVPS('elevate');
            if (res.success) {
              const count = res.data?.innovationsCreated ?? 0;
              await log(`✅ Élévation terminée — ${count} innovations générées`, 'success');
              await emit('result', { action: 'elevate', created: count });
            } else {
              await log(`⚠️ Élévation (VPS) : ${res.error || 'erreur inconnue'}`, 'warn');
            }
          } else {
            const { abdulBasir } = await import('@/lib/ai/agents/basir');
            const results = await abdulBasir.processPendingDiscoveries();
            const created = results.filter(r => r.success).length;
            await log(`✅ Élévation terminée — ${created} innovations générées`, 'success');
            await emit('result', { action: 'elevate', created });
          }
        } catch (e: any) {
          await log(`⚠️ Élévation indisponible : ${e.message}`, 'warn');
        }
      }

      // ─── Analyser ──────────────────────────────────────────────────
      if (action === 'analyze' || action === 'pipeline') {
        await log('🧠 Analyse — détection de patterns et tendances...', 'info');
        try {
          if (VPS_BASE_URL) {
            const res = await proxyToVPS('analyze');
            if (res.success) {
              const d = res.data || {};
              await log(`✅ Analyse terminée — ${d.patternsDetected ?? 0} patterns, ${d.trendsAnalyzed ?? 0} tendances`, 'success');
              await emit('result', { action: 'analyze', patterns: d.patternsDetected ?? 0, trends: d.trendsAnalyzed ?? 0 });
            } else {
              await log(`⚠️ Analyse (VPS) : ${res.error || 'erreur inconnue'}`, 'warn');
            }
          } else {
            const { fusionEngine } = await import('@/lib/ai/agents/fusion-engine');
            const result = await fusionEngine.analyze();
            await log(`✅ Analyse terminée — ${result.patterns.length} patterns, ${result.trends.length} tendances`, 'success');
            await emit('result', { action: 'analyze', patterns: result.patterns.length, trends: result.trends.length });
          }
        } catch (e: any) {
          await log(`⚠️ Analyse indisponible : ${e.message}`, 'warn');
        }
      }

      // ─── Business Intel ────────────────────────────────────────────
      if (action === 'business-intel') {
        const topic = payload?.topic || 'instagram-acquisition';
        await log(`💡 Intelligence Métier — analyse du topic "${topic}"...`, 'info');
        try {
          if (VPS_BASE_URL) {
            const res = await proxyToVPS('business-intel', { action: 'scout', topic });
            if (res.success) {
              const count = res.data?.insights?.length ?? 0;
              await log(`✅ ${count} insights générés pour "${topic}"`, 'success');
              await emit('result', { action: 'business-intel', topic, count });
            } else {
              await log(`⚠️ Business Intel (VPS) : ${res.error || 'erreur'}`, 'warn');
            }
          } else {
            const { scoutBusinessIntelligence } = await import('@/lib/ai/agents/khabir-business');
            const result = await scoutBusinessIntelligence(topic);
            const count = result.insights?.length ?? 0;
            await log(`✅ ${count} insights générés pour "${topic}"`, 'success');
            await emit('result', { action: 'business-intel', topic, count });
          }
        } catch (e: any) {
          await log(`⚠️ Intelligence Métier indisponible : ${e.message}`, 'warn');
        }
      }

      // ─── Stats finales ─────────────────────────────────────────────
      const stats = await getStats();
      await emit('stats', stats);
      await emit('done', { message: 'Pipeline terminé' });

    } catch (err: any) {
      await log(`❌ Erreur critique : ${err.message}`, 'error');
      await emit('done', { error: err.message });
    } finally {
      try { writer.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
