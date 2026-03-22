/**
 * Stripe SDK singleton for server-side usage.
 * Only initialized when STRIPE_SECRET_KEY is available.
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil',
      typescript: true,
    });
  }
  return stripeInstance;
}
