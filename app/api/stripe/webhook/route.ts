export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getStripe } from '@/lib/stripe';
import { findInvoiceByStripeIntent, updateInvoice, createFollowup, getProjectById, updateProject } from '@/lib/db';
import { notifySlack } from '@/lib/slack';
import { logger } from '@/lib/logger';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req.ip ?? 'anon', 'stripe-webhook');
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    logger.warn(`[stripe-webhook] Signature verification failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoiceId;
        if (!invoiceId) {
          logger.warn('[stripe-webhook] checkout.session.completed missing invoiceId in metadata');
          break;
        }

        // Update invoice status
        await updateInvoice(invoiceId, {
          status: 'Payée' as const,
          paidAt: Date.now(),
          stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        } as Record<string, unknown>);

        // Trigger auto-chain: same logic as finances PATCH
        const invoice = findInvoiceByStripeIntent(
          typeof session.payment_intent === 'string' ? session.payment_intent : ''
        );
        if (invoice?.projectId) {
          const project = await getProjectById(invoice.projectId);
          if (project) {
            await updateProject(invoice.projectId, { updatedAt: Date.now() });
          }
          // Create Upsell followup J+30
          await createFollowup({
            clientName: invoice.clientName,
            type: 'Upsell' as const,
            status: 'À faire' as const,
            priority: 'Normale' as const,
            scheduledAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
            projectId: invoice.projectId,
            notes: `Upsell suite au paiement Stripe de ${invoice.amount}€`,
          });
        }

        // Notify Slack
        await notifySlack('invoice_paid', {
          Client: invoice?.clientName ?? 'Inconnu',
          Montant: `${invoice?.amount ?? 0}€`,
          Source: 'Stripe',
        });

        logger.info(`[stripe-webhook] Invoice ${invoiceId} marked as paid via Stripe`);
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceId = pi.metadata?.invoiceId;
        if (invoiceId) {
          await updateInvoice(invoiceId, {
            status: 'Payée' as const,
            paidAt: Date.now(),
            stripePaymentIntentId: pi.id,
          } as Record<string, unknown>);
          logger.info(`[stripe-webhook] Payment intent ${pi.id} succeeded for invoice ${invoiceId}`);
        }
        break;
      }

      default:
        logger.info(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    logger.error(`[stripe-webhook] Error processing event: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
