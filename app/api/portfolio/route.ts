export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, createPortfolioItem, updatePortfolioItem, getPortfolioItems, deletePortfolioItem } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';
    const rawDb = (getDb() as any).$client;

    if (statsOnly) {
      const totalPublie: number = rawDb.prepare("SELECT COUNT(*) as c FROM portfolio_items WHERE published=1").get().c;
      const featured: number = rawDb.prepare("SELECT COUNT(*) as c FROM portfolio_items WHERE featured=1").get().c;
      const byTypeRows: { project_type: string; c: number }[] = rawDb.prepare("SELECT project_type, COUNT(*) as c FROM portfolio_items GROUP BY project_type").all();
      const parType: Record<string, number> = {};
      byTypeRows.forEach(r => { parType[r.project_type] = r.c; });
      return NextResponse.json({ success: true, data: { totalPublie, parType, featured } });
    }

    const type = searchParams.get('type') ?? undefined;
    const featured = searchParams.get('featured') === 'true' ? true : undefined;
    const published = searchParams.get('published') === 'true' ? true : undefined;
    const items = await getPortfolioItems({ projectType: type, featured, published });
    return NextResponse.json({ success: true, data: { items } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = await createPortfolioItem(body);
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    const body = await request.json();
    await updatePortfolioItem(id, body);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    await deletePortfolioItem(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
