export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import {
  getDb, createInvoice, updateInvoice, getInvoices, deleteInvoice,
  createExpense, updateExpense, getExpenses, deleteExpense,
  createFollowup,
} from '@/lib/db';
import { validateBody, invoiceCreateSchema, invoiceUpdateSchema, expenseCreateSchema, expenseUpdateSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRateLimit(`finances:get:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
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
    const rl = checkRateLimit(`finances:post:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const { type, ...data } = body;
    if (type === 'expense') {
      const ve = validateBody(data, expenseCreateSchema);
      if (!ve.success) return ve.response;
      const expenseData = {
        ...ve.data,
        date: ve.data.date ? new Date(ve.data.date).getTime() : Date.now(),
      };
      const id = await createExpense(expenseData as Parameters<typeof createExpense>[0]);
      return NextResponse.json({ success: true, data: { id } });
    }
    const vi = validateBody(data, invoiceCreateSchema);
    if (!vi.success) return vi.response;
    const invoiceData = {
      ...vi.data,
      dueDate: vi.data.dueDate ? new Date(vi.data.dueDate).getTime() : null,
    };
    const id = await createInvoice(invoiceData as Parameters<typeof createInvoice>[0]);
    return NextResponse.json({ success: true, data: { id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = checkRateLimit(`finances:patch:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')!;
    const type = searchParams.get('type');
    const body = await request.json();
    const autoChainActions: string[] = [];
    if (type === 'expense') {
      const ve = validateBody(body, expenseUpdateSchema);
      if (!ve.success) return ve.response;
      const expenseUpdate: Record<string, unknown> = { ...ve.data };
      if (typeof expenseUpdate.date === 'string') {
        expenseUpdate.date = new Date(expenseUpdate.date as string).getTime();
      }
      await updateExpense(id, expenseUpdate as Partial<import('@/lib/db/schema_finances').Expense>);
    } else {
      const vi = validateBody(body, invoiceUpdateSchema);
      if (!vi.success) return vi.response;
      const invoiceUpdate: Record<string, unknown> = { ...vi.data };
      if (typeof invoiceUpdate.dueDate === 'string') {
        invoiceUpdate.dueDate = new Date(invoiceUpdate.dueDate as string).getTime();
      }
      await updateInvoice(id, invoiceUpdate as Partial<import('@/lib/db/schema_finances').Invoice>);

      // Auto-chain: Facture → "Payée"
      if (vi.data.status === 'Payée') {
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
    const rl = checkRateLimit(`finances:delete:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 'default');
    if (!rl.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });

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
