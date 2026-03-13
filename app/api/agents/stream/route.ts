import { NextRequest } from 'next/server';
import { registerSSEClient, unregisterSSEClient } from '@/lib/worker';

/**
 * GET /api/agents/stream
 * Server-Sent Events (SSE) - VERSION RÉSILIENCE Phase 2
 * Exorcisme de la RAM - Heartbeat + Cleanup total
 */
export async function GET(request: NextRequest) {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  let heartbeat: NodeJS.Timeout;
  let keepaliveInterval: NodeJS.Timeout;
  let isClosed = false;
  
  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Client ${clientId} connected`);
      
      // Send initial connection message
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ type: 'connected', clientId })}

`)
      );

      // Register this client for broadcasts
      const send = (data: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(new TextEncoder().encode(data));
        } catch (e) {
          isClosed = true;
        }
      };

      registerSSEClient(clientId, send);

      // 🔒 RÉSILIENCE Phase 2 : Keepalive toutes les 15s pour détecter déconnexion
      keepaliveInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(keepaliveInterval);
          return;
        }
        try {
          controller.enqueue(new TextEncoder().encode(':keepalive\n\n'));
        } catch (e) {
          isClosed = true;
          clearInterval(keepaliveInterval);
          unregisterSSEClient(clientId);
        }
      }, 15000);

      // Heartbeat legacy (30s) pour compatibilité
      heartbeat = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(new TextEncoder().encode(':heartbeat\n\n'));
        } catch (e) {
          isClosed = true;
          clearInterval(heartbeat);
          unregisterSSEClient(clientId);
        }
      }, 30000);

      // 🔒 RÉSILIENCE Phase 2 : Cleanup EXPLICITE et TOTAL
      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        console.log(`[SSE] Client ${clientId} disconnected (abort)`);
        
        // Nettoyer TOUS les intervals
        clearInterval(heartbeat);
        clearInterval(keepaliveInterval);
        
        // 🔒 SUPPRESSION EXPLICITE du registre global
        unregisterSSEClient(clientId);
        
        // 🔒 Fermeture forcée du controller
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      };

      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      console.log(`[SSE] Stream cancelled for ${clientId}`);
      isClosed = true;
      clearInterval(heartbeat);
      clearInterval(keepaliveInterval);
      unregisterSSEClient(clientId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
