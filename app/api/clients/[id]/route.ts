export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leads } from '@/lib/db/schema_leads';
import { projects } from '@/lib/db/schema_projects';
import { invoices } from '@/lib/db/schema_finances';
import { followups } from '@/lib/db/schema_postvente';
import { portalTokens, deliverables } from '@/lib/db/schema_portal';
import { eq, or } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const leadId = params.id;

    // Load the lead
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead introuvable' }, { status: 404 });
    }

    const clientName = lead.company || lead.name;

    // Load all linked projects (by leadId or matching clientName)
    const allProjects = await db.select().from(projects).where(
      or(eq(projects.leadId, leadId), eq(projects.clientName, clientName))
    );

    // Load invoices by clientName
    const allInvoices = await db.select().from(invoices).where(
      eq(invoices.clientName, clientName)
    );

    // Load followups by leadId or clientName
    const allFollowups = await db.select().from(followups).where(
      or(eq(followups.leadId, leadId), eq(followups.clientName, clientName))
    );

    // Load portal tokens + deliverables for each project
    const projectIds = allProjects.map(p => p.id);
    let allPortalTokens: (typeof portalTokens.$inferSelect)[] = [];
    let allDeliverables: (typeof deliverables.$inferSelect)[] = [];

    for (const pid of projectIds) {
      const tokens = await db.select().from(portalTokens).where(eq(portalTokens.projectId, pid));
      allPortalTokens = [...allPortalTokens, ...tokens];
      const dels = await db.select().from(deliverables).where(eq(deliverables.projectId, pid));
      allDeliverables = [...allDeliverables, ...dels];
    }

    return NextResponse.json({
      success: true,
      data: {
        lead,
        projects: allProjects,
        invoices: allInvoices,
        followups: allFollowups,
        portalTokens: allPortalTokens,
        deliverables: allDeliverables,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
