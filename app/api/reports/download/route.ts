export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientReportById, getProjectByPortalToken } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'portal');
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const reportId = req.nextUrl.searchParams.get('id');
  const token = req.nextUrl.searchParams.get('token');

  if (!reportId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    // If token provided, validate portal access
    let allowedProjectId: string | null = null;
    if (token) {
      const tokenData = getProjectByPortalToken(token);
      if (!tokenData || tokenData.expired) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
      }
      allowedProjectId = tokenData.projectId;
    }

    const report = getClientReportById(reportId);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    // Verify project access if using portal token
    if (allowedProjectId && report.projectId !== allowedProjectId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!report.htmlContent) return NextResponse.json({ error: 'Report content not available' }, { status: 404 });

    const safePeriod = report.period.replace(/["\n\r]/g, '_');
    return new NextResponse(report.htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="report-${safePeriod}.html"`,
      },
    });
  } catch (err) {
    logger.error(`[reports] Download error: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
