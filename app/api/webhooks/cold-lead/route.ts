export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company, website, address, category, notes, website_score, websiteScore } = body;
    if (!name) return NextResponse.json({ success: false, error: 'name requis' }, { status: 400 });

    const score = websiteScore ?? website_score ?? null;

    const result = await createLead({
      name,
      email: email ?? null,
      phone: phone ?? null,
      company: company ?? null,
      source: 'GMB',
      status: 'Nouveau',
      website: website ?? null,
      websiteScore: score !== null ? Number(score) : null,
      emailSentCount: 1,
      lastContactedAt: Date.now(),
      notes: [
        'Source: cold-email (Google Maps)',
        website ? `Site: ${website}` : null,
        score !== null ? `Score Lighthouse: ${score}/100` : null,
        address ? `Adresse: ${address}` : null,
        category ? `Catégorie: ${category}` : null,
        notes ?? null,
      ].filter(Boolean).join('\n') || null,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
