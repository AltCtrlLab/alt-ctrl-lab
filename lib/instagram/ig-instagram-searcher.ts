/**
 * Instagram Searcher — Chrome CDP (port 9222).
 * Stratégie : intercepter les réponses de l'API interne d'Instagram.
 * Instagram appelle /api/v1/web/search/topsearch/ quand l'utilisateur tape
 * dans la barre de recherche → on capture le JSON structuré directement.
 * Plus robuste que scraper le DOM (pas de sélecteurs fragiles).
 */

import { connectToDebugChrome } from './stealth-browser';

const IGNORED_HANDLES = new Set([
  'explore', 'reels', 'direct', 'accounts', 'p', 'stories', 'about',
  'instagram', 'help', 'legal', 'privacy', 'safety', 'press', 'null',
  'undefined', 'www', 'shop', 'api', 'graphql', '_n', 'shareddata',
  'home', 'search', 'login', 'signup', 'register',
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

  const allHandles = new Set<string>();

  try {
    emit('info', `🌐 Connexion Instagram (Chrome CDP)...`);

    // Intercepter les réponses API d'Instagram
    const capturedHandles: string[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (
        url.includes('/api/v1/web/search/topsearch') ||
        url.includes('/web/search/topsearch') ||
        url.includes('query_hash') && url.includes('search')
      ) {
        try {
          const json = await response.json().catch(() => null);
          if (!json) return;

          // Format topsearch : { users: [{ user: { username, ... } }] }
          if (json.users) {
            for (const item of json.users) {
              const handle = item?.user?.username || item?.username;
              if (handle && typeof handle === 'string') capturedHandles.push(handle);
            }
          }
          // Format GraphQL : nested data
          if (json.data?.top?.sections) {
            for (const section of json.data.top.sections) {
              for (const media of section?.layout_content?.medias || []) {
                const handle = media?.media?.owner?.username;
                if (handle) capturedHandles.push(handle);
              }
            }
          }
        } catch { /* ignorer les erreurs de parsing */ }
      }
    });

    // Aller sur Instagram
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2000);

    // Vérifier la session
    const currentUrl = page.url();
    if (currentUrl.includes('/accounts/login') || currentUrl.includes('/login')) {
      throw new Error('Session Instagram expirée — reconnexion manuelle requise sur le VPS');
    }

    emit('info', `🔍 Recherche "${query}" (interception API)...`);

    // Stratégie 1 : appels directs à l'API de recherche via fetch dans la page
    // (utilise les cookies de session déjà présents)
    // Plusieurs contextes pour maximiser les résultats
    const contexts = ['blended', 'user'];
    for (const ctx of contexts) {
      const rankToken = (Math.random()).toFixed(6);
      const apiHandles = await page.evaluate(async (q: string, context: string, token: string) => {
        try {
          const res = await fetch(
            `/api/v1/web/search/topsearch/?context=${context}&query=${encodeURIComponent(q)}&rank_token=${token}&count=50`,
            {
              headers: {
                'x-ig-app-id': '936619743392459',
                'x-requested-with': 'XMLHttpRequest',
                'accept': '*/*',
              },
              credentials: 'include',
            }
          );
          if (!res.ok) return [];
          const json = await res.json();
          const users: string[] = [];
          if (json.users) {
            for (const item of json.users) {
              const u = item?.user?.username || item?.username;
              if (u) users.push(u);
            }
          }
          return users;
        } catch {
          return [];
        }
      }, query, ctx, rankToken);

      for (const h of apiHandles) {
        if (!IGNORED_HANDLES.has(h.toLowerCase()) && h.length >= 3) {
          allHandles.add(h);
        }
      }
    }

    emit('info', `   📊 ${allHandles.size} profils après appels API directs`);

    // Stratégie 2 : si peu de résultats, activer la barre de recherche pour déclencher d'autres appels API
    if (allHandles.size < 10) {
      emit('info', `   ↳ Peu de résultats, activation via barre de recherche...`);

      try {
        // Trouver la barre de recherche via CDP en évaluant le DOM (tout dans try-catch)
        const searchActivated = await page.evaluate(() => {
          try {
            const inputs = document.querySelectorAll('input[type="text"], input[placeholder]');
            for (const el of inputs as NodeListOf<HTMLInputElement>) {
              if (
                el.placeholder?.toLowerCase().includes('search') ||
                el.placeholder?.toLowerCase().includes('recherch') ||
                el.getAttribute('aria-label')?.toLowerCase().includes('search')
              ) {
                el.focus();
                return true;
              }
            }
            const btns = document.querySelectorAll('[aria-label]');
            for (const el of btns as NodeListOf<HTMLElement>) {
              const label = el.getAttribute('aria-label')?.toLowerCase() || '';
              if (label.includes('search') || label.includes('recherch')) {
                if (typeof (el as any).click === 'function') (el as any).click();
                return true;
              }
            }
            return false;
          } catch { return false; }
        }).catch(() => false);

        if (!searchActivated) {
          await page.keyboard.press('/');
        }

        await sleep(1000);
        await page.keyboard.type(query, { delay: 100 });
        await sleep(3000);

        for (const h of capturedHandles) {
          if (!IGNORED_HANDLES.has(h.toLowerCase()) && h.length >= 3) {
            allHandles.add(h);
          }
        }

        emit('info', `   📊 ${allHandles.size} profils après activation barre de recherche`);
      } catch {
        emit('info', `   ↳ Activation barre de recherche échouée — on continue avec les résultats API`);
      }
    }

    // Stratégie 3 : si toujours peu de résultats, essayer avec des variantes de query
    if (allHandles.size < 5) {
      const shortQuery = niche.split(' ')[0]; // juste le premier mot
      const moreHandles = await page.evaluate(async (q: string) => {
        try {
          const res = await fetch(
            `/api/v1/web/search/topsearch/?context=user&query=${encodeURIComponent(q)}&rank_token=0.2&count=50`,
            {
              headers: { 'x-ig-app-id': '936619743392459', 'x-requested-with': 'XMLHttpRequest' },
              credentials: 'include',
            }
          );
          if (!res.ok) return [];
          const json = await res.json();
          return (json.users || []).map((i: any) => i?.user?.username || i?.username).filter(Boolean);
        } catch { return []; }
      }, shortQuery);

      for (const h of moreHandles) {
        if (!IGNORED_HANDLES.has(h.toLowerCase()) && h.length >= 3) {
          allHandles.add(h);
        }
      }
    }

    const handles = [...allHandles].slice(0, maxResults);
    emit('info', `   ✅ ${handles.length} profils collectés pour "${query}"`);

    return { handles, query };

  } finally {
    await page.close().catch(() => {});
  }
}
