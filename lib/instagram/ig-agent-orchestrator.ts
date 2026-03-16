import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { sendInstagramDM, type DMResult } from './dm-sender';
import { isSessionValid, closeBrowser } from './stealth-browser';
import { filterInstagramProfile, type IGLightProfile } from './ig-light-filter';
import { generateVisualIcebreaker } from './ig-visual-icebreaker';
import { createLead, updateLead } from '@/lib/db';

// ─── Config ─────────────────────────────────────────────────────────────────
const IG_MAX_DMS_PER_DAY = parseInt(process.env.IG_MAX_DMS_PER_DAY || '10', 10);
const IG_WARMUP_DAYS = parseInt(process.env.IG_WARMUP_DAYS || '7', 10);
const IG_MIN_DELAY = parseInt(process.env.IG_MIN_DELAY_BETWEEN_DMS || '180000', 10); // 3 min
const IG_MAX_DELAY = parseInt(process.env.IG_MAX_DELAY_BETWEEN_DMS || '480000', 10); // 8 min
const FOLLOWUP_DELAY_MS = 48 * 60 * 60 * 1000; // 48h

// ─── Types ──────────────────────────────────────────────────────────────────
export interface IGLead {
  profileUrl: string;
  name: string;
  niche: string;
  instagramHandle: string;
  followersCount?: string;
  address?: string;
}

export interface IGCampaignDetail {
  lead: IGLead;
  profile: IGLightProfile | null;
  prospectScore: number;
  dm: DMResult | null;
  message: string | null;
  icebreaker: string | null;
  dbLeadId: string | null;
  error?: string;
}

export interface IGCampaignResult {
  sent: number;
  failed: number;
  skipped: number;
  filtered: number;
  details: IGCampaignDetail[];
}

export type CampaignEventCallback = (type: string, payload: Record<string, unknown>) => void;

// ─── Warm-up logic ──────────────────────────────────────────────────────────

function getMaxDMsToday(campaignStartDate: string): number {
  const start = new Date(campaignStartDate);
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceStart >= IG_WARMUP_DAYS) return IG_MAX_DMS_PER_DAY;
  return Math.min((daysSinceStart + 1) * 2, IG_MAX_DMS_PER_DAY);
}

function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// ─── DM Generation (with Visual Icebreaker) ─────────────────────────────────

async function generateDMWithIcebreaker(
  lead: IGLead,
  icebreaker: string,
): Promise<string | null> {
  const prompt = `Tu rédiges un DM Instagram de prospection. Structure EXACTE en 5 lignes.

STRUCTURE OBLIGATOIRE :

LIGNE 1 — SALUTATION :
"Bonjour," (simple, élégant)

LIGNE 2 — ICEBREAKER VISUEL (utilise cette observation comme base, reformule-la avec fluidité) :
"${icebreaker}"

LIGNE 3 — LE DIAGNOSTIC :
Fais remarquer avec élégance le décalage entre la qualité de leur travail visible sur Instagram et l'absence d'un écrin digital à la hauteur. Ne jamais utiliser les mots "site web" — parler d'"empreinte digitale", "expérience web", "vitrine en ligne", "écrin digital", "prolongement digital".

LIGNE 4 — LA QUESTION DE CURIOSITÉ :
Une question stratégique à faible friction. Le prospect doit se sentir amené à réfléchir, pas à acheter.
Exemples : "C'est un choix stratégique de concentrer toute votre visibilité sur Instagram ?" / "Vous avez prévu de prolonger cette identité dans une expérience web ?"

LIGNE 5 — FORMULE DE POLITESSE PREMIUM :
Originale, élégante, non générique. TOUJOURS suivie d'un retour à la ligne puis "L'équipe AltCtrl.Lab".
Exemples :
"Au plaisir d'avoir votre regard là-dessus,
L'équipe AltCtrl.Lab"
ou
"Hâte d'échanger,
L'équipe AltCtrl.Lab"
ou
"Au plaisir de vous lire,
L'équipe AltCtrl.Lab"

CONTEXTE :
- Entreprise : ${lead.name}
- Instagram : @${lead.instagramHandle} (${lead.followersCount || '—'} followers)
- Secteur : ${lead.niche}

INTERDITS ABSOLUS :
- ZÉRO lien (aucun URL)
- ZÉRO mention d'agence ou de nom de société
- ZÉRO emoji
- ZÉRO point d'exclamation excessif
- Jamais le mot "site web"
- Vouvoiement strict
- Ton : Directeur Artistique / Stratège, observation de pair à pair, fluide et élégant
- Pas d'approche commerciale agressive

FORMAT : Réponds UNIQUEMENT avec les 5 lignes du DM. Pas de guillemets, pas de labels, pas de numéros. Juste le texte prêt à envoyer.`;

  try {
    const result = await executeOpenClawAgent('khatib', prompt, 60000);
    if (!result.success || !result.stdout.trim()) return null;

    let dm = result.stdout.trim();
    if (dm.startsWith('"') && dm.endsWith('"')) dm = dm.slice(1, -1);
    if (dm.startsWith('«') && dm.endsWith('»')) dm = dm.slice(1, -1).trim();
    return dm;
  } catch {
    return null;
  }
}

// ─── Followup message ───────────────────────────────────────────────────────

const FOLLOWUP_MESSAGES = [
  "Notre message s'est peut-être perdu dans vos fils de discussion. La question reste ouverte si le sujet vous intéresse !",
];

function getFollowupMessage(): string {
  return FOLLOWUP_MESSAGES[Math.floor(Math.random() * FOLLOWUP_MESSAGES.length)];
}

// ─── Orchestrateur principal ────────────────────────────────────────────────

/**
 * Entonnoir à 2 Vitesses :
 *
 * VITESSE 1 (Filtre Léger — HTTP) :
 *   Pour chaque lead → vérification profil via HTTP simple.
 *   Filtre : followers, activité, compte public, score > 40.
 *   → Produit un Top N de prospects qualifiés.
 *
 * VITESSE 2 (Filtre Lourd — Puppeteer Stealth) :
 *   Pour chaque prospect qualifié → Visual Icebreaker + DM personnalisé.
 *   Screenshot grille IG → analyse IA → icebreaker → DM.
 *
 * SHADOW PIPELINE :
 *   Lead créé en DB avec ig_dm_state = 'WAITING_REPLY'.
 *   ig_next_action_at = now + 48h pour relance automatique.
 */
export async function runIGCampaign(
  leads: IGLead[],
  campaignStartDate: string,
  onEvent?: CampaignEventCallback,
  maxOverride?: number,
): Promise<IGCampaignResult> {
  const emit = onEvent || (() => {});
  const result: IGCampaignResult = { sent: 0, failed: 0, skipped: 0, filtered: 0, details: [] };

  const maxToday = maxOverride ?? getMaxDMsToday(campaignStartDate);
  emit('start', { message: `📸 Campagne IG DM — max ${maxToday} DMs aujourd'hui (${leads.length} leads à filtrer)`, maxToday });

  // ═══════════════════════════════════════════════════════════════════════════
  // VITESSE 1 — Filtre Léger (HTTP, pas de browser)
  // ═══════════════════════════════════════════════════════════════════════════
  emit('info', { message: '🔍 VITESSE 1 — Qualification légère (HTTP)...' });

  const qualifiedLeads: Array<{ lead: IGLead; profile: IGLightProfile; score: number }> = [];

  for (const lead of leads) {
    emit('scan', { message: `   📋 @${lead.instagramHandle} — vérification...` });

    const filterResult = await filterInstagramProfile(lead.instagramHandle);

    if (!filterResult.passed || !filterResult.profile) {
      result.filtered++;
      emit('skip', { message: `   ❌ @${lead.instagramHandle} — ${filterResult.reason}` });
      result.details.push({
        lead, profile: filterResult.profile, prospectScore: filterResult.score,
        dm: null, message: null, icebreaker: null, dbLeadId: null,
        error: filterResult.reason,
      });
      continue;
    }

    emit('qualify', { message: `   ✅ @${lead.instagramHandle} — ${filterResult.reason} (${filterResult.profile.followers} followers)` });
    qualifiedLeads.push({ lead, profile: filterResult.profile, score: filterResult.score });
  }

  emit('info', { message: `📊 Filtre léger terminé — ${qualifiedLeads.length}/${leads.length} qualifiés` });

  if (qualifiedLeads.length === 0) {
    emit('complete', { message: '⚠️ Aucun prospect qualifié — campagne terminée', results: result });
    return result;
  }

  // Trier par score décroissant — les meilleurs prospects d'abord
  qualifiedLeads.sort((a, b) => b.score - a.score);

  // Limiter au top N (max DMs du jour)
  const topProspects = qualifiedLeads.slice(0, maxToday);
  emit('info', { message: `🏆 Top ${topProspects.length} prospects sélectionnés pour DM` });

  // ═══════════════════════════════════════════════════════════════════════════
  // VITESSE 2 — Filtre Lourd (Puppeteer Stealth)
  // ═══════════════════════════════════════════════════════════════════════════
  emit('info', { message: '🔐 Vérification de la session Instagram...' });
  const sessionOk = await isSessionValid();
  if (!sessionOk) {
    emit('fatal', { message: '❌ Session Instagram expirée — reconnexion manuelle requise' });
    return result;
  }
  emit('info', { message: '✅ Session active — lancement VITESSE 2' });

  for (const { lead, profile, score } of topProspects) {
    if (result.sent >= maxToday) {
      emit('info', { message: `⏸️ Limite quotidienne atteinte (${maxToday} DMs)` });
      break;
    }

    emit('scan', { message: `🎯 ${lead.name} (@${lead.instagramHandle}) — score ${score}/100` });

    // 2a — Visual Icebreaker
    emit('info', { message: `   👁️ Visual Icebreaker — analyse du profil...` });
    const icebreaker = await generateVisualIcebreaker(lead.instagramHandle, lead.name, lead.niche);
    emit('info', { message: `   💡 Icebreaker: "${icebreaker.icebreaker}"` });

    // 2b — Générer le DM complet (icebreaker + pitch subtil)
    emit('info', { message: `   🤖 Génération du DM par Agent khatib...` });
    const dm = await generateDMWithIcebreaker(lead, icebreaker.icebreaker);
    if (!dm) {
      emit('warn', { message: `   ⚠️ Échec génération DM pour ${lead.name}` });
      result.failed++;
      result.details.push({
        lead, profile, prospectScore: score,
        dm: null, message: null, icebreaker: icebreaker.icebreaker, dbLeadId: null,
        error: 'Agent khatib failed',
      });
      continue;
    }
    emit('info', { message: `   ✍️ DM généré (${dm.length} chars)` });

    // 2c — Envoyer le DM via Puppeteer Stealth
    emit('send', { message: `   📨 Envoi du DM à @${lead.instagramHandle}...` });
    const dmResult = await sendInstagramDM(lead.profileUrl, dm);

    const now = Date.now();

    if (dmResult.success) {
      result.sent++;

      // 2d — Shadow Pipeline : créer le lead en DB avec état WAITING_REPLY
      let dbLeadId: string | null = null;
      try {
        const { id } = await createLead({
          name: lead.name,
          company: lead.name,
          email: null,
          source: 'Instagram',
          status: 'Nouveau',
          website: lead.profileUrl,
          websiteScore: null,
          emailSentCount: 0,
          lastContactedAt: now,
          notes: [
            `Source: Instagram DM (@${lead.instagramHandle})`,
            `Followers: ${profile.followers}`,
            `Score prospect: ${score}/100`,
            `Bio: ${profile.bio || '—'}`,
            `Niche: ${lead.niche}`,
            `Adresse: ${lead.address || '—'}`,
            `Icebreaker: ${icebreaker.icebreaker}`,
            `Observations: ${icebreaker.observations}`,
            ``,
            `--- DM ENVOYÉ ---`,
            `Date: ${new Date(now).toLocaleString('fr-FR')}`,
            dm,
          ].join('\n'),
        });
        dbLeadId = id;

        // Mettre à jour les champs Instagram spécifiques
        await updateLead(id, {
          ig_handle: lead.instagramHandle,
          ig_followers: profile.followers,
          ig_dm_state: 'WAITING_REPLY',
          ig_dm_sent_at: now,
          ig_dm_content: dm,
          ig_next_action_at: now + FOLLOWUP_DELAY_MS,
          ig_prospect_score: score,
        });
      } catch (e: any) {
        emit('warn', { message: `   ⚠️ Erreur DB: ${e.message}` });
      }

      emit('done_lead', {
        message: `   ✅ DM envoyé à @${lead.instagramHandle} (${Math.round(dmResult.durationMs / 1000)}s) — ${result.sent}/${maxToday} — relance auto dans 48h`,
        current: result.sent,
        total: maxToday,
      });

      result.details.push({
        lead, profile, prospectScore: score,
        dm: dmResult, message: dm, icebreaker: icebreaker.icebreaker, dbLeadId,
      });
    } else {
      result.failed++;
      emit('warn', { message: `   ❌ Échec envoi : ${dmResult.error}` });
      result.details.push({
        lead, profile, prospectScore: score,
        dm: dmResult, message: dm, icebreaker: icebreaker.icebreaker, dbLeadId: null,
        error: dmResult.error,
      });

      if (dmResult.error?.includes('Session expirée')) {
        emit('fatal', { message: '🔒 Session expirée — campagne arrêtée' });
        break;
      }
    }

    // 2e — Pause human-like entre les DMs
    const idx = topProspects.findIndex(p => p.lead === lead);
    if (result.sent < maxToday && idx < topProspects.length - 1) {
      const delaySec = Math.round((IG_MIN_DELAY + Math.random() * (IG_MAX_DELAY - IG_MIN_DELAY)) / 1000);
      emit('info', { message: `   ⏳ Pause ${delaySec}s avant le prochain DM...` });
      await randomDelay(IG_MIN_DELAY, IG_MAX_DELAY);
    }
  }

  // Cleanup
  await closeBrowser();

  emit('complete', {
    message: `📊 Campagne terminée — ${result.sent} envoyés, ${result.failed} échoués, ${result.filtered} filtrés (Vitesse 1)`,
    results: result,
  });

  return result;
}

// ─── Campagne autonome (recherche IG + pipeline) ────────────────────────────

/**
 * Lance une campagne Instagram complète de façon autonome :
 * 1. Recherche des profils IG pour niche + ville via Chrome CDP
 * 2. Filtre léger (Bio-Link Gatekeeper, score > 40)
 * 3. Visual Icebreaker + DM personnalisé via Agent khatib
 * 4. Shadow Pipeline (lead en DB, relance 48h)
 *
 * Continue de chercher de nouveaux profils jusqu'à atteindre targetLeads.
 */
export async function runIGCampaignAuto(
  niche: string,
  ville: string,
  targetLeads: number,
  onEvent?: CampaignEventCallback,
): Promise<IGCampaignResult> {
  const emit = onEvent || (() => {});
  const { searchInstagramProfiles } = await import('./ig-instagram-searcher');

  emit('plan', {
    message: `🎯 Mission : ${targetLeads} leads qualifiés — ${niche} à ${ville}`,
    niche, ville, targetLeads,
  });

  // Variantes de recherche pour élargir si pas assez de profils qualifiés
  const searchVariants: Array<[string, string]> = [
    [niche, ville],
    [niche, ''],
    [`${niche} indépendant`, ville],
    [`${niche} artisan`, ''],
    [niche, 'local'],
  ];

  const seenHandles = new Set<string>();
  const campaignResult: IGCampaignResult = { sent: 0, failed: 0, skipped: 0, filtered: 0, details: [] };
  const campaignStart = new Date().toISOString();

  for (const [searchNiche, searchVille] of searchVariants) {
    if (campaignResult.sent >= targetLeads) break;

    const query = searchVille ? `${searchNiche} ${searchVille}` : searchNiche;
    emit('info', { message: `🔍 Recherche Instagram : "${query}"...` });

    let handles: string[] = [];
    try {
      const searchResult = await searchInstagramProfiles(
        searchNiche,
        searchVille,
        30,
        (type, message) => emit(type, { message }),
      );
      handles = searchResult.handles.filter(h => !seenHandles.has(h));
      handles.forEach(h => seenHandles.add(h));
    } catch (err: any) {
      emit('warn', { message: `⚠️ Recherche "${query}" échouée : ${err.message}` });
      continue;
    }

    if (handles.length === 0) {
      emit('info', { message: `   Aucun nouveau profil pour "${query}"` });
      continue;
    }

    emit('info', { message: `   ${handles.length} nouveaux profils → qualification...` });

    const leads: IGLead[] = handles.map(handle => ({
      profileUrl: `https://www.instagram.com/${handle}/`,
      name: handle,
      niche,
      instagramHandle: handle,
    }));

    // Lancer le pipeline sur ce batch, en passant le nombre restant à atteindre
    const remaining = targetLeads - campaignResult.sent;
    const batchResult = await runIGCampaign(leads, campaignStart, onEvent, remaining);

    // Fusionner les résultats
    campaignResult.sent += batchResult.sent;
    campaignResult.failed += batchResult.failed;
    campaignResult.skipped += batchResult.skipped;
    campaignResult.filtered += batchResult.filtered;
    campaignResult.details.push(...batchResult.details);

    if (campaignResult.sent >= targetLeads) break;

    emit('info', { message: `📊 ${campaignResult.sent}/${targetLeads} DMs envoyés — recherche d'autres profils...` });
  }

  if (campaignResult.sent < targetLeads) {
    emit('warn', { message: `⚠️ Objectif non atteint : ${campaignResult.sent}/${targetLeads} DMs envoyés (${campaignResult.filtered} profils filtrés au total — tous avaient un site web ou bio-link)` });
  }

  return campaignResult;
}

// ─── Relance automatique (Shadow Pipeline) ──────────────────────────────────

/**
 * Envoie les relances pour les leads en WAITING_REPLY dont le délai est dépassé.
 * À appeler via un cron quotidien.
 */
export async function runIGFollowups(
  onEvent?: CampaignEventCallback,
): Promise<{ sent: number; failed: number }> {
  const emit = onEvent || (() => {});
  const result = { sent: 0, failed: 0 };

  const { getDb } = await import('@/lib/db');
  const rawDb = (getDb() as any).$client;

  const now = Date.now();
  const pendingFollowups = rawDb.prepare(
    `SELECT id, ig_handle, name FROM leads
     WHERE ig_dm_state = 'WAITING_REPLY'
     AND ig_next_action_at IS NOT NULL
     AND ig_next_action_at <= ?`
  ).all(now) as Array<{ id: string; ig_handle: string; name: string }>;

  if (pendingFollowups.length === 0) {
    emit('info', { message: '📭 Aucune relance en attente' });
    return result;
  }

  emit('start', { message: `🔄 ${pendingFollowups.length} relances à envoyer` });

  const sessionOk = await isSessionValid();
  if (!sessionOk) {
    emit('fatal', { message: '❌ Session Instagram expirée' });
    return result;
  }

  for (const lead of pendingFollowups) {
    const profileUrl = `https://www.instagram.com/${lead.ig_handle}/`;
    const followupMsg = getFollowupMessage();

    emit('send', { message: `   🔄 Relance @${lead.ig_handle}...` });
    const dmResult = await sendInstagramDM(profileUrl, followupMsg);

    if (dmResult.success) {
      result.sent++;
      await updateLead(lead.id, {
        ig_dm_state: 'FOLLOWUP_SENT',
        ig_dm_content: followupMsg,
        ig_next_action_at: null, // Plus de relance auto
      });
      emit('done_lead', { message: `   ✅ Relance envoyée à @${lead.ig_handle}` });
    } else {
      result.failed++;
      emit('warn', { message: `   ❌ Échec relance @${lead.ig_handle}: ${dmResult.error}` });

      if (dmResult.error?.includes('Session expirée')) {
        emit('fatal', { message: '🔒 Session expirée — relances arrêtées' });
        break;
      }
    }

    await randomDelay(IG_MIN_DELAY, IG_MAX_DELAY);
  }

  await closeBrowser();
  emit('complete', { message: `📊 Relances terminées — ${result.sent} envoyées, ${result.failed} échouées` });
  return result;
}
