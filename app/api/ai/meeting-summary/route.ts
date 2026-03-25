export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

interface MeetingSummary {
  title: string;
  date: string;
  duration: string;
  participants: string[];
  summary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  nextSteps: string[];
}

interface ActionItem {
  task: string;
  owner: string;
  deadline: string | null;
}

/**
 * POST /api/ai/meeting-summary
 * Takes meeting transcript (text) and generates structured summary.
 *
 * Two input modes:
 * 1. { transcript: string } — raw transcript text
 * 2. { audioUrl: string } — audio file URL (uses Whisper via OpenClaw agent)
 *
 * Optional: { projectId?: string, leadId?: string } — links to existing entities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, audioUrl, projectId, leadId, title } = body as {
      transcript?: string;
      audioUrl?: string;
      projectId?: string;
      leadId?: string;
      title?: string;
    };

    if (!transcript && !audioUrl) {
      return NextResponse.json({ error: 'Provide transcript or audioUrl' }, { status: 400 });
    }

    let text = transcript || '';

    // If audio URL provided, transcribe via OpenClaw agent
    if (audioUrl && !text) {
      logger.info('meeting-summary', 'Transcribing audio', { audioUrl });
      const transcribePrompt = `Transcris ce fichier audio en texte complet.
URL du fichier : ${audioUrl}

Utilise whisper ou un outil de transcription disponible.
Retourne UNIQUEMENT le texte transcrit, sans commentaire.`;

      const result = await executeOpenClawAgent('main', transcribePrompt, 600000);
      if (result.success && result.stdout) {
        text = result.stdout;
      } else {
        return NextResponse.json({
          success: false,
          error: 'Transcription failed. Provide transcript text instead.',
        }, { status: 422 });
      }
    }

    if (!text || text.length < 50) {
      return NextResponse.json({ error: 'Transcript too short (min 50 chars)' }, { status: 400 });
    }

    // Generate summary via Kimi (faster) or OpenClaw agent (deeper)
    const summary = await generateSummary(text, title);

    if (!summary) {
      return NextResponse.json({ success: false, error: 'Summary generation failed' }, { status: 500 });
    }

    // Save to DB
    try {
      const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
      const now = Date.now();
      const id = `meeting_${now}_${Math.random().toString(36).substr(2, 9)}`;

      rawDb.prepare(`
        INSERT INTO business_insights (id, topic, source, insight, recommendation, priority, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'medium', 'active', ?)
      `).run(
        id,
        `Meeting: ${summary.title}`,
        'meeting-summary',
        JSON.stringify(summary),
        summary.actionItems.map(a => `${a.task} (${a.owner})`).join(' | ').slice(0, 500),
        now,
      );

      // Create followups for action items with deadlines
      if (projectId || leadId) {
        for (const item of summary.actionItems) {
          if (item.deadline) {
            const followupId = `followup_${now}_${Math.random().toString(36).substr(2, 9)}`;
            const clientName = summary.participants[0] || 'Client';
            const scheduledAt = parseDeadline(item.deadline);

            rawDb.prepare(`
              INSERT OR IGNORE INTO followups (id, client_name, lead_id, project_id, type, status, notes, scheduled_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, 'Action Meeting', 'Planifié', ?, ?, ?, ?)
            `).run(
              followupId, clientName,
              leadId || null, projectId || null,
              `${item.task} — Responsable: ${item.owner}`,
              scheduledAt, now, now,
            );
          }
        }
      }
    } catch (dbErr) {
      logger.warn('meeting-summary', 'DB save failed', { error: dbErr instanceof Error ? dbErr.message : 'Unknown' });
    }

    logger.info('meeting-summary', 'Summary generated', {
      title: summary.title,
      actionItems: summary.actionItems.length,
      decisions: summary.keyDecisions.length,
    });

    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('meeting-summary', 'Failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Summary generation ──────────────────────────────────────────────────────

async function generateSummary(transcript: string, title?: string): Promise<MeetingSummary | null> {
  const truncated = transcript.slice(0, 8000);

  const prompt = `Tu es un assistant de réunion expert. Analyse cette transcription et génère un résumé structuré.

${title ? `TITRE DE LA RÉUNION : ${title}` : ''}

TRANSCRIPTION :
---
${truncated}
---

Génère un résumé en JSON strict :
{
  "title": "titre de la réunion (déduit du contenu si pas fourni)",
  "date": "date de la réunion (YYYY-MM-DD, aujourd'hui si pas mentionné)",
  "duration": "durée estimée",
  "participants": ["liste des participants mentionnés"],
  "summary": "résumé en 3-5 phrases des points principaux",
  "keyDecisions": ["liste des décisions prises"],
  "actionItems": [
    { "task": "description de la tâche", "owner": "responsable", "deadline": "date limite ou null" }
  ],
  "nextSteps": ["prochaines étapes"]
}

Règles :
- Identifie TOUTES les tâches assignées
- Si un nom est mentionné avec une tâche, c'est le owner
- Les deadlines doivent être au format YYYY-MM-DD si possibles
- Le summary doit être factuel, pas d'interprétation
- En français`;

  // Try Kimi first (faster)
  if (KIMI_API_KEY) {
    try {
      const res = await fetch(KIMI_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
        body: JSON.stringify({
          model: 'kimi-k2.5',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || '';
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned) as MeetingSummary;
      }
    } catch (err) {
      logger.warn('meeting-summary', 'Kimi failed', { error: err instanceof Error ? err.message : 'Unknown' });
    }
  }

  // Fallback: OpenClaw agent
  try {
    const result = await executeOpenClawAgent('khatib', prompt, 180000);
    if (result.success && result.stdout) {
      const cleaned = result.stdout.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned) as MeetingSummary;
    }
  } catch {
    // Both failed
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDeadline(deadline: string): number {
  try {
    const parsed = new Date(deadline);
    if (!isNaN(parsed.getTime())) return parsed.getTime();
  } catch { /* ignore */ }

  // Default: 1 week from now
  return Date.now() + 7 * 86_400_000;
}
