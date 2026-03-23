export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/validation';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

const executeSchema = z.object({
  agentId: z.string().min(1),
  prompt: z.string().min(1),
  timeoutMs: z.number().min(5000).max(1800000).optional().default(900000),
  taskId: z.string().optional(),
});

/**
 * POST /api/agents/execute
 * Exécute un agent OpenClaw localement.
 * Appelé par Railway via proxy VPS ou directement sur le VPS.
 * Auth: x-dashboard-key header (service-to-service)
 */
export async function POST(request: NextRequest) {
  // Auth service-to-service
  const dashKey = request.headers.get('x-dashboard-key');
  const cronSecret = process.env.CRON_SECRET || 'altctrl-cron-secret';
  if (dashKey !== cronSecret) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Rate limit
  const ip = request.headers.get('x-forwarded-for') ?? 'service';
  const rl = checkRateLimit(`agents:execute:${ip}`, 'default');
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const validation = validateBody(body, executeSchema);
    if (!validation.success) return validation.response;

    const { agentId, prompt, timeoutMs, taskId } = validation.data;

    logger.info('AgentExecute', 'Executing agent locally', { agentId, timeoutMs, taskId });

    const result = await executeOpenClawAgent(agentId, prompt, timeoutMs, taskId);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('AgentExecute', 'Execution error', {}, error as Error);
    return NextResponse.json(
      { success: false, stdout: '', stderr: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
