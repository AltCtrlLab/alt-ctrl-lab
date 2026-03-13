export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const COCKPIT_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://alt-ctrl-lab-production.up.railway.app';
const CAL_LINK = 'https://cal.com/altctrllab/discovery';

const SCRAPER_WORKFLOW_ID = 'nrRSJkM4xCBrzRau';

function n8nHeaders() {
  return { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' };
}

async function activateScraper() {
  const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${SCRAPER_WORKFLOW_ID}/activate`, {
    method: 'POST',
    headers: n8nHeaders(),
  });
  return res.ok ? { ok: true } : { ok: false, error: await res.text() };
}

async function createFollowupWorkflow(daysAfter: 3 | 7 | 14) {
  const isBreakup = daysAfter === 14;
  const workflowName = isBreakup
    ? 'Prospection — Breakup J+14'
    : `Prospection — Follow-up J+${daysAfter}`;

  const nodes = [
    {
      id: 'cron',
      name: 'Every Day 9h',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.1,
      position: [0, 0],
      parameters: {
        rule: { interval: [{ field: 'cronExpression', expression: '0 9 * * *' }] },
      },
    },
    {
      id: 'fetchLeads',
      name: 'Fetch Leads GMB Nouveau',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [220, 0],
      parameters: {
        method: 'GET',
        url: `${COCKPIT_URL}/api/leads?source=GMB&status=Nouveau`,
        options: {},
      },
    },
    {
      id: 'filterDays',
      name: `Filter J+${daysAfter}`,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [440, 0],
      parameters: {
        jsCode: `
const now = Date.now();
const minMs = ${daysAfter} * 86400000;
const maxMs = ${daysAfter + 1} * 86400000;
const leads = $input.first().json.data?.leads ?? [];
return leads
  .filter(l => {
    const ref = l.last_contacted_at ?? l.created_at;
    const age = now - ref;
    return age >= minMs && age < maxMs && (l.email_sent_count ?? 0) < ${daysAfter === 3 ? 2 : daysAfter === 7 ? 3 : 99};
  })
  .map(l => ({ json: l }));
        `,
      },
    },
    {
      id: 'patchLead',
      name: 'PATCH Lead Cockpit',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [660, 0],
      parameters: {
        method: 'PATCH',
        url: `=${COCKPIT_URL}/api/leads?id={{ $json.id }}`,
        sendBody: true,
        bodyParameters: {
          parameters: [
            {
              name: 'emailSentCount',
              value: `={{ ($json.email_sent_count ?? 1) + 1 }}`,
            },
            {
              name: 'lastContactedAt',
              value: `={{ Date.now() }}`,
            },
            {
              name: 'notes',
              value: isBreakup
                ? `={{ ($json.notes ?? '') + '\\nBreakup email J+14 — ' + new Date().toLocaleDateString('fr-FR') }}`
                : `={{ ($json.notes ?? '') + '\\nRelance J+${daysAfter} envoyée — ' + new Date().toLocaleDateString('fr-FR') }}`,
            },
            ...(isBreakup ? [{ name: 'status', value: 'Perdu' }] : []),
          ],
        },
        options: {},
      },
    },
  ];

  const connections: Record<string, any> = {
    'Every Day 9h': {
      main: [[{ node: 'Fetch Leads GMB Nouveau', type: 'main', index: 0 }]],
    },
    'Fetch Leads GMB Nouveau': {
      main: [[{ node: `Filter J+${daysAfter}`, type: 'main', index: 0 }]],
    },
    [`Filter J+${daysAfter}`]: {
      main: [[{ node: 'PATCH Lead Cockpit', type: 'main', index: 0 }]],
    },
  };

  const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
    method: 'POST',
    headers: n8nHeaders(),
    body: JSON.stringify({
      name: workflowName,
      nodes,
      connections,
      settings: { executionOrder: 'v1', timezone: 'Europe/Paris' },
    }),
  });

  if (!res.ok) return { ok: false, error: await res.text(), name: workflowName };
  const data = await res.json();

  // Activate it
  await fetch(`${N8N_BASE_URL}/api/v1/workflows/${data.id}/activate`, {
    method: 'POST',
    headers: n8nHeaders(),
  });

  return { ok: true, id: data.id, name: workflowName };
}

export async function POST() {
  if (!N8N_API_KEY) {
    return NextResponse.json({ success: false, error: 'N8N_API_KEY non configuré' }, { status: 503 });
  }

  const results: any[] = [];

  // 1. Activate scraper
  const scraperResult = await activateScraper();
  results.push({ action: 'Activer Google Maps Scraper', ...scraperResult });

  // 2. Create follow-up workflows
  for (const days of [3, 7, 14] as const) {
    const r = await createFollowupWorkflow(days);
    results.push({ action: `Créer Follow-up J+${days}`, ...r });
  }

  const allOk = results.every(r => r.ok);
  return NextResponse.json({ success: allOk, results });
}
