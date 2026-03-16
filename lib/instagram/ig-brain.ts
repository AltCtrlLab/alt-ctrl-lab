/**
 * IG Brain — Le Cerveau (Agent OpenClaw).
 *
 * Reçoit le payload sensoriel de Puppeteer (liens externes + screenshot)
 * et prend les décisions :
 * 1. Qualification : le lead a-t-il un vrai site web ?
 * 2. Rédaction : DM Premium personnalisé basé sur l'analyse visuelle
 *
 * Aucune navigation ici — juste de l'intelligence.
 */

import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import type { ProfileSensorData } from './ig-profile-sensor';

export interface BrainDecision {
  qualified: boolean;
  reason: string;
  dm: string | null;
}

/** Plateformes-outils → pas un vrai site → QUALIFIÉ */
const PLATFORM_DOMAINS = [
  'doctolib', 'planity', 'calendly', 'cal.com', 'cal.eu',
  'tiktok', 'snapchat', 'fresha', 'treatwell',
  'facebook.com', 'youtube.com', 'twitter.com', 'x.com',
  'wa.me', 'whatsapp.com', 'threads.com',
  'bit.ly', 'stan.store',
];

/** Agrégateurs de liens → boîte noire → REJETÉ */
const AGGREGATOR_DOMAINS = [
  'linktr.ee', 'linktree.com', 'campsite.bio', 'tap.bio', 'lnk.bio',
  'bio.link', 'beacons.ai', 'hoo.be', 'solo.to',
];

/**
 * Pré-filtre déterministe rapide.
 * Élimine les profils évidemment non-qualifiés AVANT d'invoquer l'agent.
 */
function preFilter(data: ProfileSensorData): { pass: boolean; reason: string } {
  if (data.isPrivate) return { pass: false, reason: 'Compte privé' };
  if (data.followers < 50) return { pass: false, reason: `${data.followers} followers < 50 minimum` };
  if (data.postCount < 5) return { pass: false, reason: `${data.postCount} posts < 5 minimum` };
  return { pass: true, reason: 'Pré-filtre OK' };
}

/**
 * Le Cerveau : qualification + rédaction en un seul appel agent.
 *
 * L'agent reçoit :
 * - La liste des liens externes (data fiable, pas de vision)
 * - Les descriptions alt-text des posts (pour le contexte visuel)
 * - Le nom, la bio, le secteur
 *
 * L'agent décide et rédige.
 */
export async function brainDecide(
  data: ProfileSensorData,
  niche: string,
): Promise<BrainDecision> {
  // ── Pré-filtre déterministe (pas besoin d'IA pour ça) ──
  const pf = preFilter(data);
  if (!pf.pass) {
    return { qualified: false, reason: pf.reason, dm: null };
  }

  // ── Classifier les liens externes ──
  const links = data.externalLinks;
  const platformLinks: string[] = [];
  const aggregatorLinks: string[] = [];
  const siteLinks: string[] = [];

  for (const link of links) {
    const ll = link.toLowerCase();
    if (AGGREGATOR_DOMAINS.some(d => ll.includes(d))) {
      aggregatorLinks.push(link);
    } else if (PLATFORM_DOMAINS.some(d => ll.includes(d))) {
      platformLinks.push(link);
    } else {
      siteLinks.push(link);
    }
  }

  // ── Construire le payload pour l'agent ──
  const prompt = `Tu es le Directeur de la Stratégie Digitale d'AltCtrl.Lab. Tu analyses un profil Instagram pour décider s'il est un prospect qualifié, puis tu rédiges un DM de prospection premium si oui.

═══════════════════════════════════════════
DONNÉES DU PROFIL (extraites par Puppeteer)
═══════════════════════════════════════════

Nom : ${data.fullName}
Handle : @${data.handle}
Secteur : ${niche}
Bio : ${data.bio || '(vide)'}
Followers : ${data.followers}
Posts : ${data.postCount}

LIENS EXTERNES TROUVÉS SUR LA PAGE :
${links.length === 0 ? '(aucun lien externe — Le Graal)' : links.map((l, i) => `  ${i + 1}. ${l}`).join('\n')}

Classification automatique :
- Sites web potentiels : ${siteLinks.length > 0 ? siteLinks.join(', ') : '(aucun)'}
- Plateformes-outils : ${platformLinks.length > 0 ? platformLinks.join(', ') : '(aucune)'}
- Agrégateurs de liens : ${aggregatorLinks.length > 0 ? aggregatorLinks.join(', ') : '(aucun)'}

DESCRIPTIONS VISUELLES DES DERNIERS POSTS :
${data.postDescriptions.length > 0 ? data.postDescriptions.map((d, i) => `  Post ${i + 1}: ${d}`).join('\n') : '(aucune description disponible)'}

═══════════════════════════════════════════
ÉTAPE 1 — QUALIFICATION
═══════════════════════════════════════════

Règle : Analyse le tableau des liens externes.
- Si "Sites web potentiels" contient un vrai nom de domaine d'entreprise (comme il-valentino.ch, restaurantoctopus.ch), le lead est REJETÉ — ils ont déjà un site.
- Si les liens sont vides, ou ne contiennent que des plateformes-outils (doctolib, planity, calendly, etc.), le lead est QUALIFIÉ.
- Si un agrégateur de liens est présent (linktr.ee, etc.), le lead est REJETÉ — boîte noire, impossible de savoir s'ils ont un site.

═══════════════════════════════════════════
ÉTAPE 2 — RÉDACTION DU DM (uniquement si QUALIFIÉ)
═══════════════════════════════════════════

Si le lead est qualifié, rédige un DM Instagram premium.

STRUCTURE EXACTE :

LIGNE 1 — "Bonjour,"

LIGNE 2 — ICEBREAKER VISUEL : Utilise les descriptions des posts pour faire une observation de pair à pair sur leur Direction Artistique. Référence un élément spécifique et visuel (un dressage, une lumière, une composition, une matière, un détail technique). Max 20 mots. Vouvoiement. Zéro emoji. Zéro point d'exclamation.

LIGNE 3 — DIAGNOSTIC : Fais remarquer avec élégance le décalage entre la qualité de leur travail et l'absence d'écrin digital. Ne jamais dire "site web" — utilise "empreinte digitale", "expérience web", "vitrine en ligne", "écrin digital".

LIGNE 4 — QUESTION DE CURIOSITÉ : Une question stratégique à faible friction. Le prospect doit réfléchir, pas acheter.

LIGNE 5 — FORMULE : Élégante + retour à la ligne + "L'équipe AltCtrl.Lab"

INTERDITS : Zéro lien, zéro mention d'agence, zéro emoji, zéro "!", jamais "site web", vouvoiement strict.

═══════════════════════════════════════════
FORMAT DE RÉPONSE (STRICT)
═══════════════════════════════════════════

VERDICT: QUALIFIÉ ou REJETÉ
RAISON: [explication courte]
DM:
[le DM complet prêt à envoyer, ou "N/A" si rejeté]`;

  try {
    const result = await executeOpenClawAgent('khatib', prompt, 90000);

    if (!result.success || !result.stdout.trim()) {
      // Fallback déterministe si l'agent échoue
      return fallbackDecision(data, niche, siteLinks, aggregatorLinks);
    }

    return parseAgentResponse(result.stdout.trim(), data, niche, siteLinks, aggregatorLinks);
  } catch {
    return fallbackDecision(data, niche, siteLinks, aggregatorLinks);
  }
}

/**
 * Parse la réponse de l'agent au format VERDICT/RAISON/DM.
 */
function parseAgentResponse(
  output: string,
  data: ProfileSensorData,
  niche: string,
  siteLinks: string[],
  aggregatorLinks: string[],
): BrainDecision {
  const verdictMatch = output.match(/VERDICT\s*:\s*(QUALIFI[ÉE]|REJET[ÉE])/i);
  const raisonMatch = output.match(/RAISON\s*:\s*(.+)/i);
  const dmMatch = output.match(/DM\s*:\s*\n?([\s\S]+)/i);

  if (!verdictMatch) {
    // L'agent n'a pas suivi le format → fallback
    return fallbackDecision(data, niche, siteLinks, aggregatorLinks);
  }

  const qualified = verdictMatch[1].toUpperCase().startsWith('QUALIFI');
  const reason = raisonMatch?.[1]?.trim() || (qualified ? 'Qualifié par agent' : 'Rejeté par agent');

  let dm: string | null = null;
  if (qualified && dmMatch) {
    dm = dmMatch[1].trim();
    if (dm === 'N/A' || dm.length < 20) dm = null;
    // Nettoyer les guillemets éventuels
    if (dm?.startsWith('"') && dm.endsWith('"')) dm = dm.slice(1, -1);
    if (dm?.startsWith('«') && dm.endsWith('»')) dm = dm.slice(1, -1).trim();
  }

  return { qualified, reason, dm };
}

/**
 * Décision de fallback purement déterministe (si l'agent est indisponible).
 */
function fallbackDecision(
  data: ProfileSensorData,
  niche: string,
  siteLinks: string[],
  aggregatorLinks: string[],
): BrainDecision {
  if (siteLinks.length > 0) {
    return { qualified: false, reason: `Site web détecté : ${siteLinks[0]}`, dm: null };
  }
  if (aggregatorLinks.length > 0) {
    return { qualified: false, reason: `Agrégateur détecté : ${aggregatorLinks[0]}`, dm: null };
  }

  // Qualifié mais DM template (pas d'agent)
  const dm = [
    'Bonjour,',
    '',
    `Votre travail visuel en ${niche} traduit une vraie recherche esthétique.`,
    '',
    `En parcourant votre profil, on remarque que vous n'avez pas encore d'écrin digital pour prolonger cette expérience au-delà d'Instagram.`,
    '',
    `Avez-vous déjà envisagé une vitrine en ligne qui reflète cette identité visuelle ?`,
    '',
    'Au plaisir de vous lire,',
    "L'équipe AltCtrl.Lab",
  ].join('\n');

  return { qualified: true, reason: 'Qualifié (fallback — agent indisponible)', dm };
}
