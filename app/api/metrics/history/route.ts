// GET /api/metrics/history?days=7 — Retourne les snapshots historiques
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { metricsSnapshots } from '@/lib/db/schema';
import { gte, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const days = parseInt(request.nextUrl.searchParams.get('days') || '7');
    const since = new Date(Date.now() - days * 24 * 3600_000);

    const db = getDb();
    const snapshots = await db.select()
      .from(metricsSnapshots)
      .where(gte(metricsSnapshots.createdAt, since))
      .orderBy(desc(metricsSnapshots.createdAt))
      .limit(200);

    return NextResponse.json({
      success: true,
      data: { snapshots },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: { snapshots: [] },
    });
  }
}
