export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Media Kit / Press Kit Generator
 *
 * POST  /api/branding/media-kit — Generate a media/press kit (HTML)
 * GET   /api/branding/media-kit — List kits or preview a specific one
 * PATCH /api/branding/media-kit — Update kit metadata
 * DELETE /api/branding/media-kit — Delete a kit
 */

// ─── POST: Generate media kit ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName, tagline, boilerplate, logoUrl, logoWhiteUrl,
      primaryColor, secondaryColor, stats, contactName, contactEmail,
      contactPhone, websiteUrl, socialLinks, clientId,
    } = body as MediaKitInput;

    if (!companyName) {
      return NextResponse.json({ error: 'Missing companyName' }, { status: 400 });
    }

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureMediaKitTables(rawDb);
    const now = Date.now();

    // Try Kimi to enhance boilerplate + generate press-ready content
    let enhancedContent: EnhancedContent | null = null;
    try {
      const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
      if (kimiKey) {
        const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kimiKey}` },
          body: JSON.stringify({
            model: 'kimi-k2.5',
            messages: [
              {
                role: 'system',
                content: 'You are a PR and branding expert. Generate press kit content in French. Return JSON only: {"headline":"catchy headline","boilerplate":"2-3 paragraph company description","factSheet":["fact1","fact2","fact3","fact4","fact5"],"pressContact":"formatted press contact block"}',
              },
              {
                role: 'user',
                content: `Company: ${companyName}\nTagline: ${tagline || 'N/A'}\nExisting boilerplate: ${boilerplate || 'N/A'}\nWebsite: ${websiteUrl || 'N/A'}\nStats: ${JSON.stringify(stats || {})}\nContact: ${contactName || 'N/A'} (${contactEmail || 'N/A'})`,
              },
            ],
            temperature: 0.6,
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content || '';
          const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          enhancedContent = JSON.parse(cleaned);
        }
      }
    } catch (_) { /* fallback below */ }

    // Generate HTML kit
    const html = generateMediaKitHtml({
      companyName,
      tagline: tagline || '',
      boilerplate: enhancedContent?.boilerplate || boilerplate || `${companyName} est une entreprise innovante.`,
      headline: enhancedContent?.headline || `${companyName} — Media Kit`,
      factSheet: enhancedContent?.factSheet || [],
      logoUrl: logoUrl || '',
      logoWhiteUrl: logoWhiteUrl || '',
      primaryColor: primaryColor || '#d946ef',
      secondaryColor: secondaryColor || '#6366f1',
      stats: stats || {},
      contactName: contactName || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      websiteUrl: websiteUrl || '',
      socialLinks: socialLinks || {},
      pressContact: enhancedContent?.pressContact || '',
    });

    // Save to DB
    const id = `mkit_${now}_${Math.random().toString(36).substr(2, 9)}`;

    rawDb.prepare(`
      INSERT INTO media_kits (id, client_id, company_name, tagline, html_content, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, clientId || null, companyName, tagline || null, html,
      JSON.stringify({ logoUrl, primaryColor, secondaryColor, stats, contactEmail, websiteUrl, socialLinks }),
      now, now,
    );

    logger.info('media-kit', 'Generated', { id, companyName });
    return NextResponse.json({ success: true, id, html });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: List or preview ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureMediaKitTables(rawDb);

  const id = request.nextUrl.searchParams.get('id');
  const format = request.nextUrl.searchParams.get('format');

  if (id) {
    const kit = rawDb.prepare('SELECT * FROM media_kits WHERE id = ?').get(id) as Record<string, string> | undefined;
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Return raw HTML for preview
    if (format === 'html') {
      return new NextResponse(kit.html_content, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return NextResponse.json({ success: true, data: kit });
  }

  const kits = rawDb.prepare('SELECT id, client_id, company_name, tagline, created_at, updated_at FROM media_kits ORDER BY created_at DESC').all();
  return NextResponse.json({ success: true, data: kits });
}

// ─── PATCH: Update metadata ─────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, companyName, tagline } = body as { id: string; companyName?: string; tagline?: string };

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureMediaKitTables(rawDb);
    const now = Date.now();

    const fields: string[] = [];
    const values: unknown[] = [];

    if (companyName !== undefined) { fields.push('company_name = ?'); values.push(companyName); }
    if (tagline !== undefined) { fields.push('tagline = ?'); values.push(tagline); }

    if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    fields.push('updated_at = ?');
    values.push(now, id);

    rawDb.prepare(`UPDATE media_kits SET ${fields.join(', ')} WHERE id = ?`).run(...values);
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
  ensureMediaKitTables(rawDb);
  rawDb.prepare('DELETE FROM media_kits WHERE id = ?').run(id);

  return NextResponse.json({ success: true });
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface MediaKitInput {
  companyName: string;
  tagline?: string;
  boilerplate?: string;
  logoUrl?: string;
  logoWhiteUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  stats?: Record<string, string | number>;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  socialLinks?: Record<string, string>;
  clientId?: string;
}

interface EnhancedContent {
  headline: string;
  boilerplate: string;
  factSheet: string[];
  pressContact: string;
}

// ─── HTML Generator ─────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateMediaKitHtml(data: {
  companyName: string;
  tagline: string;
  boilerplate: string;
  headline: string;
  factSheet: string[];
  logoUrl: string;
  logoWhiteUrl: string;
  primaryColor: string;
  secondaryColor: string;
  stats: Record<string, string | number>;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  socialLinks: Record<string, string>;
  pressContact: string;
}): string {
  const statsHtml = Object.entries(data.stats).map(([label, value]) =>
    `<div class="stat"><div class="stat-value">${escapeHtml(String(value))}</div><div class="stat-label">${escapeHtml(label)}</div></div>`
  ).join('');

  const factsHtml = data.factSheet.map(f => `<li>${escapeHtml(f)}</li>`).join('');

  const socialHtml = Object.entries(data.socialLinks).map(([platform, url]) =>
    `<a href="${escapeHtml(url)}" class="social-link">${escapeHtml(platform)}</a>`
  ).join(' ');

  const logoSection = data.logoUrl
    ? `<div class="logo-section">
        <h3>Logo Principal</h3>
        <div class="logo-preview"><img src="${escapeHtml(data.logoUrl)}" alt="${escapeHtml(data.companyName)}"></div>
        ${data.logoWhiteUrl ? `<h3>Logo (fond sombre)</h3><div class="logo-preview dark"><img src="${escapeHtml(data.logoWhiteUrl)}" alt="${escapeHtml(data.companyName)}"></div>` : ''}
        <p class="usage-note">Merci de ne pas modifier, recadrer ou alterer les logos.</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(data.headline)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#fafafa;color:#18181b}
.hero{background:linear-gradient(135deg,${data.primaryColor},${data.secondaryColor});color:#fff;padding:80px 40px;text-align:center}
.hero h1{font-size:2.5rem;font-weight:800;margin-bottom:8px}
.hero p{font-size:1.2rem;opacity:.85}
.container{max-width:900px;margin:0 auto;padding:40px 24px}
section{margin-bottom:48px}
h2{font-size:1.5rem;font-weight:700;color:${data.primaryColor};margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid ${data.primaryColor}20}
h3{font-size:1.1rem;font-weight:600;margin:16px 0 8px}
.boilerplate{font-size:1.05rem;line-height:1.8;color:#3f3f46}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin:24px 0}
.stat{background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px;text-align:center}
.stat-value{font-size:2rem;font-weight:800;color:${data.primaryColor}}
.stat-label{font-size:.85rem;color:#71717a;margin-top:4px}
.facts{list-style:none;counter-reset:facts}
.facts li{counter-increment:facts;padding:12px 0 12px 40px;position:relative;border-bottom:1px solid #f4f4f5}
.facts li::before{content:counter(facts);position:absolute;left:0;width:28px;height:28px;background:${data.primaryColor};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700}
.logo-section{margin:24px 0}
.logo-preview{background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:32px;display:flex;align-items:center;justify-content:center;margin:8px 0 16px}
.logo-preview.dark{background:#18181b}
.logo-preview img{max-height:80px;max-width:300px}
.usage-note{font-size:.85rem;color:#a1a1aa;font-style:italic}
.color-swatches{display:flex;gap:16px;margin:16px 0}
.swatch{width:80px;height:80px;border-radius:12px;display:flex;align-items:end;justify-content:center;padding:8px;font-size:.7rem;color:#fff;font-weight:600}
.contact-card{background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px}
.contact-card p{margin:4px 0;color:#3f3f46}
.social-link{display:inline-block;background:${data.primaryColor}15;color:${data.primaryColor};padding:6px 16px;border-radius:8px;text-decoration:none;font-size:.85rem;font-weight:500;margin:4px}
.footer{text-align:center;padding:40px;color:#a1a1aa;font-size:.8rem}
@media(max-width:600px){.hero{padding:40px 20px}.hero h1{font-size:1.8rem}.stats-grid{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
<div class="hero">
  <h1>${escapeHtml(data.headline)}</h1>
  ${data.tagline ? `<p>${escapeHtml(data.tagline)}</p>` : ''}
</div>
<div class="container">

<section>
  <h2>A Propos</h2>
  <div class="boilerplate">${escapeHtml(data.boilerplate).replace(/\n/g, '<br>')}</div>
</section>

${statsHtml ? `<section><h2>Chiffres Cles</h2><div class="stats-grid">${statsHtml}</div></section>` : ''}

${factsHtml ? `<section><h2>En Bref</h2><ol class="facts">${factsHtml}</ol></section>` : ''}

${logoSection ? `<section><h2>Identite Visuelle</h2>${logoSection}
<h3>Couleurs</h3>
<div class="color-swatches">
  <div class="swatch" style="background:${data.primaryColor}">${escapeHtml(data.primaryColor)}</div>
  <div class="swatch" style="background:${data.secondaryColor}">${escapeHtml(data.secondaryColor)}</div>
</div>
</section>` : ''}

<section>
  <h2>Contact Presse</h2>
  <div class="contact-card">
    ${data.pressContact ? `<p>${escapeHtml(data.pressContact).replace(/\n/g, '<br>')}</p>` : `
    ${data.contactName ? `<p><strong>${escapeHtml(data.contactName)}</strong></p>` : ''}
    ${data.contactEmail ? `<p>Email: <a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></p>` : ''}
    ${data.contactPhone ? `<p>Tel: ${escapeHtml(data.contactPhone)}</p>` : ''}
    ${data.websiteUrl ? `<p>Web: <a href="${escapeHtml(data.websiteUrl)}">${escapeHtml(data.websiteUrl)}</a></p>` : ''}
    `}
    ${socialHtml ? `<div style="margin-top:12px">${socialHtml}</div>` : ''}
  </div>
</section>

</div>
<div class="footer">
  Media Kit — ${escapeHtml(data.companyName)} — ${new Date().getFullYear()}
</div>
</body>
</html>`;
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _mediaKitTablesCreated = false;
function ensureMediaKitTables(rawDb: import('better-sqlite3').Database) {
  if (_mediaKitTablesCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS media_kits (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      company_name TEXT NOT NULL,
      tagline TEXT,
      html_content TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mkit_client ON media_kits(client_id);
  `);
  _mediaKitTablesCreated = true;
}
