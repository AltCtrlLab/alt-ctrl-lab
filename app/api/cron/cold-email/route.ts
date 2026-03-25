export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { notifySlack } from '@/lib/slack';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';
const CAL_LINK = 'https://cal.com/altctrllab/discovery';
const MAX_PER_RUN = 10;

/**
 * POST /api/cron/cold-email
 * Daily cron — sends personalized cold emails to new leads via Kimi + Mailjet.
 * Targets: leads with email, status "Nouveau", never contacted, not GMB (handled by followup).
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const results = { sent: 0, skipped: 0, errors: [] as string[] };

  try {
    const rawDb = (getDb() as unknown as { $client: import('better-sqlite3').Database }).$client;

    // Leads éligibles: have email, Nouveau, never contacted, not GMB
    const leads = rawDb.prepare(`
      SELECT id, name, company, email, source, website, website_score, budget, notes
      FROM leads
      WHERE status = 'Nouveau'
        AND email IS NOT NULL AND email != ''
        AND source != 'GMB'
        AND (email_sent_count IS NULL OR email_sent_count = 0)
        AND (last_contacted_at IS NULL)
      ORDER BY score DESC, created_at ASC
      LIMIT ?
    `).all(MAX_PER_RUN) as Array<{
      id: string;
      name: string;
      company: string | null;
      email: string;
      source: string;
      website: string | null;
      website_score: number | null;
      budget: string | null;
      notes: string | null;
    }>;

    if (leads.length === 0) {
      return NextResponse.json({ success: true, data: { ...results, message: 'No eligible leads' } });
    }

    for (const lead of leads) {
      try {
        const personalization = buildPersonalizationContext(lead);
        const emailContent = await generateColdEmail(lead, personalization);

        if (!emailContent) {
          results.skipped++;
          continue;
        }

        const sendResult = await sendEmail(
          lead.email,
          lead.company || lead.name,
          emailContent.subject,
          emailContent.body,
        );

        if (!sendResult.success) {
          results.errors.push(`Send failed for ${lead.id}: ${sendResult.error}`);
          continue;
        }

        // Update lead: mark as contacted
        const noteEntry = `\nCold email envoyé le ${new Date().toISOString().split('T')[0]}`;
        rawDb.prepare(`
          UPDATE leads SET
            email_sent_count = 1,
            last_contacted_at = ?,
            notes = COALESCE(notes, '') || ?,
            updated_at = ?
          WHERE id = ?
        `).run(now, noteEntry, now, lead.id);

        results.sent++;

        // Slack notification for each batch
        if (results.sent === 1) {
          await notifySlack('cold_email_sent', {
            Batch: `${leads.length} leads ciblés`,
            Premier: `${lead.company || lead.name} (${lead.email})`,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`${lead.id}: ${msg}`);
      }
    }

    logger.info('cold-email', 'Cron completed', results);
    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('cold-email', 'Cron failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message, data: results }, { status: 500 });
  }
}

// ─── Kimi-powered email generation ──────────────────────────────────────────

interface EmailContent {
  subject: string;
  body: string;
}

function buildPersonalizationContext(lead: {
  name: string;
  company: string | null;
  source: string;
  website: string | null;
  website_score: number | null;
  budget: string | null;
}): string {
  const parts: string[] = [];
  if (lead.company) parts.push(`Entreprise: ${lead.company}`);
  if (lead.source) parts.push(`Source: ${lead.source}`);
  if (lead.website) parts.push(`Site web: ${lead.website}`);
  if (lead.website_score != null) parts.push(`Score site: ${lead.website_score}/100`);
  if (lead.budget) parts.push(`Budget estimé: ${lead.budget}`);
  return parts.join('\n');
}

async function generateColdEmail(
  lead: { name: string; company: string | null; website_score: number | null },
  context: string,
): Promise<EmailContent | null> {
  const prompt = `Tu es un commercial expert en cold email pour Alt Ctrl Lab, une agence digitale premium à Paris (web, branding, IA).
Rédige un cold email court et percutant (max 120 mots) pour ce prospect :

${context}

Règles :
- Sujet court et accrocheur (max 60 caractères), PAS de "[" ou emoji
- Corps : 2-3 paragraphes courts, ton humain et direct
- Mentionne un problème spécifique lié à leur contexte si possible
- Termine par un CTA clair : réserver un appel de 15 min → ${CAL_LINK}
- Signe "Cordialement, Alt Ctrl Lab"
- PAS de pitch long, PAS de jargon technique
- En français

Réponds en JSON strict : { "subject": "...", "body": "..." }`;

  // Try Kimi first
  if (KIMI_API_KEY) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(KIMI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${KIMI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'kimi-k2.5',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || '';
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned) as EmailContent;
        if (parsed.subject && parsed.body) return parsed;
      }
    } catch (err) {
      logger.warn('cold-email', 'Kimi generation failed, using fallback', {
        error: err instanceof Error ? err.message : 'Unknown',
      });
    }
  }

  // Fallback template
  const name = lead.company || lead.name;
  const scoreInfo = lead.website_score != null
    ? `Votre site a un score de performance de ${lead.website_score}/100. Des optimisations rapides pourraient améliorer significativement vos résultats.`
    : 'De nombreuses entreprises perdent des clients à cause de problèmes techniques invisibles sur leur site.';

  return {
    subject: `Votre site web travaille-t-il pour vous, ${name} ?`,
    body: `Bonjour,

${scoreInfo}

En 15 minutes, nous pouvons identifier ensemble les quick wins pour améliorer votre présence digitale.

Réservez un créneau : ${CAL_LINK}

Cordialement,
Alt Ctrl Lab`,
  };
}
