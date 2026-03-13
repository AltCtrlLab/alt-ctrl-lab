import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, eventType, scheduledAt, notes } = body;
    if (!name) return NextResponse.json({ success: false, error: 'name requis' }, { status: 400 });

    const result = await createLead({
      name,
      email: email ?? null,
      source: 'Site',
      status: 'Qualifié',
      notes: [
        eventType ? `Type: ${eventType}` : null,
        scheduledAt ? `RDV: ${new Date(scheduledAt).toLocaleString('fr-FR')}` : null,
        notes ?? null,
      ].filter(Boolean).join('\n') || null,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
