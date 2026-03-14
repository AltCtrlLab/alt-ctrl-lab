export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { createLead, getDb } from '@/lib/db';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';

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

/**
 * POST /api/cron/prospection
 * Réponse : Server-Sent Events pour suivi temps réel
 * Body : { niches?, villes?, minScore?, maxLeads? }
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const dashKey = request.headers.get('x-dashboard-key');
  if (auth !== `Bearer ${CRON_SECRET}` && dashKey !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let bodyConfig: { niches?: string[]; villes?: string[]; minScore?: number; maxLeads?: number } = {};
  try { bodyConfig = await request.json(); } catch { /* defaults */ }

  const niches = bodyConfig.niches?.length ? bodyConfig.niches : ENV_NICHES;
  const villes = bodyConfig.villes?.length ? bodyConfig.villes : ENV_VILLES;
  const minScore = bodyConfig.minScore ?? ENV_MIN_SCORE;
  const maxLeads = bodyConfig.maxLeads ?? ENV_MAX_PER_RUN;

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

        send('start', { message: `Campagne démarrée — ${maxLeads} emails cibles · ${queries.length} recherches`, config: { niches, villes, minScore, maxLeads } });

        outer: for (const query of queries) {
          if (results.sent >= maxLeads) break;

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

            // Google requires ~2s delay before using nextPageToken
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

            // 1 — Récupérer website via Place Details (textsearch ne le retourne pas)
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

            // 2 — Suppression check
            const existing = rawDb.prepare('SELECT id FROM leads WHERE website = ? COLLATE NOCASE').get(website);
            if (existing) {
              results.skipped++;
              send('skip', { message: `   ↳ ${name} — déjà contacté` });
              continue;
            }

            send('scan', { message: `   ↳ ${name} — audit Lighthouse en cours...` });

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
            } catch { /* ignore */ }

            // 4 — Filtre score
            if (lighthouseScore === null) {
              results.skipped++;
              send('skip', { message: `   ↳ ${name} — score indisponible (PageSpeed KO)` });
              continue;
            }
            if (lighthouseScore >= minScore) {
              results.skipped++;
              send('skip', { message: `   ↳ ${name} — score ${lighthouseScore}/100 (trop bon, pas ciblé)` });
              continue;
            }

            results.qualified++;
            send('qualify', { message: `   ✅ ${name} — score ${lighthouseScore}/100 — qualifié !`, score: lighthouseScore });

            // 5 — Claude email
            send('claude', { message: `   ✍️ Génération email personnalisé pour ${name}...` });
            const scoreDesc = lighthouseScore !== null
              ? `score de performance mobile de ${lighthouseScore}/100`
              : 'des performances mobiles non optimisées';

            let emailSubject = `Votre site web perd des clients, ${name}`;
            let emailBody = '';

            try {
              const prompt = `Tu es un consultant web. Rédige un cold email court (3 paragraphes max, ton direct et humain, pas de pitch agressif) pour ${name} à ${address}.

Le site ${website} a un ${scoreDesc}. Problèmes typiques : lenteur, mauvais SEO local, pas mobile-friendly.

Email doit :
- Commencer par une observation spécifique sur leur business/site (1 phrase)
- Expliquer brièvement l'impact business (clients perdus, SEO, conversions)
- Proposer un audit gratuit avec lien : ${CAL_LINK}

Format : juste le corps de l'email, sans objet, sans "Bonjour [Nom]" générique. Commence directement. Maximum 120 mots. En français.`;

              const result = await executeOpenClawAgent('khatib', prompt, 60000);
              emailBody = (result.stdout || result.stderr || '').trim();
              if (!emailBody) throw new Error('Réponse vide de OpenClaw');
              const subjectMatch = emailBody.match(/^(?:Objet|Subject)\s*:\s*(.+)/im);
              if (subjectMatch) {
                emailSubject = subjectMatch[1].trim();
                emailBody = emailBody.replace(/^Objet\s*:.+\n?/im, '').trim();
              }
            } catch (e: any) {
              results.errors.push(`Claude error for ${name}: ${e.message}`);
              send('error', { message: `   ❌ Erreur Claude pour ${name}: ${e.message}` });
              continue;
            }

            // 6 — Email contact (contact@domain)
            let contactEmail: string | null = null;
            try {
              const domain = new URL(website).hostname.replace('www.', '');
              contactEmail = `contact@${domain}`;
            } catch {
              results.skipped++;
              continue;
            }

            // 7 — Mailjet
            send('send', { message: `   📧 Envoi à ${contactEmail}...` });
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
                  send('warn', { message: `   ⚠️ Mailjet warning: ${err.substring(0, 80)}` });
                }
              } catch (e: any) {
                send('warn', { message: `   ⚠️ Mailjet erreur: ${e.message}` });
              }
            }

            // 8 — createLead
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
                ].filter(Boolean).join('\n'),
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

        const reached = results.sent >= maxLeads;
        send('complete', {
          message: reached
            ? `✅ Objectif atteint — ${results.sent} leads générés`
            : `⚠️ Objectif non atteint — ${results.sent}/${maxLeads} leads (toutes les sources épuisées)`,
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
