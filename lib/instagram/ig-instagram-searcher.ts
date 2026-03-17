/**
 * Instagram Searcher — Chrome CDP (port 9222).
 * Utilise l'URL de recherche standard (sans type=account — trop restrictif).
 * Scrolle via page.mouse.wheel() pour déclencher les WheelEvents React.
 */

import { connectToDebugChrome } from './stealth-browser';

const IGNORED_HANDLES = new Set([
  'explore', 'reels', 'direct', 'accounts', 'p', 'stories', 'about',
  'instagram', 'help', 'legal', 'privacy', 'safety', 'press', 'null',
  'undefined', 'www', 'shop', 'api', 'graphql', '_n', 'shareddata',
]);

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface IGSearchResult {
  handles: string[];
  query: string;
}

export async function searchInstagramProfiles(
  niche: string,
  ville: string,
  maxResults: number = 100,
  onEvent?: (type: string, message: string) => void,
): Promise<IGSearchResult> {
  const emit = onEvent || (() => {});
  const query = ville ? `${niche} ${ville}`.trim() : niche.trim();

  const browser = await connectToDebugChrome();
  const page = await browser.newPage();

  try {
    emit('info', `🌐 Connexion Instagram (Chrome CDP)...`);

    // Recherche standard (sans type=account — retourne trop peu de résultats)
    const searchUrl = `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(3000);
    await page.waitForSelector('a[href^="/"]', { timeout: 8000 }).catch(() => {});

    // Vérifier la session
    const loggedIn = await page.evaluate(() => {
      const text = document.body.innerText;
      return !text.includes('Log in') && !text.includes('Se connecter') && !text.includes('Connexion');
    });
    if (!loggedIn) throw new Error('Session Instagram expirée — reconnexion manuelle requise sur le VPS');

    emit('info', `🔍 Recherche "${query}"...`);

    const allHandles = new Set<string>();

    const extractHandles = async (): Promise<number> => {
      const handles = await page.evaluate((ignored: string[]) => {
        const found: string[] = [];
        const links = document.querySelectorAll('a[href]');
        for (const link of links) {
          const href = (link.getAttribute('href') || '').replace(/^https?:\/\/(?:www\.)?instagram\.com/, '');
          const match = href.match(/^\/([a-zA-Z0-9_.]{2,30})\/?$/);
          if (match) {
            const h = match[1];
            if (!ignored.includes(h) && h.length >= 3 && !h.startsWith('_')) {
              found.push(h);
            }
          }
        }
        return found;
      }, Array.from(IGNORED_HANDLES));

      let added = 0;
      for (const h of handles) {
        if (!allHandles.has(h)) {
          allHandles.add(h);
          added++;
        }
      }
      return added;
    };

    // Première extraction
    await extractHandles();

    // Scroll via page.mouse.wheel() — génère de vrais WheelEvents que React intercepte
    await page.mouse.move(683, 400);
    let consecutiveEmpty = 0;
    for (let i = 0; i < 25 && allHandles.size < maxResults; i++) {
      await page.mouse.wheel({ deltaY: 800 });
      await sleep(2000);
      const added = await extractHandles();

      if (added === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 3) break; // 3 scrolls sans nouveau résultat → on arrête
      } else {
        consecutiveEmpty = 0;
      }
    }

    const handles = Array.from(allHandles).slice(0, maxResults);
    emit('info', `   ✅ ${handles.length} profils collectés pour "${query}"`);

    return { handles, query };

  } finally {
    await page.close().catch(() => {});
  }
}
