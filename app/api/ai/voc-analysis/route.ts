export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Voice-of-Customer (VoC) Analyzer
 *
 * POST /api/ai/voc-analysis — Run VoC analysis (aggregate NPS, testimonials, feedback)
 * GET  /api/ai/voc-analysis — Get latest VoC reports
 */

// ─── POST: Run analysis ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period } = body as { period?: string };

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureVocTables(rawDb);
    const now = Date.now();
    const periodLabel = period || new Date().toISOString().slice(0, 7);

    // ── Aggregate customer feedback data ─────────────────────────────

    // 1. NPS / Followup feedback
    const npsData = safeQuery(rawDb, `
      SELECT type, status, notes, created_at FROM followups
      WHERE type IN ('NPS', 'Feedback', 'Check-in') AND notes IS NOT NULL AND notes != ''
      ORDER BY created_at DESC LIMIT 50
    `);

    // 2. Testimonials
    const testimonials = safeQuery(rawDb, `
      SELECT client_name, company, rating, text, source, created_at FROM testimonials
      WHERE text IS NOT NULL AND text != ''
      ORDER BY created_at DESC LIMIT 30
    `);

    // 3. Support bot conversations (if available)
    const supportMessages = safeQuery(rawDb, `
      SELECT content, direction, sender_name, created_at FROM conversation_messages
      WHERE direction = 'inbound'
      ORDER BY created_at DESC LIMIT 50
    `);

    // 4. Business insights (existing sentiment data)
    const recentInsights = safeQuery(rawDb, `
      SELECT type, title, content, severity FROM business_insights
      WHERE type IN ('client', 'risk', 'satisfaction')
      ORDER BY created_at DESC LIMIT 20
    `);

    const totalFeedback = npsData.length + testimonials.length + supportMessages.length;

    if (totalFeedback === 0) {
      return NextResponse.json({
        success: true,
        message: 'No customer feedback data available for analysis',
        data: { totalFeedback: 0 },
      });
    }

    // ── Calculate basic metrics ──────────────────────────────────────

    const ratings = testimonials
      .map(t => (t as Record<string, unknown>).rating as number)
      .filter(r => r > 0);
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
      : 0;

    const npsScores = npsData
      .map(n => {
        const notes = String((n as Record<string, unknown>).notes || '');
        const match = notes.match(/(\d+)\/10/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((s): s is number => s !== null);

    const npsScore = npsScores.length > 0
      ? calculateNps(npsScores)
      : null;

    // ── Kimi deep analysis ───────────────────────────────────────────

    let aiAnalysis: VocAnalysis | null = null;

    try {
      const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
      if (!kimiKey) throw new Error('No Kimi key');

      const feedbackSummary = [
        `=== TESTIMONIALS (${testimonials.length}) ===`,
        ...testimonials.slice(0, 15).map(t => {
          const tt = t as Record<string, unknown>;
          return `[${tt.rating}/5] ${tt.client_name} (${tt.company}): "${String(tt.text).slice(0, 200)}"`;
        }),
        `\n=== NPS FEEDBACK (${npsData.length}) ===`,
        ...npsData.slice(0, 15).map(n => {
          const nn = n as Record<string, unknown>;
          return `[${nn.type}] ${String(nn.notes).slice(0, 200)}`;
        }),
        `\n=== SUPPORT MESSAGES (${supportMessages.length}) ===`,
        ...supportMessages.slice(0, 10).map(m => {
          const mm = m as Record<string, unknown>;
          return `${mm.sender_name}: "${String(mm.content).slice(0, 200)}"`;
        }),
      ].join('\n');

      const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kimiKey}` },
        body: JSON.stringify({
          model: 'kimi-k2.5',
          messages: [
            {
              role: 'system',
              content: `You are a Voice-of-Customer analyst for a digital agency. Analyze all customer feedback and return JSON:
{
  "overallSentiment": "positive|neutral|negative",
  "sentimentScore": number (0-100),
  "themes": [{"name":"theme","count":number,"sentiment":"positive|neutral|negative","examples":["quote1"]}],
  "painPoints": [{"issue":"description","frequency":"high|medium|low","impact":"high|medium|low"}],
  "satisfactionDrivers": [{"driver":"description","frequency":"high|medium|low"}],
  "recommendations": [{"action":"description","priority":"high|medium|low","impact":"description"}],
  "executiveSummary": "3-4 sentences in French summarizing the VoC findings"
}
Return max 5 items per array. French language for summary and descriptions.`,
            },
            { role: 'user', content: feedbackSummary },
          ],
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || '';
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        aiAnalysis = JSON.parse(cleaned);
      }
    } catch (_) { /* fallback below */ }

    // Fallback analysis
    if (!aiAnalysis) {
      aiAnalysis = {
        overallSentiment: avgRating >= 4 ? 'positive' : avgRating >= 3 ? 'neutral' : 'negative',
        sentimentScore: Math.round(avgRating * 20),
        themes: [],
        painPoints: [],
        satisfactionDrivers: [],
        recommendations: [
          { action: 'Collecter plus de feedbacks pour une analyse approfondie', priority: 'high' as const, impact: 'Meilleure visibilite sur la satisfaction client' },
        ],
        executiveSummary: `Analyse basee sur ${totalFeedback} retours clients. Note moyenne: ${avgRating}/5.${npsScore !== null ? ` NPS: ${npsScore}.` : ''} Donnees insuffisantes pour une analyse thematique complete.`,
      };
    }

    // Save report
    const reportId = `voc_${now}_${Math.random().toString(36).substr(2, 9)}`;
    rawDb.prepare(`
      INSERT INTO voc_reports (id, period, total_feedback, avg_rating, nps_score, sentiment_score,
        overall_sentiment, themes_json, pain_points_json, drivers_json, recommendations_json,
        executive_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId, periodLabel, totalFeedback, avgRating, npsScore,
      aiAnalysis.sentimentScore, aiAnalysis.overallSentiment,
      JSON.stringify(aiAnalysis.themes), JSON.stringify(aiAnalysis.painPoints),
      JSON.stringify(aiAnalysis.satisfactionDrivers), JSON.stringify(aiAnalysis.recommendations),
      aiAnalysis.executiveSummary, now,
    );

    // Also save to business_insights for dashboard visibility
    try {
      rawDb.prepare(`
        INSERT INTO business_insights (id, type, title, content, severity, created_at)
        VALUES (?, 'satisfaction', ?, ?, ?, ?)
      `).run(
        `bi_voc_${now}`, `VoC Report — ${periodLabel}`,
        aiAnalysis.executiveSummary,
        aiAnalysis.overallSentiment === 'negative' ? 'high' : 'medium',
        now,
      );
    } catch (_) { /* business_insights optional */ }

    logger.info('voc-analysis', 'Report generated', { reportId, totalFeedback, sentiment: aiAnalysis.overallSentiment });

    return NextResponse.json({
      success: true,
      data: {
        reportId,
        period: periodLabel,
        totalFeedback,
        avgRating,
        npsScore,
        analysis: aiAnalysis,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: List reports ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureVocTables(rawDb);

  const id = request.nextUrl.searchParams.get('id');
  const latest = request.nextUrl.searchParams.get('latest') === 'true';

  if (id) {
    const report = rawDb.prepare('SELECT * FROM voc_reports WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Parse JSON fields
    return NextResponse.json({
      success: true,
      data: {
        ...report,
        themes: safeJsonParse(report.themes_json as string),
        painPoints: safeJsonParse(report.pain_points_json as string),
        satisfactionDrivers: safeJsonParse(report.drivers_json as string),
        recommendations: safeJsonParse(report.recommendations_json as string),
      },
    });
  }

  if (latest) {
    const report = rawDb.prepare('SELECT * FROM voc_reports ORDER BY created_at DESC LIMIT 1').get() as Record<string, unknown> | undefined;
    if (!report) return NextResponse.json({ success: true, data: null });

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        themes: safeJsonParse(report.themes_json as string),
        painPoints: safeJsonParse(report.pain_points_json as string),
        satisfactionDrivers: safeJsonParse(report.drivers_json as string),
        recommendations: safeJsonParse(report.recommendations_json as string),
      },
    });
  }

  // List all reports (summary only)
  const reports = rawDb.prepare(`
    SELECT id, period, total_feedback, avg_rating, nps_score, sentiment_score,
           overall_sentiment, executive_summary, created_at
    FROM voc_reports ORDER BY created_at DESC
  `).all();

  return NextResponse.json({ success: true, data: reports });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calculateNps(scores: number[]): number {
  const promoters = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

function safeJsonParse(json: string): unknown {
  try { return JSON.parse(json); } catch { return []; }
}

function safeQuery(rawDb: import('better-sqlite3').Database, sql: string): unknown[] {
  try { return rawDb.prepare(sql).all(); } catch { return []; }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface VocAnalysis {
  overallSentiment: string;
  sentimentScore: number;
  themes: { name: string; count: number; sentiment: string; examples: string[] }[];
  painPoints: { issue: string; frequency: string; impact: string }[];
  satisfactionDrivers: { driver: string; frequency: string }[];
  recommendations: { action: string; priority: 'high' | 'medium' | 'low'; impact: string }[];
  executiveSummary: string;
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _vocTablesCreated = false;
function ensureVocTables(rawDb: import('better-sqlite3').Database) {
  if (_vocTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS voc_reports (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL,
      total_feedback INTEGER DEFAULT 0,
      avg_rating REAL DEFAULT 0,
      nps_score INTEGER,
      sentiment_score INTEGER DEFAULT 0,
      overall_sentiment TEXT DEFAULT 'neutral',
      themes_json TEXT,
      pain_points_json TEXT,
      drivers_json TEXT,
      recommendations_json TEXT,
      executive_summary TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_voc_period ON voc_reports(period);
    CREATE INDEX IF NOT EXISTS idx_voc_date ON voc_reports(created_at DESC);
  `);
  _vocTablesCreated = true;
}
