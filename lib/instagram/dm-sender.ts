import type { Page } from 'puppeteer';
import { newStealthPage } from './stealth-browser';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface DMResult {
  success: boolean;
  profileUrl: string;
  error?: string;
  durationMs: number;
}

// ─── Human-like utilities ───────────────────────────────────────────────────

/** Délai aléatoire entre min et max (ms) */
function humanDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/** Scroll humain : scroll progressif avec pauses */
async function humanScroll(page: Page): Promise<void> {
  const scrollAmount = Math.floor(Math.random() * 300) + 100;
  await page.evaluate((amount) => {
    window.scrollBy({ top: amount, behavior: 'smooth' });
  }, scrollAmount);
  await humanDelay(500, 1500);
}

/**
 * Frappe humaine : caractère par caractère avec délais variables.
 * Simule les pauses naturelles (plus longues après ponctuation, espaces).
 */
async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.focus(selector);
  await humanDelay(200, 600);

  for (const char of text) {
    await page.keyboard.type(char, { delay: 0 });

    // Délai variable selon le caractère
    if (char === '.' || char === '!' || char === '?') {
      await humanDelay(200, 500); // Pause après ponctuation
    } else if (char === ' ') {
      await humanDelay(50, 150); // Petite pause après espace
    } else if (char === '\n') {
      await humanDelay(300, 700); // Pause après retour à la ligne
    } else {
      await humanDelay(40, 180); // Frappe normale
    }

    // Micro-pause aléatoire (simule hésitation ~5% du temps)
    if (Math.random() < 0.05) {
      await humanDelay(400, 1200);
    }
  }
}

/**
 * Mouvement de souris humain vers un élément.
 * Déplace la souris progressivement avec de légères déviations.
 */
async function humanMouseMove(page: Page, targetX: number, targetY: number): Promise<void> {
  const mouse = page.mouse;
  const steps = Math.floor(Math.random() * 15) + 10;

  // Position de départ aléatoire (simuler une position courante)
  let currentX = Math.floor(Math.random() * 1366);
  let currentY = Math.floor(Math.random() * 768);

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    // Interpolation avec légère courbe de Bézier (déviation)
    const deviation = Math.sin(progress * Math.PI) * (Math.random() * 30 - 15);
    const x = currentX + (targetX - currentX) * progress + deviation;
    const y = currentY + (targetY - currentY) * progress + deviation * 0.5;
    await mouse.move(x, y);
    await humanDelay(5, 25);
  }

  // Position finale exacte
  await mouse.move(targetX, targetY);
}

/**
 * Clic humain : déplace la souris puis clique avec un petit délai.
 */
async function humanClick(page: Page, selector: string): Promise<void> {
  const element = await page.$(selector);
  if (!element) throw new Error(`Élément non trouvé : ${selector}`);

  const box = await element.boundingBox();
  if (!box) throw new Error(`BoundingBox null pour : ${selector}`);

  // Cliquer à une position légèrement aléatoire dans l'élément
  const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
  const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);

  await humanMouseMove(page, targetX, targetY);
  await humanDelay(100, 300);
  await page.mouse.click(targetX, targetY);
}

// ─── Core : Envoi de DM Instagram ───────────────────────────────────────────

/**
 * Envoie un DM Instagram à un profil donné.
 * Requiert une session Instagram active (cookies dans userDataDir).
 *
 * Séquence :
 * 1. Naviguer vers le profil
 * 2. Scroll naturel
 * 3. Cliquer sur "Message"
 * 4. Attendre le chargement de la conversation
 * 5. Taper le message (human-like)
 * 6. Envoyer (Enter)
 * 7. Vérifier la confirmation
 */
export async function sendInstagramDM(profileUrl: string, message: string): Promise<DMResult> {
  const startTime = Date.now();
  let page: Page | null = null;

  try {
    page = await newStealthPage();

    // 1 — Naviguer vers le profil
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await humanDelay(1500, 3000);

    // Vérifier qu'on est bien connecté (pas redirigé vers login)
    const currentUrl = page.url();
    if (currentUrl.includes('/accounts/login')) {
      return { success: false, profileUrl, error: 'Session expirée — reconnexion requise', durationMs: Date.now() - startTime };
    }

    // 2 — Scroll naturel (simuler la lecture du profil)
    await humanScroll(page);
    await humanDelay(800, 2000);

    // 3 — Cliquer sur le bouton "Message" / "Envoyer un message"
    // Instagram utilise des aria-labels variables selon la langue
    const messageButtonSelectors = [
      // Sélecteurs basés sur le texte/aria-label (résistants aux changements CSS)
      'div[role="button"]:has-text("Message")',
      'div[role="button"]:has-text("Envoyer un message")',
      '[aria-label="Message"]',
      '[aria-label="Envoyer un message"]',
    ];

    let messageClicked = false;
    for (const sel of messageButtonSelectors) {
      try {
        // Utiliser evaluate pour chercher par texte (plus robuste)
        const found = await page.evaluate((text) => {
          const buttons = document.querySelectorAll('div[role="button"], button');
          for (const btn of buttons) {
            if (btn.textContent?.trim() === text) {
              (btn as HTMLElement).click();
              return true;
            }
          }
          return false;
        }, sel.includes('Message') ? 'Message' : 'Envoyer un message');

        if (found) {
          messageClicked = true;
          break;
        }
      } catch { /* try next selector */ }
    }

    // Fallback : chercher tout bouton contenant "message" (case insensitive)
    if (!messageClicked) {
      messageClicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('div[role="button"], button');
        for (const btn of buttons) {
          const text = (btn.textContent || '').toLowerCase().trim();
          if (text === 'message' || text === 'envoyer un message' || text === 'send message') {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
    }

    if (!messageClicked) {
      return { success: false, profileUrl, error: 'Bouton Message non trouvé sur le profil', durationMs: Date.now() - startTime };
    }

    // 4 — Attendre le chargement de la conversation DM
    await humanDelay(2000, 4000);

    // Chercher la zone de saisie du message
    const textareaSelectors = [
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]',
      'div[role="textbox"][contenteditable="true"]',
      'textarea[aria-label*="message"]',
      'textarea[aria-label*="Message"]',
    ];

    let textareaSelector: string | null = null;
    for (const sel of textareaSelectors) {
      const exists = await page.$(sel);
      if (exists) {
        textareaSelector = sel;
        break;
      }
    }

    if (!textareaSelector) {
      return { success: false, profileUrl, error: 'Zone de saisie du message non trouvée', durationMs: Date.now() - startTime };
    }

    // 5 — Taper le message (human-like, caractère par caractère)
    await humanDelay(500, 1500);
    await humanType(page, textareaSelector, message);

    // 6 — Pause avant envoi (comme un humain qui relit)
    await humanDelay(800, 2500);

    // Envoyer via Enter
    await page.keyboard.press('Enter');

    // 7 — Attendre confirmation (le message apparaît dans le chat)
    await humanDelay(2000, 4000);

    // Vérifier que le message a bien été envoyé (présent dans le DOM du chat)
    const messageSent = await page.evaluate((msg) => {
      const chatMessages = document.querySelectorAll('div[role="row"], div[class*="message"]');
      for (const el of chatMessages) {
        if (el.textContent?.includes(msg.substring(0, 30))) return true;
      }
      // Fallback : vérifier qu'il n'y a pas d'erreur visible
      const errorTexts = ['couldn\'t send', 'erreur', 'error', 'try again'];
      const bodyText = document.body.innerText.toLowerCase();
      for (const err of errorTexts) {
        if (bodyText.includes(err)) return false;
      }
      return true; // Pas d'erreur détectée → on assume succès
    }, message);

    if (!messageSent) {
      return { success: false, profileUrl, error: 'Message non confirmé dans le chat', durationMs: Date.now() - startTime };
    }

    return { success: true, profileUrl, durationMs: Date.now() - startTime };
  } catch (err: any) {
    return { success: false, profileUrl, error: err.message || 'Erreur inconnue', durationMs: Date.now() - startTime };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
