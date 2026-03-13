export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { proposals } from '@/lib/db/schema_proposals';
import { eq, desc } from 'drizzle-orm';

// GET /api/proposals?status=PENDING
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'PENDING';
  
  try {
    const db = getDb();
    
    const results = await db.select()
      .from(proposals)
      .where(status === 'ALL' ? undefined : eq(proposals.status, status))
      .orderBy(desc(proposals.createdAt));
    
    return NextResponse.json({
      success: true,
      data: { proposals: results }
    });
    
  } catch (error) {
    console.error('[API] Error fetching proposals:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch proposals'
    }, { status: 500 });
  }
}

// POST /api/proposals - Créer une proposition (appelé par rassid)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getDb();
    
    const id = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.insert(proposals).values({
      id,
      title: body.title,
      originalConcept: body.originalConcept,
      sourceUrl: body.sourceUrl,
      sourcePlatform: body.sourcePlatform,
      altCtrlMutation: body.altCtrlMutation,
      technicalArchitecture: body.technicalArchitecture,
      impactAnalysis: body.impactAnalysis,
      discoveredBy: body.discoveredBy || 'abdulkhabir',
      elevatedBy: body.elevatedBy || 'abdulbasir',
      status: 'PENDING',
      createdAt: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      data: { id }
    });
    
  } catch (error) {
    console.error('[API] Error creating proposal:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create proposal'
    }, { status: 500 });
  }
}

// PATCH /api/proposals?id=xxx - Approuver/Rejeter
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    }
    
    const body = await request.json();
    const db = getDb();
    
    await db.update(proposals)
      .set({
        status: body.status,
        decidedAt: new Date(),
        decisionBy: body.decisionBy || 'CEO',
        implementationTaskId: body.implementationTaskId,
      })
      .where(eq(proposals.id, id));
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API] Error updating proposal:', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}
