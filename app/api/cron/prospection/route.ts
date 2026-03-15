export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { createLead, getDb } from '@/lib/db';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import fs from 'fs';
import path from 'path';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY || '';
const MAILJET_API_KEY = process.env.MAILJET_API_KEY || '';
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || '';
const MAILJET_FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'hello@altctrllab.com';
const MAILJET_FROM_NAME = process.env.MAILJET_FROM_NAME || 'Alt Ctrl Lab';
const CAL_LINK = 'https://cal.com/altctrllab/discovery';

const ENV_NICHES = (process.env.PROSPECTION_NICHES || 'artisans,restaurants,PME locales').split(',');
const ENV_VILLES = (process.env.PROSPECTION_VILLES || 'Genève,Lausanne,Annecy').split(',');
const ENV_MIN_SCORE = parseInt(process.env.PROSPECTION_MIN_SCORE || '65', 10);
const ENV_MAX_PER_RUN = parseInt(process.env.PROSPECTION_MAX_PER_RUN || '10', 10);

// ─── Platform email blacklist ──────────────────────────────────────────────
const EMAIL_DOMAIN_BLACKLIST = [
  'planity.com', 'doctolib.fr', 'facebook.com', 'instagram.com', 'google.com',
  'booking.com', 'tripadvisor.com', 'tripadvisor.fr', 'yelp.com', 'pagesjaunes.fr',
  'wix.com', 'squarespace.com', 'wordpress.com', 'gmail.com', 'yahoo.com',
  'outlook.com', 'hotmail.com', 'live.com', 'orange.fr', 'free.fr', 'sfr.fr',
];

// ─── Level 1 : Extraction email rapide (regex sur homepage) ─────────────────
async function extractEmailFast(url: string): Promise<string | null> {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    if (EMAIL_DOMAIN_BLACKLIST.some(b => domain.includes(b))) return null;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Regex emails from page
    const regexMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const allEmails = regexMatches.map(e => e.toLowerCase());

    // Déduplique + filtre blacklist
    const unique = [...new Set(allEmails)];
    const filtered = unique.filter(email => {
      const emailDomain = email.split('@')[1];
      if (!emailDomain) return false;
      if (EMAIL_DOMAIN_BLACKLIST.some(b => emailDomain.includes(b))) return false;
      if (email.includes('.png') || email.includes('.jpg') || email.includes('.svg')) return false;
      if (email.length < 5 || email.length > 80) return false;
      return true;
    });

    if (filtered.length === 0) return null;

    // Priorisation
    const sameDomain = filtered.find(e => e.endsWith('@' + domain));
    if (sameDomain) return sameDomain;
    const infoEmail = filtered.find(e => e.startsWith('info@'));
    if (infoEmail) return infoEmail;
    const contactEmail = filtered.find(e => e.startsWith('contact@'));
    if (contactEmail) return contactEmail;
    return filtered[0];
  } catch {
    return null;
  }
}

// ─── Level 2 : Agent IA chercheur d'email ───────────────────────────────────
interface AgentEmailResult {
  email: string | null;
  confidence: number;
  source_url: string;
}

function isValidAgentEmailResult(data: unknown): data is AgentEmailResult {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.confidence !== 'number' || obj.confidence < 1 || obj.confidence > 100) return false;
  if (typeof obj.source_url !== 'string') return false;
  if (obj.email !== null) {
    if (typeof obj.email !== 'string') return false;
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(obj.email)) return false;
  }
  return true;
}

async function extractEmailAgent(url: string, companyName: string): Promise<AgentEmailResult | null> {
  try {
    const prompt = `Tu es un extracteur de données B2B impitoyable. Ta mission : trouver l'adresse email de contact de l'entreprise "${companyName}" dont le site web est ${url}.

MÉTHODE :
1. Cherche l'email dans le DOM de la homepage (mailto:, texte visible)
2. Cherche dans les pages /contact, /mentions-légales, /impressum, /a-propos, /equipe
3. Cherche dans les balises JSON-LD (schema.org)

RÈGLES STRICTES :
- INTERDICTION de deviner ou inventer un email
- INTERDICTION de générer contact@domain ou info@domain par défaut
- Tu dois avoir TROUVÉ l'email sur une page réelle
- Si tu ne trouves rien, email = null

Réponds UNIQUEMENT avec ce JSON (rien d'autre) :
{"email": "found@example.com", "confidence": 85, "source_url": "https://example.com/contact"}

Si aucun email trouvé :
{"email": null, "confidence": 0, "source_url": "${url}"}`;

    const result = await executeOpenClawAgent('data_miner', prompt, 120000);
    if (!result.success) return null;

    const output = (result.stdout || '').trim();
    // Extract JSON from output (agent may add extra text)
    const jsonMatch = output.match(/\{[\s\S]*?"email"[\s\S]*?"confidence"[\s\S]*?"source_url"[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!isValidAgentEmailResult(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─── P0: Gatekeeper de délivrabilité (MX + SMTP check) ─────────────────────
async function verifyEmailDeliverability(email: string): Promise<{ valid: boolean; reason: string }> {
  const domain = email.split('@')[1];
  if (!domain) return { valid: false, reason: 'domaine invalide' };

  try {
    // Step 1 — MX record check via DNS-over-HTTPS (works in serverless)
    const dnsRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!dnsRes.ok) return { valid: false, reason: 'DNS lookup échoué' };
    const dnsData = await dnsRes.json();

    // Check for MX records
    const mxRecords = dnsData.Answer?.filter((r: any) => r.type === 15) || [];
    if (mxRecords.length === 0) {
      // No MX records — check for A record as fallback (some domains handle mail on A)
      const aRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, {
        signal: AbortSignal.timeout(3000),
      });
      if (aRes.ok) {
        const aData = await aRes.json();
        const aRecords = aData.Answer?.filter((r: any) => r.type === 1) || [];
        if (aRecords.length === 0) {
          return { valid: false, reason: 'aucun MX/A record — domaine ne reçoit pas d\'emails' };
        }
        // Has A record but no MX — risky but possible
        return { valid: true, reason: 'A record uniquement (pas de MX) — délivrabilité incertaine' };
      }
      return { valid: false, reason: 'aucun MX record' };
    }

    // Step 2 — SMTP verification via external API (MailboxLayer / free alternative)
    // We use a lightweight SMTP check via an external validator API
    // Note: direct SMTP from serverless is unreliable (firewalled), so we use API
    const verifyApiKey = process.env.EMAIL_VERIFY_API_KEY || '';
    if (verifyApiKey) {
      try {
        const verifyRes = await fetch(
          `https://emailvalidation.abstractapi.com/v1/?api_key=${verifyApiKey}&email=${encodeURIComponent(email)}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          // AbstractAPI returns deliverability status
          if (verifyData.deliverability === 'UNDELIVERABLE') {
            return { valid: false, reason: `SMTP rejeté — boîte mail inexistante (${verifyData.deliverability})` };
          }
          if (verifyData.is_disposable_email?.value) {
            return { valid: false, reason: 'email jetable détecté' };
          }
          // DELIVERABLE or RISKY — proceed
          return { valid: true, reason: `vérifié (${verifyData.deliverability || 'MX OK'})` };
        }
      } catch { /* API down — fall through to MX-only validation */ }
    }

    // MX records exist but no SMTP API available — trust MX
    return { valid: true, reason: `MX vérifié (${mxRecords.length} record${mxRecords.length > 1 ? 's' : ''})` };
  } catch {
    // DNS error — don't block, but flag
    return { valid: true, reason: 'vérification DNS échouée — MX non confirmé' };
  }
}

// ─── HTML Email Template ────────────────────────────────────────────────────
// Template fichier editable : lib/email/prospection-template.html
let _cachedTemplate: string | null = null;

function loadEmailTemplate(): string {
  if (_cachedTemplate) return _cachedTemplate;
  try {
    const templatePath = path.join(process.cwd(), 'lib/email/prospection-template.html');
    _cachedTemplate = fs.readFileSync(templatePath, 'utf-8');
    return _cachedTemplate;
  } catch {
    return '<html><body><p>{{intro}}</p><p>{{impact}}</p><p><a href="{{cal_link}}">Réserver un audit</a></p></body></html>';
  }
}

function buildEmailHTML(params: {
  name: string;
  website: string;
  score: number | null;
  claudeIntroDynamique: string;
  claudeImpactDynamique: string;
  calLink: string;
}) {
  const { name, website, score, claudeIntroDynamique, claudeImpactDynamique, calLink } = params;
  const scoreDisplay = score !== null ? `${score}` : '—';
  const scoreColor = score === null ? '#6b7280' : score < 40 ? '#ef4444' : score < 65 ? '#f59e0b' : '#22c55e';
  const scoreLabel = score === null ? 'Non mesuré' : score < 40 ? 'Critique' : score < 65 ? 'À améliorer' : 'Correct';
  const loadTime = score !== null && score < 50 ? '&gt; 4 secondes' : 'À vérifier';
  const domain = (() => { try { return new URL(website).hostname.replace('www.', ''); } catch { return website; } })();

  const scoreUx = score === null ? 'Non mesuré' : score < 40 ? 'Faible' : score < 65 ? 'Moyen' : 'Bon';
  const scoreSeo = score === null ? 'Non mesuré' : score < 50 ? 'À revoir' : 'Acceptable';

  return loadEmailTemplate()
    .replace(/\{\{claude_intro_dynamique\}\}/g, claudeIntroDynamique)
    .replace(/\{\{claude_impact_dynamique\}\}/g, claudeImpactDynamique)
    .replace(/\{\{domain\}\}/g, domain)
    .replace(/\{\{score_display\}\}/g, scoreDisplay)
    .replace(/\{\{score_color\}\}/g, scoreColor)
    .replace(/\{\{score_label\}\}/g, scoreLabel)
    .replace(/\{\{score_ux\}\}/g, scoreUx)
    .replace(/\{\{score_seo\}\}/g, scoreSeo)
    .replace(/\{\{load_time\}\}/g, loadTime)
    .replace(/\{\{cal_link\}\}/g, calLink)
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{website\}\}/g, website);
}

let _cachedTemplateInstagram: string | null = null;
let _cachedTemplateLinkedin: string | null = null;

function loadInstagramTemplate(): string {
  if (_cachedTemplateInstagram) return _cachedTemplateInstagram;
  try {
    const p = path.join(process.cwd(), 'lib/email/prospection-template-instagram.html');
    _cachedTemplateInstagram = fs.readFileSync(p, 'utf-8');
    return _cachedTemplateInstagram;
  } catch {
    return '<html><body><p>{{intro}}</p><p>{{impact}}</p><p><a href="{{cal_link}}">Réserver un audit</a></p></body></html>';
  }
}

function loadLinkedinTemplate(): string {
  if (_cachedTemplateLinkedin) return _cachedTemplateLinkedin;
  try {
    const p = path.join(process.cwd(), 'lib/email/prospection-template-linkedin.html');
    _cachedTemplateLinkedin = fs.readFileSync(p, 'utf-8');
    return _cachedTemplateLinkedin;
  } catch {
    return '<html><body><p>{{intro}}</p><p>{{impact}}</p><p><a href="{{cal_link}}">Réserver un audit</a></p></body></html>';
  }
}

function buildInstagramEmailHTML(params: {
  name: string; intro: string; impact: string; instagramHandle: string; followersCount: string; calLink: string;
}) {
  return loadInstagramTemplate()
    .replace(/\{\{intro\}\}/g, params.intro)
    .replace(/\{\{impact\}\}/g, params.impact)
    .replace(/\{\{instagram_handle\}\}/g, params.instagramHandle)
    .replace(/\{\{followers_count\}\}/g, params.followersCount)
    .replace(/\{\{cal_link\}\}/g, params.calLink)
    .replace(/\{\{name\}\}/g, params.name);
}

function buildLinkedinEmailHTML(params: {
  name: string; intro: string; impact: string; linkedinHeadline: string; calLink: string;
}) {
  return loadLinkedinTemplate()
    .replace(/\{\{intro\}\}/g, params.intro)
    .replace(/\{\{impact\}\}/g, params.impact)
    .replace(/\{\{linkedin_headline\}\}/g, params.linkedinHeadline)
    .replace(/\{\{cal_link\}\}/g, params.calLink)
    .replace(/\{\{name\}\}/g, params.name);
}

// ─── Fallback phrases (si Claude API échoue) ─────────────────────────────
function getFallbackParagraphs(name: string, website: string, score: number | null) {
  const loadTime = score !== null && score < 50 ? 'plus de 4 secondes' : 'un temps de chargement élevé';

  return {
    claudeIntroDynamique: `Dans votre secteur, une expérience utilisateur lente détruit instantanément la <span style="color:#ff00aa;font-weight:800;">confiance</span> de vos prospects.`,
    claudeImpactDynamique: `Avec ${loadTime}, vous perdez mécaniquement <span style="color:#ff00aa;font-weight:800;">40% de vos conversions</span> sur mobile.`,
  };
}

// ─── Personnalisation IA via Agent ───────────────────────────────────────────
async function personalizeWithAgent(params: {
  name: string;
  address: string;
  website: string;
  score: number | null;
  niche: string;
}): Promise<{ claudeIntroDynamique: string; claudeImpactDynamique: string } | null> {
  try {
    const { name, address, website, score, niche } = params;

    const loadTime = score !== null && score < 50 ? `${Math.max(3, Math.round(10 - score / 10))}s` : 'un temps élevé';
    const scoreText = score !== null ? `Score PageSpeed mobile : ${score}/100.` : 'Score PageSpeed non disponible.';
    const badScoreDetected = score !== null
      ? `Score mobile ${score}/100, temps de chargement ~${loadTime}`
      : 'Score non mesurable (site trop lent ou mal configuré)';

    const prompt = `Tu es un expert en Growth Marketing B2B et un auditeur technique senior. Ton but est de rédiger deux courtes phrases pour un e-mail de prospection à froid.
Ton ton doit être : direct, lucide, chirurgical, sans aucune complaisance ni flatterie. Pas de blabla, va droit au but.

Règle de formatage stricte : Tu peux mettre en valeur 1 à 2 mots maximum par phrase en utilisant EXACTEMENT cette balise HTML : <span style="color:#ff00aa;font-weight:800;">le mot clé</span>. Ne dépasse jamais 2 mots mis en valeur par phrase.

CONTEXTE :
- Entreprise : ${name}
- Secteur : ${niche}
- Localisation : ${address}
- Site web : ${website}
- ${scoreText}
- Mauvais score détecté : ${badScoreDetected}

Tâche 1 - Variable CLAUDE_INTRO_DYNAMIQUE :
Rédige UNE seule phrase contextuelle (max 15 mots) basée sur le secteur "${niche}".
Exemple : "Dans le secteur de la restauration, une expérience utilisateur lente détruit instantanément la <span style="color:#ff00aa;font-weight:800;">confiance</span> de vos prospects."

Tâche 2 - Variable CLAUDE_IMPACT_DYNAMIQUE :
Rédige UNE seule phrase (max 20 mots) qui lie le mauvais score technique (${badScoreDetected}) à une perte de chiffre d'affaires.
Exemple : "Avec un temps de chargement de ${loadTime}, vous perdez mécaniquement <span style="color:#ff00aa;font-weight:800;">40% de vos conversions</span> sur mobile."

FORMAT STRICT (respecte EXACTEMENT) :
CLAUDE_INTRO_DYNAMIQUE: [phrase]
CLAUDE_IMPACT_DYNAMIQUE: [phrase]`;

    const result = await executeOpenClawAgent('khatib', prompt, 60000);
    if (!result.success) return null;

    const text = (result.stdout || '').trim();
    const introMatch = text.match(/CLAUDE_INTRO_DYNAMIQUE:\s*([\s\S]*?)(?=CLAUDE_IMPACT_DYNAMIQUE:|$)/i);
    const impactMatch = text.match(/CLAUDE_IMPACT_DYNAMIQUE:\s*([\s\S]*?)$/i);

    if (introMatch && impactMatch) {
      return {
        claudeIntroDynamique: introMatch[1].trim(),
        claudeImpactDynamique: impactMatch[1].trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function personalizeForInstagram(params: {
  name: string; address: string; instagramHandle: string; followersCount: string; niche: string;
}): Promise<{ intro: string; impact: string } | null> {
  try {
    const { name, address, instagramHandle, followersCount, niche } = params;
    const prompt = `Tu es le directeur créatif d'une agence digitale premium. Tu écris un DM Instagram / email court et percutant.

CONTEXTE PROSPECT :
- Entreprise : ${name}
- Secteur : ${niche}
- Localisation : ${address}
- Instagram : @${instagramHandle} (${followersCount} followers)
- PAS de site web (ou site très basique)

NOTRE AGENCE : ALT CTRL LAB — laboratoire digital qui crée des sites web pour les entreprises locales.

OBJECTIF : Convaincre cette entreprise qu'un site web pro multiplierait l'impact de leur présence Instagram.

Pour le INTRO (max 60 mots) :
- Accroche : tu as vu leur Instagram, leur contenu est top
- Observation : malgré cette présence Instagram, ils n'ont pas de site web
- Curiosité : pourquoi on les contacte

Pour le IMPACT (max 80 mots) :
- Douleur : les clients cherchent sur Google, pas sur Instagram
- Coût : sans site, ils perdent les clients qui ne sont pas sur Instagram
- Vision : un site web + leur Instagram = visibilité complète

RÈGLES :
- Ton conversationnel, pas corporate
- "Nous" / "Notre équipe", jamais "Je"
- Pas de formules génériques
- Spécifique au secteur ${niche}

FORMAT STRICT :
INTRO: [texte]
IMPACT: [texte]`;

    const result = await executeOpenClawAgent('khatib', prompt, 60000);
    if (!result.success) return null;
    const text = (result.stdout || '').trim();
    const introMatch = text.match(/INTRO:\s*([\s\S]*?)(?=IMPACT:|$)/i);
    const impactMatch = text.match(/IMPACT:\s*([\s\S]*?)$/i);
    if (introMatch && impactMatch) {
      return { intro: introMatch[1].trim(), impact: impactMatch[1].trim() };
    }
    return null;
  } catch { return null; }
}

async function personalizeForLinkedin(params: {
  name: string; linkedinHeadline: string; niche: string;
}): Promise<{ intro: string; impact: string } | null> {
  try {
    const { name, linkedinHeadline, niche } = params;
    const prompt = `Tu es le directeur créatif d'une agence digitale premium. Tu écris un cold email pour un professionnel trouvé sur LinkedIn.

CONTEXTE PROSPECT :
- Nom : ${name}
- Headline LinkedIn : ${linkedinHeadline}
- Secteur : ${niche}
- Pas de site web personnel / professionnel

NOTRE AGENCE : ALT CTRL LAB — laboratoire digital qui crée des sites web professionnels.

OBJECTIF : Convaincre que leur expertise LinkedIn mérite une vitrine web dédiée.

Pour le INTRO (max 60 mots) :
- Accroche : leur profil LinkedIn montre une vraie expertise
- Observation : pas de site web pour capitaliser dessus
- Curiosité : pourquoi on les contacte

Pour le IMPACT (max 80 mots) :
- Douleur : LinkedIn c'est bien mais c'est une plateforme qu'ils ne contrôlent pas
- Coût : sans site, ils dépendent de l'algorithme LinkedIn
- Vision : un site web = leur propre plateforme, SEO, crédibilité pro

RÈGLES :
- Ton professionnel mais humain
- "Nous" / "Notre équipe", jamais "Je"
- Spécifique à leur expertise

FORMAT STRICT :
INTRO: [texte]
IMPACT: [texte]`;

    const result = await executeOpenClawAgent('khatib', prompt, 60000);
    if (!result.success) return null;
    const text = (result.stdout || '').trim();
    const introMatch = text.match(/INTRO:\s*([\s\S]*?)(?=IMPACT:|$)/i);
    const impactMatch = text.match(/IMPACT:\s*([\s\S]*?)$/i);
    if (introMatch && impactMatch) {
      return { intro: introMatch[1].trim(), impact: impactMatch[1].trim() };
    }
    return null;
  } catch { return null; }
}

/**
 * POST /api/cron/prospection
 * Réponse : Server-Sent Events pour suivi temps réel
 * Body : { niches?, villes?, minScore?, maxLeads?, emailTemplate?, channel? }
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const dashKey = request.headers.get('x-dashboard-key');
  if (auth !== `Bearer ${CRON_SECRET}` && dashKey !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let bodyConfig: { niches?: string[]; villes?: string[]; minScore?: number; maxLeads?: number; emailTemplate?: string; channel?: 'google-maps' | 'instagram' | 'linkedin' } = {};
  try { bodyConfig = await request.json(); } catch { /* defaults */ }

  const niches = bodyConfig.niches?.length ? bodyConfig.niches : ENV_NICHES;
  const villes = bodyConfig.villes?.length ? bodyConfig.villes : ENV_VILLES;
  const minScore = bodyConfig.minScore ?? ENV_MIN_SCORE;
  const maxLeads = bodyConfig.maxLeads ?? ENV_MAX_PER_RUN;
  const channel = bodyConfig.channel || 'google-maps';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, payload: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`));
        } catch { /* client disconnected */ }
      };

      const results = { scanned: 0, qualified: 0, skipped: 0, sent: 0, errors: [] as string[] };

      try {
        const rawDb = (getDb() as any).$client;

        const queries: string[] = [];
        for (const niche of niches) {
          for (const ville of villes) {
            queries.push(`${niche.trim()} ${ville.trim()}`);
          }
        }

        if (channel === 'google-maps') {
        send('start', { message: `Campagne démarrée — ${maxLeads} leads cibles · ${queries.length} recherches`, config: { niches, villes, minScore, maxLeads, channel } });

        outer: for (const query of queries) {
          if (results.sent >= maxLeads) break;

          // Extract niche from query (first word before city)
          const queryNiche = query.split(' ').slice(0, -1).join(' ') || query;

          send('query', { message: `🔍 Recherche : ${query}` });

          let nextPageToken: string | undefined;
          let pageNum = 0;

          do {
            pageNum++;
            const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
            placesUrl.searchParams.set('query', query);
            placesUrl.searchParams.set('language', 'fr');
            placesUrl.searchParams.set('key', GOOGLE_PLACES_KEY);
            if (nextPageToken) placesUrl.searchParams.set('pagetoken', nextPageToken);

            if (nextPageToken) await new Promise(r => setTimeout(r, 2000));

            const placesRes = await fetch(placesUrl.toString());
            if (!placesRes.ok) {
              send('warn', { message: `⚠️ Places API erreur pour "${query}"` });
              break;
            }
            const placesData = await placesRes.json();
            const places: any[] = placesData.results || [];
            nextPageToken = placesData.next_page_token;
            send('info', { message: `   ${places.length} lieux trouvés (page ${pageNum})` });

          for (const place of places) {
            if (results.sent >= maxLeads) break outer;

            const name: string = place.name;
            const address: string = place.formatted_address ?? '';
            results.scanned++;

            // 1 — Website
            let website: string | null = place.website ?? null;
            if (!website && place.place_id) {
              try {
                const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=website&key=${GOOGLE_PLACES_KEY}`;
                const detailRes = await fetch(detailUrl);
                if (detailRes.ok) {
                  const detail = await detailRes.json();
                  website = detail.result?.website ?? null;
                }
              } catch { /* ignore */ }
            }

            if (!website) {
              results.skipped++;
              send('skip', { message: `   ↳ ${name} — pas de site web` });
              continue;
            }

            // 2 — Dedup (website OR name)
            const existingByWebsite = rawDb.prepare('SELECT id FROM leads WHERE website = ? COLLATE NOCASE').get(website);
            const existingByName = rawDb.prepare('SELECT id FROM leads WHERE (company = ? OR name = ?) COLLATE NOCASE').get(name, name);
            if (existingByWebsite || existingByName) {
              results.skipped++;
              send('skip', { message: `   ↳ ${name} — déjà en base` });
              continue;
            }

            send('scan', { message: `   ↳ ${name} — audit Lighthouse en cours...` });

            // 3 — PageSpeed
            let lighthouseScore: number | null = null;
            try {
              const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(website)}&strategy=mobile${GOOGLE_PLACES_KEY ? `&key=${GOOGLE_PLACES_KEY}` : ''}`;
              const psRes = await fetch(psUrl);
              if (psRes.ok) {
                const psData = await psRes.json();
                const perf = psData.lighthouseResult?.categories?.performance?.score;
                if (perf != null) lighthouseScore = Math.round(perf * 100);
              }
            } catch { /* ignore */ }

            // 4 — Score filter
            if (lighthouseScore !== null && lighthouseScore >= minScore) {
              results.skipped++;
              send('skip', { message: `   ↳ ${name} — score ${lighthouseScore}/100 (trop bon)` });
              continue;
            }

            results.qualified++;
            const scoreLabel = lighthouseScore !== null ? `${lighthouseScore}/100` : 'non vérifié';
            send('qualify', { message: `   ✅ ${name} — score ${scoreLabel} — qualifié !` });

            // 5 — Personnalisation Claude + template HTML
            send('info', { message: `   🤖 Personnalisation IA pour ${name}...` });

            const personalized = await personalizeWithAgent({
              name, address, website, score: lighthouseScore, niche: queryNiche,
            });

            const { claudeIntroDynamique, claudeImpactDynamique } = personalized || getFallbackParagraphs(name, website, lighthouseScore);

            if (personalized) {
              send('info', { message: `   ✨ Email personnalisé par Claude` });
            } else {
              send('warn', { message: `   ⚠️ Fallback template (Claude indisponible)` });
            }

            const emailSubject = `${name} — nous avons analysé votre site web`;
            const emailHTML = buildEmailHTML({
              name, website, score: lighthouseScore, claudeIntroDynamique, claudeImpactDynamique, calLink: CAL_LINK,
            });

            // Plain text version (stripped HTML tags for plain text)
            const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '');
            const domain = (() => { try { return new URL(website).hostname.replace('www.', ''); } catch { return website; } })();
            const emailText = `Bonjour,\n\nVotre site web n'est pas qu'une simple vitrine, c'est votre moteur d'acquisition principal.\n\nNotre scan d'infrastructure révèle des frictions techniques majeures sur ${domain} qui brident votre croissance actuelle.\n\n${stripHtml(claudeIntroDynamique)}\n\n${stripHtml(claudeImpactDynamique)}\n\nUne interface non-optimisée est un client offert directement à vos concurrents.\n\nRéservez un audit gratuit (15 min, sans engagement) :\n${CAL_LINK}\n\nL'équipe Alt Ctrl Lab\nhello@altctrllab.com`;

            // 6 — Extraction email déterministe (zéro fallback)
            let contactEmail: string | null = null;
            let emailSource = '';
            const siteDomain = (() => { try { return new URL(website).hostname.replace('www.', ''); } catch { return ''; } })();

            // 6a — Level 1 : Extraction rapide (regex homepage)
            send('info', { message: `   🔎 Level 1 — extraction rapide depuis ${website}...` });
            contactEmail = await extractEmailFast(website);
            if (contactEmail) {
              emailSource = 'Level 1 (regex)';
              send('info', { message: `   ✉️ Email trouvé (${emailSource}) : ${contactEmail}` });
            }

            // 6b — Level 2 : Agent IA chercheur si Level 1 échoue
            if (!contactEmail) {
              send('info', { message: `   🤖 Level 2 — Agent IA chercheur pour ${name}...` });
              const agentResult = await extractEmailAgent(website, name);
              if (agentResult?.email && agentResult.confidence >= 50) {
                contactEmail = agentResult.email;
                emailSource = `Level 2 (agent, confiance ${agentResult.confidence}%, source: ${agentResult.source_url})`;
                send('info', { message: `   ✉️ Email trouvé (${emailSource}) : ${contactEmail}` });
              } else if (agentResult?.email) {
                send('warn', { message: `   ⚠️ Agent a trouvé ${agentResult.email} mais confiance trop basse (${agentResult.confidence}%)` });
              }
            }

            // 6c — ÉCHEC_ENRICHISSEMENT : aucun email trouvé → on crée le lead mais on n'envoie PAS
            if (!contactEmail) {
              send('warn', { message: `   ⚠️ ÉCHEC_ENRICHISSEMENT — aucun email déterministe trouvé` });
              // Créer le lead sans email pour suivi manuel
              try {
                await createLead({
                  name,
                  email: null,
                  company: name,
                  source: 'GMB',
                  status: 'Nouveau',
                  website,
                  websiteScore: lighthouseScore,
                  emailSentCount: 0,
                  lastContactedAt: null,
                  notes: [
                    'Source: cold-email (Google Maps)',
                    '⚠️ ÉCHEC_ENRICHISSEMENT — email non trouvé',
                    `Site: ${website}`,
                    lighthouseScore !== null ? `Score Lighthouse: ${lighthouseScore}/100` : null,
                    `Adresse: ${address}`,
                    `Niche: ${queryNiche}`,
                    `Méthode: Level 1 (regex) + Level 2 (agent IA) → aucun résultat`,
                    `Action requise: recherche manuelle de l'email`,
                  ].filter(x => x !== null).join('\n'),
                });
                results.sent++;
                send('done_lead', { message: `   📋 Lead créé SANS email — ${name} (enrichissement manuel requis) (${results.sent}/${maxLeads})`, current: results.sent, total: maxLeads });
              } catch (e: any) {
                results.errors.push(`createLead error for ${name}: ${e.message}`);
              }
              continue;
            }

            // 6d — Gatekeeper : validation MX + SMTP avant envoi
            send('info', { message: `   🛡️ Vérification délivrabilité ${contactEmail}...` });
            const deliverability = await verifyEmailDeliverability(contactEmail);
            if (!deliverability.valid) {
              send('warn', { message: `   ❌ Email rejeté : ${deliverability.reason}` });
              // Créer le lead avec email invalide flaggé
              try {
                await createLead({
                  name,
                  email: contactEmail,
                  company: name,
                  source: 'GMB',
                  status: 'Nouveau',
                  website,
                  websiteScore: lighthouseScore,
                  emailSentCount: 0,
                  lastContactedAt: null,
                  notes: [
                    'Source: cold-email (Google Maps)',
                    `⚠️ EMAIL NON VÉRIFIÉ — ${deliverability.reason}`,
                    `Email trouvé (${emailSource}): ${contactEmail}`,
                    `Site: ${website}`,
                    lighthouseScore !== null ? `Score Lighthouse: ${lighthouseScore}/100` : null,
                    `Adresse: ${address}`,
                    `Niche: ${queryNiche}`,
                  ].filter(x => x !== null).join('\n'),
                });
                results.sent++;
                send('done_lead', { message: `   📋 Lead créé — email non vérifié (${deliverability.reason}) (${results.sent}/${maxLeads})`, current: results.sent, total: maxLeads });
              } catch (e: any) {
                results.errors.push(`createLead error for ${name}: ${e.message}`);
              }
              continue;
            }
            send('info', { message: `   ✅ Délivrabilité confirmée : ${deliverability.reason}` });

            // 7 — Mailjet (email vérifié uniquement)
            send('send', { message: `   📧 Envoi à ${contactEmail} (${emailSource})...` });
            if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
              try {
                const mjRes = await fetch('https://api.mailjet.com/v3.1/send', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Basic ' + Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64'),
                  },
                  body: JSON.stringify({
                    Messages: [{
                      From: { Email: MAILJET_FROM_EMAIL, Name: MAILJET_FROM_NAME },
                      To: [{ Email: contactEmail, Name: name }],
                      Subject: emailSubject,
                      TextPart: emailText,
                      HTMLPart: emailHTML,
                    }],
                  }),
                });
                if (!mjRes.ok) {
                  const err = await mjRes.text();
                  send('warn', { message: `   ⚠️ Mailjet: ${err.substring(0, 100)}` });
                }
              } catch (e: any) {
                send('warn', { message: `   ⚠️ Mailjet erreur: ${e.message}` });
              }
            }

            // 8 — Create lead
            try {
              await createLead({
                name,
                email: contactEmail,
                company: name,
                source: 'GMB',
                status: 'Nouveau',
                website,
                websiteScore: lighthouseScore,
                emailSentCount: 1,
                lastContactedAt: Date.now(),
                notes: [
                  'Source: cold-email (Google Maps)',
                  `Site: ${website}`,
                  lighthouseScore !== null ? `Score Lighthouse: ${lighthouseScore}/100` : null,
                  `Adresse: ${address}`,
                  `Niche: ${queryNiche}`,
                  `Email trouvé via: ${emailSource}`,
                  `Délivrabilité: ${deliverability.reason}`,
                  `Personnalisé: ${personalized ? 'Claude IA' : 'Template par défaut'}`,
                  ``,
                  `--- EMAIL ENVOYÉ ---`,
                  `Objet: ${emailSubject}`,
                  `À: ${contactEmail}`,
                  `Date: ${new Date().toLocaleString('fr-FR')}`,
                  ``,
                  `--- EMAIL HTML ---`,
                  emailHTML,
                ].filter(x => x !== null).join('\n'),
              });
              results.sent++;
              send('done_lead', { message: `   🎯 Lead créé — ${name} (${results.sent}/${maxLeads})`, current: results.sent, total: maxLeads });
            } catch (e: any) {
              results.errors.push(`createLead error for ${name}: ${e.message}`);
              send('error', { message: `   ❌ createLead erreur: ${e.message}` });
            }

            await new Promise(r => setTimeout(r, 300));
          }
          } while (nextPageToken && results.sent < maxLeads);
        }
        } else if (channel === 'instagram') {
          // Instagram flow
          send('start', { message: `📸 Campagne Instagram — ${maxLeads} leads cibles`, config: { niches, villes, minScore, maxLeads, channel } });

          outer_ig: for (const query of queries) {
            if (results.sent >= maxLeads) break;
            const queryNiche = query.split(' ').slice(0, -1).join(' ') || query;
            send('query', { message: `🔍 Recherche : ${query}` });

            const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
            placesUrl.searchParams.set('query', query);
            placesUrl.searchParams.set('language', 'fr');
            placesUrl.searchParams.set('key', GOOGLE_PLACES_KEY);

            const placesRes = await fetch(placesUrl.toString());
            if (!placesRes.ok) { send('warn', { message: `⚠️ Places API erreur` }); continue; }
            const placesData = await placesRes.json();
            const places: any[] = placesData.results || [];

            for (const place of places) {
              if (results.sent >= maxLeads) break outer_ig;
              const name: string = place.name;
              const address: string = place.formatted_address ?? '';
              results.scanned++;

              // Get website
              let website: string | null = place.website ?? null;
              if (!website && place.place_id) {
                try {
                  const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=website&key=${GOOGLE_PLACES_KEY}`;
                  const detailRes = await fetch(detailUrl);
                  if (detailRes.ok) {
                    const detail = await detailRes.json();
                    website = detail.result?.website ?? null;
                  }
                } catch {}
              }

              // Instagram filter: KEEP those WITHOUT a website or with very bad score
              let lighthouseScore: number | null = null;
              if (website) {
                try {
                  const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(website)}&strategy=mobile${GOOGLE_PLACES_KEY ? `&key=${GOOGLE_PLACES_KEY}` : ''}`;
                  const psRes = await fetch(psUrl);
                  if (psRes.ok) {
                    const psData = await psRes.json();
                    const perf = psData.lighthouseResult?.categories?.performance?.score;
                    if (perf != null) lighthouseScore = Math.round(perf * 100);
                  }
                } catch {}

                // Skip if they have a decent website (score > 30)
                if (lighthouseScore !== null && lighthouseScore > 30) {
                  results.skipped++;
                  send('skip', { message: `   ↳ ${name} — site web correct (${lighthouseScore}/100), pas la cible Instagram` });
                  continue;
                }
              }

              // Dedup
              const existingByName = rawDb.prepare('SELECT id FROM leads WHERE (company = ? OR name = ?) COLLATE NOCASE').get(name, name);
              if (existingByName) {
                results.skipped++;
                send('skip', { message: `   ↳ ${name} — déjà en base` });
                continue;
              }

              // Search Instagram via Google
              send('scan', { message: `   ↳ ${name} — recherche Instagram...` });
              let instagramHandle: string | null = null;
              let followersCount = '—';
              const ville = query.split(' ').pop() || '';
              try {
                const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_PLACES_KEY}&cx=${process.env.GOOGLE_CSE_ID || ''}&q="${encodeURIComponent(name)}" site:instagram.com ${encodeURIComponent(ville)}&num=1`;
                const searchRes = await fetch(searchUrl);
                if (searchRes.ok) {
                  const searchData = await searchRes.json();
                  const firstResult = searchData.items?.[0];
                  if (firstResult?.link?.includes('instagram.com')) {
                    const handleMatch = firstResult.link.match(/instagram\.com\/([^/?]+)/);
                    if (handleMatch) instagramHandle = handleMatch[1];
                    // Try to get followers from snippet/metatags
                    const snippet = firstResult.snippet || '';
                    const followersMatch = snippet.match(/([\d,.]+[KkMm]?)\s*[Ff]ollowers/);
                    if (followersMatch) followersCount = followersMatch[1];
                  }
                }
              } catch {}

              if (!instagramHandle) {
                results.skipped++;
                send('skip', { message: `   ↳ ${name} — pas d'Instagram trouvé` });
                continue;
              }

              results.qualified++;
              send('qualify', { message: `   ✅ ${name} — @${instagramHandle} (${followersCount} followers)` });

              // Personalize with Claude
              send('info', { message: `   🤖 Personnalisation IA pour ${name}...` });
              const personalized = await personalizeForInstagram({
                name, address, instagramHandle, followersCount, niche: queryNiche,
              });

              const intro = personalized?.intro || `Nous avons découvert votre compte Instagram @${instagramHandle} et votre activité dans le secteur ${queryNiche} à ${ville}. Votre contenu est engageant, mais nous avons remarqué que vous n'avez pas de site web professionnel pour capitaliser sur cette audience.`;
              const impact = personalized?.impact || `Saviez-vous que 97% des consommateurs recherchent une entreprise locale sur Google avant de se déplacer ? Sans site web, vous êtes invisible pour tous ceux qui ne sont pas sur Instagram. Un site web professionnel, connecté à votre Instagram, multiplierait votre visibilité et vos conversions.`;

              // Build DM message (short, conversational)
              const dmMessage = `Bonjour ${name} 👋\n\nNous avons découvert votre compte @${instagramHandle} — votre contenu est vraiment top ! Notre équipe aide les entreprises comme la vôtre à créer un site web pro qui travaille pour vous 24/7.\n\nIntéressé(e) par un audit gratuit de 15 min ? ${CAL_LINK}`;

              // Try to find an email for email outreach too (cascade Level 1 → Level 2)
              let contactEmail: string | null = null;
              if (website) {
                contactEmail = await extractEmailFast(website);
                if (!contactEmail) {
                  const agentResult = await extractEmailAgent(website, name);
                  if (agentResult?.email && agentResult.confidence >= 50) {
                    contactEmail = agentResult.email;
                  }
                }
                // Validate if found
                if (contactEmail) {
                  const igDeliverability = await verifyEmailDeliverability(contactEmail);
                  if (!igDeliverability.valid) contactEmail = null;
                }
              }

              // Send email if we have one
              if (contactEmail && MAILJET_API_KEY && MAILJET_SECRET_KEY) {
                const emailSubject = `${name} — votre Instagram mérite un site web`;
                const emailHTML = buildInstagramEmailHTML({
                  name, intro, impact, instagramHandle, followersCount, calLink: CAL_LINK,
                });
                send('send', { message: `   📧 Envoi à ${contactEmail}...` });
                try {
                  await fetch('https://api.mailjet.com/v3.1/send', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: 'Basic ' + Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64'),
                    },
                    body: JSON.stringify({
                      Messages: [{
                        From: { Email: MAILJET_FROM_EMAIL, Name: MAILJET_FROM_NAME },
                        To: [{ Email: contactEmail, Name: name }],
                        Subject: emailSubject,
                        TextPart: `Bonjour,\n\n${intro}\n\n${impact}\n\nRéservez un audit gratuit :\n${CAL_LINK}\n\nL'équipe Alt Ctrl Lab`,
                        HTMLPart: emailHTML,
                      }],
                    }),
                  });
                } catch {}
              }

              // Create lead
              try {
                await createLead({
                  name,
                  email: contactEmail,
                  company: name,
                  source: 'Instagram',
                  status: 'Nouveau',
                  website: website || `https://instagram.com/${instagramHandle}`,
                  websiteScore: lighthouseScore,
                  emailSentCount: contactEmail ? 1 : 0,
                  lastContactedAt: contactEmail ? Date.now() : null,
                  notes: [
                    `Source: Instagram (@${instagramHandle})`,
                    `Followers: ${followersCount}`,
                    website ? `Site: ${website}` : 'Pas de site web',
                    lighthouseScore !== null ? `Score Lighthouse: ${lighthouseScore}/100` : null,
                    `Adresse: ${address}`,
                    `Niche: ${queryNiche}`,
                    ``,
                    `--- MESSAGE DM ---`,
                    dmMessage,
                    contactEmail ? `\n--- EMAIL ENVOYÉ ---\nObjet: ${name} — votre Instagram mérite un site web\nÀ: ${contactEmail}\nDate: ${new Date().toLocaleString('fr-FR')}` : null,
                  ].filter(x => x !== null).join('\n'),
                });
                results.sent++;
                send('done_lead', { message: `   🎯 Lead créé — ${name} (@${instagramHandle}) (${results.sent}/${maxLeads})`, current: results.sent, total: maxLeads });
              } catch (e: any) {
                results.errors.push(`createLead error for ${name}: ${e.message}`);
                send('error', { message: `   ❌ Erreur: ${e.message}` });
              }

              await new Promise(r => setTimeout(r, 300));
            }
          }
        } else if (channel === 'linkedin') {
          // LinkedIn flow
          send('start', { message: `💼 Campagne LinkedIn — ${maxLeads} leads cibles`, config: { niches, villes, minScore, maxLeads, channel } });

          for (const query of queries) {
            if (results.sent >= maxLeads) break;
            const queryNiche = query.split(' ').slice(0, -1).join(' ') || query;
            const ville = query.split(' ').pop() || '';
            send('query', { message: `🔍 Recherche LinkedIn : ${query}` });

            // Search Google for LinkedIn profiles
            try {
              const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_PLACES_KEY}&cx=${process.env.GOOGLE_CSE_ID || ''}&q="${encodeURIComponent(queryNiche)}" "${encodeURIComponent(ville)}" site:linkedin.com/in/&num=10`;
              const searchRes = await fetch(searchUrl);
              if (!searchRes.ok) { send('warn', { message: `⚠️ Google Search erreur` }); continue; }
              const searchData = await searchRes.json();
              const items = searchData.items || [];
              send('info', { message: `   ${items.length} profils trouvés` });

              for (const item of items) {
                if (results.sent >= maxLeads) break;
                results.scanned++;

                const profileUrl = item.link || '';
                const title = item.title || '';
                const snippet = item.snippet || '';
                // Extract name from title (usually "FirstName LastName - Headline | LinkedIn")
                const nameParts = title.split(/\s*[-–|]\s*/);
                const profileName = nameParts[0]?.trim() || title;
                const headline = nameParts[1]?.trim() || snippet.substring(0, 100);

                // Dedup
                const existing = rawDb.prepare('SELECT id FROM leads WHERE (company = ? OR name = ?) COLLATE NOCASE').get(profileName, profileName);
                if (existing) {
                  results.skipped++;
                  send('skip', { message: `   ↳ ${profileName} — déjà en base` });
                  continue;
                }

                // Check for website in search results
                let website: string | null = null;
                // Try to find a website mentioned in the snippet
                const urlMatch = snippet.match(/https?:\/\/[^\s"'<>]+\.[a-z]{2,}/i);
                if (urlMatch && !urlMatch[0].includes('linkedin.com')) {
                  website = urlMatch[0];
                }

                results.qualified++;
                send('qualify', { message: `   ✅ ${profileName} — "${headline}"` });

                // Personalize
                send('info', { message: `   🤖 Personnalisation IA pour ${profileName}...` });
                const personalized = await personalizeForLinkedin({
                  name: profileName, linkedinHeadline: headline, niche: queryNiche,
                });

                const intro = personalized?.intro || `Nous avons découvert votre profil LinkedIn et votre expertise en tant que "${headline}". Votre parcours est impressionnant, mais nous avons remarqué que vous n'avez pas de site web dédié pour mettre en valeur votre expertise.`;
                const impact = personalized?.impact || `LinkedIn est un excellent réseau professionnel, mais vous dépendez de leur algorithme pour votre visibilité. Un site web personnel vous donne le contrôle total : SEO, portfolio, témoignages clients, prise de RDV automatisée. C'est votre vitrine digitale disponible 24/7.`;

                // No automatic email for LinkedIn (we don't have their email)
                // Just create the lead with the LinkedIn template ready

                try {
                  const emailHTML = buildLinkedinEmailHTML({
                    name: profileName, intro, impact, linkedinHeadline: headline, calLink: CAL_LINK,
                  });

                  await createLead({
                    name: profileName,
                    email: null,
                    company: profileName,
                    source: 'LinkedIn',
                    status: 'Nouveau',
                    website: website || profileUrl,
                    websiteScore: null,
                    emailSentCount: 0,
                    lastContactedAt: null,
                    notes: [
                      `Source: LinkedIn`,
                      `Profil: ${profileUrl}`,
                      `Headline: ${headline}`,
                      `Niche: ${queryNiche}`,
                      `Ville: ${ville}`,
                      ``,
                      `--- EMAIL PRÊT (non envoyé) ---`,
                      `Objet: ${profileName} — votre expertise mérite une vitrine web`,
                      ``,
                      `--- EMAIL HTML ---`,
                      emailHTML,
                    ].join('\n'),
                  });
                  results.sent++;
                  send('done_lead', { message: `   🎯 Lead créé — ${profileName} (${results.sent}/${maxLeads})`, current: results.sent, total: maxLeads });
                } catch (e: any) {
                  results.errors.push(`createLead error for ${profileName}: ${e.message}`);
                  send('error', { message: `   ❌ Erreur: ${e.message}` });
                }

                await new Promise(r => setTimeout(r, 300));
              }
            } catch (e: any) {
              send('warn', { message: `⚠️ Erreur recherche: ${e.message}` });
            }
          }
        }

        const reached = results.sent >= maxLeads;
        send('complete', {
          message: reached
            ? `✅ Objectif atteint — ${results.sent} leads générés`
            : `⚠️ Objectif non atteint — ${results.sent}/${maxLeads} leads (sources épuisées)`,
          reached,
          results,
        });
      } catch (err: any) {
        send('fatal', { message: `❌ Erreur fatale: ${err.message}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
