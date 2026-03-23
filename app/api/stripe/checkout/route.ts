export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { validateBody, stripeCheckoutSchema } from '@/lib/validation';
import { getStripe } from '@/lib/stripe';
import { getInvoiceById, updateInvoice } from '@/lib/db';
import { logger } from '@/lib/logger';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000');

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'default');
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured — set STRIPE_SECRET_KEY' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const v = validateBody(body, stripeCheckoutSchema);
    if (!v.success) return v.response;

    const invoice = getInvoiceById(v.data.invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'Payée') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    // If a payment link already exists, return it
    if (invoice.stripePaymentLinkUrl) {
      return NextResponse.json({ success: true, url: invoice.stripePaymentLinkUrl });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Facture — ${invoice.clientName}` },
          unit_amount: Math.round(invoice.amount * 100),
        },
        quantity: 1,
      }],
      metadata: { invoiceId: invoice.id },
      success_url: `${BASE_URL}/finances?paid=${invoice.id}`,
      cancel_url: `${BASE_URL}/finances`,
    });

    // Store the payment link and intent
    await updateInvoice(invoice.id, {
      stripePaymentLinkUrl: session.url,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    } as Record<string, unknown>);

    logger.info(`[stripe] Checkout session created for invoice ${invoice.id}: ${session.id}`);

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    logger.error(`[stripe] Checkout error: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
