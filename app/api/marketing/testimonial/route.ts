export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Automated Testimonial Collector
 *
 * GET  /api/marketing/testimonial — List testimonials (admin) or public approved ones
 * POST /api/marketing/testimonial — Submit a testimonial (public form)
 * PATCH /api/marketing/testimonial — Approve / feature / delete (admin)
 *
 * Public widget: GET ?format=widget returns embeddable HTML "wall of love"
 */

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── GET: List testimonials ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureTestimonialTables(rawDb);

  const format = request.nextUrl.searchParams.get('format');
  const all = request.nextUrl.searchParams.get('all') === 'true';

  if (format === 'widget') {
    // Public embeddable widget — only approved testimonials
    const testimonials = rawDb.prepare(
      'SELECT client_name, company, role, rating, text, photo_url FROM testimonials WHERE approved = 1 ORDER BY featured DESC, created_at DESC LIMIT 20',
    ).all() as Array<{ client_name: string; company: string; role: string; rating: number; text: string; photo_url: string | null }>;

    return new NextResponse(generateWidget(testimonials), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Admin list
  const where = all ? '' : 'WHERE approved = 1';
  const testimonials = rawDb.prepare(`SELECT * FROM testimonials ${where} ORDER BY created_at DESC`).all();

  const stats = rawDb.prepare(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) as approved,
           SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured,
           ROUND(AVG(rating), 1) as avg_rating
    FROM testimonials
  `).get() as { total: number; approved: number; featured: number; avg_rating: number };

  return NextResponse.json({ success: true, data: { testimonials, stats } });
}

// ─── POST: Submit testimonial (public) ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName, company, role, rating, text, photoUrl, videoUrl, projectId } = body as {
      clientName: string;
      company?: string;
      role?: string;
      rating?: number;
      text: string;
      photoUrl?: string;
      videoUrl?: string;
      projectId?: string;
    };

    if (!clientName || !text) {
      return NextResponse.json({ error: 'Missing clientName or text' }, { status: 400 });
    }

    if (text.length > 2000) {
      return NextResponse.json({ error: 'Text too long (max 2000 chars)' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureTestimonialTables(rawDb);

    const now = Date.now();
    const id = `testi_${now}_${Math.random().toString(36).substr(2, 9)}`;
    const safeRating = Math.min(5, Math.max(1, rating || 5));

    rawDb.prepare(`
      INSERT INTO testimonials (id, client_name, company, role, rating, text, photo_url, video_url, project_id, approved, featured, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'form', ?)
    `).run(id, clientName, company || null, role || null, safeRating, text, photoUrl || null, videoUrl || null, projectId || null, now);

    logger.info('testimonial', 'New testimonial submitted', { id, clientName });

    return NextResponse.json({
      success: true,
      id,
      message: 'Merci pour votre temoignage ! Il sera publie apres validation.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── PATCH: Manage testimonials (admin) ─────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body as { id: string; action: string };

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureTestimonialTables(rawDb);

    switch (action) {
      case 'approve':
        rawDb.prepare('UPDATE testimonials SET approved = 1 WHERE id = ?').run(id);
        break;
      case 'reject':
        rawDb.prepare('UPDATE testimonials SET approved = 0 WHERE id = ?').run(id);
        break;
      case 'feature':
        rawDb.prepare('UPDATE testimonials SET featured = 1, approved = 1 WHERE id = ?').run(id);
        break;
      case 'unfeature':
        rawDb.prepare('UPDATE testimonials SET featured = 0 WHERE id = ?').run(id);
        break;
      case 'delete':
        rawDb.prepare('DELETE FROM testimonials WHERE id = ?').run(id);
        break;
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _testiTablesCreated = false;
function ensureTestimonialTables(rawDb: import('better-sqlite3').Database) {
  if (_testiTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      company TEXT,
      role TEXT,
      rating INTEGER DEFAULT 5,
      text TEXT NOT NULL,
      photo_url TEXT,
      video_url TEXT,
      project_id TEXT,
      approved INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      source TEXT DEFAULT 'manual',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_testi_approved ON testimonials(approved);
    CREATE INDEX IF NOT EXISTS idx_testi_featured ON testimonials(featured);
  `);
  _testiTablesCreated = true;
}

// ─── Public Widget HTML ─────────────────────────────────────────────────────

function generateWidget(testimonials: Array<{ client_name: string; company: string; role: string; rating: number; text: string; photo_url: string | null }>): string {
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  const cards = testimonials.map(t => `
    <div class="testi-card">
      <div class="testi-stars">${stars(t.rating)}</div>
      <p class="testi-text">"${escapeHtml(t.text)}"</p>
      <div class="testi-author">
        ${t.photo_url ? `<img src="${escapeHtml(t.photo_url)}" class="testi-photo" alt="">` : '<div class="testi-avatar">' + escapeHtml(t.client_name.charAt(0)) + '</div>'}
        <div>
          <div class="testi-name">${escapeHtml(t.client_name)}</div>
          ${t.role || t.company ? `<div class="testi-role">${escapeHtml([t.role, t.company].filter(Boolean).join(' — '))}</div>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; background: transparent; }
  .testi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; padding: 20px; }
  .testi-card { background: white; border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px; transition: box-shadow 0.2s; }
  .testi-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
  .testi-stars { color: #f59e0b; font-size: 16px; margin-bottom: 12px; }
  .testi-text { color: #3f3f46; font-size: 14px; line-height: 1.6; margin-bottom: 16px; font-style: italic; }
  .testi-author { display: flex; align-items: center; gap: 12px; }
  .testi-photo { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
  .testi-avatar { width: 40px; height: 40px; border-radius: 50%; background: #d946ef; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }
  .testi-name { font-weight: 600; font-size: 14px; color: #18181b; }
  .testi-role { font-size: 12px; color: #71717a; }
</style></head>
<body><div class="testi-grid">${cards}</div></body></html>`;
}
