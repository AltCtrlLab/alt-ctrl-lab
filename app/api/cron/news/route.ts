/**
 * GET /api/cron/news
 * Triggered daily at 8h by Windows Task Scheduler (or curl).
 * Command: curl http://localhost:3000/api/cron/news
 */

import { NextResponse } from 'next/server';
import { fetchAndStoreNews } from '@/lib/news/fetcher';

export async function GET() {
  try {
    const result = await fetchAndStoreNews();
    console.log(`[Cron/News] Fetched ${result.stored} articles from: ${result.sources.join(', ')}`);
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron/News] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
