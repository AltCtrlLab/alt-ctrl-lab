/**
 * Webhook HMAC Authentication
 * Validates incoming webhook requests using timing-safe HMAC comparison.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

const WEBHOOK_SECRETS: Record<string, string> = {
  cal: process.env.WEBHOOK_SECRET_CAL ?? '',
  n8n: process.env.WEBHOOK_SECRET_N8N ?? '',
  gmb: process.env.WEBHOOK_SECRET_GMB ?? '',
  audit: process.env.WEBHOOK_SECRET_AUDIT ?? '',
  generic: process.env.WEBHOOK_SECRET ?? '',
};

/**
 * Verify a webhook request's HMAC signature.
 * Checks X-Webhook-Signature header against HMAC-SHA256 of the raw body.
 * Falls back to X-Webhook-Key for simple secret comparison.
 *
 * @returns true if valid, false if invalid. Skips validation if no secret configured (dev mode).
 */
export function verifyWebhookAuth(
  request: NextRequest,
  source: keyof typeof WEBHOOK_SECRETS,
  rawBody: string,
): boolean {
  const secret = WEBHOOK_SECRETS[source] || WEBHOOK_SECRETS.generic;

  // Skip auth in dev if no secret configured
  if (!secret) return true;

  // Method 1: HMAC signature (preferred)
  const signature = request.headers.get('x-webhook-signature');
  if (signature) {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  // Method 2: Simple key comparison (fallback for services that don't support HMAC)
  const key = request.headers.get('x-webhook-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  if (key) {
    if (key.length !== secret.length) return false;
    return timingSafeEqual(Buffer.from(key), Buffer.from(secret));
  }

  // No auth header provided
  return false;
}
