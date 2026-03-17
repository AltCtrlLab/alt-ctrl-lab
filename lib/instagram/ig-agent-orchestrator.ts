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
  const FALLBACK_DM = (niche: string) =>
    `Bonjour,\n\nLa cohérence de votre travail de ${niche} se distingue nettement du bruit d'Instagram, et ce type de direction artistique mérite un écrin digital à la hauteur. Avez-vous prévu de prolonger l'expérience de votre marque en dehors des réseaux, ou est-ce un choix stratégique d'y concentrer toute votre visibilité ?\n\nAu plaisir de vous lire,\nL'équipe AltCtrl.Lab`;

  const isGenericFallback = icebreaker.includes('👏') || icebreaker.includes('vraiment qualitatif') || icebreaker.length < 20;
  const effectiveIcebreaker = isGenericFallback ? '' : icebreaker;

  const prompt = `Tu es un Directeur Artistique et Stratège Digital de haut niveau. Tu rédiges des DMs Instagram qui convertissent.

RÈGLE ABSOLUE : Tu génères TOUJOURS le DM. Tu ne poses JAMAIS de questions. Tu ne demandes JAMAIS plus d'informations. Tu travailles avec ce que tu as.

Structure du message — un seul paragraphe fluide, 3 phrases max :

1. "Bonjour." (point final, sobre)
2. Phrases 1+2 fusionnées : pars de cette observation sur leur profil — "${effectiveIcebreaker}" — et lie immédiatement cette qualité au fait qu'Instagram est trop limité pour un travail de ce calibre. Souligne le potentiel inexploité, pas le manque.
3. Une question ouverte sur leur vision digitale à long terme.
4. Signature exacte (aucune variation) :
Au plaisir de vous lire,
L'équipe AltCtrl.Lab

PROFIL :
- @${lead.instagramHandle} · ${lead.followersCount || '—'} followers · secteur : ${lead.niche}

EXEMPLE (secteur coiffure) :
Bonjour. La maîtrise des reflets sur vos balayages révèle une signature visuelle aboutie qui mériterait d'exister dans un espace qui vous est propre, loin du bruit des réseaux. Avez-vous prévu de créer une expérience web dédiée pour prolonger ce que vous construisez ici, ou est-ce un choix stratégique de rester exclusivement sur Instagram ?

Au plaisir de vous lire,
L'équipe AltCtrl.Lab

CONTRAINTES : zéro emoji · vouvoiement · jamais "site web" · zéro lien · zéro point d'exclamation · vocabulaire : écrin, sublimer, prolonger, indépendance digitale

Réponds UNIQUEMENT avec le texte du DM, prêt à coller. Rien d'autre.`;

  // Icebreaker générique → fallback directement, pas besoin de l'agent
  if (isGenericFallback) return FALLBACK_DM(lead.niche);

  try {
    const result = await executeOpenClawAgent('khatib', prompt, 60000);
    if (!result.success || !result.stdout.trim()) return FALLBACK_DM(lead.niche);

    let dm = result.stdout.trim();
    if (dm.startsWith('"') && dm.endsWith('"')) dm = dm.slice(1, -1);
    if (dm.startsWith('«') && dm.endsWith('»')) dm = dm.slice(1, -1).trim();
    // Vérifier que l'agent n'a pas demandé des infos au lieu de générer
    const asksForInfo = dm.includes('fournissez') || dm.includes('avez-vous des') || dm.includes('pourriez-vous') || dm.includes('capture d\'écran') || dm.includes('j\'ai besoin');
    if (asksForInfo) return FALLBACK_DM(lead.niche);
    return dm;
  } catch {
    return FALLBACK_DM(lead.niche);
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

  // Variantes de recherche — du plus ciblé au plus large
  // La mission ne s'arrête QUE quand targetLeads DMs sont envoyés
  const searchVariants: Array<[string, string]> = [
    [niche, ville],
    [niche, ''],
    [`${niche} indépendant`, ville],
    [`${niche} local`, ville],
    [`${niche} artisan`, ''],
    [niche, 'france'],
    [niche, 'suisse'],
    [niche, 'paris'],
    [niche, 'lyon'],
    [niche, 'bordeaux'],
    [niche, 'marseille'],
  ];

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

  for (const [searchNiche, searchVille] of searchVariants) {
    if (campaignResult.sent >= targetLeads) break;

    const query = searchVille ? `${searchNiche} ${searchVille}` : searchNiche;
    emit('info', { message: `🔍 Recherche : "${query}" (objectif : ${campaignResult.sent}/${targetLeads} atteint)` });

    let handles: string[] = [];
    try {
      const searchResult = await searchInstagramProfiles(
        searchNiche,
        searchVille,
        200, // cherche le plus de profils possible
        (type, message) => emit(type, { message }),
      );
      handles = searchResult.handles.filter(h => !seenHandles.has(h));
      handles.forEach(h => seenHandles.add(h));
    } catch (err: any) {
      emit('warn', { message: `⚠️ Recherche "${query}" échouée : ${err.message}` });
      continue;
    }

    if (handles.length === 0) {
      emit('info', { message: `   Aucun nouveau profil — variante suivante` });
      continue;
    }

    emit('info', { message: `   ${handles.length} nouveaux profils → qualification en cours...` });

    const leads: IGLead[] = handles.map(handle => ({
      profileUrl: `https://www.instagram.com/${handle}/`,
      name: handle,
      niche,
      instagramHandle: handle,
    }));

    const remaining = targetLeads - campaignResult.sent;
    const batchResult = await runIGCampaign(leads, campaignStart, batchEmit, remaining);

    campaignResult.sent += batchResult.sent;
    campaignResult.failed += batchResult.failed;
    campaignResult.skipped += batchResult.skipped;
    campaignResult.filtered += batchResult.filtered;
    campaignResult.details.push(...batchResult.details);

    emit('info', { message: `📊 Avancement : ${campaignResult.sent}/${targetLeads} DMs envoyés — ${campaignResult.filtered} profils filtrés jusqu'ici` });
  }

  emit('complete', {
    message: campaignResult.sent >= targetLeads
      ? `✅ Mission accomplie — ${campaignResult.sent}/${targetLeads} DMs envoyés`
      : `⚠️ Mission incomplète : ${campaignResult.sent}/${targetLeads} DMs envoyés — ${campaignResult.filtered + campaignResult.details.length} profils examinés, ${campaignResult.filtered} filtrés (bio-link/site web déjà présent). Essaie une niche moins digitalisée ou une autre ville.`,
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
