export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { discoveries, innovations, detectedPatterns } from '@/lib/db/schema_rd';
import { sql } from 'drizzle-orm';

const VPS_BASE_URL = process.env.VPS_BASE_URL || '';
const DASH_KEY = process.env.CRON_SECRET || 'altctrl-cron-secret';

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

  // Émet un step structuré (remplace les logs texte bruts)
  const step = (id: string, label: string, status: 'running' | 'done' | 'warn' | 'error', detail = '') =>
    emit('step', { id, label, status, detail, ts: Date.now() });

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
      await emit('start', { action });

      // ─── Scout ─────────────────────────────────────────────────────
      if (action === 'scout' || action === 'pipeline') {
        await step('scout', 'Scout', 'running', 'Scraping ProductHunt, GitHub, HackerNews...');
        try {
          if (VPS_BASE_URL) {
            const res = await proxyToVPS('scout');
            const count = res.data?.discoveriesCreated ?? 0;
            await step('scout', 'Scout', res.success ? 'done' : 'warn', res.success ? `${count} nouvelles découvertes` : res.error || 'Erreur inconnue');
          } else {
            const { abdulKhabir } = await import('@/lib/ai/agents/khabir');
            const results = await abdulKhabir.scout();
            const count = results.filter((r: any) => r.success && !r.alreadyKnown).length;
            await step('scout', 'Scout', 'done', `${count} nouvelles découvertes`);
          }
        } catch (e: any) {
          await step('scout', 'Scout', 'warn', `Indisponible : ${e.message}`);
        }
      }

      // ─── Élever ────────────────────────────────────────────────────
      if (action === 'elevate' || action === 'pipeline') {
        await step('elevate', 'Élever', 'running', 'Analyse IA des découvertes en attente...');
        try {
          if (VPS_BASE_URL) {
            const res = await proxyToVPS('elevate');
            const count = res.data?.innovationsCreated ?? 0;
            await step('elevate', 'Élever', res.success ? 'done' : 'warn', res.success ? `${count} innovations générées` : res.error || 'Erreur');
          } else {
            const { abdulBasir } = await import('@/lib/ai/agents/basir');
            const results = await abdulBasir.processPendingDiscoveries();
            const count = results.filter((r: any) => r.success).length;
            await step('elevate', 'Élever', 'done', `${count} innovations générées`);
          }
        } catch (e: any) {
          await step('elevate', 'Élever', 'warn', `Indisponible : ${e.message}`);
        }
      }

      // ─── Analyser ──────────────────────────────────────────────────
      if (action === 'analyze' || action === 'pipeline') {
        await step('analyze', 'Analyser', 'running', 'Détection de patterns et tendances...');
        try {
          if (VPS_BASE_URL) {
            const res = await proxyToVPS('analyze');
            const d = res.data || {};
            await step('analyze', 'Analyser', res.success ? 'done' : 'warn', res.success ? `${d.patternsDetected ?? 0} patterns, ${d.trendsAnalyzed ?? 0} tendances` : res.error || 'Erreur');
          } else {
            const { fusionEngine } = await import('@/lib/ai/agents/fusion-engine');
            const result = await fusionEngine.analyze();
            await step('analyze', 'Analyser', 'done', `${result.patterns.length} patterns, ${result.trends.length} tendances`);
          }
        } catch (e: any) {
          await step('analyze', 'Analyser', 'warn', `Indisponible : ${e.message}`);
        }
      }

      // ─── Business Intel ────────────────────────────────────────────
      if (action === 'business-intel') {
        const topic = (payload?.topic as string) || 'instagram-acquisition';
        await step('business-intel', 'Intelligence Métier', 'running', `Analyse du topic "${topic}"...`);
        try {
          if (VPS_BASE_URL) {
            const res = await proxyToVPS('business-intel', { action: 'scout', topic });
            if (res.success) {
              const count = res.data?.insights?.length ?? 0;
              await step('business-intel', 'Intelligence Métier', 'done', `${count} insights générés`);

              // ← Clé : lire les insights depuis VPS et les émettre directement
              // (Railway ne peut pas lire la DB VPS, donc on envoie les données dans le stream)
              const insRes = await proxyToVPS('business-intel', { action: 'get', topic });
              const insights = insRes.data?.insights || [];
              await emit('insights', { topic, insights });
            } else {
              await step('business-intel', 'Intelligence Métier', 'warn', res.error || 'Erreur VPS');
            }
          } else {
            const { scoutBusinessIntelligence, getInsightsByTopic } = await import('@/lib/ai/agents/khabir-business');
            const result = await scoutBusinessIntelligence(topic);
            const count = result.insights?.length ?? 0;
            await step('business-intel', 'Intelligence Métier', 'done', `${count} insights générés`);
            const insights = getInsightsByTopic(topic);
            await emit('insights', { topic, insights });
          }
        } catch (e: any) {
          await step('business-intel', 'Intelligence Métier', 'warn', `Indisponible : ${e.message}`);
        }
      }

      // ─── Stats finales ─────────────────────────────────────────────
      const stats = await getStats();
      await emit('stats', stats);
      await emit('done', { action });

    } catch (err: any) {
      await emit('step', { id: 'error', label: 'Erreur', status: 'error', detail: err.message, ts: Date.now() });
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
