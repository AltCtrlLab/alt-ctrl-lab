export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Portfolio / Showcase Builder
 *
 * POST  /api/portfolio/showcase — Generate public showcase HTML from featured projects
 * GET   /api/portfolio/showcase — Get showcase or list showcase items
 * PATCH /api/portfolio/showcase — Feature/unfeature project, update showcase item
 */

// ─── POST: Generate showcase ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, title, description, imageUrl, techStack, liveUrl, category } = body as {
      action?: string;
      projectId?: string;
      title?: string;
      description?: string;
      imageUrl?: string;
      techStack?: string;
      liveUrl?: string;
      category?: string;
    };

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureShowcaseTables(rawDb);
    const now = Date.now();

    // Generate full HTML showcase page
    if (action === 'generate') {
      const items = rawDb.prepare('SELECT * FROM showcase_items WHERE featured = 1 ORDER BY display_order ASC').all() as ShowcaseItem[];

      if (items.length === 0) {
        return NextResponse.json({ error: 'No featured projects to showcase' }, { status: 400 });
      }

      // Try Kimi for enhanced descriptions
      let enhancedItems = items;
      try {
        const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
        if (kimiKey) {
          const itemsSummary = items.map(i => `- ${i.title}: ${i.description || 'no desc'} (${i.tech_stack || 'N/A'})`).join('\n');
          const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kimiKey}` },
            body: JSON.stringify({
              model: 'kimi-k2.5',
              messages: [
                { role: 'system', content: 'You enhance portfolio project descriptions. Return JSON array of objects with {title, tagline, description} for each project. Keep it professional, concise, impressive. French language.' },
                { role: 'user', content: `Enhance these portfolio items:\n${itemsSummary}` },
              ],
              temperature: 0.7,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const raw = data.choices?.[0]?.message?.content || '';
            const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const enhanced = JSON.parse(cleaned) as { title: string; tagline: string; description: string }[];
            enhancedItems = items.map((item, i) => ({
              ...item,
              title: enhanced[i]?.title || item.title,
              description: enhanced[i]?.description || item.description,
              tagline: enhanced[i]?.tagline || '',
            }));
          }
        }
      } catch (_) { /* fallback to original descriptions */ }

      const html = generateShowcaseHtml(enhancedItems);

      // Save generated showcase
      const showcaseId = `showcase_${now}`;
      rawDb.prepare(`
        INSERT OR REPLACE INTO showcase_pages (id, html, items_count, generated_at)
        VALUES (?, ?, ?, ?)
      `).run(showcaseId, html, items.length, now);

      logger.info('portfolio', 'Showcase generated', { items: items.length });
      return NextResponse.json({ success: true, id: showcaseId, itemsCount: items.length, html });
    }

    // Add showcase item
    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 });
    }

    const id = `showitem_${now}_${Math.random().toString(36).substr(2, 9)}`;
    const maxOrder = rawDb.prepare('SELECT MAX(display_order) as m FROM showcase_items').get() as { m: number | null };
    const order = (maxOrder?.m || 0) + 1;

    rawDb.prepare(`
      INSERT INTO showcase_items (id, project_id, title, description, image_url, tech_stack, live_url, category, featured, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(id, projectId || null, title, description || null, imageUrl || null, techStack || null, liveUrl || null, category || 'web', order, now, now);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: Get showcase or list items ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureShowcaseTables(rawDb);

  const format = request.nextUrl.searchParams.get('format');

  // Return last generated HTML
  if (format === 'html') {
    const page = rawDb.prepare('SELECT * FROM showcase_pages ORDER BY generated_at DESC LIMIT 1').get() as { html: string } | undefined;
    if (!page) return NextResponse.json({ error: 'No showcase generated yet' }, { status: 404 });
    return new NextResponse(page.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // List all items
  const items = rawDb.prepare('SELECT * FROM showcase_items ORDER BY display_order ASC').all();

  const stats = rawDb.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured_count
    FROM showcase_items
  `).get() as Record<string, number>;

  const categories = rawDb.prepare(
    'SELECT category, COUNT(*) as count FROM showcase_items GROUP BY category'
  ).all();

  return NextResponse.json({ success: true, data: { items, stats, categories } });
}

// ─── PATCH: Update item ─────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, title, description, imageUrl, techStack, liveUrl, category, displayOrder } = body as {
      id: string;
      action?: string;
      title?: string;
      description?: string;
      imageUrl?: string;
      techStack?: string;
      liveUrl?: string;
      category?: string;
      displayOrder?: number;
    };

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureShowcaseTables(rawDb);
    const now = Date.now();

    if (action === 'feature') {
      rawDb.prepare('UPDATE showcase_items SET featured = 1, updated_at = ? WHERE id = ?').run(now, id);
      return NextResponse.json({ success: true });
    }
    if (action === 'unfeature') {
      rawDb.prepare('UPDATE showcase_items SET featured = 0, updated_at = ? WHERE id = ?').run(now, id);
      return NextResponse.json({ success: true });
    }

    // Update fields
    const fields: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (imageUrl !== undefined) { fields.push('image_url = ?'); values.push(imageUrl); }
    if (techStack !== undefined) { fields.push('tech_stack = ?'); values.push(techStack); }
    if (liveUrl !== undefined) { fields.push('live_url = ?'); values.push(liveUrl); }
    if (category !== undefined) { fields.push('category = ?'); values.push(category); }
    if (displayOrder !== undefined) { fields.push('display_order = ?'); values.push(displayOrder); }

    if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    fields.push('updated_at = ?');
    values.push(now, id);

    rawDb.prepare(`UPDATE showcase_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return NextResponse.json({ success: true });
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
  ensureShowcaseTables(rawDb);
  rawDb.prepare('DELETE FROM showcase_items WHERE id = ?').run(id);

  return NextResponse.json({ success: true });
}

// ─── HTML Generator ─────────────────────────────────────────────────────────

interface ShowcaseItem {
  id: string;
  title: string;
  description: string | null;
  tagline?: string;
  image_url: string | null;
  tech_stack: string | null;
  live_url: string | null;
  category: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateShowcaseHtml(items: ShowcaseItem[]): string {
  const projectCards = items.map((item, i) => {
    const tags = (item.tech_stack || '').split(',').map(t => t.trim()).filter(Boolean);
    const tagHtml = tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    const imgStyle = item.image_url
      ? `background-image:url('${escapeHtml(item.image_url)}');background-size:cover;background-position:center;`
      : `background:linear-gradient(135deg,hsl(${(i * 60) % 360},70%,15%),hsl(${(i * 60 + 40) % 360},60%,25%));`;

    return `
      <div class="card" style="animation-delay:${i * 0.1}s">
        <div class="card-img" style="${imgStyle}">
          ${item.live_url ? `<a href="${escapeHtml(item.live_url)}" target="_blank" class="visit-btn">Voir le site &rarr;</a>` : ''}
        </div>
        <div class="card-body">
          <span class="category">${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          ${item.tagline ? `<p class="tagline">${escapeHtml(item.tagline)}</p>` : ''}
          ${item.description ? `<p class="desc">${escapeHtml(item.description)}</p>` : ''}
          ${tagHtml ? `<div class="tags">${tagHtml}</div>` : ''}
        </div>
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Portfolio — AltCtrl.Lab</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#0a0a0a;color:#e5e5e5;min-height:100vh}
header{text-align:center;padding:80px 20px 40px;background:linear-gradient(180deg,#1a0a2e,#0a0a0a)}
header h1{font-size:3rem;font-weight:800;background:linear-gradient(135deg,#d946ef,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
header p{color:#a3a3a3;margin-top:12px;font-size:1.1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:32px;max-width:1280px;margin:0 auto;padding:40px 24px}
.card{background:#141414;border-radius:16px;overflow:hidden;border:1px solid #262626;transition:transform .3s,box-shadow .3s;animation:fadeUp .6s ease both}
.card:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(217,70,239,.1)}
.card-img{height:220px;position:relative;display:flex;align-items:end;justify-content:end;padding:16px}
.visit-btn{background:rgba(0,0,0,.7);color:#d946ef;text-decoration:none;padding:8px 16px;border-radius:8px;font-size:.85rem;backdrop-filter:blur(8px);border:1px solid rgba(217,70,239,.3)}
.visit-btn:hover{background:rgba(217,70,239,.2)}
.card-body{padding:24px}
.category{text-transform:uppercase;font-size:.7rem;letter-spacing:2px;color:#d946ef;font-weight:600}
.card-body h3{font-size:1.3rem;margin:8px 0;font-weight:700}
.tagline{color:#a78bfa;font-size:.9rem;font-style:italic;margin-bottom:8px}
.desc{color:#a3a3a3;font-size:.9rem;line-height:1.6;margin-bottom:12px}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{background:#1e1e2e;color:#c084fc;padding:4px 10px;border-radius:6px;font-size:.75rem;border:1px solid #2e2e4e}
footer{text-align:center;padding:60px 20px;color:#525252;font-size:.85rem}
footer a{color:#d946ef;text-decoration:none}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:480px){.grid{grid-template-columns:1fr}header h1{font-size:2rem}}
</style>
</head>
<body>
<header>
  <h1>Nos Realisations</h1>
  <p>${items.length} projets soigneusement livres par AltCtrl.Lab</p>
</header>
<div class="grid">
${projectCards}
</div>
<footer>
  <p>&copy; ${new Date().getFullYear()} <a href="https://altctrllab.com">AltCtrl.Lab</a> — Agence Digitale Premium</p>
</footer>
</body>
</html>`;
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _showcaseTablesCreated = false;
function ensureShowcaseTables(rawDb: import('better-sqlite3').Database) {
  if (_showcaseTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS showcase_items (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      tech_stack TEXT,
      live_url TEXT,
      category TEXT DEFAULT 'web',
      featured INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_show_featured ON showcase_items(featured);
    CREATE INDEX IF NOT EXISTS idx_show_order ON showcase_items(display_order);

    CREATE TABLE IF NOT EXISTS showcase_pages (
      id TEXT PRIMARY KEY,
      html TEXT NOT NULL,
      items_count INTEGER DEFAULT 0,
      generated_at INTEGER NOT NULL
    );
  `);
  _showcaseTablesCreated = true;
}
