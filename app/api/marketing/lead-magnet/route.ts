export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, createLead } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

/**
 * Lead Magnet / Gated Content System
 *
 * POST /api/marketing/lead-magnet — Create a lead magnet (admin)
 * GET  /api/marketing/lead-magnet — List lead magnets (admin) or get specific one
 * PATCH /api/marketing/lead-magnet — Download request (public — captures email, sends file, creates lead)
 */

// ─── GET: List lead magnets ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureLeadMagnetTables(rawDb);

  const id = request.nextUrl.searchParams.get('id');

  if (id) {
    const magnet = rawDb.prepare('SELECT * FROM lead_magnets WHERE id = ? AND active = 1').get(id);
    if (!magnet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: magnet });
  }

  const magnets = rawDb.prepare('SELECT * FROM lead_magnets ORDER BY created_at DESC').all();
  const stats = rawDb.prepare(`
    SELECT COUNT(*) as total, SUM(downloads) as total_downloads, SUM(leads_captured) as total_leads
    FROM lead_magnets
  `).get() as { total: number; total_downloads: number; total_leads: number };

  return NextResponse.json({ success: true, data: { magnets, stats } });
}

// ─── POST: Create lead magnet ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, fileUrl, category, landingHeadline, landingSubheadline, ctaText } = body as {
      title: string;
      description?: string;
      fileUrl: string;
      category?: string;
      landingHeadline?: string;
      landingSubheadline?: string;
      ctaText?: string;
    };

    if (!title || !fileUrl) {
      return NextResponse.json({ error: 'Missing title or fileUrl' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureLeadMagnetTables(rawDb);

    const now = Date.now();
    const id = `lm_${now}_${Math.random().toString(36).substr(2, 9)}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    rawDb.prepare(`
      INSERT INTO lead_magnets (id, title, description, file_url, category, slug, landing_headline, landing_subheadline, cta_text, downloads, leads_captured, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?)
    `).run(
      id, title, description || null, fileUrl, category || 'guide', slug,
      landingHeadline || title,
      landingSubheadline || description || '',
      ctaText || 'Telecharger gratuitement',
      now, now,
    );

    logger.info('lead-magnet', 'Created', { id, title });

    return NextResponse.json({
      success: true,
      id,
      slug,
      landingUrl: `/api/marketing/lead-magnet?id=${id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── PATCH: Download request (captures lead) ────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { magnetId, email, name, company } = body as {
      magnetId: string;
      email: string;
      name?: string;
      company?: string;
    };

    if (!magnetId || !email || !email.includes('@')) {
      return NextResponse.json({ error: 'Missing magnetId or valid email' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureLeadMagnetTables(rawDb);

    const magnet = rawDb.prepare('SELECT * FROM lead_magnets WHERE id = ? AND active = 1').get(magnetId) as {
      id: string; title: string; file_url: string;
    } | undefined;

    if (!magnet) {
      return NextResponse.json({ error: 'Lead magnet not found' }, { status: 404 });
    }

    // Check if lead already exists
    const existingLead = rawDb.prepare('SELECT id FROM leads WHERE email = ?').get(email) as { id: string } | undefined;

    if (!existingLead) {
      // Create new lead
      await createLead({
        name: name || email.split('@')[0],
        email,
        company: company || null,
        source: 'Lead Magnet',
        status: 'Nouveau',
        notes: `Downloaded: ${magnet.title}`,
      });

      rawDb.prepare('UPDATE lead_magnets SET leads_captured = leads_captured + 1, updated_at = ? WHERE id = ?')
        .run(Date.now(), magnetId);
    }

    // Increment downloads
    rawDb.prepare('UPDATE lead_magnets SET downloads = downloads + 1, updated_at = ? WHERE id = ?')
      .run(Date.now(), magnetId);

    // Send email with download link
    await sendEmail(
      email,
      name || 'Bonjour',
      `Votre ressource : ${magnet.title}`,
      `Bonjour${name ? ` ${name}` : ''},\n\nMerci pour votre interet !\n\nVoici votre ressource "${magnet.title}" :\n${magnet.file_url}\n\nN'hesitez pas a nous contacter si vous avez des questions.\n\nA bientot,\nL'equipe AltCtrl.Lab`,
    );

    logger.info('lead-magnet', 'Download captured', { magnetId, email, isNew: !existingLead });

    return NextResponse.json({
      success: true,
      fileUrl: magnet.file_url,
      isNewLead: !existingLead,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _lmTablesCreated = false;
function ensureLeadMagnetTables(rawDb: import('better-sqlite3').Database) {
  if (_lmTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS lead_magnets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT NOT NULL,
      category TEXT DEFAULT 'guide',
      slug TEXT,
      landing_headline TEXT,
      landing_subheadline TEXT,
      cta_text TEXT DEFAULT 'Telecharger',
      downloads INTEGER DEFAULT 0,
      leads_captured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lm_slug ON lead_magnets(slug);
    CREATE INDEX IF NOT EXISTS idx_lm_active ON lead_magnets(active);
  `);
  _lmTablesCreated = true;
}
