/**
 * Instagram Searcher — utilise le Chrome CDP (port 9222) déjà connecté à Instagram.
 * Ouvre un nouvel onglet, tape la recherche niche+ville dans la barre de recherche IG,
 * récupère les handles des profils trouvés.
 */

import { connectToDebugChrome } from './stealth-browser';

const IGNORED_HANDLES = new Set([
  'explore', 'reels', 'direct', 'accounts', 'p', 'stories', 'about',
  'instagram', 'help', 'legal', 'privacy', 'safety', 'press',
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
 * Recherche des profils Instagram pour une niche + ville donnée.
 * Utilise le Chrome CDP déjà connecté (CHROME_DEBUG_URL=http://localhost:9222).
 * Retourne une liste de handles (sans @).
 */
export async function searchInstagramProfiles(
  niche: string,
  ville: string,
  maxResults: number = 25,
  onEvent?: (type: string, message: string) => void,
): Promise<IGSearchResult> {
  const emit = onEvent || (() => {});
  const query = `${niche} ${ville}`;

  const browser = await connectToDebugChrome();
  const page = await browser.newPage();

  try {
    emit('info', `🌐 Ouverture Instagram (Chrome CDP)...`);
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);

    // Vérifier la session
    const loggedIn = await page.evaluate(() => {
      const text = document.body.innerText;
      return !text.includes('Log in') && !text.includes('Se connecter') && !text.includes('Connexion');
    });
    if (!loggedIn) throw new Error('Session Instagram expirée — reconnexion manuelle requise sur le VPS');

    emit('info', `🔍 Recherche "${query}"...`);

    // ── Essai 1 : cliquer sur l'icône de recherche dans la sidebar ──
    const searchIconClicked = await page.evaluate(() => {
      // Chercher l'icône loupe dans la sidebar gauche
      const svgs = document.querySelectorAll('svg[aria-label]');
      for (const svg of svgs) {
        const label = (svg.getAttribute('aria-label') || '').toLowerCase();
        if (label.includes('search') || label.includes('recherch')) {
          const parent = svg.closest('a, [role="link"], [role="button"]') as HTMLElement | null;
          if (parent) { parent.click(); return true; }
        }
      }
      // Fallback : chercher un lien href="/explore/" ou texte "Search"
      const links = document.querySelectorAll('a[href="/explore/"], a[href*="search"]');
      for (const link of links) {
        (link as HTMLElement).click();
        return true;
      }
      return false;
    });

    await sleep(1500);

    // ── Essai 2 si l'icône n'est pas trouvée : naviguer via URL ──
    if (!searchIconClicked) {
      emit('info', `   ↳ Icône introuvable, navigation directe...`);
      await page.goto(`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`, {
        waitUntil: 'networkidle2',
        timeout: 15000,
      });
      await sleep(2000);
    } else {
      // Trouver et remplir le champ de recherche
      const inputSel = 'input[placeholder*="earch"], input[placeholder*="echerch"], input[aria-label*="earch"], input[aria-label*="echerch"]';
      try {
        await page.waitForSelector(inputSel, { timeout: 5000 });
      } catch {
        // Fallback navigation
        emit('info', `   ↳ Champ de recherche introuvable, navigation directe...`);
        await page.goto(`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`, {
          waitUntil: 'networkidle2',
          timeout: 15000,
        });
        await sleep(2000);
      }

      const input = await page.$(inputSel);
      if (input) {
        await input.click();
        await sleep(300);
        // Effacer et taper la requête
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.keyboard.type(query, { delay: rand(50, 120) });
        await sleep(3000); // Attendre les suggestions
      }
    }

    // Screenshot de debug
    try {
      await page.screenshot({ path: '/root/ig-agent/debug-search-results.png' }).catch(() => {});
    } catch { /* ignore */ }

    // ── Extraire les handles depuis les résultats ──
    const handles = await page.evaluate((ignoredHandles: string[]) => {
      const found: string[] = [];
      const links = document.querySelectorAll('a[href]');
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/^\/([a-zA-Z0-9_.]+)\/?$/);
        if (match) {
          const h = match[1];
          if (!ignoredHandles.includes(h) && !found.includes(h) && found.length < 30) {
            found.push(h);
          }
        }
      }
      return found;
    }, Array.from(IGNORED_HANDLES));

    emit('info', `   ✅ ${handles.length} profils trouvés pour "${query}"`);

    // Filtrer les handles qui ressemblent à des noms d'utilisateurs IG valides (pas des pages internes)
    const filtered = handles
      .filter(h => h.length > 2 && !h.startsWith('_') && h !== 'null')
      .slice(0, maxResults);

    return { handles: filtered, query };
  } finally {
    await page.close().catch(() => {});
    // Ne PAS fermer le browser (partagé via CDP)
  }
}
