/**
 * Filtre Léger Instagram — Qualification rapide via Puppeteer stealth.
 * Utilise la session persistante pour accéder aux stats du profil.
 * Rapide : pas de screenshot, juste scrape des métriques.
 */

import type { Page } from 'puppeteer';
import { newStealthPage } from './stealth-browser';

export interface IGLightProfile {
  handle: string;
  profileUrl: string;
  exists: boolean;
  isPrivate: boolean;
  followers: number;
  following: number;
  postCount: number;
  bio: string;
  bioLink: string | null;
  fullName: string;
  isBusinessAccount: boolean;
  lastPostRecent: boolean;
}

export interface IGLightFilterResult {
  passed: boolean;
  reason: string;
  profile: IGLightProfile | null;
  score: number;
}

const MIN_FOLLOWERS = 50;
const MIN_POSTS = 5;

// ─── Bio-Link Gatekeeper ────────────────────────────────────────────────────

/** Plateformes-outils : pas un vrai site web → QUALIFIÉ */
const PLATFORM_DOMAINS = [
  'doctolib', 'planity', 'calendly', 'cal.com', 'tiktok', 'snapchat',
  'fresha', 'treatwell', 'facebook.com', 'youtube.com', 'twitter.com',
  'x.com', 'wa.me', 'whatsapp.com', 'threads.com', 'threads.net',
];

/** Agrégateurs de liens : trop complexe à parser → REJETÉ */
const LINKAGGREG_DOMAINS = [
  'linktr.ee', 'linktree.com', 'campsite.bio', 'tap.bio', 'lnk.bio',
  'bio.link', 'beacons.ai', 'hoo.be', 'solo.to',
];

export type BioLinkVerdict = 'NO_LINK' | 'PLATFORM' | 'AGGREGATOR' | 'CUSTOM_SITE';

/**
 * Analyse le lien de la bio Instagram et retourne le verdict.
 * - NO_LINK → QUALIFIÉ (Le Graal)
 * - PLATFORM → QUALIFIÉ (pas un vrai site)
 * - AGGREGATOR → REJETÉ (boîte noire)
 * - CUSTOM_SITE → REJETÉ (ils ont déjà un site)
 */
export function classifyBioLink(bioLink: string | null): { verdict: BioLinkVerdict; reason: string } {
  if (!bioLink || bioLink.trim() === '') {
    return { verdict: 'NO_LINK', reason: 'Aucun lien en bio — Le Graal' };
  }

  const linkLower = bioLink.toLowerCase();

  for (const domain of LINKAGGREG_DOMAINS) {
    if (linkLower.includes(domain)) {
      return { verdict: 'AGGREGATOR', reason: `Lien agrégateur détecté (${domain}) — Boîte Noire` };
    }
  }

  for (const domain of PLATFORM_DOMAINS) {
    if (linkLower.includes(domain)) {
      return { verdict: 'PLATFORM', reason: `Plateforme-outil détectée (${domain}) — pas un site web` };
    }
  }

  return { verdict: 'CUSTOM_SITE', reason: `Site web existant détecté (${bioLink}) — déjà équipé` };
}

/**
 * Scrape les stats d'un profil Instagram via Puppeteer stealth (session active).
 */
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchProfileViaPage(handle: string): Promise<IGLightProfile | null> {
  let page: Page | null = null;
  try {
    page = await newStealthPage();
    await page.goto(`https://www.instagram.com/${handle}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });
    // Attendre que les stats se chargent (Instagram est une SPA)
    await sleep(3000);
    await page.waitForSelector('header', { timeout: 5000 }).catch(() => {});

    // Vérifier que le profil existe (pas de page 404 / "Sorry, this page isn't available")
    const notFound = await page.evaluate(() => {
      return document.body.innerText.includes("Sorry, this page") ||
        document.body.innerText.includes("Page introuvable") ||
        document.body.innerText.includes("isn't available");
    });
    if (notFound) return null;

    const data = await page.evaluate(() => {
      const parseNum = (raw: string): number => {
        const s = (raw || '').replace(/,/g, '').trim();
        if (/[Kk]$/.test(s)) return Math.round(parseFloat(s) * 1000);
        if (/[Mm]$/.test(s)) return Math.round(parseFloat(s) * 1000000);
        return parseInt(s, 10) || 0;
      };

      // Stratégie 1 : JSON embarqué dans les scripts (le plus fiable)
      let followers = 0, following = 0, postCount = 0;
      let bio = '', fullName = '', bioLink: string | null = null;
      let isPrivate = false, isBusinessAccount = false;

      try {
        const scripts = document.querySelectorAll('script[type="application/json"], script:not([src])');
        for (const script of scripts) {
          const text = script.textContent || '';
          if (!text.includes('"edge_followed_by"') && !text.includes('"follower_count"')) continue;
          try {
            const json = JSON.parse(text);
            // Chercher récursivement les champs clés
            const find = (obj: any): any => {
              if (!obj || typeof obj !== 'object') return null;
              if ('edge_followed_by' in obj) return obj;
              if ('follower_count' in obj) return obj;
              for (const v of Object.values(obj)) {
                const r = find(v);
                if (r) return r;
              }
              return null;
            };
            const node = find(json);
            if (node) {
              followers = node.edge_followed_by?.count ?? node.follower_count ?? 0;
              following = node.edge_follow?.count ?? node.following_count ?? 0;
              postCount = node.edge_owner_to_timeline_media?.count ?? node.media_count ?? 0;
              bio = node.biography || '';
              fullName = node.full_name || '';
              isPrivate = node.is_private ?? false;
              isBusinessAccount = node.is_business_account ?? node.is_professional_account ?? false;
              const extUrl = node.external_url || node.bio_links?.[0]?.url || '';
              if (extUrl) bioLink = extUrl;
              break;
            }
          } catch { /* continue */ }
        }
      } catch { /* continuer vers stratégie 2 */ }

      // Stratégie 2 : DOM header (fallback si JSON non trouvé)
      if (followers === 0) {
        const getText = (el: Element | null): string => el?.textContent?.trim() || '';
        const headerText = document.querySelector('header')?.textContent || '';

        const fMatch = headerText.match(/([\d,.]+[KkMm]?)\s*(?:followers|abonnés)/i);
        if (fMatch) followers = parseNum(fMatch[1]);

        const pMatch = headerText.match(/([\d,.]+[KkMm]?)\s*(?:posts?|publications?)/i);
        if (pMatch) postCount = parseNum(pMatch[1]);

        if (!bio) {
          const bioEl = document.querySelector('header section > div > span');
          bio = getText(bioEl);
        }
        if (!fullName) {
          const nameEl = document.querySelector('header section h1, header section h2, header h1, header h2');
          fullName = getText(nameEl);
        }
        if (!isPrivate) {
          isPrivate = document.body.innerText.includes('This account is private') ||
            document.body.innerText.includes('Ce compte est privé');
        }
      }

      // Bio Link depuis le DOM (si pas trouvé dans JSON)
      if (!bioLink) {
        const bioLinkEl = document.querySelector(
          'header a[href*="l.instagram.com"], header a[rel*="nofollow"], header a[target="_blank"]'
        );
        if (bioLinkEl) {
          const href = bioLinkEl.getAttribute('href') || '';
          if (href.includes('l.instagram.com')) {
            const urlMatch = href.match(/u=([^&]+)/);
            if (urlMatch) bioLink = decodeURIComponent(urlMatch[1]);
          } else if (href.startsWith('http')) {
            bioLink = href;
          }
        }
      }

      return { followers, following, postCount, bio, bioLink, fullName, isPrivate, isBusinessAccount };
    });

    // Activité : si postCount > 0 dans le JSON, on considère le compte actif
    // (article time ne charge pas assez vite avec domcontentloaded)
    const lastPostRecent = data.postCount > 0;

    return {
      handle,
      profileUrl: `https://www.instagram.com/${handle}/`,
      exists: true,
      isPrivate: data.isPrivate,
      followers: data.followers,
      following: data.following,
      postCount: data.postCount,
      bio: data.bio,
      bioLink: data.bioLink,
      fullName: data.fullName || handle,
      isBusinessAccount: data.isBusinessAccount,
      lastPostRecent,
    };
  } catch {
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

/**
 * Score prospect 0-100.
 */
function calculateProspectScore(profile: IGLightProfile): number {
  let score = 0;

  // Followers (max 30 pts)
  if (profile.followers >= 10000) score += 30;
  else if (profile.followers >= 5000) score += 25;
  else if (profile.followers >= 1000) score += 20;
  else if (profile.followers >= 500) score += 15;
  else if (profile.followers >= 100) score += 10;
  else if (profile.followers >= MIN_FOLLOWERS) score += 5;

  // Posts (max 20 pts)
  if (profile.postCount >= 50) score += 20;
  else if (profile.postCount >= 20) score += 15;
  else if (profile.postCount >= MIN_POSTS) score += 10;

  // Activité récente (20 pts)
  if (profile.lastPostRecent) score += 20;

  // Compte business (15 pts)
  if (profile.isBusinessAccount) score += 15;

  // Compte public (15 pts)
  if (!profile.isPrivate) score += 15;

  return Math.min(score, 100);
}

/**
 * Filtre léger : qualifie un profil Instagram en ~3-5 secondes.
 */
export async function filterInstagramProfile(handle: string): Promise<IGLightFilterResult> {
  const profile = await fetchProfileViaPage(handle);

  if (!profile) {
    return { passed: false, reason: 'Profil inexistant ou inaccessible', profile: null, score: 0 };
  }

  if (profile.isPrivate) {
    return { passed: false, reason: 'Compte privé — DM impossible', profile, score: 0 };
  }

  if (profile.followers < MIN_FOLLOWERS) {
    return { passed: false, reason: `${profile.followers} followers < ${MIN_FOLLOWERS} minimum`, profile, score: 0 };
  }

  if (profile.postCount < MIN_POSTS) {
    return { passed: false, reason: `${profile.postCount} posts < ${MIN_POSTS} minimum`, profile, score: 0 };
  }

  if (!profile.lastPostRecent) {
    return { passed: false, reason: 'Compte inactif — dernier post > 30 jours', profile, score: 0 };
  }

  // ── Influencer Gatekeeper ──
  // Rejeter les comptes personnels de type influenceur/blogger/créateur de contenu
  // qui parlent DE la niche mais ne SONT PAS le business cible
  const INFLUENCER_KEYWORDS = [
    'influenceur', 'influenceuse', 'influencer',
    'content creator', 'créateur de contenu', 'créatrice de contenu',
    'blogueur', 'blogueuse', 'blogger', 'blog',
    'food blogger', 'food lover', 'foodie', 'food addict',
    'l\'influ', 'l\'influenceur',
    'partenariat', 'collaboration pro', 'press kit',
    'ugc creator', 'ugc',
    'nano influenceur', 'micro influenceur',
    'lifestyle', 'créateur', 'créatrice',
  ];
  const bioAndName = `${profile.bio} ${profile.fullName}`.toLowerCase();
  const influencerMatch = INFLUENCER_KEYWORDS.find(kw => bioAndName.includes(kw));
  if (influencerMatch) {
    return { passed: false, reason: `Influenceur/blogger détecté ("${influencerMatch}") — pas un business`, profile, score: 0 };
  }

  // ── Bio-Link Gatekeeper ──
  const bioLinkVerdict = classifyBioLink(profile.bioLink);
  if (bioLinkVerdict.verdict === 'AGGREGATOR') {
    return { passed: false, reason: `REJETÉ — ${bioLinkVerdict.reason}`, profile, score: 0 };
  }
  if (bioLinkVerdict.verdict === 'CUSTOM_SITE') {
    return { passed: false, reason: `REJETÉ — ${bioLinkVerdict.reason}`, profile, score: 0 };
  }
  // NO_LINK ou PLATFORM → on continue

  const score = calculateProspectScore(profile);

  if (score < 40) {
    return { passed: false, reason: `Score prospect ${score}/100 — trop bas`, profile, score };
  }

  return { passed: true, reason: `Score prospect ${score}/100 — qualifié`, profile, score };
}
