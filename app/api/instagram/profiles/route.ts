import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAllCachedProfiles } from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const rawDb = (getDb() as any).$client;

    // Leads déjà DM'd
    const dmed = rawDb.prepare(`
      SELECT id, name, company, ig_handle, ig_followers, ig_dm_state, ig_dm_sent_at, ig_dm_content, ig_prospect_score, status, created_at
      FROM leads
      WHERE ig_handle IS NOT NULL AND ig_dm_state IS NOT NULL
      ORDER BY ig_dm_sent_at DESC
      LIMIT 200
    `).all();

    // Cache profils visités
    const cache = getAllCachedProfiles();

    return NextResponse.json({ success: true, dmed, cache });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ success: false, error: 'Missing id or status' }, { status: 400 });

    const rawDb = (getDb() as any).$client;
    rawDb.prepare(`UPDATE leads SET status = ?, updated_at = ? WHERE id = ?`).run(status, Date.now(), id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
