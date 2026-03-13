/**
 * 🎨 PILIER 1 : MOTEUR DE RENDU VISUEL (Visual QA Loop)
 * Capture et analyse des composants UI générés
 */

import puppeteer from 'puppeteer';

// Template HTML pour isoler et rendre le composant React
const HTML_TEMPLATE = (jsxCode: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; padding: 20px; background: #0a0a0a; min-height: 100vh; }
    #root { display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 40px); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${jsxCode}
    
    // Auto-mount si un composant par défaut est exporté
    const root = ReactDOM.createRoot(document.getElementById('root'));
    const Component = Component || (() => React.createElement('div', null, 'No component exported'));
    root.render(React.createElement(Component, null));
  </script>
</body>
</html>
`;

// Singleton browser instance
let browser: puppeteer.Browser | null = null;

/**
 * Initialise ou récupère l'instance Puppeteer
 */
async function getBrowser(): Promise<puppeteer.Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });
  }
  return browser;
}

/**
 * 🔮 CAPTURE COMPONENT - Rendu visuel du code React
 * @param codeString - Le code React/JSX généré
 * @param viewport - Dimensions du viewport (desktop/mobile/tablet)
 * @returns Screenshot en base64 ou null si erreur
 */
export async function captureComponent(
  codeString: string,
  viewport: { width: number; height: number } = { width: 1280, height: 800 }
): Promise<{ success: boolean; base64?: string; error?: string }> {
  let page: puppeteer.Page | null = null;
  
  try {
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();
    
    // Configurer le viewport
    await page.setViewport(viewport);
    
    // Injecter le template HTML avec le code du composant
    const htmlContent = HTML_TEMPLATE(codeString);
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0'
    });
    
    // Attendre que Tailwind et React soient chargés
    await page.waitForFunction(() => {
      return (window as any).tailwind !== undefined && 
             (window as any).React !== undefined;
    }, { timeout: 10000 });
    
    // Attendre un court délai pour le rendu complet
    await new Promise(r => setTimeout(r, 1000));
    
    // Capturer le screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      fullPage: false
    });
    
    await page.close();
    
    return {
      success: true,
      base64: `data:image/png;base64,${screenshot}`
    };
    
  } catch (error) {
    if (page) {
      try { await page.close(); } catch (e) {}
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Screenshot failed'
    };
  }
}

/**
 * 🔮 CAPTURE MULTI-VIEWPORT - Tests responsive
 * Capture le composant sur 3 viewports standards
 */
export async function captureComponentResponsive(
  codeString: string
): Promise<{ 
  success: boolean; 
  screenshots?: { 
    mobile: string; 
    tablet: string; 
    desktop: string; 
  }; 
  error?: string 
}> {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 }
  ] as const;
  
  const results: any = {};
  
  for (const viewport of viewports) {
    const result = await captureComponent(codeString, viewport);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    results[viewport.name] = result.base64;
  }
  
  return {
    success: true,
    screenshots: results
  };
}

/**
 * 🧹 NETTOYAGE - Fermer le browser (à appeler au shutdown)
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
