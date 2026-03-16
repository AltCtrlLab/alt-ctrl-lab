export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { runIGCampaignAuto } from '@/lib/instagram/ig-agent-orchestrator';
import { buildPromptWithSkill } from '@/lib/agents/load-skill';

const DASH_KEY = process.env.CRON_SECRET || 'altctrl-cron-secret';

/**
 * POST /api/instagram/agent-chat
 *
 * Le Directeur Marketing Digital (agent fatah + skill ig-director) reçoit
 * un prompt libre, planifie la campagne, puis orchestre l'exécution complète
 * via Chrome CDP (port 9222) déjà connecté à Instagram sur le VPS.
 *
 * Body  : { message: string }
 * Auth  : x-dashboard-key header
 * Reply : text/event-stream (SSE)
 */
export async function POST(request: NextRequest) {
  const dashKey = request.headers.get('x-dashboard-key');
  const auth = request.headers.get('authorization');
  if (dashKey !== DASH_KEY && auth !== `Bearer ${DASH_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: { message?: string } = {};
  try { body = await request.json(); } catch { /* default */ }

  const userMessage = body.message?.trim();
  if (!userMessage) {
    return new Response(JSON.stringify({ error: 'message requis' }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`));
        } catch { /* client déconnecté */ }
      };

      try {
        // ── ÉTAPE 1 : Le Directeur analyse le brief avec son skill ig-director ──
        send('thinking', { message: `🧠 Le Directeur Marketing analyse votre mission...` });

        // Le skill est embedé directement dans le prompt → fonctionne sur Railway ET sur VPS
        const parsePrompt = buildPromptWithSkill('ig-director',
          `Mission reçue : "${userMessage}"

Analyse cette mission et réponds UNIQUEMENT avec un JSON valide sur UNE SEULE LIGNE (pas de markdown, pas de blocs de code) :
{"niche":"restaurant","ville":"Genève","targetLeads":5,"strategy":"Ta stratégie en 1 phrase d'action"}

Si la niche n'est pas précisée, infère le secteur le plus logique selon le contexte.
Si la ville n'est pas précisée, utilise "Genève".
Si le nombre de leads n'est pas précisé, utilise 5.

Réponds UNIQUEMENT avec le JSON sur une ligne.`
        );

        const parseResult = await executeOpenClawAgent('fatah', parsePrompt, 60000);

        let niche = 'restaurant';
        let ville = 'Genève';
        let targetLeads = 5;
        let strategy = 'Recherche et qualification des profils Instagram sans site web, DMs Visual Icebreaker';

        if (parseResult.success && parseResult.stdout.trim()) {
          const text = parseResult.stdout.trim();
          const jsonMatch = text.match(/\{[^}]+\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              niche = parsed.niche || niche;
              ville = parsed.ville || ville;
              targetLeads = parseInt(parsed.targetLeads) || targetLeads;
              strategy = (parsed.strategy && parsed.strategy !== 'undefined') ? parsed.strategy : `Prospection Instagram ${parsed.niche || niche} à ${parsed.ville || ville}, qualification bio-link + DM Visual Icebreaker`;
            } catch { /* garder les défauts */ }
          }
        } else {
          // Fallback regex si OpenClaw indisponible (ex: Railway sans WSL)
          const nicheMatcher = userMessage.match(
            /\b(restaurant|coiffeur|artisan|boulangerie|boutique|hôtel|spa|salon|médecin|avocat|architecte|plombier|électricien|menuisier|garage|pharmacie|opticien|fleuriste|photographe|tatoueur)\b/i
          );
          if (nicheMatcher) niche = nicheMatcher[1].toLowerCase();

          const villeMatcher = userMessage.match(
            /\b(Genève|Lausanne|Annecy|Lyon|Paris|Marseille|Bordeaux|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Lille|Zurich|Berne|Chambéry|Grenoble)\b/i
          );
          if (villeMatcher) ville = villeMatcher[1];

          const countMatcher = userMessage.match(/\b(\d+)\b/);
          if (countMatcher) targetLeads = parseInt(countMatcher[1]);

          strategy = `Prospection Instagram ${niche} à ${ville}, Visual Icebreaker + DM structuré`;
        }

        // ── ÉTAPE 2 : Présenter le plan de campagne ──
        send('plan', {
          message: `✅ Plan de campagne établi par le Directeur`,
          niche,
          ville,
          targetLeads,
          strategy,
          detail: `Je vais chercher des profils "${niche}" à ${ville} via la barre de recherche Instagram, les qualifier via le Bio-Link Gatekeeper, puis envoyer un DM structuré (Visual Icebreaker + diagnostic + question de curiosité + "Au plaisir de vous lire, L'équipe AltCtrl.Lab") à chacun. Objectif : ${targetLeads} leads qualifiés créés en DB.`,
        });

        await new Promise(r => setTimeout(r, 300));

        // ── ÉTAPE 3 : Lancement de la campagne ──
        send('start_campaign', { message: `🚀 Lancement de la campagne Instagram...` });

        const result = await runIGCampaignAuto(
          niche,
          ville,
          targetLeads,
          (type, payload) => send(type, payload as Record<string, unknown>),
        );

        // ── ÉTAPE 4 : Rapport final (avec skill pour ton cohérent) ──
        const reportPrompt = buildPromptWithSkill('ig-director',
          `Tu viens de terminer une campagne de prospection Instagram. Rédige un rapport de mission.

Résultats :
- DMs envoyés avec succès : ${result.sent}
- Leads qualifiés créés en DB : ${result.sent}
- Profils analysés et filtrés (non qualifiés) : ${result.filtered}
- Échecs techniques : ${result.failed}
- Mission : "${userMessage}"
- Niche / Ville : ${niche} / ${ville}

Rédige un rapport de mission court (3-4 phrases) :
1. Bilan factuel de la campagne
2. Qualité des prospects identifiés
3. Prochaine étape recommandée (ex: surveiller les réponses dans 48h, relancer, itérer sur la niche)

Ton : Directeur Marketing, professionnel et direct. Pas d'emojis excessifs.`
        );

        const reportResult = await executeOpenClawAgent('fatah', reportPrompt, 45000);
        const reportText = reportResult.success && reportResult.stdout.trim()
          ? reportResult.stdout.trim()
          : `Campagne terminée. ${result.sent} DMs envoyés sur ${result.sent + result.filtered + result.failed} profils analysés. ${result.filtered} profils filtrés (bio-link existant). Surveillez les réponses dans 48h pour la relance automatique.`;

        send('report', {
          message: reportText,
          results: result,
        });

      } catch (err: any) {
        send('fatal', { message: `❌ Erreur : ${err.message}. Vérifiez que CHROME_DEBUG_URL est configuré et que Chrome est connecté à Instagram sur le VPS.` });
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
