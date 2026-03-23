export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { validateBody, portalGenerateSchema } from '@/lib/validation';
import { createPortalToken, getProjectById, getPortalTokensForProject } from '@/lib/db';
import { logger } from '@/lib/logger';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000');

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'default');
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const v = validateBody(body, portalGenerateSchema);
    if (!v.success) return v.response;

    const project = await getProjectById(v.data.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { id, rawToken } = createPortalToken(v.data.projectId, v.data.label, v.data.expiresInDays);
    const url = `${BASE_URL}/client-portal/${rawToken}`;

    logger.info(`[portal] Token generated for project ${v.data.projectId}: ${id}`);

    return NextResponse.json({ success: true, tokenId: id, url });
  } catch (err) {
    logger.error(`[portal] Error: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'default');
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const tokens = getPortalTokensForProject(projectId);
  return NextResponse.json({ success: true, tokens });
}
