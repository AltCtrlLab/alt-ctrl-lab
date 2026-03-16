export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { runIGCampaign, type IGLead } from '@/lib/instagram/ig-agent-orchestrator';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';

/**
 * POST /api/instagram/dm-campaign
 *
 * Lance une campagne de DMs Instagram via l'Agent Fantôme.
 * Réponse en Server-Sent Events pour suivi temps réel.
 *
 * Body :
 * {
 *   leads: [{ profileUrl, name, niche, instagramHandle, followersCount?, address? }],
 *   maxDMs?: number,
 *   campaignStartDate?: string  // ISO date, pour calcul warm-up
 * }
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const dashKey = request.headers.get('x-dashboard-key');
  if (auth !== `Bearer ${CRON_SECRET}` && dashKey !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: { leads?: IGLead[]; maxDMs?: number; campaignStartDate?: string } = {};
  try { body = await request.json(); } catch { /* defaults */ }

  const leads = body.leads || [];
  if (leads.length === 0) {
    return new Response(JSON.stringify({ error: 'No leads provided' }), { status: 400 });
  }

  const campaignStartDate = body.campaignStartDate || new Date().toISOString();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`));
        } catch { /* client disconnected */ }
      };

      try {
        const result = await runIGCampaign(leads, campaignStartDate, send, body.maxDMs);
        send('final', { results: result });
      } catch (err: any) {
        send('fatal', { message: `❌ Erreur fatale: ${err.message}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
