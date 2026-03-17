/**
 * Instagram Searcher — Chrome CDP (port 9222).
 * Stratégie : utiliser la barre de recherche Instagram comme un humain.
 * 1. Aller sur instagram.com
 * 2. Cliquer sur le champ de recherche
 * 3. Taper la query
 * 4. Attendre les résultats (dropdown)
 * 5. Scroller dans les résultats pour en charger plus
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

    // Aller sur la page d'accueil Instagram
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(3000);

    // Vérifier la session
    const url = page.url();
    if (url.includes('/accounts/login') || url.includes('/login')) {
      throw new Error('Session Instagram expirée — reconnexion manuelle requise sur le VPS');
    }

    emit('info', `🔍 Recherche "${query}" via barre de recherche...`);

    // Trouver et cliquer sur la barre de recherche
    // Instagram a plusieurs variantes de sélecteurs selon la version
    const searchSelectors = [
      'input[placeholder*="Search"]',
      'input[placeholder*="search"]',
      'input[placeholder*="Rechercher"]',
      'input[aria-label*="Search"]',
      'input[aria-label*="Rechercher"]',
      '[role="button"][aria-label*="Search"]',
      '[role="button"][aria-label*="Rechercher"]',
      'a[href="/direct/inbox/"] + * input',
    ];

    let searchClicked = false;
    for (const sel of searchSelectors) {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        searchClicked = true;
        break;
      }
    }

    // Si pas trouvé avec les sélecteurs classiques, chercher via le texte
    if (!searchClicked) {
      // Essayer de trouver via l'icône loupe en cliquant sur le nav
      const navLinks = await page.$$('a[href]');
      for (const link of navLinks) {
        const ariaLabel = await link.evaluate(el => el.getAttribute('aria-label') || '');
        if (ariaLabel.toLowerCase().includes('search') || ariaLabel.toLowerCase().includes('recherch')) {
          await link.click();
          searchClicked = true;
          break;
        }
      }
    }

    if (!searchClicked) {
      // Fallback: aller directement sur l'URL de recherche
      emit('info', `   ↳ Barre de recherche non trouvée, fallback URL...`);
      await page.goto(
        `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`,
        { waitUntil: 'domcontentloaded', timeout: 25000 }
      );
      await sleep(5000);
    } else {
      await sleep(1000);

      // Taper la query
      await page.keyboard.type(query, { delay: 80 });
      await sleep(3000); // Attendre que les résultats chargent
    }

    // Extraire les handles depuis la page / dropdown
    const allHandles = new Set<string>();

    const extractHandles = async (): Promise<number> => {
      const handles = await page.evaluate((ignored: string[]) => {
        const found: string[] = [];
        const links = document.querySelectorAll('a[href]');
        for (const link of links) {
          const raw = link.getAttribute('href') || '';
          // Supporter href absolu ou relatif
          const href = raw.replace(/^https?:\/\/(?:www\.)?instagram\.com/, '');
          const match = href.match(/^\/([a-zA-Z0-9_.]{2,30})\/?$/);
          if (match) {
            const h = match[1];
            if (!ignored.includes(h) && h.length >= 3 && !h.startsWith('_')) {
              found.push(h);
            }
          }
        }
        return [...new Set(found)]; // dédupliquer
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

    // Attendre que les résultats de recherche apparaissent
    // (compter les profils avant/après pour détecter le chargement)
    let lastCount = allHandles.size;
    for (let wait = 0; wait < 5; wait++) {
      await sleep(1500);
      await extractHandles();
      if (allHandles.size > lastCount + 2) break; // Des résultats ont chargé
      lastCount = allHandles.size;
    }

    emit('info', `   📊 ${allHandles.size} profils après chargement initial`);

    // Scroll pour charger plus de résultats
    await page.mouse.move(683, 400);
    let consecutiveEmpty = 0;
    for (let i = 0; i < 30 && allHandles.size < maxResults; i++) {
      await page.mouse.wheel({ deltaY: 600 });
      await sleep(2000);
      const added = await extractHandles();

      if (added === 0) {
        consecutiveEmpty++;
        // Essayer Page Down aussi
        if (consecutiveEmpty === 1) {
          await page.keyboard.press('PageDown');
          await sleep(1500);
          await extractHandles();
        }
        if (consecutiveEmpty >= 3) break;
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
