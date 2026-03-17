/**
 * Instagram Searcher — utilise le Chrome CDP (port 9222) déjà connecté à Instagram.
 * Ouvre un nouvel onglet, tape la recherche dans la barre IG,
 * clique sur l'onglet "Comptes", scrolle pour charger un maximum de profils.
 */

import { connectToDebugChrome } from './stealth-browser';

const IGNORED_HANDLES = new Set([
  'explore', 'reels', 'direct', 'accounts', 'p', 'stories', 'about',
  'instagram', 'help', 'legal', 'privacy', 'safety', 'press', 'null',
  'undefined', 'www', 'shop', 'api', 'graphql',
]);

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface IGSearchResult {
  handles: string[];
  query: string;
}

/**
 * Recherche des profils Instagram et scrolle pour charger un maximum de résultats.
 * Clique sur l'onglet "Comptes" pour avoir uniquement des profils.
 */
export async function searchInstagramProfiles(
  niche: string,
  ville: string,
  maxResults: number = 100,
  onEvent?: (type: string, message: string) => void,
): Promise<IGSearchResult> {
  const emit = onEvent || (() => {});
  const query = ville ? `${niche} ${ville}` : niche;

  const browser = await connectToDebugChrome();
  const page = await browser.newPage();

  try {
    emit('info', `🌐 Ouverture Instagram (Chrome CDP)...`);
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);

    const loggedIn = await page.evaluate(() => {
      const text = document.body.innerText;
      return !text.includes('Log in') && !text.includes('Se connecter') && !text.includes('Connexion');
    });
    if (!loggedIn) throw new Error('Session Instagram expirée — reconnexion manuelle requise sur le VPS');

    emit('info', `🔍 Recherche "${query}"...`);

    // ── Naviguer directement vers la recherche par URL (plus fiable) ──
    await page.goto(
      `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`,
      { waitUntil: 'networkidle2', timeout: 20000 },
    );
    await sleep(3000);

    // ── Cliquer sur l'onglet "Comptes" / "Accounts" ──
    const accountsTabClicked = await page.evaluate(() => {
      const tabs = document.querySelectorAll('[role="tab"], a[role="tab"], button[role="tab"]');
      for (const tab of tabs) {
        const text = (tab.textContent || '').toLowerCase().trim();
        if (text === 'accounts' || text === 'comptes' || text.includes('account') || text.includes('compte')) {
          (tab as HTMLElement).click();
          return true;
        }
      }
      // Fallback: chercher un lien avec "accounts" dans l'URL
      const links = document.querySelectorAll('a[href*="accounts"]');
      for (const link of links) {
        (link as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (accountsTabClicked) {
      await sleep(2000);
      emit('info', `   ↳ Onglet "Comptes" activé`);
    }

    // ── Collecter les handles en scrollant ──
    const allHandles = new Set<string>();
    let scrollAttempts = 0;
    const maxScrolls = Math.ceil(maxResults / 8); // ~8 profils par scroll

    while (allHandles.size < maxResults && scrollAttempts < maxScrolls) {
      // Extraire les handles visibles
      const newHandles = await page.evaluate((ignored: string[]) => {
        const found: string[] = [];
        const links = document.querySelectorAll('a[href]');
        for (const link of links) {
          const href = link.getAttribute('href') || '';
          const match = href.match(/^\/([a-zA-Z0-9_.]{2,30})\/?$/);
          if (match) {
            const h = match[1];
            if (!ignored.includes(h) && !found.includes(h) && h.length >= 3) {
              found.push(h);
            }
          }
        }
        return found;
      }, Array.from(IGNORED_HANDLES));

      let addedCount = 0;
      for (const h of newHandles) {
        if (!allHandles.has(h)) {
          allHandles.add(h);
          addedCount++;
        }
      }

      if (scrollAttempts > 0 && addedCount === 0) {
        // Plus de nouveaux profils, on s'arrête
        break;
      }

      // Scroller vers le bas
      await page.evaluate(() => window.scrollBy(0, 1200));
      await sleep(rand(1200, 2000));
      scrollAttempts++;
    }

    emit('info', `   ✅ ${allHandles.size} profils collectés pour "${query}" (${scrollAttempts} scrolls)`);

    const handles = Array.from(allHandles).slice(0, maxResults);
    return { handles, query };

  } finally {
    await page.close().catch(() => {});
    // Ne PAS fermer le browser (partagé via CDP)
  }
}
