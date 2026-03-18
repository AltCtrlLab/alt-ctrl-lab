import { sendInstagramDM, type DMResult } from './dm-sender';
import { isSessionValid, closeBrowser } from './stealth-browser';
import { filterInstagramProfile, type IGLightProfile } from './ig-light-filter';
import { createLead, updateLead } from '@/lib/db';

// ─── Config ─────────────────────────────────────────────────────────────────
const IG_MAX_DMS_PER_DAY = parseInt(process.env.IG_MAX_DMS_PER_DAY || '10', 10);
const IG_WARMUP_DAYS = parseInt(process.env.IG_WARMUP_DAYS || '7', 10);
const IG_MIN_DELAY = parseInt(process.env.IG_MIN_DELAY_BETWEEN_DMS || '90000', 10);  // 1.5 min
const IG_MAX_DELAY = parseInt(process.env.IG_MAX_DELAY_BETWEEN_DMS || '140000', 10); // 2.3 min
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

// ─── DM Generation ──────────────────────────────────────────────────────────

const FALLBACK_DM = (niche: string) =>
  `Bonjour,\n\nLa cohérence de votre travail de ${niche} se distingue nettement du bruit d'Instagram, et ce type de direction artistique mérite un écrin digital à la hauteur. Avez-vous prévu de prolonger l'expérience de votre marque en dehors des réseaux, ou est-ce un choix stratégique d'y concentrer toute votre visibilité ?\n\nAu plaisir de vous lire,\nL'équipe AltCtrl.Lab`;

async function generateDM(
  lead: IGLead,
  _profile: IGLightProfile,
): Promise<string> {
  return FALLBACK_DM(lead.niche);
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
  dryRun = false,
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

    const filterResult = await filterInstagramProfile(lead.instagramHandle, lead.niche);

    if (!filterResult.passed || !filterResult.profile) {
      result.filtered++;
      emit('skip', {
        message: `❌ @${lead.instagramHandle} — ${filterResult.reason}`,
        handle: lead.instagramHandle,
        reason: filterResult.reason,
        passed: false,
      });
      result.details.push({
        lead, profile: filterResult.profile, prospectScore: filterResult.score,
        dm: null, message: null, dbLeadId: null,
        error: filterResult.reason,
      });
      continue;
    }

    emit('qualify', {
      message: `✅ @${lead.instagramHandle} — ${filterResult.reason}`,
      handle: lead.instagramHandle,
      score: filterResult.score,
      followers: filterResult.profile.followers,
      passed: true,
    });
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
  // VITESSE 2 — Génération DM (+ envoi si pas dryRun)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!dryRun) {
    emit('info', { message: '🔐 Vérification de la session Instagram...' });
    const sessionOk = await isSessionValid();
    if (!sessionOk) {
      emit('fatal', { message: '❌ Session Instagram expirée — reconnexion manuelle requise' });
      return result;
    }
    emit('info', { message: '✅ Session active — lancement VITESSE 2' });
  }

  for (const { lead, profile, score } of topProspects) {
    if (result.sent >= maxToday) {
      emit('info', { message: `⏸️ Limite quotidienne atteinte (${maxToday} DMs)` });
      break;
    }

    emit('scan', { message: `🎯 ${lead.name} (@${lead.instagramHandle}) — score ${score}/100` });

    // 2a — Générer le DM depuis les données du profil
    const dm = await generateDM(lead, profile);

    // Mode prévisualisation : afficher le DM dans l'UI, pas d'envoi
    if (dryRun) {
      result.sent++;
      emit('dm_preview', {
        message: `✅ DM généré pour @${lead.instagramHandle}`,
        handle: lead.instagramHandle,
        profileUrl: lead.profileUrl,
        dmText: dm,
        score,
        current: result.sent,
        total: maxToday,
      });
      result.details.push({ lead, profile, prospectScore: score, dm: null, message: dm, dbLeadId: null });
      continue;
    }

    // 2b — Envoyer le DM via Puppeteer Stealth
    emit('send', { message: `📨 Envoi du DM à @${lead.instagramHandle}...`, handle: lead.instagramHandle });
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
        message: `✅ DM envoyé à @${lead.instagramHandle} — ${result.sent}/${maxToday}`,
        handle: lead.instagramHandle,
        current: result.sent,
        total: maxToday,
        status: 'sent',
      });

      result.details.push({
        lead, profile, prospectScore: score,
        dm: dmResult, message: dm, dbLeadId,
      });
    } else {
      result.failed++;
      emit('dm_error', {
        message: `❌ Échec envoi @${lead.instagramHandle} : ${dmResult.error}`,
        handle: lead.instagramHandle,
        error: dmResult.error,
        status: 'failed',
      });
      result.details.push({
        lead, profile, prospectScore: score,
        dm: dmResult, message: dm, dbLeadId: null,
        error: dmResult.error,
      });

      if (dmResult.error?.includes('Session expirée')) {
        emit('fatal', { message: '🔒 Session expirée — campagne arrêtée' });
        break;
      }
    }

    // 2e — Pause human-like entre les DMs (mode envoi seulement)
    if (!dryRun) {
      const idx = topProspects.findIndex(p => p.lead === lead);
      if (result.sent < maxToday && idx < topProspects.length - 1) {
        const delayMs = IG_MIN_DELAY + Math.random() * (IG_MAX_DELAY - IG_MIN_DELAY);
        const delaySec = Math.round(delayMs / 1000);
        emit('dm_waiting', { message: `⏳ Prochain DM dans ${delaySec}s`, delaySec });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // Cleanup (seulement si on a utilisé le browser)
  if (!dryRun) await closeBrowser();

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
  dryRun = false,
): Promise<IGCampaignResult> {
  const emit = onEvent || (() => {});
  const { searchInstagramProfiles } = await import('./ig-instagram-searcher');

  emit('plan', {
    message: `🎯 Mission : ${targetLeads} leads qualifiés — ${niche} à ${ville}`,
    niche, ville, targetLeads,
  });

  // ─── Variantes de recherche par round ───────────────────────────────────────
  function getSearchVariants(round: number): Array<[string, string]> {
    if (round === 0) {
      return ville ? [
        [niche, ville],
        [`${niche} pro`, ville],
      ] : [
        [niche, ''],
        [`${niche} pro`, ''],
      ];
    }
    if (round === 1) {
      return ville ? [
        [`${niche} indépendant`, ville],
        [`${niche} local`, ville],
        [`${niche}s`, ville],
      ] : [
        [`${niche} artisan`, ''],
        [`${niche} indépendant`, ''],
      ];
    }
    if (round === 2) {
      return [
        [niche, ''],
        [`${niche} artisan`, ''],
        [`${niche} france`, ''],
      ];
    }
    // Round 3+ : fallback grandes villes
    return [
      [niche, 'paris'],
      [niche, 'lyon'],
      [niche, 'bordeaux'],
      [niche, 'marseille'],
      [niche, 'toulouse'],
    ];
  }

  // Charger les handles déjà DM'd depuis la DB (éviter les doublons cross-campagnes)
  const { getDb } = await import('@/lib/db');
  const rawDb = (getDb() as any).$client;
  let alreadyDmd = new Set<string>();
  try {
    alreadyDmd = new Set<string>(
      (rawDb.prepare(`SELECT ig_handle FROM leads WHERE ig_handle IS NOT NULL AND ig_dm_state IS NOT NULL`).all() as Array<{ ig_handle: string }>)
        .map((r: { ig_handle: string }) => r.ig_handle.toLowerCase())
    );
  } catch { /* colonne pas encore migrée — ignorer */ }

  const seenHandles = new Set<string>(alreadyDmd);
  const campaignResult: IGCampaignResult = { sent: 0, failed: 0, skipped: 0, filtered: 0, details: [] };
  const campaignStart = new Date().toISOString();

  // Emetteur filtré : supprime les 'complete' des batchs internes
  const batchEmit: CampaignEventCallback = (type, payload) => {
    if (type === 'complete') return;
    emit(type, payload);
  };

  let round = 0;
  let emptyRoundsInRow = 0;
  const MAX_EMPTY_ROUNDS = 2; // Arrêter après 2 rounds consécutifs sans profils

  while (campaignResult.sent < targetLeads) {
    const variants = getSearchVariants(round);
    let foundNewInRound = false;

    for (const [searchNiche, searchVille] of variants) {
      if (campaignResult.sent >= targetLeads) break;

      const query = searchVille ? `${searchNiche} ${searchVille}` : searchNiche;
      emit('search', { message: `🔍 Recherche : "${query}"`, query, phase: 'searching' });

      let handles: string[] = [];
      try {
        const searchResult = await searchInstagramProfiles(
          searchNiche,
          searchVille,
          200,
          (type, message) => emit(type, { message }),
        );
        handles = searchResult.handles.filter(h => !seenHandles.has(h.toLowerCase()));
        handles.forEach(h => seenHandles.add(h.toLowerCase()));
      } catch (err: any) {
        emit('warn', { message: `⚠️ Recherche "${query}" échouée : ${err.message}` });
        continue;
      }

      if (handles.length === 0) {
        emit('info', { message: `   Aucun nouveau profil — variante suivante` });
        continue;
      }

      foundNewInRound = true;
      emit('search_result', { message: `${handles.length} profils trouvés`, query, count: handles.length });

      const leads: IGLead[] = handles.map(handle => ({
        profileUrl: `https://www.instagram.com/${handle}/`,
        name: handle,
        niche,
        instagramHandle: handle,
      }));

      const remaining = targetLeads - campaignResult.sent;
      const batchResult = await runIGCampaign(leads, campaignStart, batchEmit, remaining, dryRun);

      campaignResult.sent += batchResult.sent;
      campaignResult.failed += batchResult.failed;
      campaignResult.skipped += batchResult.skipped;
      campaignResult.filtered += batchResult.filtered;
      campaignResult.details.push(...batchResult.details);

      emit('info', { message: `📊 Avancement : ${campaignResult.sent}/${targetLeads} DMs envoyés — ${campaignResult.filtered} profils filtrés jusqu'ici` });
    }

    if (!foundNewInRound) {
      emptyRoundsInRow++;
      if (emptyRoundsInRow >= MAX_EMPTY_ROUNDS || round >= 3) {
        emit('warn', { message: `⚠️ Plus aucun nouveau profil après ${round + 1} rounds — arrêt de la recherche` });
        break;
      }
    } else {
      emptyRoundsInRow = 0;
    }

    round++;
  }

  emit('complete', {
    message: campaignResult.sent >= targetLeads
      ? `✅ Mission accomplie — ${campaignResult.sent}/${targetLeads} DMs envoyés`
      : `⚠️ Mission incomplète : ${campaignResult.sent}/${targetLeads} DMs envoyés — ${campaignResult.filtered + campaignResult.details.length} profils examinés, ${campaignResult.filtered} filtrés.`,
    results: campaignResult,
  });

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
