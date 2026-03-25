export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

interface AuditResult {
  url: string;
  score: number;
  performance: AuditCategory;
  seo: AuditCategory;
  accessibility: AuditCategory;
  security: AuditCategory;
  recommendations: string[];
  generatedAt: number;
}

interface AuditCategory {
  score: number;
  issues: string[];
}

/**
 * POST /api/ai/seo-audit
 * Full SEO/Performance audit of a website.
 * Uses Puppeteer-extra for crawl + Kimi for analysis + optional agent matin for deep dive.
 *
 * Body: { url: string, deep?: boolean, leadId?: string }
 * - deep: true → uses OpenClaw agent matin for a full technical analysis (slower, ~5min)
 * - deep: false → quick Puppeteer crawl + Kimi analysis (~30s)
 */
export async function POST(request: NextRequest) {
  try {
    const { url, deep, leadId } = (await request.json()) as {
      url: string;
      deep?: boolean;
      leadId?: string;
    };

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    logger.info('seo-audit', 'Starting audit', { url, deep, leadId });

    // Step 1: Quick technical crawl via fetch (no Puppeteer needed for basic checks)
    const techData = await quickTechAudit(url);

    // Step 2: AI analysis
    let aiAnalysis: string | null = null;

    if (deep) {
      // Deep mode: use agent matin for comprehensive analysis
      const prompt = `Tu es un expert SEO technique et performance web. Audite ce site :
URL: ${url}

Données techniques collectées :
${JSON.stringify(techData, null, 2)}

Fais un audit complet :
1. Performance (temps de chargement, taille page, ressources bloquantes)
2. SEO technique (meta tags, headings, robots.txt, sitemap, canonical)
3. Accessibilité (ARIA, contraste, alt tags)
4. Sécurité (HTTPS, headers, CSP)

Pour chaque catégorie, donne un score /100 et liste les 3-5 problèmes les plus critiques.
Termine par les 10 recommandations prioritaires classées par impact.

Réponds en JSON strict :
{
  "performance": { "score": N, "issues": ["..."] },
  "seo": { "score": N, "issues": ["..."] },
  "accessibility": { "score": N, "issues": ["..."] },
  "security": { "score": N, "issues": ["..."] },
  "recommendations": ["..."]
}`;

      const result = await executeOpenClawAgent('matin', prompt, 300000);
      if (result.success && result.stdout) {
        aiAnalysis = result.stdout;
      }
    }

    // If no deep analysis or agent failed, use Kimi
    if (!aiAnalysis) {
      aiAnalysis = await kimiAnalysis(url, techData);
    }

    // Parse AI analysis
    let parsed: Omit<AuditResult, 'url' | 'score' | 'generatedAt'>;
    try {
      const cleaned = (aiAnalysis || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback scoring based on tech data
      parsed = buildFallbackAnalysis(techData);
    }

    const overallScore = Math.round(
      (parsed.performance.score + parsed.seo.score + parsed.accessibility.score + parsed.security.score) / 4,
    );

    const audit: AuditResult = {
      url,
      score: overallScore,
      ...parsed,
      generatedAt: Date.now(),
    };

    // Save to DB
    try {
      const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
      const now = Date.now();
      const id = `audit_${now}_${Math.random().toString(36).substr(2, 9)}`;

      rawDb.prepare(`
        INSERT INTO business_insights (id, topic, source, insight, recommendation, priority, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(
        id,
        'SEO Audit',
        url,
        JSON.stringify(audit),
        (audit.recommendations || []).slice(0, 3).join(' | '),
        overallScore >= 80 ? 'low' : overallScore >= 50 ? 'medium' : 'high',
        now,
      );

      // Update lead website_score if linked
      if (leadId) {
        rawDb.prepare('UPDATE leads SET website_score = ?, updated_at = ? WHERE id = ?')
          .run(overallScore, now, leadId);
      }
    } catch (dbErr) {
      logger.warn('seo-audit', 'Failed to save to DB', { error: dbErr instanceof Error ? dbErr.message : 'Unknown' });
    }

    logger.info('seo-audit', 'Audit completed', { url, score: overallScore, deep: !!deep });
    return NextResponse.json({ success: true, data: audit });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('seo-audit', 'Audit failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Quick technical audit (no Puppeteer, just HTTP) ──────────────────────────

interface TechData {
  statusCode: number;
  loadTimeMs: number;
  contentLength: number;
  hasHttps: boolean;
  headers: Record<string, string>;
  meta: {
    title: string | null;
    description: string | null;
    hasViewport: boolean;
    hasCanonical: boolean;
    hasRobotsTxt: boolean;
    hasSitemap: boolean;
    ogTags: number;
    h1Count: number;
    imgWithoutAlt: number;
    totalImages: number;
  };
}

async function quickTechAudit(url: string): Promise<TechData> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AltCtrlLab-SEO-Auditor/1.0' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    const html = await res.text();
    const loadTimeMs = Date.now() - start;

    // Parse meta info from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    const viewportMatch = html.match(/<meta\s+name=["']viewport["']/i);
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']/i);
    const ogMatches = html.match(/<meta\s+property=["']og:/gi) || [];
    const h1Matches = html.match(/<h1[\s>]/gi) || [];
    const imgMatches = html.match(/<img\s/gi) || [];
    const imgAltMatches = html.match(/<img\s[^>]*alt=["'][^"']+["']/gi) || [];

    // Check robots.txt and sitemap
    const baseUrl = new URL(url).origin;
    let hasRobotsTxt = false;
    let hasSitemap = false;

    try {
      const robotsRes = await fetch(`${baseUrl}/robots.txt`, { signal: AbortSignal.timeout(5000) });
      hasRobotsTxt = robotsRes.ok && (await robotsRes.text()).length > 10;
    } catch { /* ignore */ }

    try {
      const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`, { signal: AbortSignal.timeout(5000) });
      hasSitemap = sitemapRes.ok && (await sitemapRes.text()).includes('<urlset');
    } catch { /* ignore */ }

    // Collect security headers
    const secHeaders: Record<string, string> = {};
    for (const key of ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options']) {
      const val = res.headers.get(key);
      if (val) secHeaders[key] = val;
    }

    return {
      statusCode: res.status,
      loadTimeMs,
      contentLength: html.length,
      hasHttps: url.startsWith('https'),
      headers: secHeaders,
      meta: {
        title: titleMatch?.[1]?.trim() || null,
        description: descMatch?.[1]?.trim() || null,
        hasViewport: !!viewportMatch,
        hasCanonical: !!canonicalMatch,
        hasRobotsTxt,
        hasSitemap,
        ogTags: ogMatches.length,
        h1Count: h1Matches.length,
        imgWithoutAlt: imgMatches.length - imgAltMatches.length,
        totalImages: imgMatches.length,
      },
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      statusCode: 0,
      loadTimeMs: Date.now() - start,
      contentLength: 0,
      hasHttps: url.startsWith('https'),
      headers: {},
      meta: {
        title: null, description: null, hasViewport: false, hasCanonical: false,
        hasRobotsTxt: false, hasSitemap: false, ogTags: 0, h1Count: 0, imgWithoutAlt: 0, totalImages: 0,
      },
    };
  }
}

// ─── Kimi analysis ────────────────────────────────────────────────────────────

async function kimiAnalysis(url: string, techData: TechData): Promise<string | null> {
  if (!KIMI_API_KEY) return null;

  const prompt = `Audite ce site web et donne un rapport SEO/Performance :
URL: ${url}
Status: ${techData.statusCode}
Temps chargement: ${techData.loadTimeMs}ms
HTTPS: ${techData.hasHttps}
Titre: ${techData.meta.title || 'MANQUANT'}
Description: ${techData.meta.description || 'MANQUANTE'}
Viewport: ${techData.meta.hasViewport}
Canonical: ${techData.meta.hasCanonical}
robots.txt: ${techData.meta.hasRobotsTxt}
sitemap.xml: ${techData.meta.hasSitemap}
OG Tags: ${techData.meta.ogTags}
H1: ${techData.meta.h1Count}
Images sans alt: ${techData.meta.imgWithoutAlt}/${techData.meta.totalImages}
Security headers: ${JSON.stringify(techData.headers)}

Réponds en JSON strict :
{
  "performance": { "score": N, "issues": ["..."] },
  "seo": { "score": N, "issues": ["..."] },
  "accessibility": { "score": N, "issues": ["..."] },
  "security": { "score": N, "issues": ["..."] },
  "recommendations": ["les 10 recommandations prioritaires"]
}`;

  try {
    const res = await fetch(KIMI_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
      body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.3 }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// ─── Fallback analysis ────────────────────────────────────────────────────────

function buildFallbackAnalysis(t: TechData) {
  const perfIssues: string[] = [];
  const seoIssues: string[] = [];
  const a11yIssues: string[] = [];
  const secIssues: string[] = [];

  // Performance
  let perfScore = 100;
  if (t.loadTimeMs > 3000) { perfIssues.push(`Temps de chargement élevé: ${t.loadTimeMs}ms`); perfScore -= 30; }
  else if (t.loadTimeMs > 1500) { perfIssues.push(`Temps de chargement moyen: ${t.loadTimeMs}ms`); perfScore -= 15; }
  if (t.contentLength > 500000) { perfIssues.push('Page trop lourde (>500KB HTML)'); perfScore -= 20; }

  // SEO
  let seoScore = 100;
  if (!t.meta.title) { seoIssues.push('Titre manquant'); seoScore -= 25; }
  if (!t.meta.description) { seoIssues.push('Meta description manquante'); seoScore -= 20; }
  if (!t.meta.hasCanonical) { seoIssues.push('Canonical manquant'); seoScore -= 10; }
  if (!t.meta.hasRobotsTxt) { seoIssues.push('robots.txt manquant'); seoScore -= 15; }
  if (!t.meta.hasSitemap) { seoIssues.push('sitemap.xml manquant'); seoScore -= 15; }
  if (t.meta.h1Count === 0) { seoIssues.push('Aucun H1 trouvé'); seoScore -= 15; }
  if (t.meta.h1Count > 1) { seoIssues.push(`${t.meta.h1Count} H1 trouvés (devrait être 1)`); seoScore -= 10; }
  if (t.meta.ogTags === 0) { seoIssues.push('Aucun Open Graph tag'); seoScore -= 10; }

  // Accessibility
  let a11yScore = 100;
  if (!t.meta.hasViewport) { a11yIssues.push('Viewport meta manquant'); a11yScore -= 25; }
  if (t.meta.imgWithoutAlt > 0) { a11yIssues.push(`${t.meta.imgWithoutAlt} images sans attribut alt`); a11yScore -= Math.min(t.meta.imgWithoutAlt * 5, 30); }

  // Security
  let secScore = 100;
  if (!t.hasHttps) { secIssues.push('Pas de HTTPS'); secScore -= 40; }
  if (!t.headers['strict-transport-security']) { secIssues.push('HSTS manquant'); secScore -= 15; }
  if (!t.headers['content-security-policy']) { secIssues.push('CSP manquant'); secScore -= 15; }
  if (!t.headers['x-frame-options']) { secIssues.push('X-Frame-Options manquant'); secScore -= 10; }
  if (!t.headers['x-content-type-options']) { secIssues.push('X-Content-Type-Options manquant'); secScore -= 10; }

  const recommendations = [
    ...seoIssues.slice(0, 3).map(i => `Corriger : ${i}`),
    ...perfIssues.slice(0, 2).map(i => `Optimiser : ${i}`),
    ...secIssues.slice(0, 3).map(i => `Sécuriser : ${i}`),
    ...a11yIssues.slice(0, 2).map(i => `Accessibilité : ${i}`),
  ].slice(0, 10);

  return {
    performance: { score: Math.max(perfScore, 0), issues: perfIssues },
    seo: { score: Math.max(seoScore, 0), issues: seoIssues },
    accessibility: { score: Math.max(a11yScore, 0), issues: a11yIssues },
    security: { score: Math.max(secScore, 0), issues: secIssues },
    recommendations,
  };
}
