export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Knowledge Base / Internal Wiki
 *
 * GET    /api/knowledge — List articles, search, filter by category
 * POST   /api/knowledge — Create article
 * PATCH  /api/knowledge — Update article
 * DELETE /api/knowledge — Delete article
 *
 * Categories: process, template, runbook, decision, faq, resource
 */

// ─── GET: List / search ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureKnowledgeTables(rawDb);

  const search = request.nextUrl.searchParams.get('search');
  const category = request.nextUrl.searchParams.get('category');
  const id = request.nextUrl.searchParams.get('id');

  if (id) {
    const article = rawDb.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(id);
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Increment views
    rawDb.prepare('UPDATE knowledge_base SET views = views + 1 WHERE id = ?').run(id);
    return NextResponse.json({ success: true, data: article });
  }

  let query = 'SELECT id, title, category, tags, views, updated_at, created_at FROM knowledge_base WHERE 1=1';
  const params: unknown[] = [];

  if (search) {
    query += ' AND (title LIKE ? OR content_md LIKE ? OR tags LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY updated_at DESC';

  const articles = rawDb.prepare(query).all(...params);

  const categories = rawDb.prepare(`
    SELECT category, COUNT(*) as count FROM knowledge_base GROUP BY category ORDER BY count DESC
  `).all();

  const stats = rawDb.prepare(`
    SELECT COUNT(*) as total, SUM(views) as total_views FROM knowledge_base
  `).get() as { total: number; total_views: number };

  return NextResponse.json({
    success: true,
    data: { articles, categories, stats },
  });
}

// ─── POST: Create article ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, contentMd, category, tags } = body as {
      title: string;
      contentMd: string;
      category?: string;
      tags?: string;
    };

    if (!title || !contentMd) {
      return NextResponse.json({ error: 'Missing title or contentMd' }, { status: 400 });
    }

    const validCategories = ['process', 'template', 'runbook', 'decision', 'faq', 'resource'];
    const safeCategory = validCategories.includes(category || '') ? category : 'resource';

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureKnowledgeTables(rawDb);

    const now = Date.now();
    const id = `kb_${now}_${Math.random().toString(36).substr(2, 9)}`;

    rawDb.prepare(`
      INSERT INTO knowledge_base (id, title, content_md, category, tags, views, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, title, contentMd, safeCategory, tags || null, now, now);

    logger.info('knowledge', 'Article created', { id, title, category: safeCategory });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── PATCH: Update article ──────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, contentMd, category, tags } = body as {
      id: string;
      title?: string;
      contentMd?: string;
      category?: string;
      tags?: string;
    };

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureKnowledgeTables(rawDb);

    const now = Date.now();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (contentMd !== undefined) { fields.push('content_md = ?'); values.push(contentMd); }
    if (category !== undefined) { fields.push('category = ?'); values.push(category); }
    if (tags !== undefined) { fields.push('tags = ?'); values.push(tags); }

    if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    fields.push('updated_at = ?');
    values.push(now, id);

    rawDb.prepare(`UPDATE knowledge_base SET ${fields.join(', ')} WHERE id = ?`).run(...values);

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
  ensureKnowledgeTables(rawDb);

  rawDb.prepare('DELETE FROM knowledge_base WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _kbTablesCreated = false;
function ensureKnowledgeTables(rawDb: import('better-sqlite3').Database) {
  if (_kbTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content_md TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'resource',
      tags TEXT,
      views INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
    CREATE INDEX IF NOT EXISTS idx_kb_updated ON knowledge_base(updated_at DESC);
  `);
  _kbTablesCreated = true;
}
