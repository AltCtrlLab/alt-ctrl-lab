export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { runIGFollowups } from '@/lib/instagram/ig-agent-orchestrator';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';

/**
 * POST /api/instagram/followups
 *
 * Envoie les relances Instagram pour les leads en WAITING_REPLY
 * dont le délai de 48h est dépassé.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const dashKey = request.headers.get('x-dashboard-key');
  if (auth !== `Bearer ${CRON_SECRET}` && dashKey !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`));
        } catch { /* client disconnected */ }
      };

      try {
        const result = await runIGFollowups(send);
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
