export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { logger } from '@/lib/logger';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

/**
 * POST /api/ai/linkedin-prospector
 * LinkedIn lead enrichment + outreach message generation.
 *
 * Two modes:
 * 1. enrich: Takes LinkedIn leads without email, uses agent fatah to scrape
 *    their website (if any) and find contact info
 * 2. generate: Generates personalized LinkedIn connection requests / DM / email
 *    messages for a batch of leads
 *
 * Body: { mode: 'enrich' | 'generate', leadIds?: string[], limit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { mode, leadIds, limit = 10 } = (await request.json()) as {
      mode: 'enrich' | 'generate';
      leadIds?: string[];
      limit?: number;
    };

    if (mode === 'enrich') {
      return handleEnrich(leadIds, limit);
    } else if (mode === 'generate') {
      return handleGenerate(leadIds, limit);
    }

    return NextResponse.json({ error: 'Invalid mode. Use "enrich" or "generate".' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('linkedin-prospector', 'Failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Enrich: find emails for LinkedIn leads ──────────────────────────────────

async function handleEnrich(leadIds: string[] | undefined, limit: number) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;
  const now = Date.now();

  // Get LinkedIn leads without email
  let leads: Array<{ id: string; name: string; company: string | null; website: string | null; notes: string | null }>;

  if (leadIds?.length) {
    const placeholders = leadIds.map(() => '?').join(',');
    leads = rawDb.prepare(`
      SELECT id, name, company, website, notes FROM leads
      WHERE id IN (${placeholders}) AND source = 'LinkedIn' AND (email IS NULL OR email = '')
    `).all(...leadIds) as typeof leads;
  } else {
    leads = rawDb.prepare(`
      SELECT id, name, company, website, notes FROM leads
      WHERE source = 'LinkedIn' AND (email IS NULL OR email = '')
      ORDER BY score DESC, created_at DESC
      LIMIT ?
    `).all(limit) as typeof leads;
  }

  if (leads.length === 0) {
    return NextResponse.json({ success: true, data: { enriched: 0, message: 'No LinkedIn leads without email' } });
  }

  const results = { enriched: 0, failed: 0, errors: [] as string[] };

  for (const lead of leads) {
    // Extract website/LinkedIn URL from notes or website field
    const profileUrl = extractLinkedInUrl(lead.notes, lead.website);
    const websiteUrl = lead.website && !lead.website.includes('linkedin.com') ? lead.website : null;

    if (!websiteUrl && !profileUrl) {
      results.failed++;
      continue;
    }

    // Try to find email via website scraping
    let email: string | null = null;

    if (websiteUrl) {
      email = await scrapeEmailFromWebsite(websiteUrl);
    }

    // If no email from website, try agent fatah for deeper research
    if (!email && profileUrl) {
      const prompt = `Trouve l'adresse email professionnelle de cette personne :
Nom: ${lead.name}
Entreprise: ${lead.company || 'N/A'}
LinkedIn: ${profileUrl}
Site web: ${websiteUrl || 'N/A'}

Cherche sur :
1. Le site web (page contact, mentions légales, whois)
2. Des patterns d'email courants (prenom@domaine, p.nom@domaine, etc.)
3. Des mentions dans des annuaires ou articles

Réponds UNIQUEMENT avec l'email trouvé, rien d'autre. Si tu ne trouves pas, réponds "NOT_FOUND".`;

      try {
        const result = await executeOpenClawAgent('fatah', prompt, 120000);
        if (result.success && result.stdout) {
          const found = result.stdout.trim();
          if (found !== 'NOT_FOUND' && found.includes('@') && found.length < 100) {
            email = found.toLowerCase();
          }
        }
      } catch {
        // Agent failed, continue
      }
    }

    if (email) {
      rawDb.prepare('UPDATE leads SET email = ?, updated_at = ? WHERE id = ?').run(email, now, lead.id);
      results.enriched++;
      logger.info('linkedin-prospector', 'Email found', { leadId: lead.id, email });
    } else {
      results.failed++;
    }
  }

  logger.info('linkedin-prospector', 'Enrichment completed', results);
  return NextResponse.json({ success: true, data: results });
}

// ─── Generate: personalized outreach messages ────────────────────────────────

interface OutreachMessage {
  leadId: string;
  leadName: string;
  connectionRequest: string;
  followUpDm: string;
  emailSubject: string;
  emailBody: string;
}

async function handleGenerate(leadIds: string[] | undefined, limit: number) {
  const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;

  let leads: Array<{ id: string; name: string; company: string | null; email: string | null; website: string | null; notes: string | null; score: number }>;

  if (leadIds?.length) {
    const placeholders = leadIds.map(() => '?').join(',');
    leads = rawDb.prepare(`
      SELECT id, name, company, email, website, notes, score FROM leads
      WHERE id IN (${placeholders}) AND source = 'LinkedIn'
    `).all(...leadIds) as typeof leads;
  } else {
    leads = rawDb.prepare(`
      SELECT id, name, company, email, website, notes, score FROM leads
      WHERE source = 'LinkedIn' AND status IN ('Nouveau', 'Qualifié', 'À creuser')
      ORDER BY score DESC
      LIMIT ?
    `).all(limit) as typeof leads;
  }

  if (leads.length === 0) {
    return NextResponse.json({ success: true, data: { messages: [], count: 0 } });
  }

  const messages: OutreachMessage[] = [];

  for (const lead of leads) {
    const headline = extractHeadline(lead.notes);

    const prompt = `Tu es un expert en prospection LinkedIn pour Alt Ctrl Lab (agence digitale premium, Paris).
Génère 3 messages personnalisés pour ce prospect :

Nom: ${lead.name}
Entreprise: ${lead.company || 'N/A'}
Headline: ${headline || 'N/A'}
Score: ${lead.score}/10
Site web: ${lead.website || 'Aucun'}

1. **Connection Request** (max 300 chars, LinkedIn limit)
   - Personnel, pas de pitch
   - Mentionne un point commun ou une observation sur leur profil
   - Pas de "j'aimerais vous ajouter à mon réseau"

2. **Follow-up DM** (max 500 chars, envoyé 3j après connexion)
   - Apporte de la valeur (un insight, une stat pertinente)
   - Soft CTA : proposition d'échange, pas de vente directe

3. **Cold Email** (si on a leur email, sujet + corps 120 mots max)
   - Sujet court et intrigant
   - Corps: problème → solution → CTA (appel 15 min)
   - Lien: https://cal.com/altctrllab/discovery

Réponds en JSON strict :
{
  "connectionRequest": "...",
  "followUpDm": "...",
  "emailSubject": "...",
  "emailBody": "..."
}
Langue: français.`;

    try {
      const content = await callKimi(prompt);
      if (content) {
        messages.push({
          leadId: lead.id,
          leadName: lead.name,
          ...content,
        });
      }
    } catch (err) {
      logger.warn('linkedin-prospector', 'Generation failed for lead', {
        leadId: lead.id,
        error: err instanceof Error ? err.message : 'Unknown',
      });
    }
  }

  logger.info('linkedin-prospector', 'Messages generated', { count: messages.length, total: leads.length });
  return NextResponse.json({ success: true, data: { messages, count: messages.length } });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractLinkedInUrl(notes: string | null, website: string | null): string | null {
  const sources = [notes, website].filter(Boolean).join(' ');
  const match = sources.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s"')]+/i);
  return match?.[0] || null;
}

function extractHeadline(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Headline:\s*(.+)/i);
  return match?.[1]?.trim() || null;
}

async function scrapeEmailFromWebsite(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AltCtrlBot/1.0)' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract emails from page
    const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const emails = [...new Set(matches.map(e => e.toLowerCase()))];

    // Filter out generic/platform emails
    const blacklist = ['noreply', 'no-reply', 'support', 'info@wix', 'info@squarespace', 'example.com'];
    const filtered = emails.filter(e => !blacklist.some(b => e.includes(b)));

    return filtered[0] || null;
  } catch {
    return null;
  }
}

async function callKimi(prompt: string): Promise<{ connectionRequest: string; followUpDm: string; emailSubject: string; emailBody: string } | null> {
  if (!KIMI_API_KEY) return null;

  try {
    const res = await fetch(KIMI_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_API_KEY}` },
      body: JSON.stringify({ model: 'kimi-k2.5', messages: [{ role: 'user', content: prompt }], temperature: 0.7 }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
