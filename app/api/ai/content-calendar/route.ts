export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * AI-Powered Content Calendar Generator
 *
 * POST /api/ai/content-calendar — Generate monthly content plan
 * Body: { month?, year?, industry?, themes?, platforms? }
 *
 * GET /api/ai/content-calendar — Get scheduled content items for the month
 */

interface CalendarEntry {
  day: number;
  theme: string;
  format: string;
  platform: string;
  brief: string;
  hashtags: string[];
}

// ─── POST: Generate calendar ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year, industry, themes, platforms, postsPerWeek } = body as {
      month?: number;
      year?: number;
      industry?: string;
      themes?: string[];
      platforms?: string[];
      postsPerWeek?: number;
    };

    const targetMonth = month || new Date().getMonth() + 2; // next month by default
    const targetYear = year || new Date().getFullYear();
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const targetPlatforms = platforms || ['LinkedIn', 'Instagram', 'Twitter'];
    const targetThemes = themes || ['expertise', 'behind-the-scenes', 'tips', 'case-study', 'engagement'];
    const pPerWeek = postsPerWeek || 4;
    const totalPosts = pPerWeek * 4;

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;

    // Get top-performing past content for inspiration
    const topContent = rawDb.prepare(`
      SELECT title, type, platform, tags FROM content_items
      WHERE status = 'Publié'
      ORDER BY created_at DESC LIMIT 10
    `).all() as Array<{ title: string; type: string; platform: string; tags: string }>;

    let calendar: CalendarEntry[] = [];

    if (KIMI_API_KEY) {
      try {
        const monthName = new Date(targetYear, targetMonth - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

        const prompt = `Genere un calendrier editorial pour ${monthName} pour une agence digitale premium (AltCtrl.Lab).

Contraintes :
- ${totalPosts} posts repartis sur le mois (${pPerWeek}/semaine, pas le weekend)
- Plateformes : ${targetPlatforms.join(', ')}
- Themes : ${targetThemes.join(', ')}
${industry ? `- Industrie cible : ${industry}` : ''}
- Mois de ${daysInMonth} jours

${topContent.length > 0 ? `Contenus passes populaires (pour inspiration) : ${topContent.map(c => c.title).join(', ')}` : ''}

Reponds UNIQUEMENT en JSON : un array de ${totalPosts} objets :
[{ "day": 1-${daysInMonth}, "theme": "...", "format": "post|carousel|story|article|video|poll", "platform": "...", "brief": "description en 1-2 phrases", "hashtags": ["tag1", "tag2"] }]

Assure une bonne repartition des themes et plateformes. Les jours doivent etre des jours ouvrés (lun-ven).`;

        const res = await fetch(KIMI_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
          body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.6, max_tokens: 3000 }),
          signal: AbortSignal.timeout(25000),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content || '';
          const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          calendar = JSON.parse(cleaned);
        }
      } catch (err) {
        logger.warn('content-calendar', `AI generation failed: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    // Fallback: algorithmic calendar
    if (calendar.length === 0) {
      const formats = ['post', 'carousel', 'story', 'article', 'poll'];
      let postCount = 0;
      for (let day = 1; day <= daysInMonth && postCount < totalPosts; day++) {
        const date = new Date(targetYear, targetMonth - 1, day);
        const dow = date.getDay();
        if (dow === 0 || dow === 6) continue; // skip weekends

        if (postCount < totalPosts) {
          calendar.push({
            day,
            theme: targetThemes[postCount % targetThemes.length],
            format: formats[postCount % formats.length],
            platform: targetPlatforms[postCount % targetPlatforms.length],
            brief: `Contenu ${targetThemes[postCount % targetThemes.length]} pour ${targetPlatforms[postCount % targetPlatforms.length]}`,
            hashtags: ['altctrllab', 'digital', targetThemes[postCount % targetThemes.length]],
          });
          postCount++;
        }
      }
    }

    // Optionally save to content_items
    const now = Date.now();
    let saved = 0;
    const saveToDB = (body as Record<string, unknown>).save === true;

    if (saveToDB) {
      for (const entry of calendar) {
        const id = `cal_${now}_${Math.random().toString(36).substr(2, 9)}`;
        const scheduledAt = new Date(targetYear, targetMonth - 1, entry.day, 9, 0).getTime();

        rawDb.prepare(`
          INSERT INTO content_items (id, title, type, status, platform, body, tags, scheduled_at, created_at, updated_at)
          VALUES (?, ?, ?, 'Planifié', ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          `[${entry.format.toUpperCase()}] ${entry.theme}`,
          entry.format === 'carousel' ? 'Carousel' : entry.format === 'article' ? 'Article' : 'Post',
          entry.platform,
          entry.brief,
          entry.hashtags.join(','),
          scheduledAt,
          now, now,
        );
        saved++;
      }
    }

    logger.info('content-calendar', 'Calendar generated', { month: targetMonth, entries: calendar.length, saved });

    return NextResponse.json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        totalEntries: calendar.length,
        saved,
        calendar,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('content-calendar', 'Generation failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: Scheduled content for month ───────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;

  const month = parseInt(request.nextUrl.searchParams.get('month') || String(new Date().getMonth() + 1), 10);
  const year = parseInt(request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()), 10);

  const startOfMonth = new Date(year, month - 1, 1).getTime();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).getTime();

  const items = rawDb.prepare(`
    SELECT id, title, type, status, platform, body, tags, scheduled_at, created_at
    FROM content_items
    WHERE scheduled_at >= ? AND scheduled_at <= ?
    ORDER BY scheduled_at ASC
  `).all(startOfMonth, endOfMonth);

  const statusBreakdown = rawDb.prepare(`
    SELECT status, COUNT(*) as count
    FROM content_items
    WHERE scheduled_at >= ? AND scheduled_at <= ?
    GROUP BY status
  `).all(startOfMonth, endOfMonth);

  return NextResponse.json({
    success: true,
    data: { month, year, items, statusBreakdown, total: items.length },
  });
}
