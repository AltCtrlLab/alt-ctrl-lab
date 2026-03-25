export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Brand Asset Kit Generator
 *
 * POST /api/branding/kit — Create/update a brand kit for a client
 * GET  /api/branding/kit?clientId=xxx — Get brand kit (JSON or HTML one-pager)
 * GET  /api/branding/kit?all=true — List all brand kits
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── POST: Create/update brand kit ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, companyName, logoUrl, primaryColor, secondaryColor, accentColor, fontHeading, fontBody, tagline, toneOfVoice } = body as {
      clientId?: string;
      companyName: string;
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      fontHeading?: string;
      fontBody?: string;
      tagline?: string;
      toneOfVoice?: string;
    };

    if (!companyName) {
      return NextResponse.json({ error: 'Missing companyName' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureBrandTables(rawDb);
    const now = Date.now();
    const id = `brand_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // Upsert: if clientId exists, replace
    if (clientId) {
      rawDb.prepare('DELETE FROM brand_kits WHERE client_id = ?').run(clientId);
    }

    rawDb.prepare(`
      INSERT INTO brand_kits (id, client_id, company_name, logo_url, primary_color, secondary_color, accent_color, font_heading, font_body, tagline, tone_of_voice, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, clientId || null, companyName,
      logoUrl || null,
      primaryColor || '#d946ef',
      secondaryColor || '#6366f1',
      accentColor || '#f59e0b',
      fontHeading || 'Inter',
      fontBody || 'Inter',
      tagline || null,
      toneOfVoice || null,
      now, now,
    );

    logger.info('branding', 'Brand kit created', { id, companyName });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: Retrieve brand kit ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureBrandTables(rawDb);

  const clientId = request.nextUrl.searchParams.get('clientId');
  const id = request.nextUrl.searchParams.get('id');
  const format = request.nextUrl.searchParams.get('format');
  const all = request.nextUrl.searchParams.get('all') === 'true';

  if (all) {
    const kits = rawDb.prepare('SELECT * FROM brand_kits ORDER BY created_at DESC').all();
    return NextResponse.json({ success: true, data: kits });
  }

  const kit = id
    ? rawDb.prepare('SELECT * FROM brand_kits WHERE id = ?').get(id)
    : clientId
      ? rawDb.prepare('SELECT * FROM brand_kits WHERE client_id = ?').get(clientId)
      : rawDb.prepare('SELECT * FROM brand_kits ORDER BY created_at DESC LIMIT 1').get();

  if (!kit) {
    return NextResponse.json({ error: 'Brand kit not found' }, { status: 404 });
  }

  const k = kit as Record<string, string | null>;

  if (format === 'html') {
    return new NextResponse(generateOnePager(k), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return NextResponse.json({ success: true, data: kit });
}

// ─── One-pager HTML ─────────────────────────────────────────────────────────

function generateOnePager(k: Record<string, string | null>): string {
  const name = escapeHtml(k.company_name || 'Brand');
  const primary = k.primary_color || '#d946ef';
  const secondary = k.secondary_color || '#6366f1';
  const accent = k.accent_color || '#f59e0b';
  const fontH = k.font_heading || 'Inter';
  const fontB = k.font_body || 'Inter';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Brand Kit — ${name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${fontH}:wght@400;600;700&family=${fontB}:wght@400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: '${fontB}', system-ui, sans-serif; color: #18181b; max-width: 900px; margin: 0 auto; padding: 48px; }
    h1 { font-family: '${fontH}', system-ui, sans-serif; font-size: 36px; font-weight: 700; margin-bottom: 8px; }
    h2 { font-family: '${fontH}', system-ui, sans-serif; font-size: 20px; font-weight: 600; color: ${secondary}; margin: 32px 0 16px; border-bottom: 2px solid ${primary}22; padding-bottom: 8px; }
    .header { text-align: center; padding-bottom: 32px; border-bottom: 3px solid ${primary}; margin-bottom: 32px; }
    .tagline { font-size: 18px; color: #71717a; font-style: italic; margin-top: 8px; }
    .colors { display: flex; gap: 16px; margin: 16px 0; }
    .color-chip { width: 100px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .color-swatch { height: 80px; }
    .color-label { padding: 8px; text-align: center; font-size: 12px; font-weight: 600; background: white; }
    .fonts { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 16px 0; }
    .font-box { padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; }
    .font-name { font-size: 14px; color: #71717a; margin-bottom: 8px; }
    .font-sample-h { font-family: '${fontH}', sans-serif; font-size: 28px; font-weight: 700; }
    .font-sample-b { font-family: '${fontB}', sans-serif; font-size: 16px; line-height: 1.6; }
    .tone { background: ${primary}08; border-left: 4px solid ${primary}; padding: 20px; border-radius: 0 12px 12px 0; margin: 16px 0; line-height: 1.6; }
    .logo-box { display: flex; align-items: center; justify-content: center; padding: 32px; background: #fafafa; border-radius: 12px; border: 1px dashed #d4d4d8; margin: 16px 0; min-height: 120px; }
    .logo-box img { max-height: 80px; max-width: 280px; }
    .footer { margin-top: 48px; text-align: center; color: #a1a1aa; font-size: 11px; padding-top: 24px; border-top: 1px solid #e4e4e7; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    ${k.logo_url ? `<img src="${escapeHtml(k.logo_url)}" alt="${name}" style="max-height: 60px; margin-bottom: 16px;">` : ''}
    <h1 style="color: ${primary};">${name}</h1>
    ${k.tagline ? `<div class="tagline">${escapeHtml(k.tagline)}</div>` : ''}
    <p style="margin-top: 12px; color: #71717a; font-size: 14px;">Brand Guidelines</p>
  </div>

  ${k.logo_url ? `<h2>Logo</h2>
  <div class="logo-box"><img src="${escapeHtml(k.logo_url)}" alt="${name}"></div>` : ''}

  <h2>Couleurs</h2>
  <div class="colors">
    <div class="color-chip">
      <div class="color-swatch" style="background: ${primary};"></div>
      <div class="color-label">Primaire<br>${primary}</div>
    </div>
    <div class="color-chip">
      <div class="color-swatch" style="background: ${secondary};"></div>
      <div class="color-label">Secondaire<br>${secondary}</div>
    </div>
    <div class="color-chip">
      <div class="color-swatch" style="background: ${accent};"></div>
      <div class="color-label">Accent<br>${accent}</div>
    </div>
    <div class="color-chip">
      <div class="color-swatch" style="background: #18181b;"></div>
      <div class="color-label">Texte<br>#18181b</div>
    </div>
    <div class="color-chip">
      <div class="color-swatch" style="background: #fafafa; border: 1px solid #e4e4e7;"></div>
      <div class="color-label">Fond<br>#fafafa</div>
    </div>
  </div>

  <h2>Typographie</h2>
  <div class="fonts">
    <div class="font-box">
      <div class="font-name">Titres — ${escapeHtml(fontH)}</div>
      <div class="font-sample-h">Aa Bb Cc 123</div>
      <div class="font-sample-h" style="font-size: 20px; font-weight: 600; margin-top: 8px;">Sous-titre exemple</div>
    </div>
    <div class="font-box">
      <div class="font-name">Corps — ${escapeHtml(fontB)}</div>
      <div class="font-sample-b">Aa Bb Cc 123</div>
      <div class="font-sample-b" style="margin-top: 8px; color: #52525b;">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.</div>
    </div>
  </div>

  ${k.tone_of_voice ? `<h2>Ton de voix</h2>
  <div class="tone">${escapeHtml(k.tone_of_voice)}</div>` : ''}

  <div class="footer">
    ${name} — Brand Kit<br>
    Genere le ${new Date().toLocaleDateString('fr-FR')}
  </div>
</body>
</html>`;
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _brandTablesCreated = false;
function ensureBrandTables(rawDb: import('better-sqlite3').Database) {
  if (_brandTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS brand_kits (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      company_name TEXT NOT NULL,
      logo_url TEXT,
      primary_color TEXT NOT NULL DEFAULT '#d946ef',
      secondary_color TEXT DEFAULT '#6366f1',
      accent_color TEXT DEFAULT '#f59e0b',
      font_heading TEXT DEFAULT 'Inter',
      font_body TEXT DEFAULT 'Inter',
      tagline TEXT,
      tone_of_voice TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_brand_client ON brand_kits(client_id);
  `);
  _brandTablesCreated = true;
}
