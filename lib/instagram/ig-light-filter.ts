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
  'x.com', 'wa.me', 'whatsapp.com',
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
async function fetchProfileViaPage(handle: string): Promise<IGLightProfile | null> {
  let page: Page | null = null;
  try {
    page = await newStealthPage();
    await page.goto(`https://www.instagram.com/${handle}/`, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });

    // Vérifier que le profil existe (pas de page 404 / "Sorry, this page isn't available")
    const notFound = await page.evaluate(() => {
      return document.body.innerText.includes("Sorry, this page") ||
        document.body.innerText.includes("Page introuvable") ||
        document.body.innerText.includes("isn't available");
    });
    if (notFound) return null;

    const data = await page.evaluate(() => {
      const getText = (el: Element | null): string => el?.textContent?.trim() || '';

      // Stats : Instagram met les stats dans des <span> ou <li> dans le header
      // Format : "123 posts", "1,234 followers", "567 following"
      const statElements = document.querySelectorAll('header section ul li, header section li');
      let followers = 0, following = 0, postCount = 0;

      for (const el of statElements) {
        const text = getText(el).toLowerCase();
        const numMatch = text.match(/([\d,.]+[km]?)/i);
        if (!numMatch) continue;

        const raw = numMatch[1].replace(/,/g, '');
        let num = 0;
        if (raw.match(/k$/i)) num = Math.round(parseFloat(raw) * 1000);
        else if (raw.match(/m$/i)) num = Math.round(parseFloat(raw) * 1000000);
        else num = parseInt(raw, 10) || 0;

        if (text.includes('follower') || text.includes('abonné')) followers = num;
        else if (text.includes('following') || text.includes('abonnement')) following = num;
        else if (text.includes('post') || text.includes('publication')) postCount = num;
      }

      // Fallback : chercher dans le texte brut du header
      if (followers === 0) {
        const headerText = document.querySelector('header')?.textContent || '';
        const fMatch = headerText.match(/([\d,.]+[KkMm]?)\s*(?:followers|abonnés)/);
        if (fMatch) {
          const raw = fMatch[1].replace(/,/g, '');
          if (raw.match(/[Kk]$/)) followers = Math.round(parseFloat(raw) * 1000);
          else if (raw.match(/[Mm]$/)) followers = Math.round(parseFloat(raw) * 1000000);
          else followers = parseInt(raw, 10) || 0;
        }
      }

      // Bio
      const bioEl = document.querySelector('header section > div > span, header section div[class] > span');
      const bio = getText(bioEl);

      // Nom complet
      const nameEl = document.querySelector('header section h1, header section h2');
      const fullName = getText(nameEl);

      // Compte privé
      const isPrivate = document.body.innerText.includes('This account is private') ||
        document.body.innerText.includes('Ce compte est privé');

      // Compte business (catégorie visible sous le nom)
      const categoryEl = document.querySelector('header section div[class*="category"], header a[href*="category"]');
      const isBusinessAccount = !!categoryEl?.textContent?.trim();

      // Bio Link : lien externe dans le header du profil
      const bioLinkEl = document.querySelector('header a[href*="l.instagram.com"], header a[rel="me nofollow noopener noreferrer"], header a[target="_blank"]');
      let bioLink: string | null = null;
      if (bioLinkEl) {
        const href = bioLinkEl.getAttribute('href') || '';
        // Instagram wrappe les liens via l.instagram.com/... ou affiche le texte directement
        if (href.includes('l.instagram.com')) {
          const urlMatch = href.match(/u=([^&]+)/);
          if (urlMatch) bioLink = decodeURIComponent(urlMatch[1]);
        } else if (href.startsWith('http')) {
          bioLink = href;
        }
        // Fallback : le texte du lien peut être l'URL directe
        if (!bioLink) {
          const linkText = bioLinkEl.textContent?.trim() || '';
          if (linkText.includes('.') && !linkText.includes(' ')) bioLink = linkText;
        }
      }

      return { followers, following, postCount, bio, bioLink, fullName, isPrivate, isBusinessAccount };
    });

    // Activité récente : vérifier si le premier post a une date récente
    const lastPostRecent = await page.evaluate(() => {
      const timeEl = document.querySelector('article time');
      if (timeEl) {
        const datetime = timeEl.getAttribute('datetime');
        if (datetime) {
          const postDate = new Date(datetime);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return postDate > thirtyDaysAgo;
        }
      }
      // Fallback : si on voit des posts, on assume actif
      const posts = document.querySelectorAll('article img');
      return posts.length > 0;
    });

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
