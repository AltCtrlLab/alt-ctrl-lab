import { NextRequest, NextResponse } from 'next/server';
import { fetchAndStoreNews, getLatestNews, shouldRefreshNews } from '@/lib/news/fetcher';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: cors });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '8');

    // Auto-refresh if stale
    const stale = await shouldRefreshNews();
    if (stale) {
      // Non-blocking background refresh
      fetchAndStoreNews().catch(console.error);
    }

    const items = await getLatestNews(limit);

    return NextResponse.json({
      success: true,
      data: items,
      meta: { stale, count: items.length },
    }, { headers: cors });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500, headers: cors });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'refresh' || !action) {
      const result = await fetchAndStoreNews();
      return NextResponse.json({
        success: true,
        data: result,
        message: `${result.stored} articles récupérés depuis : ${result.sources.join(', ')}`,
      }, { headers: cors });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400, headers: cors });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500, headers: cors });
  }
}
