export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, website, company } = body;
    if (!name) return NextResponse.json({ success: false, error: 'name requis' }, { status: 400 });

    const result = await createLead({
      name,
      email: email ?? null,
      company: company ?? null,
      source: 'Site',
      status: 'Nouveau',
      notes: [
        'Audit demandé',
        website ? `Site: ${website}` : null,
      ].filter(Boolean).join('\n') || null,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
