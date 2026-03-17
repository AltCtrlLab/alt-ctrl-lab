/**
 * Instagram Searcher — Chrome CDP (port 9222).
 * Utilise l'URL de recherche avec type=account pour avoir uniquement des profils.
 * Scrolle le container de résultats pour charger un maximum de profils.
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

    // Aller directement sur la recherche filtrée par comptes
    const searchUrl = `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}&type=account`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(3000);

    // Vérifier la session
    const loggedIn = await page.evaluate(() => {
      const text = document.body.innerText;
      return !text.includes('Log in') && !text.includes('Se connecter') && !text.includes('Connexion');
    });
    if (!loggedIn) throw new Error('Session Instagram expirée — reconnexion manuelle requise sur le VPS');

    emit('info', `🔍 Recherche "${query}" (type=account)...`);

    // Extraire les handles initiaux
    const allHandles = new Set<string>();

    // Fonction d'extraction des handles depuis la page
    const extractHandles = async (): Promise<number> => {
      const handles = await page.evaluate((ignored: string[]) => {
        const found: string[] = [];
        // Chercher tous les liens qui ressemblent à des profils IG
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

    // Scroller pour charger plus de profils
    // Instagram charge les résultats dans un div scrollable — on essaie plusieurs approches
    for (let i = 0; i < 20 && allHandles.size < maxResults; i++) {
      // Approche 1 : scroller le container de résultats
      const scrolled = await page.evaluate(() => {
        // Chercher le container scrollable des résultats
        const selectors = [
          'div[style*="overflow"]',
          '[role="main"] div',
          'main div',
          'div[class*="search"]',
        ];
        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            if (el.scrollHeight > el.clientHeight + 100) {
              el.scrollTop += 800;
              return true;
            }
          }
        }
        // Fallback : scroller la page entière
        window.scrollTo(0, document.body.scrollHeight);
        return false;
      });

      await sleep(1500);
      const added = await extractHandles();

      if (i > 3 && added === 0) {
        // Essayer de scroller différemment
        await page.evaluate(() => {
          document.querySelector('main')?.scrollBy(0, 800);
          document.body.scrollTop += 800;
          window.scrollBy(0, 800);
        });
        await sleep(1000);
        const added2 = await extractHandles();
        if (added2 === 0) break; // Plus rien à charger
      }
    }

    // Si on a peu de résultats, essayer aussi la recherche sans le filtre type=account
    if (allHandles.size < 10) {
      emit('info', `   ↳ Peu de résultats (${allHandles.size}), tentative sans filtre type...`);
      await page.goto(
        `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`,
        { waitUntil: 'networkidle2', timeout: 20000 },
      );
      await sleep(3000);
      await extractHandles();

      for (let i = 0; i < 10 && allHandles.size < maxResults; i++) {
        await page.evaluate(() => { window.scrollBy(0, 1000); });
        await sleep(1200);
        const added = await extractHandles();
        if (added === 0) break;
      }
    }

    const handles = Array.from(allHandles).slice(0, maxResults);
    emit('info', `   ✅ ${handles.length} profils collectés pour "${query}"`);

    return { handles, query };

  } finally {
    await page.close().catch(() => {});
  }
}
