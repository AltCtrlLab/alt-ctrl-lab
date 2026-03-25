export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

interface RepurposeInput {
  contentId?: string;
  sourceText: string;
  sourceTitle: string;
  formats: ('linkedin' | 'twitter_thread' | 'newsletter' | 'instagram_caption' | 'carousel_brief')[];
  language: 'fr' | 'en';
}

interface RepurposedContent {
  format: string;
  title: string;
  body: string;
  hashtags?: string[];
}

/**
 * POST /api/ai/repurpose-content
 * ContentMorph v1 — Takes 1 long-form content and repurposes it into multiple formats.
 * Input: { sourceText, sourceTitle, formats[], language }
 * Output: { success, data: RepurposedContent[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RepurposeInput;
    const { sourceText, sourceTitle, formats, language } = body;

    if (!sourceText || !sourceTitle || !formats?.length) {
      return NextResponse.json({ error: 'Missing sourceText, sourceTitle, or formats' }, { status: 400 });
    }

    const results: RepurposedContent[] = [];
    const errors: string[] = [];

    // Generate each format via Kimi
    for (const format of formats) {
      try {
        const prompt = buildRepurposePrompt(sourceTitle, sourceText, format, language);
        const content = await callKimi(prompt);

        if (content) {
          results.push(content);

          // Save to content_items table if we have a DB
          try {
            const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
            const now = Date.now();
            const id = `content_${now}_${Math.random().toString(36).substr(2, 9)}`;
            const platform = FORMAT_TO_PLATFORM[format] || 'Autre';
            const type = FORMAT_TO_TYPE[format] || 'Post';

            rawDb.prepare(`
              INSERT INTO content_items (id, title, body, platform, type, status, pillar, scheduled_date, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'Brouillon', 'Thought Leadership', ?, ?, ?)
            `).run(id, content.title, content.body, platform, type, getNextScheduleDate(results.length), now, now);
          } catch {
            // Non-critical: continue even if DB insert fails
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown';
        errors.push(`${format}: ${msg}`);
      }
    }

    logger.info('repurpose', 'ContentMorph completed', { formats: formats.length, generated: results.length, errors: errors.length });

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        source: sourceTitle,
        formatsRequested: formats.length,
        formatsGenerated: results.length,
        errors,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('repurpose', 'ContentMorph failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Format mapping ───────────────────────────────────────────────────────────

const FORMAT_TO_PLATFORM: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter_thread: 'Twitter',
  newsletter: 'Newsletter',
  instagram_caption: 'Instagram',
  carousel_brief: 'Instagram',
};

const FORMAT_TO_TYPE: Record<string, string> = {
  linkedin: 'Post',
  twitter_thread: 'Thread',
  newsletter: 'Newsletter',
  instagram_caption: 'Caption',
  carousel_brief: 'Carousel',
};

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildRepurposePrompt(
  title: string,
  sourceText: string,
  format: string,
  language: string,
): string {
  const lang = language === 'fr' ? 'français' : 'anglais';
  const truncatedSource = sourceText.slice(0, 3000);

  const formatInstructions: Record<string, string> = {
    linkedin: `Post LinkedIn professionnel (150-200 mots).
- Hook accrocheur en première ligne (question ou stat choc)
- 3-4 paragraphes courts avec sauts de ligne
- Storytelling ou insight actionnable
- CTA en fin de post
- 3-5 hashtags pertinents en fin
- Utilise des émojis avec parcimonie (1-2 max)`,

    twitter_thread: `Thread Twitter/X (5-7 tweets).
- Tweet 1 = hook irrésistible (max 280 chars)
- Chaque tweet = 1 idée claire (max 280 chars)
- Dernier tweet = CTA + mention @altctrllab
- Numérote chaque tweet (1/, 2/, etc.)
- Format: un tweet par ligne, séparé par "---"`,

    newsletter: `Section newsletter (200-300 mots).
- Titre accrocheur
- Introduction de 2 lignes qui donne envie de lire
- 3-4 points clés en paragraphes courts
- CTA final vers un call ou article
- Ton personnel et expert`,

    instagram_caption: `Caption Instagram engageante (100-150 mots).
- Hook en première ligne (emoji + question ou affirmation forte)
- Corps : 2-3 paragraphes courts avec des tips
- CTA : "Enregistre ce post" ou "Partage à quelqu'un qui..."
- 15-20 hashtags pertinents après un saut de ligne
- 2-3 émojis dans le texte`,

    carousel_brief: `Brief de carousel Instagram (5-7 slides).
- Slide 1 : titre accrocheur (max 8 mots)
- Slides 2-6 : 1 idée par slide, titre + 2-3 lignes d'explication
- Dernière slide : CTA + @altctrllab
- Format JSON: { "slides": [{ "title": "...", "body": "..." }] }`,
  };

  return `Tu es un expert en content repurposing pour Alt Ctrl Lab, agence digitale premium.

CONTENU SOURCE :
Titre : ${title}
---
${truncatedSource}
---

MISSION : Transforme ce contenu en ${format.replace('_', ' ')}.

RÈGLES :
${formatInstructions[format] || 'Format libre, 150-200 mots.'}
- Langue : ${lang}
- Adapte le ton au format (LinkedIn = pro, Twitter = punchy, Instagram = engageant)
- Garde les insights clés mais reformule entièrement

Réponds en JSON strict : { "format": "${format}", "title": "...", "body": "...", "hashtags": ["..."] }`;
}

// ─── Kimi caller ──────────────────────────────────────────────────────────────

async function callKimi(prompt: string): Promise<RepurposedContent | null> {
  if (!KIMI_API_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(KIMI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      logger.warn('repurpose', 'Kimi API error', { status: res.status });
      return null;
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as RepurposedContent;
  } catch (err) {
    clearTimeout(timeout);
    logger.warn('repurpose', 'Kimi call failed', { error: err instanceof Error ? err.message : 'Unknown' });
    return null;
  }
}

// ─── Schedule helper ──────────────────────────────────────────────────────────

function getNextScheduleDate(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset + 1);
  return date.toISOString().split('T')[0];
}
