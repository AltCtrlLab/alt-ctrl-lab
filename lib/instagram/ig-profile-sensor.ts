/**
 * Profile Sensor — Extraction Sensorielle Hybride (Les Mains).
 *
 * Puppeteer navigue sur le profil Instagram et extrait :
 * 1. Tous les liens externes (bio + module liens + anywhere)
 * 2. Screenshot de la grille (pour analyse DA par l'agent)
 * 3. Métriques brutes (followers, posts, nom, bio)
 *
 * Aucune décision ici — juste de la donnée fiable.
 */

import type { Page } from 'puppeteer';
import { newStealthPage } from './stealth-browser';

export interface ProfileSensorData {
  handle: string;
  exists: boolean;
  isPrivate: boolean;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  postCount: number;
  /** Tous les liens externes trouvés sur la page (hors instagram.com) */
  externalLinks: string[];
  /** Screenshot base64 de la grille des posts */
  gridScreenshot: string | null;
  /** Descriptions alt-text des derniers posts */
  postDescriptions: string[];
}

/**
 * Extrait toutes les données d'un profil Instagram.
 * Ne prend aucune décision — c'est le rôle de l'agent.
 */
export async function extractProfileData(handle: string): Promise<ProfileSensorData | null> {
  let page: Page | null = null;
  try {
    page = await newStealthPage();
    await page.goto(`https://www.instagram.com/${handle}/`, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await new Promise(r => setTimeout(r, 2500));

    // Vérifier existence
    const notFound = await page.evaluate(() => {
      const t = document.body.innerText;
      return t.includes("Sorry, this page") || t.includes("Page introuvable") || t.includes("isn't available");
    });
    if (notFound) return null;

    // ── Extraction des métriques via le texte brut du header ──
    const metrics = await page.evaluate(() => {
      const headerText = document.querySelector('header')?.innerText || '';

      function parseNum(raw: string): number {
        raw = raw.replace(/,/g, '');
        if (raw.match(/[kK]$/)) return Math.round(parseFloat(raw) * 1000);
        if (raw.match(/[mM]$/)) return Math.round(parseFloat(raw) * 1000000);
        return parseInt(raw, 10) || 0;
      }

      let followers = 0, following = 0, postCount = 0;

      const fMatch = headerText.match(/([\d,.]+[KkMm]?)\s*followers?/i);
      if (fMatch) followers = parseNum(fMatch[1]);
      const abMatch = headerText.match(/([\d,.]+[KkMm]?)\s*abonn[ée]/i);
      if (abMatch && !followers) followers = parseNum(abMatch[1]);

      const flMatch = headerText.match(/([\d,.]+[KkMm]?)\s*following/i);
      if (flMatch) following = parseNum(flMatch[1]);
      const abmtMatch = headerText.match(/([\d,.]+[KkMm]?)\s*abonnement/i);
      if (abmtMatch && !following) following = parseNum(abmtMatch[1]);

      const pMatch = headerText.match(/([\d,.]+[KkMm]?)\s*posts?/i);
      if (pMatch) postCount = parseNum(pMatch[1]);
      const pubMatch = headerText.match(/([\d,.]+[KkMm]?)\s*publication/i);
      if (pubMatch && !postCount) postCount = parseNum(pubMatch[1]);

      const bioEl = document.querySelector('header section > div > span, header section div[class] > span');
      const bio = bioEl?.textContent?.trim() || '';

      const nameEl = document.querySelector('header section h1, header section h2');
      const fullName = nameEl?.textContent?.trim() || '';

      const isPrivate = document.body.innerText.includes('This account is private') ||
        document.body.innerText.includes('Ce compte est privé');

      return { followers, following, postCount, bio, fullName, isPrivate };
    });

    // ── Extraction de TOUS les liens externes ──
    // querySelectorAll('a') → filtrer hors instagram.com
    const externalLinks = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      const externals: string[] = [];
      const seen = new Set<string>();

      for (const link of allLinks) {
        let href = link.getAttribute('href') || '';

        // Décoder les liens wrappés par Instagram (l.instagram.com/...)
        if (href.includes('l.instagram.com')) {
          const urlMatch = href.match(/u=([^&]+)/);
          if (urlMatch) href = decodeURIComponent(urlMatch[1]);
        }

        // Ignorer les liens internes Instagram
        if (!href.startsWith('http')) continue;
        if (href.includes('instagram.com')) continue;
        if (href.includes('facebook.com/instagram')) continue;

        // Nettoyer les tracking params pour déduplication
        let clean: string;
        try {
          const url = new URL(href);
          clean = url.origin + url.pathname;
        } catch {
          clean = href.split('?')[0];
        }

        if (!seen.has(clean)) {
          seen.add(clean);
          externals.push(clean);
        }
      }

      return externals;
    });

    // ── Screenshot de la grille ──
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await new Promise(r => setTimeout(r, 2000));

    let gridScreenshot: string | null = null;
    try {
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        encoding: 'base64',
        clip: { x: 0, y: 200, width: 1366, height: 600 },
      });
      gridScreenshot = `data:image/png;base64,${screenshotBuffer}`;
    } catch { /* screenshot optionnel */ }

    // ── Alt-text des posts ──
    const postDescriptions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('article img'))
        .slice(0, 9)
        .map(img => (img as HTMLImageElement).alt)
        .filter(alt => alt && alt.length > 10);
    });

    return {
      handle,
      exists: true,
      isPrivate: metrics.isPrivate,
      fullName: metrics.fullName || handle,
      bio: metrics.bio,
      followers: metrics.followers,
      following: metrics.following,
      postCount: metrics.postCount,
      externalLinks,
      gridScreenshot,
      postDescriptions,
    };
  } catch {
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
