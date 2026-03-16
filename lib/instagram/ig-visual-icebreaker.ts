/**
 * Visual Icebreaker — Screenshot grille Instagram + analyse IA.
 * Puppeteer stealth capture les 6-9 derniers posts,
 * puis l'agent khatib génère un icebreaker viscéralement humain.
 */

import type { Page } from 'puppeteer';
import { newStealthPage } from './stealth-browser';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';

export interface IcebreakerResult {
  icebreaker: string;
  screenshotBase64: string | null;
  observations: string; // ce que l'agent a observé visuellement
}

/**
 * Capture un screenshot de la grille Instagram (6-9 derniers posts).
 */
async function captureInstagramGrid(handle: string): Promise<string | null> {
  let page: Page | null = null;
  try {
    page = await newStealthPage();
    await page.goto(`https://www.instagram.com/${handle}/`, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });

    // Attendre que la grille de posts charge
    await page.waitForSelector('article img', { timeout: 10000 }).catch(() => {});

    // Scroll léger pour charger les images
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot de la zone grille (viewport centré sur les posts)
    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      clip: { x: 0, y: 200, width: 1366, height: 600 },
    });

    return `data:image/png;base64,${screenshot}`;
  } catch {
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

/**
 * Extrait le texte des derniers posts (bio + légendes visibles) sans browser.
 */
async function scrapeProfileContext(handle: string): Promise<string> {
  let page: Page | null = null;
  try {
    page = await newStealthPage();
    await page.goto(`https://www.instagram.com/${handle}/`, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });

    const context = await page.evaluate(() => {
      const bio = document.querySelector('header section div span')?.textContent || '';
      const name = document.querySelector('header section h2, header section h1')?.textContent || '';
      // Récupérer les alt text des images (Instagram les remplit avec les descriptions)
      const imgAlts = Array.from(document.querySelectorAll('article img'))
        .slice(0, 9)
        .map(img => (img as HTMLImageElement).alt)
        .filter(alt => alt && alt.length > 10);

      return { bio, name, imgAlts };
    });

    return [
      `Nom: ${context.name}`,
      `Bio: ${context.bio}`,
      `Descriptions des derniers posts:`,
      ...context.imgAlts.map((alt, i) => `  Post ${i + 1}: ${alt}`),
    ].join('\n');
  } catch {
    return '';
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

/**
 * Génère un Visual Icebreaker personnalisé basé sur le contenu Instagram.
 *
 * 1. Capture screenshot de la grille
 * 2. Scrape le contexte textuel (bio, alt-text des posts)
 * 3. Agent khatib analyse et génère l'icebreaker
 */
export async function generateVisualIcebreaker(
  handle: string,
  name: string,
  niche: string,
): Promise<IcebreakerResult> {
  // Capture en parallèle
  const [screenshot, context] = await Promise.all([
    captureInstagramGrid(handle),
    scrapeProfileContext(handle),
  ]);

  const prompt = `Tu es un Directeur Artistique senior. Tu viens de consulter le profil Instagram @${handle} (${name}, secteur: ${niche}).

CONTEXTE DU PROFIL :
${context || 'Contexte non disponible — génère un icebreaker basé sur le secteur.'}

TA MISSION : Génère UNE phrase d'accroche (icebreaker) pour un DM Instagram.

POSTURE : Observation de pair à pair. Tu es un stratège qui reconnaît la qualité d'un travail. Élégant, précis, jamais familier.

RÈGLES :
- UNE seule phrase (max 20 mots)
- Vouvoiement obligatoire
- Référence un élément SPÉCIFIQUE et VISUEL de leur contenu (un dressage, une lumière, une composition, une matière, un détail technique)
- Ton d'observation professionnelle — pas d'enthousiasme excessif
- ZÉRO point d'exclamation
- ZÉRO emoji
- PAS de "j'ai vu/découvert votre profil"
- PAS de mention d'agence, de site web, ou de vente

EXEMPLES PAR SECTEUR :
- Restaurant : "Votre travail sur les textures dans le dressage du dernier plat traduit une vraie recherche esthétique"
- Coiffeur : "La maîtrise des reflets sur votre dernier balayage révèle une signature visuelle aboutie"
- Boutique : "La cohérence éditoriale de vos mises en scène produit est rare à ce niveau sur Instagram"
- Artisan : "Le grain de finition sur votre dernière pièce parle de lui-même"
- Boulangerie : "La lumière sur vos dernières photos de viennoiseries capture parfaitement le feuilletage"

FORMAT STRICT — réponds avec exactement 2 lignes :
ICEBREAKER: [ta phrase — max 20 mots, observation de pair à pair]
OBSERVATIONS: [en 1 phrase, ce que tu as remarqué sur leur direction artistique/style]`;

  try {
    const result = await executeOpenClawAgent('khatib', prompt, 60000);
    if (!result.success) {
      return {
        icebreaker: `Votre contenu ${niche} est vraiment qualitatif 👏`,
        screenshotBase64: screenshot,
        observations: 'Agent indisponible — icebreaker générique',
      };
    }

    const text = result.stdout.trim();
    const icebreakerMatch = text.match(/ICEBREAKER:\s*(.*)/i);
    const observationsMatch = text.match(/OBSERVATIONS:\s*(.*)/i);

    return {
      icebreaker: icebreakerMatch?.[1]?.trim() || `Votre contenu ${niche} est vraiment qualitatif 👏`,
      screenshotBase64: screenshot,
      observations: observationsMatch?.[1]?.trim() || 'Profil analysé',
    };
  } catch {
    return {
      icebreaker: `Votre contenu ${niche} est vraiment qualitatif 👏`,
      screenshotBase64: screenshot,
      observations: 'Erreur agent — icebreaker générique',
    };
  }
}
