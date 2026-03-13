/**
 * Local Cron Runner — Alt Ctrl Lab R&D
 *
 * Lance le pipeline R&D automatiquement toutes les 6 heures.
 * Usage: node scripts/cron.js
 *
 * Laisse tourner dans un terminal séparé pendant que `npm run dev` tourne.
 */

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-rnd-2024';
const INTERVAL_HOURS = Number(process.env.RD_INTERVAL_HOURS || 6);
const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;

async function runRdCycle() {
  const now = new Date().toLocaleString('fr-FR');
  console.log(`\n[CRON] ${now} — Démarrage cycle R&D...`);

  try {
    const res = await fetch(`${BASE_URL}/api/rd/cron`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      // Timeout de 10 minutes pour laisser le temps aux agents LLM
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });

    const data = await res.json();

    if (data.success) {
      const scout = data.data?.scout;
      const elevate = data.data?.elevate;
      console.log(`[CRON] Cycle terminé en ${data.meta?.duration}`);
      if (scout) console.log(`[CRON] Scout: ${JSON.stringify(scout).substring(0, 200)}`);
      if (elevate) console.log(`[CRON] Elevate: ${JSON.stringify(elevate).substring(0, 200)}`);
    } else {
      console.error('[CRON] Cycle échoué:', data.error);
      if (data.partialResults) {
        console.error('[CRON] Résultats partiels:', JSON.stringify(data.partialResults, null, 2));
      }
    }
  } catch (err) {
    if (err.name === 'TimeoutError') {
      console.error('[CRON] Timeout — le cycle a pris plus de 10 minutes');
    } else {
      console.error('[CRON] Erreur réseau:', err.message);
      console.error('[CRON] Le serveur Next.js tourne-t-il sur', BASE_URL, '?');
    }
  }

  console.log(`[CRON] Prochain cycle dans ${INTERVAL_HOURS}h (${new Date(Date.now() + INTERVAL_MS).toLocaleString('fr-FR')})`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Alt Ctrl Lab — R&D Cron Runner');
  console.log(`  Serveur   : ${BASE_URL}`);
  console.log(`  Intervalle: ${INTERVAL_HOURS}h`);
  console.log('='.repeat(60));

  // Premier run immédiat
  await runRdCycle();

  // Puis toutes les X heures
  setInterval(runRdCycle, INTERVAL_MS);
}

main().catch(console.error);
