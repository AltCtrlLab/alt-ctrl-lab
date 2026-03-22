/**
 * Shared email utility — Mailjet transactional emails.
 * Extracted from /api/cron/followup for reuse across all crons.
 */

import { logger } from '@/lib/logger';

const MAILJET_API_KEY = process.env.MAILJET_API_KEY || '';
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || '';
const MAILJET_FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'hello@altctrllab.com';
const MAILJET_FROM_NAME = process.env.MAILJET_FROM_NAME || 'Alt Ctrl Lab';

interface SendEmailResult {
  success: boolean;
  error?: string;
}

export async function sendEmail(
  to: string,
  name: string,
  subject: string,
  body: string,
): Promise<SendEmailResult> {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    logger.warn('email', 'Mailjet credentials missing — email skipped', { to, subject });
    return { success: false, error: 'Mailjet credentials not configured' };
  }

  try {
    const res = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64'),
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: MAILJET_FROM_EMAIL, Name: MAILJET_FROM_NAME },
          To: [{ Email: to, Name: name }],
          Subject: subject,
          TextPart: body,
          HTMLPart: body.split('\n').map(l => `<p>${l}</p>`).join(''),
        }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error('email', 'Mailjet API error', { to, subject, status: res.status, response: errText });
      return { success: false, error: `Mailjet ${res.status}: ${errText}` };
    }

    logger.info('email', 'Email sent', { to, subject });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('email', 'Failed to send email', { to, subject }, err instanceof Error ? err : undefined);
    return { success: false, error: message };
  }
}
