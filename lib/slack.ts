/**
 * Slack notification utility — outgoing webhooks via Block Kit.
 * Graceful degradation: skips silently if SLACK_WEBHOOK_URL is not configured.
 */

import { logger } from './logger';

export type SlackEvent =
  | 'new_lead'
  | 'invoice_paid'
  | 'project_delivered'
  | 'deadline_t_minus_1'
  | 'ai_agent_error';

interface SlackEventData {
  [key: string]: string | number | undefined;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : 'http://localhost:3000';

const EVENT_CONFIG: Record<SlackEvent, { emoji: string; color: string; title: string; link: string }> = {
  new_lead: {
    emoji: ':rocket:',
    color: '#f59e0b', // amber
    title: 'Nouveau Lead',
    link: '/leads',
  },
  invoice_paid: {
    emoji: ':white_check_mark:',
    color: '#10b981', // emerald
    title: 'Facture Payée',
    link: '/finances',
  },
  project_delivered: {
    emoji: ':tada:',
    color: '#8b5cf6', // violet
    title: 'Projet Livré',
    link: '/projets',
  },
  deadline_t_minus_1: {
    emoji: ':warning:',
    color: '#ef4444', // rose
    title: 'Deadline J-1',
    link: '/projets',
  },
  ai_agent_error: {
    emoji: ':rotating_light:',
    color: '#ef4444', // rose
    title: 'Erreur Agent IA',
    link: '/automations',
  },
};

export async function notifySlack(event: SlackEvent, data: SlackEventData): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.info(`[slack] No SLACK_WEBHOOK_URL configured — skipping ${event}`);
    return;
  }

  const config = EVENT_CONFIG[event];
  const fields = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ({
      type: 'mrkdwn' as const,
      text: `*${k}:*\n${v}`,
    }));

  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${config.emoji} ${config.title}`, emoji: true },
      },
      ...(fields.length > 0 ? [{
        type: 'section',
        fields: fields.slice(0, 10), // Slack max 10 fields
      }] : []),
      {
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'Voir dans le cockpit', emoji: true },
          url: `${BASE_URL}${config.link}`,
          style: 'primary',
        }],
      },
    ],
    attachments: [{
      color: config.color,
      fallback: `${config.title}: ${JSON.stringify(data)}`,
    }],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn(`[slack] Webhook returned ${res.status} for event ${event}`);
    }
  } catch (err) {
    logger.warn(`[slack] Failed to send notification: ${err instanceof Error ? err.message : err}`);
  }
}
