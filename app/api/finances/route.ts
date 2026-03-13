import { NextRequest, NextResponse } from 'next/server';
import {
  getDb, createInvoice, updateInvoice, getInvoices, deleteInvoice,
  createExpense, updateExpense, getExpenses, deleteExpense,
  createFollowup,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';
    const type = searchParams.get('type');
    const rawDb = (getDb() as any).$client;

    if (statsOnly) {
      const now = Date.now();
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
      const monthStart = startOfMonth.getTime();

      const caEncaisse: number = rawDb.prepare("SELECT COALESCE(SUM(amount),0) as v FROM invoices WHERE status='Payée'").get().v;
      const caEnAttente: number = rawDb.prepare("SELECT COALESCE(SUM(amount),0) as v FROM invoices WHERE status IN ('Envoyée','En retard')").get().v;
      const depensesMois: number = rawDb.prepare("SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE date >= ?").get(monthStart).v;
      const facturesEnRetard: number = rawDb.prepare("SELECT COUNT(*) as c FROM invoices WHERE status='En retard'").get().c;
      const margeNette = caEncaisse - depensesMois;

      return NextResponse.json({ success: true, data: { caEncaisse, caEnAttente, depensesMois, margeNette, facturesEnRetard } });
    }

    if (type === 'expenses') {
      const data = await getExpenses();
      return NextResponse.json({ success: true, data: { expenses: data } });
    }

    const data = await getInvoices();
    return NextResponse.json({ success: true, data: { invoices: data } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;
    if (type === 'expense') {
      const id = await createExpense(data);
      return NextResponse.json({ success: true, data: { id } });
    }
    const id = await createInvoice(data);
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    const type = searchParams.get('type');
    const body = await request.json();
    const autoChainActions: string[] = [];
    if (type === 'expense') {
      await updateExpense(id, body);
    } else {
      await updateInvoice(id, body);

      // Auto-chain: Facture → "Payée"
      if (body.status === 'Payée') {
        try {
          const rawDb = (getDb() as any).$client;
          const invoice = rawDb.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
          if (invoice) {
            // Update project budgetReçu if linked
            if (invoice.project_id) {
              rawDb.prepare(`
                UPDATE projects SET updated_at = ? WHERE id = ?
              `).run(Date.now(), invoice.project_id);
              autoChainActions.push('Projet mis à jour');
            }
            // Create upsell followup J+30
            await createFollowup({
              clientName: invoice.client_name,
              projectId: invoice.project_id ?? undefined,
              type: 'Upsell',
              status: 'À faire',
              priority: 'Normale',
              scheduledAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
              notes: `Upsell automatique — facture payée (${invoice.amount}€)`,
            });
            autoChainActions.push('Follow-up Upsell J+30 planifié');
          }
        } catch (chainErr: any) {
          console.error('Auto-chain invoice→Payée error:', chainErr.message);
        }
      }
    }
    return NextResponse.json({ success: true, autoChain: autoChainActions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    const type = searchParams.get('type');
    if (type === 'expense') {
      await deleteExpense(id);
    } else {
      await deleteInvoice(id);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
