export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getProjectByPortalToken, getDeliverablesForProject } from '@/lib/db';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'portal');
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const id = req.nextUrl.searchParams.get('id');
  const token = req.nextUrl.searchParams.get('token');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // If token provided, validate portal access
  if (token) {
    const tokenData = getProjectByPortalToken(token);
    if (!tokenData || tokenData.expired) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }
    // Verify the deliverable belongs to the token's project
    const deliverables = getDeliverablesForProject(tokenData.projectId);
    const deliverable = deliverables.find(d => d.id === id);
    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found for this project' }, { status: 404 });
    }

    if (!fs.existsSync(deliverable.filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const buffer = fs.readFileSync(deliverable.filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': deliverable.mimeType ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${deliverable.filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  }

  // Without token — require dashboard context (no separate auth check needed for internal use)
  // Find deliverable across all projects
  return NextResponse.json({ error: 'Token required for download' }, { status: 403 });
}
