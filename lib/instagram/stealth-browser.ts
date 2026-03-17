import type { Browser, Page } from 'puppeteer';

// ─── Config ─────────────────────────────────────────────────────────────────
const IG_SESSION_DIR = process.env.IG_SESSION_DIR || '/home/user/.instagram-session';
const IG_PROXY_URL = process.env.IG_PROXY_URL || '';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Si CHROME_DEBUG_URL est défini (ex: http://localhost:9222), on se connecte
// via CDP au Chrome déjà ouvert (et déjà connecté à Instagram).
// Sinon, on lance un nouveau navigateur headless avec session persistante.
const CHROME_DEBUG_URL = process.env.CHROME_DEBUG_URL || '';

// Lazy-loaded puppeteer-extra (dynamic import pour éviter les erreurs webpack)
let _puppeteerReady: Promise<any> | null = null;
async function getPuppeteer(): Promise<any> {
  if (!_puppeteerReady) {
    _puppeteerReady = import('puppeteer-extra').then(async (mod) => {
      const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
      mod.default.use(StealthPlugin());
      return mod.default;
    });
  }
  return _puppeteerReady;
}

/**
 * Connexion au Chrome déjà lancé via CDP (port 9222 sur le VPS).
 * Le navigateur est partagé — NE JAMAIS l'appeler .close() dessus.
 * Utilise puppeteer natif (pas puppeteer-extra) pour la connexion CDP.
 */
export async function connectToDebugChrome(): Promise<Browser> {
  const { connect } = await import('puppeteer');
  return connect({ browserURL: CHROME_DEBUG_URL }) as unknown as Browser;
}

// ─── Singleton ──────────────────────────────────────────────────────────────
let _browser: Browser | null = null;

/**
 * Lance un navigateur Puppeteer stealth avec session persistante.
 * Le userDataDir conserve cookies/localStorage/session Instagram.
 * Connexion manuelle requise une seule fois.
 */
export async function launchStealthBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;

  const puppeteer = await getPuppeteer();

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-size=1366,768',
    `--user-agent=${USER_AGENT}`,
  ];

  if (IG_PROXY_URL) {
    args.push(`--proxy-server=${IG_PROXY_URL}`);
  }

  _browser = await puppeteer.launch({
    headless: true,
    userDataDir: IG_SESSION_DIR,
    args,
    defaultViewport: { width: 1366, height: 768 },
  }) as unknown as Browser;

  // Graceful cleanup on process exit
  const cleanup = async () => {
    if (_browser?.connected) {
      await _browser.close().catch(() => {});
      _browser = null;
    }
  };
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);

  return _browser;
}

/**
 * Ouvre un nouvel onglet avec les configurations anti-détection.
 */
export async function newStealthPage(): Promise<Page> {
  let browser: Browser;

  if (CHROME_DEBUG_URL) {
    // Mode CDP : se connecter au Chrome déjà ouvert sur le VPS
    browser = await connectToDebugChrome();
  } else {
    // Mode launch : lancer un nouveau navigateur headless
    browser = await launchStealthBrowser();
  }

  const page = await browser.newPage();

  if (!CHROME_DEBUG_URL) {
    // En mode launch seulement : injecter les patches anti-détection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
    });
  }

  await page.setUserAgent(USER_AGENT);
  return page;
}

/**
 * Ferme le navigateur singleton proprement.
 */
export async function closeBrowser(): Promise<void> {
  // Ne jamais fermer le Chrome partagé en mode CDP
  if (CHROME_DEBUG_URL) return;
  if (_browser?.connected) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

/**
 * Vérifie si la session Instagram est toujours active.
 * Navigue vers instagram.com et vérifie si on est connecté.
 */
export async function isSessionValid(): Promise<boolean> {
  let page: Page | null = null;
  try {
    page = await newStealthPage();
    // Naviguer sur instagram.com pour avoir les cookies de session dans le contexte fetch
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Vérifier la session via l'API topsearch — si 200 OK, la session est valide
    const ok = await page.evaluate(async () => {
      try {
        const res = await fetch(
          '/api/v1/web/search/topsearch/?context=blended&query=test&rank_token=0.5',
          { headers: { 'x-ig-app-id': '936619743392459', 'x-requested-with': 'XMLHttpRequest' }, credentials: 'include' }
        );
        return res.ok;
      } catch { return false; }
    });
    return ok;
  } catch {
    return false;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
