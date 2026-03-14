export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { createLead, getDb } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

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

// ─── HTML Email Template ────────────────────────────────────────────────────
function buildEmailHTML(params: {
  name: string;
  website: string;
  score: number | null;
  intro: string;
  impact: string;
  calLink: string;
}) {
  const { name, website, score, intro, impact, calLink } = params;
  const scoreDisplay = score !== null ? `${score}` : '—';
  const scoreColor = score === null ? '#6b7280' : score < 40 ? '#ef4444' : score < 65 ? '#f59e0b' : '#22c55e';
  const scoreLabel = score === null ? 'Non mesuré' : score < 40 ? 'Critique' : score < 65 ? 'À améliorer' : 'Correct';
  const domain = (() => { try { return new URL(website).hostname.replace('www.', ''); } catch { return website; } })();

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#18181b 0%,#1c1917 100%);border-radius:16px 16px 0 0;padding:32px 40px;border-bottom:1px solid rgba(251,146,60,0.2);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:20px;font-weight:700;color:#fb923c;letter-spacing:-0.5px;">ALT CTRL LAB</span>
                <span style="font-size:12px;color:#71717a;margin-left:12px;">Performance & Growth Digital</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- INTRO -->
        <tr><td style="background-color:#18181b;padding:40px 40px 24px;">
          <p style="margin:0 0 8px;font-size:15px;color:#a1a1aa;">Bonjour,</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#e4e4e7;">
            ${intro}
          </p>
        </td></tr>

        <!-- DIAGNOSTIC SECTION -->
        <tr><td style="background-color:#18181b;padding:0 40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(251,146,60,0.08) 0%,rgba(251,146,60,0.02) 100%);border:1px solid rgba(251,146,60,0.15);border-radius:12px;">
            <tr><td style="padding:24px;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#fb923c;text-transform:uppercase;letter-spacing:1.5px;">
                📊 Diagnostic rapide — ${domain}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Score circle -->
                  <td width="80" valign="top">
                    <div style="width:64px;height:64px;border-radius:50%;border:3px solid ${scoreColor};display:flex;align-items:center;justify-content:center;text-align:center;line-height:64px;">
                      <span style="font-size:22px;font-weight:800;color:${scoreColor};">${scoreDisplay}</span>
                    </div>
                  </td>
                  <!-- Metrics -->
                  <td valign="top" style="padding-left:16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:3px 0;">
                          <span style="font-size:13px;color:#a1a1aa;">Performance mobile</span>
                          <span style="font-size:13px;font-weight:600;color:${scoreColor};margin-left:8px;">${scoreLabel}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:3px 0;">
                          <span style="font-size:13px;color:#a1a1aa;">Temps de chargement</span>
                          <span style="font-size:13px;font-weight:600;color:#f59e0b;margin-left:8px;">${score !== null && score < 50 ? '> 4 secondes' : 'À vérifier'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:3px 0;">
                          <span style="font-size:13px;color:#a1a1aa;">SEO local</span>
                          <span style="font-size:13px;font-weight:600;color:#f59e0b;margin-left:8px;">Optimisable</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- IMPACT -->
        <tr><td style="background-color:#18181b;padding:0 40px 32px;">
          <p style="margin:0;font-size:15px;line-height:1.7;color:#d4d4d8;">
            ${impact}
          </p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="background-color:#18181b;padding:0 40px 40px;" align="center">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(135deg,#ea580c 0%,#fb923c 100%);border-radius:10px;padding:0;">
              <a href="${calLink}" target="_blank" style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                Réserver un audit gratuit →
              </a>
            </td></tr>
          </table>
          <p style="margin:12px 0 0;font-size:12px;color:#52525b;">
            15 minutes · Sans engagement · 100% gratuit
          </p>
        </td></tr>

        <!-- SEPARATOR -->
        <tr><td style="background-color:#18181b;padding:0 40px;">
          <div style="border-top:1px solid rgba(255,255,255,0.06);"></div>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background-color:#18181b;border-radius:0 0 16px 16px;padding:28px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#e4e4e7;">L'équipe Alt Ctrl Lab</p>
                <p style="margin:0 0 2px;font-size:12px;color:#71717a;">Performance web · SEO local · Croissance digitale</p>
                <p style="margin:0;font-size:12px;color:#52525b;">hello@altctrllab.com</p>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Fallback paragraphs (si Claude API échoue) ─────────────────────────────
function getFallbackParagraphs(name: string, website: string, score: number | null) {
  const domain = (() => { try { return new URL(website).hostname.replace('www.', ''); } catch { return website; } })();
  const scoreText = score !== null
    ? `Nous avons analysé ${domain} et constaté un score de performance de ${score}/100 sur mobile.`
    : `Nous avons analysé ${domain} et identifié plusieurs axes d'optimisation sur mobile.`;

  return {
    intro: `${scoreText} C'est un point que nous souhaitions porter à votre attention car il a un impact direct sur votre visibilité en ligne et sur le nombre de clients qui vous contactent via votre site.`,
    impact: `Aujourd'hui, plus de 65% des recherches locales se font depuis un smartphone. Un site qui met plus de 3 secondes à charger perd en moyenne 53% de ses visiteurs — autant de clients potentiels qui se tournent vers vos concurrents. Notre équipe accompagne des entreprises comme ${name} pour transformer leur présence digitale en véritable levier de croissance.`,
  };
}

// ─── Claude API personalisation ─────────────────────────────────────────────
async function personalizeWithClaude(params: {
  name: string;
  address: string;
  website: string;
  score: number | null;
  niche: string;
}): Promise<{ intro: string; impact: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const anthropic = new Anthropic({ apiKey });
    const { name, address, website, score, niche } = params;
    const scoreInfo = score !== null ? `Score PageSpeed mobile : ${score}/100.` : 'Score PageSpeed non disponible.';

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Tu es un expert en marketing digital et prospection B2B. Rédige deux paragraphes pour un cold email professionnel.

DONNÉES DU PROSPECT :
- Entreprise : ${name}
- Secteur : ${niche}
- Adresse : ${address}
- Site web : ${website}
- ${scoreInfo}

RÈGLES STRICTES :
- Toujours parler en "NOUS" (notre équipe, nous avons analysé…), JAMAIS en "je"
- Ton professionnel mais chaleureux, pas agressif ni vendeur
- Mentionner des détails spécifiques à leur secteur (${niche}) et leur zone géographique
- Être concret sur les problèmes identifiés et leur impact business

FORMAT DE RÉPONSE (respecte exactement ce format) :
INTRO: [Premier paragraphe — 2-3 phrases. Observation concrète sur leur site/business + pourquoi nous les contactons. Max 60 mots.]
IMPACT: [Deuxième paragraphe — 2-3 phrases. Impact business chiffré adapté à leur secteur + ce que notre équipe peut apporter. Max 70 mots.]`,
      }],
    });

    const text = (msg.content[0] as any).text || '';
    const introMatch = text.match(/INTRO:\s*([\s\S]*?)(?=IMPACT:|$)/i);
    const impactMatch = text.match(/IMPACT:\s*([\s\S]*?)$/i);

    if (introMatch && impactMatch) {
      return {
        intro: introMatch[1].trim(),
        impact: impactMatch[1].trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * POST /api/cron/prospection
 * Réponse : Server-Sent Events pour suivi temps réel
 * Body : { niches?, villes?, minScore?, maxLeads?, emailTemplate? }
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const dashKey = request.headers.get('x-dashboard-key');
  if (auth !== `Bearer ${CRON_SECRET}` && dashKey !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let bodyConfig: { niches?: string[]; villes?: string[]; minScore?: number; maxLeads?: number; emailTemplate?: string } = {};
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

        send('start', { message: `Campagne démarrée — ${maxLeads} leads cibles · ${queries.length} recherches`, config: { niches, villes, minScore, maxLeads } });

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

            const personalized = await personalizeWithClaude({
              name, address, website, score: lighthouseScore, niche: queryNiche,
            });

            const { intro, impact } = personalized || getFallbackParagraphs(name, website, lighthouseScore);

            if (personalized) {
              send('info', { message: `   ✨ Email personnalisé par Claude` });
            } else {
              send('warn', { message: `   ⚠️ Fallback template (Claude indisponible)` });
            }

            const emailSubject = `${name} — nous avons analysé votre site web`;
            const emailHTML = buildEmailHTML({
              name, website, score: lighthouseScore, intro, impact, calLink: CAL_LINK,
            });

            // Plain text version
            const emailText = `Bonjour,\n\n${intro}\n\n${impact}\n\nRéservez un audit gratuit (15 min, sans engagement) :\n${CAL_LINK}\n\nL'équipe Alt Ctrl Lab\nhello@altctrllab.com`;

            // 6 — Contact email
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
                  `Personnalisé: ${personalized ? 'Claude IA' : 'Template par défaut'}`,
                  ``,
                  `--- EMAIL ENVOYÉ ---`,
                  `Objet: ${emailSubject}`,
                  `À: ${contactEmail}`,
                  `Date: ${new Date().toLocaleString('fr-FR')}`,
                  ``,
                  `${intro}`,
                  ``,
                  `${impact}`,
                  ``,
                  `→ ${CAL_LINK}`,
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
