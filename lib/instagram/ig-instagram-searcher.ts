/**
 * Instagram Searcher — délègue à l'agent OpenClaw (matin) via Chrome Debug Protocol.
 * L'agent navigue Instagram naturellement, trouve la barre de recherche, extrait les profils.
 * Plus robuste que les sélecteurs CSS qui cassent à chaque update Instagram.
 */

import { executeOpenClawAgent } from '@/lib/worker/exec-agent';

const IGNORED_HANDLES = new Set([
  'explore', 'reels', 'direct', 'accounts', 'p', 'stories', 'about',
  'instagram', 'help', 'legal', 'privacy', 'safety', 'press', 'null',
  'undefined', 'www', 'shop', 'api', 'graphql', '_n', 'shareddata',
  'home', 'search', 'login', 'signup', 'register',
]);

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

  emit('info', `🤖 Agent OpenClaw recherche "${query}" sur Instagram...`);

  const prompt = `Tu as accès à Chrome via le Chrome Debug Protocol (CDP) sur http://127.0.0.1:9222.

MISSION : Rechercher des profils Instagram correspondant à "${query}" et retourner leur liste.

ÉTAPES :
1. Connecte-toi à Chrome via CDP (http://127.0.0.1:9222)
2. Navigue vers https://www.instagram.com/
3. Cherche la barre de recherche (icône loupe dans le menu gauche, ou champ "Search" / "Rechercher")
4. Clique dessus et tape : ${query}
5. Attends 3 secondes que les résultats apparaissent
6. Relève tous les handles Instagram visibles dans les résultats (profils uniquement, pas hashtags ni lieux)
7. Scrolle dans les résultats pour en charger plus (jusqu'à ${maxResults} profils ou 3 scrolls sans nouveau résultat)
8. Retourne la liste

FORMAT DE RÉPONSE OBLIGATOIRE — retourne UNIQUEMENT les handles, un par ligne, sans @ ni espace :
exemple_handle1
exemple_handle2
exemple_handle3

RÈGLES :
- Ne retourne QUE les handles (identifiants de compte), pas de phrases
- Pas de @, pas d'URL, pas d'explications
- Un handle par ligne
- Minimum 2 caractères, max 30, uniquement lettres/chiffres/points/underscores
- Si 0 résultats trouvés, retourne juste : AUCUN_RESULTAT`;

  const result = await executeOpenClawAgent('matin', prompt, 120000);

  if (!result.success && !result.stdout) {
    emit('warn', `   ⚠️ Agent échec pour "${query}": ${result.stderr?.slice(0, 100)}`);
    return { handles: [], query };
  }

  // Parser les handles depuis la sortie de l'agent
  const lines = result.stdout.split('\n');
  const handles: string[] = [];

  for (const line of lines) {
    const raw = line.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_.]/g, '');
    if (
      raw.length >= 3 &&
      raw.length <= 30 &&
      /^[a-zA-Z0-9_.]+$/.test(raw) &&
      !IGNORED_HANDLES.has(raw.toLowerCase()) &&
      raw !== 'AUCUN_RESULTAT'
    ) {
      handles.push(raw);
    }
  }

  const unique = [...new Set(handles)].slice(0, maxResults);
  emit('info', `   ✅ ${unique.length} profils collectés pour "${query}"`);

  return { handles: unique, query };
}
