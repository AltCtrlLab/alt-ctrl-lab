export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createLead, getDb } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY || '';
const MAILJET_API_KEY = process.env.MAILJET_API_KEY || '';
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || '';
const MAILJET_FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'hello@altctrllab.com';
const MAILJET_FROM_NAME = process.env.MAILJET_FROM_NAME || 'Alt Ctrl Lab';
const CAL_LINK = 'https://cal.com/altctrllab/discovery';

// Config campagne par défaut — surchargeable via env
const DEFAULT_NICHES = (process.env.PROSPECTION_NICHES || 'artisans,restaurants,PME locales').split(',');
const DEFAULT_VILLES = (process.env.PROSPECTION_VILLES || 'Genève,Lausanne,Annecy').split(',');
const MIN_SCORE = parseInt(process.env.PROSPECTION_MIN_SCORE || '65', 10);
const MAX_PER_RUN = parseInt(process.env.PROSPECTION_MAX_PER_RUN || '20', 10);

/**
 * POST /api/cron/prospection
 * Déclencheur : Railway cron — lundi 8h00
 * Pipeline : Google Places → PageSpeed → filtre <MIN_SCORE → Claude email → Mailjet → createLead
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = { scanned: 0, qualified: 0, skipped: 0, sent: 0, errors: [] as string[] };

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const rawDb = (getDb() as any).$client;

    // Construire les requêtes niche × ville
    const queries: string[] = [];
    for (const niche of DEFAULT_NICHES) {
      for (const ville of DEFAULT_VILLES) {
        queries.push(`${niche.trim()} ${ville.trim()}`);
      }
    }

    for (const query of queries) {
      // 1 — Google Places textsearch
      const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      placesUrl.searchParams.set('query', query);
      placesUrl.searchParams.set('language', 'fr');
      placesUrl.searchParams.set('key', GOOGLE_PLACES_KEY);

      const placesRes = await fetch(placesUrl.toString());
      if (!placesRes.ok) continue;
      const placesData = await placesRes.json();
      const places: any[] = placesData.results || [];

      for (const place of places.slice(0, 5)) {
        if (results.sent >= MAX_PER_RUN) break;
        results.scanned++;

        const website: string | null = place.website ?? null;
        const name: string = place.name;
        const address: string = place.formatted_address ?? '';

        if (!website) { results.skipped++; continue; }

        // 2 — Suppression check : email déjà contacté ?
        // On check par website URL plutôt qu'email (pas encore extrait)
        const existing = rawDb.prepare('SELECT id FROM leads WHERE website = ? COLLATE NOCASE').get(website);
        if (existing) { results.skipped++; continue; }

        // 3 — PageSpeed Insights
        let lighthouseScore: number | null = null;
        try {
          const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(website)}&strategy=mobile&key=${GOOGLE_PLACES_KEY}`;
          const psRes = await fetch(psUrl);
          if (psRes.ok) {
            const psData = await psRes.json();
            const perf = psData.lighthouseResult?.categories?.performance?.score;
            if (perf != null) lighthouseScore = Math.round(perf * 100);
          }
        } catch { /* ignore pagespeed errors */ }

        // 4 — Filtre score
        if (lighthouseScore !== null && lighthouseScore >= MIN_SCORE) {
          results.skipped++;
          continue;
        }

        results.qualified++;

        // 5 — Claude génère email personnalisé
        const scoreDesc = lighthouseScore !== null
          ? `score de performance mobile de ${lighthouseScore}/100`
          : 'des performances mobiles non optimisées';

        let emailSubject = `Votre site web perd des clients, ${name}`;
        let emailBody = '';

        try {
          const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 600,
            messages: [{
              role: 'user',
              content: `Tu es un consultant web. Rédige un cold email court (3 paragraphes max, ton direct et humain, pas de pitch agressif) pour ${name} à ${address}.

Le site ${website} a un ${scoreDesc}. Problèmes typiques : lenteur, mauvais SEO local, pas mobile-friendly.

Email doit :
- Commencer par une observation spécifique sur leur business/site (1 phrase)
- Expliquer brièvement l'impact business (clients perdus, SEO, conversions)
- Proposer un audit gratuit avec lien : ${CAL_LINK}

Format : juste le corps de l'email, sans objet, sans "Bonjour [Nom]" générique. Commence directement. Maximum 120 mots. En français.`,
            }],
          });
          emailBody = (msg.content[0] as any).text;
          // Extraire un objet depuis la réponse si présent
          const subjectMatch = emailBody.match(/^Objet\s*:\s*(.+)/im);
          if (subjectMatch) {
            emailSubject = subjectMatch[1].trim();
            emailBody = emailBody.replace(/^Objet\s*:.+\n?/im, '').trim();
          }
        } catch (e: any) {
          results.errors.push(`Claude error for ${name}: ${e.message}`);
          continue;
        }

        // 6 — Extraire email contact depuis Google Places details
        let contactEmail: string | null = null;
        try {
          if (place.place_id) {
            const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=website,formatted_phone_number&key=${GOOGLE_PLACES_KEY}`;
            const detailRes = await fetch(detailUrl);
            if (detailRes.ok) {
              const detail = await detailRes.json();
              // Google Places ne donne pas l'email, on essaie de trouver depuis le site
              // Méthode simplifiée : on construit l'email type contact@domain
              const domain = new URL(website).hostname.replace('www.', '');
              contactEmail = `contact@${domain}`;
            }
          }
        } catch { /* ignore */ }

        if (!contactEmail) {
          // Fallback : contact@domain
          try {
            const domain = new URL(website).hostname.replace('www.', '');
            contactEmail = `contact@${domain}`;
          } catch {
            results.skipped++;
            continue;
          }
        }

        // 7 — Mailjet envoi
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
                  TextPart: emailBody,
                  HTMLPart: emailBody.split('\n').map(l => `<p>${l}</p>`).join(''),
                }],
              }),
            });
            if (!mjRes.ok) {
              const err = await mjRes.text();
              results.errors.push(`Mailjet error for ${name}: ${err.substring(0, 100)}`);
            }
          } catch (e: any) {
            results.errors.push(`Mailjet send error for ${name}: ${e.message}`);
          }
        }

        // 8 — Créer lead dans cockpit
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
              `Query: ${query}`,
              `Email envoyé: ${emailSubject}`,
            ].filter(Boolean).join('\n'),
          });
          results.sent++;
        } catch (e: any) {
          results.errors.push(`createLead error for ${name}: ${e.message}`);
        }

        // Rate limiting : pause entre les prospects
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, data: results }, { status: 500 });
  }
}

// Trigger manuel depuis la page Prospection
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  // En dev ou via dashboard, on accepte sans auth stricte
  const isDev = process.env.NODE_ENV === 'development';
  const dashboardKey = request.headers.get('x-dashboard-key');
  if (!isDev && auth !== `Bearer ${CRON_SECRET}` && dashboardKey !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Déléguer au POST
  return POST(request);
}
