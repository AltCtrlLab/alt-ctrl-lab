export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const MAILJET_API_KEY = process.env.MAILJET_API_KEY || '';
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || '';
const MAILJET_FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'hello@altctrllab.com';
const MAILJET_FROM_NAME = process.env.MAILJET_FROM_NAME || 'Alt Ctrl Lab';
const CAL_LINK = 'https://cal.com/altctrllab/discovery';

const DAY_MS = 86_400_000;

/**
 * POST /api/cron/followup
 * Déclencheur : Railway cron — tous les jours à 9h
 * Pipeline :
 *   J+3  → email relance courte
 *   J+7  → email case study (résultat client)
 *   J+14 → breakup email + statut → Perdu
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const results = { j3: 0, j7: 0, j14: 0, errors: [] as string[] };

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const rawDb = (getDb() as any).$client;

    // Leads GMB Nouveau, dernier contact il y a 3-14 jours
    const leads = rawDb.prepare(`
      SELECT * FROM leads
      WHERE source = 'GMB'
        AND status = 'Nouveau'
        AND last_contacted_at IS NOT NULL
        AND email IS NOT NULL
      ORDER BY last_contacted_at ASC
    `).all() as any[];

    for (const lead of leads) {
      const daysSince = (now - lead.last_contacted_at) / DAY_MS;
      const count: number = lead.email_sent_count ?? 0;

      let step: 'j3' | 'j7' | 'j14' | null = null;
      if (daysSince >= 3 && daysSince < 4 && count === 1) step = 'j3';
      else if (daysSince >= 7 && daysSince < 8 && count === 2) step = 'j7';
      else if (daysSince >= 14 && count === 3) step = 'j14';

      if (!step) continue;

      // J+14 breakup — pas besoin de Claude
      if (step === 'j14') {
        const subject = `Dernière tentative — ${lead.company || lead.name}`;
        const body = `Bonjour,

Je ne veux pas vous déranger davantage, donc ce sera mon dernier message.

Si votre site web vous coûte des clients plutôt que de vous en apporter, je reste disponible.

Un audit gratuit → ${CAL_LINK}

Bonne continuation,
${MAILJET_FROM_NAME}`;

        await sendEmail(lead.email, lead.company || lead.name, subject, body);
        rawDb.prepare(`
          UPDATE leads SET
            status = 'Perdu',
            lost_reason = 'Pas de réponse cold outreach (J+14)',
            email_sent_count = email_sent_count + 1,
            last_contacted_at = ?,
            updated_at = ?
          WHERE id = ?
        `).run(now, now, lead.id);
        results.j14++;
        continue;
      }

      // J+3 et J+7 — Claude génère l'email
      const scoreInfo = lead.website_score != null ? `score ${lead.website_score}/100` : 'performances sous-optimales';
      const prompt = step === 'j3'
        ? `Rédige une relance courte (2 paragraphes max, 80 mots max) pour ${lead.company || lead.name}.
Tu leur avais envoyé un email sur les problèmes de leur site (${scoreInfo}).
Commence par "Je vous avais contacté la semaine dernière..." ou similaire.
Propose une alternative rapide : un appel de 15 min ou l'audit gratuit → ${CAL_LINK}.
Pas de pitch. Ton humain. En français.`
        : `Rédige un email de relance J+7 (3 paragraphes, 100 mots max) pour ${lead.company || lead.name}.
C'est la 2e relance. Cite un résultat concret : "Un client similaire a augmenté ses leads de 40% en 3 mois après refonte mobile."
Leur site a un ${scoreInfo}. Fin : lien audit gratuit → ${CAL_LINK}.
Ton direct, pas de jargon. En français.`;

      let body = '';
      let subject = step === 'j3'
        ? `Re: Votre site web — ${lead.company || lead.name}`
        : `Un client similaire a +40% de leads — ${lead.company || lead.name}`;

      try {
        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        });
        body = (msg.content[0] as any).text;
      } catch (e: any) {
        results.errors.push(`Claude error for ${lead.id}: ${e.message}`);
        continue;
      }

      await sendEmail(lead.email, lead.company || lead.name, subject, body);

      rawDb.prepare(`
        UPDATE leads SET
          email_sent_count = email_sent_count + 1,
          last_contacted_at = ?,
          notes = notes || '\nRelance ${step === 'j3' ? 'J+3' : 'J+7'} envoyée le ' || date('now'),
          updated_at = ?
        WHERE id = ?
      `).run(now, now, lead.id);

      results[step]++;
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, data: results }, { status: 500 });
  }
}

async function sendEmail(to: string, name: string, subject: string, body: string) {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) return;
  await fetch('https://api.mailjet.com/v3.1/send', {
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
}
