export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * Social Media Templates — Canva-like presets for various formats
 *
 * POST /api/content/social-template — Generate a template
 * Body: { templateType: quote|stat|testimonial|before-after|listicle|story, data, platform?, primaryColor? }
 *
 * GET /api/content/social-template — List generated templates
 * GET /api/content/social-template?type=quote — Filter by type
 */

type TemplateType = 'quote' | 'stat' | 'testimonial' | 'before-after' | 'listicle' | 'story';

const VALID_TYPES: TemplateType[] = ['quote', 'stat', 'testimonial', 'before-after', 'listicle', 'story'];

// ─── POST: Generate template ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateType, data, platform, primaryColor, language } = body as {
      templateType: TemplateType;
      data: Record<string, unknown>;
      platform?: string;
      primaryColor?: string;
      language?: string;
    };

    if (!templateType || !VALID_TYPES.includes(templateType)) {
      return NextResponse.json({ error: `Invalid templateType. Must be: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    const color = primaryColor || '#d946ef';
    const lang = language || 'fr';
    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
    ensureSocialTemplateTables(rawDb);

    // Generate content with Kimi if text fields are sparse
    let enrichedData = { ...data };
    if (KIMI_API_KEY && (!data.text || (data.text as string).length < 20)) {
      try {
        const prompt = buildEnrichPrompt(templateType, data, lang);
        const res = await fetch(KIMI_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
          body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.6, max_tokens: 500 }),
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          const result = await res.json();
          const raw = result.choices?.[0]?.message?.content || '';
          const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          try { enrichedData = { ...enrichedData, ...JSON.parse(cleaned) }; } catch { /* keep original */ }
        }
      } catch { /* fallback to provided data */ }
    }

    // Generate HTML template
    const html = generateTemplate(templateType, enrichedData, color, platform || 'instagram');

    // Save
    const now = Date.now();
    const id = `stpl_${now}_${Math.random().toString(36).substr(2, 9)}`;
    rawDb.prepare(`
      INSERT INTO social_templates (id, type, platform, data_json, html, primary_color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, templateType, platform || 'instagram', JSON.stringify(enrichedData), html, color, now);

    logger.info('social-template', 'Generated', { id, type: templateType });

    return NextResponse.json({ success: true, id, templateType, html });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── GET: List templates ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  ensureSocialTemplateTables(rawDb);

  const type = request.nextUrl.searchParams.get('type');
  const id = request.nextUrl.searchParams.get('id');

  if (id) {
    const tpl = rawDb.prepare('SELECT * FROM social_templates WHERE id = ?').get(id);
    if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: tpl });
  }

  const where = type ? 'WHERE type = ?' : '';
  const params = type ? [type] : [];
  const templates = rawDb.prepare(`SELECT id, type, platform, primary_color, created_at FROM social_templates ${where} ORDER BY created_at DESC LIMIT 50`).all(...params);

  return NextResponse.json({ success: true, data: templates });
}

// ─── DB ─────────────────────────────────────────────────────────────────────

let _socialTplCreated = false;
function ensureSocialTemplateTables(rawDb: import('better-sqlite3').Database) {
  if (_socialTplCreated) return;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS social_templates (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      platform TEXT DEFAULT 'instagram',
      data_json TEXT,
      html TEXT NOT NULL,
      primary_color TEXT DEFAULT '#d946ef',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stpl_type ON social_templates(type);
  `);
  _socialTplCreated = true;
}

// ─── Enrich prompt ──────────────────────────────────────────────────────────

function buildEnrichPrompt(type: TemplateType, data: Record<string, unknown>, lang: string): string {
  const langLabel = lang === 'fr' ? 'francais' : 'English';
  const prompts: Record<TemplateType, string> = {
    quote: `Genere une citation inspirante pour un post social media d'agence digitale en ${langLabel}. Sujet: ${data.topic || 'entrepreneuriat digital'}. JSON: {"text": "la citation", "author": "auteur", "subtitle": "contexte court"}`,
    stat: `Genere un post statistique impactant pour une agence digitale en ${langLabel}. Sujet: ${data.topic || 'ROI digital'}. JSON: {"number": "chiffre impressionnant", "label": "ce que ca mesure", "source": "source", "insight": "interpretation en 1 phrase"}`,
    testimonial: `Formate un temoignage client pour social media en ${langLabel}. Client: ${data.clientName || 'un client'}. JSON: {"text": "le temoignage (2-3 phrases)", "clientName": "nom", "role": "poste", "company": "entreprise", "rating": 5}`,
    'before-after': `Genere un post avant/apres pour une agence digitale en ${langLabel}. Sujet: ${data.topic || 'refonte site web'}. JSON: {"beforeTitle": "Avant", "beforePoints": ["point1","point2","point3"], "afterTitle": "Apres", "afterPoints": ["point1","point2","point3"], "result": "resultat chiffre"}`,
    listicle: `Genere une liste de ${data.count || 5} conseils pour un post social media en ${langLabel}. Sujet: ${data.topic || 'marketing digital'}. JSON: {"title": "titre accrocheur", "items": ["conseil 1", "conseil 2", ...], "cta": "call to action"}`,
    story: `Genere le contenu pour une story Instagram d'agence digitale en ${langLabel}. Sujet: ${data.topic || 'behind the scenes'}. JSON: {"headline": "titre court", "body": "texte court (max 30 mots)", "cta": "swipe up text", "emoji": "emoji pertinent"}`,
  };
  return prompts[type];
}

// ─── Template generators ────────────────────────────────────────────────────

function esc(s: unknown): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateTemplate(type: TemplateType, data: Record<string, unknown>, color: string, platform: string): string {
  const size = platform === 'story' || type === 'story' ? { w: 1080, h: 1920 } : { w: 1080, h: 1080 };
  const generators: Record<TemplateType, () => string> = {
    quote: () => quoteTemplate(data, color, size),
    stat: () => statTemplate(data, color, size),
    testimonial: () => testimonialTemplate(data, color, size),
    'before-after': () => beforeAfterTemplate(data, color, size),
    listicle: () => listicleTemplate(data, color, size),
    story: () => storyTemplate(data, color, { w: 1080, h: 1920 }),
  };
  return generators[type]();
}

function baseStyle(color: string, size: { w: number; h: number }): string {
  return `<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${size.w}px; height: ${size.h}px; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
  .slide { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px; position: relative; }
  .brand { position: absolute; bottom: 40px; font-size: 18px; font-weight: 700; color: ${color}; letter-spacing: 1px; }
</style>`;
}

function quoteTemplate(d: Record<string, unknown>, color: string, size: { w: number; h: number }): string {
  return `<!DOCTYPE html><html><head>${baseStyle(color, size)}
<style>.slide { background: linear-gradient(135deg, #0f0f23, #1a1a3e); color: white; text-align: center; }
.quote-mark { font-size: 120px; color: ${color}; line-height: 1; opacity: 0.6; } .quote-text { font-size: 42px; font-weight: 600; line-height: 1.4; max-width: 800px; margin: 24px 0; } .quote-author { font-size: 22px; color: ${color}; margin-top: 16px; } .quote-sub { font-size: 16px; color: #a1a1aa; }</style>
</head><body><div class="slide">
<div class="quote-mark">"</div>
<div class="quote-text">${esc(d.text || 'Votre citation ici')}</div>
<div class="quote-author">— ${esc(d.author || 'Auteur')}</div>
${d.subtitle ? `<div class="quote-sub">${esc(d.subtitle)}</div>` : ''}
<div class="brand">ALTCTRL.LAB</div>
</div></body></html>`;
}

function statTemplate(d: Record<string, unknown>, color: string, size: { w: number; h: number }): string {
  return `<!DOCTYPE html><html><head>${baseStyle(color, size)}
<style>.slide { background: #0f0f23; color: white; text-align: center; }
.stat-number { font-size: 140px; font-weight: 800; color: ${color}; line-height: 1; } .stat-label { font-size: 32px; font-weight: 600; margin-top: 16px; } .stat-insight { font-size: 20px; color: #a1a1aa; margin-top: 24px; max-width: 700px; line-height: 1.5; } .stat-source { font-size: 14px; color: #52525b; margin-top: 12px; }</style>
</head><body><div class="slide">
<div class="stat-number">${esc(d.number || '93%')}</div>
<div class="stat-label">${esc(d.label || 'des entreprises')}</div>
<div class="stat-insight">${esc(d.insight || '')}</div>
${d.source ? `<div class="stat-source">Source : ${esc(d.source)}</div>` : ''}
<div class="brand">ALTCTRL.LAB</div>
</div></body></html>`;
}

function testimonialTemplate(d: Record<string, unknown>, color: string, size: { w: number; h: number }): string {
  const stars = '★'.repeat(Number(d.rating) || 5) + '☆'.repeat(5 - (Number(d.rating) || 5));
  return `<!DOCTYPE html><html><head>${baseStyle(color, size)}
<style>.slide { background: linear-gradient(135deg, #0f0f23, #1a1a2e); color: white; text-align: center; }
.stars { font-size: 36px; color: #f59e0b; margin-bottom: 24px; } .testi-text { font-size: 34px; font-style: italic; line-height: 1.5; max-width: 800px; } .testi-name { font-size: 24px; font-weight: 700; color: ${color}; margin-top: 32px; } .testi-role { font-size: 18px; color: #a1a1aa; }</style>
</head><body><div class="slide">
<div class="stars">${stars}</div>
<div class="testi-text">"${esc(d.text || 'Temoignage client')}"</div>
<div class="testi-name">${esc(d.clientName || 'Client')}</div>
<div class="testi-role">${esc([d.role, d.company].filter(Boolean).join(' — '))}</div>
<div class="brand">ALTCTRL.LAB</div>
</div></body></html>`;
}

function beforeAfterTemplate(d: Record<string, unknown>, color: string, size: { w: number; h: number }): string {
  const before = (d.beforePoints as string[]) || ['Point 1', 'Point 2', 'Point 3'];
  const after = (d.afterPoints as string[]) || ['Point 1', 'Point 2', 'Point 3'];
  return `<!DOCTYPE html><html><head>${baseStyle(color, size)}
<style>.slide { background: #0f0f23; color: white; padding: 60px; }
.ba-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; width: 100%; } .ba-col { padding: 32px; border-radius: 16px; } .ba-before { background: #1a1a2e; } .ba-after { background: ${color}22; border: 2px solid ${color}; } .ba-title { font-size: 28px; font-weight: 700; margin-bottom: 20px; } .ba-before .ba-title { color: #ef4444; } .ba-after .ba-title { color: ${color}; } .ba-item { font-size: 20px; padding: 8px 0; border-bottom: 1px solid #333; } .ba-result { text-align: center; margin-top: 32px; font-size: 24px; font-weight: 700; color: ${color}; }</style>
</head><body><div class="slide">
<div class="ba-grid">
  <div class="ba-col ba-before"><div class="ba-title">${esc(d.beforeTitle || 'Avant')}</div>${before.map(p => `<div class="ba-item">✗ ${esc(p)}</div>`).join('')}</div>
  <div class="ba-col ba-after"><div class="ba-title">${esc(d.afterTitle || 'Apres')}</div>${after.map(p => `<div class="ba-item">✓ ${esc(p)}</div>`).join('')}</div>
</div>
${d.result ? `<div class="ba-result">${esc(d.result)}</div>` : ''}
<div class="brand">ALTCTRL.LAB</div>
</div></body></html>`;
}

function listicleTemplate(d: Record<string, unknown>, color: string, size: { w: number; h: number }): string {
  const items = (d.items as string[]) || ['Conseil 1', 'Conseil 2', 'Conseil 3'];
  return `<!DOCTYPE html><html><head>${baseStyle(color, size)}
<style>.slide { background: #0f0f23; color: white; align-items: flex-start; padding: 60px 80px; }
.list-title { font-size: 38px; font-weight: 800; margin-bottom: 32px; } .list-item { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; font-size: 22px; line-height: 1.4; } .list-num { background: ${color}; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; } .list-cta { margin-top: auto; font-size: 20px; color: ${color}; font-weight: 600; }</style>
</head><body><div class="slide">
<div class="list-title">${esc(d.title || 'Top conseils')}</div>
${items.map((item, i) => `<div class="list-item"><div class="list-num">${i + 1}</div><div>${esc(item)}</div></div>`).join('')}
${d.cta ? `<div class="list-cta">${esc(d.cta)}</div>` : ''}
<div class="brand">ALTCTRL.LAB</div>
</div></body></html>`;
}

function storyTemplate(d: Record<string, unknown>, color: string, size: { w: number; h: number }): string {
  return `<!DOCTYPE html><html><head>${baseStyle(color, size)}
<style>.slide { background: linear-gradient(180deg, ${color}, #0f0f23 70%); color: white; text-align: center; justify-content: flex-end; padding-bottom: 200px; }
.story-emoji { font-size: 80px; margin-bottom: 24px; } .story-headline { font-size: 48px; font-weight: 800; line-height: 1.2; margin-bottom: 16px; } .story-body { font-size: 24px; color: #d4d4d8; max-width: 700px; line-height: 1.5; } .story-cta { margin-top: 40px; background: white; color: #0f0f23; padding: 16px 40px; border-radius: 40px; font-size: 20px; font-weight: 700; }</style>
</head><body><div class="slide">
${d.emoji ? `<div class="story-emoji">${d.emoji}</div>` : ''}
<div class="story-headline">${esc(d.headline || 'Titre')}</div>
<div class="story-body">${esc(d.body || '')}</div>
${d.cta ? `<div class="story-cta">${esc(d.cta)}</div>` : ''}
<div class="brand" style="color: white;">ALTCTRL.LAB</div>
</div></body></html>`;
}
