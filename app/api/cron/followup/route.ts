export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const MAILJET_FROM_NAME = process.env.MAILJET_FROM_NAME || 'Alt Ctrl Lab';
const CAL_LINK = 'https://cal.com/altctrllab/discovery';

const DAY_MS = 86_400_000;

interface GmbLead {
  id: string;
  name: string;
  company: string | null;
  email: string;
  source: string;
  website_score: number | null;
  email_sent_count: number | null;
  last_contacted_at: number;
}

/**
 * POST /api/cron/followup
 * Déclencheur : Railway cron — tous les jours à 9h
 * Pipeline :
 *   J+3  → email relance courte (Khatib)
 *   J+7  → email case study (Khatib)
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
    const rawDb = (getDb() as any).$client;

    // Leads GMB Nouveau, dernier contact il y a 3-14 jours
    const leads = rawDb.prepare(`
      SELECT id, name, company, email, source, website_score, email_sent_count, last_contacted_at
      FROM leads
      WHERE source = 'GMB'
        AND status = 'Nouveau'
        AND last_contacted_at IS NOT NULL
        AND email IS NOT NULL
      ORDER BY last_contacted_at ASC
    `).all() as GmbLead[];

    for (const lead of leads) {
      const daysSince = (now - lead.last_contacted_at) / DAY_MS;
      const count: number = lead.email_sent_count ?? 0;

      let step: 'j3' | 'j7' | 'j14' | null = null;
      if (daysSince >= 3 && daysSince < 7 && count === 1) step = 'j3';
      else if (daysSince >= 7 && daysSince < 14 && count === 2) step = 'j7';
      else if (daysSince >= 14 && count === 3) step = 'j14';

      if (!step) continue;

      // J+14 breakup — template statique, pas besoin d'IA
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
            email_sent_count = COALESCE(email_sent_count, 0) + 1,
            last_contacted_at = ?,
            updated_at = ?
          WHERE id = ?
        `).run(now, now, lead.id);
        results.j14++;
        continue;
      }

      // J+3 et J+7 — Khatib génère l'email
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
      const subject = step === 'j3'
        ? `Re: Votre site web — ${lead.company || lead.name}`
        : `Un client similaire a +40% de leads — ${lead.company || lead.name}`;

      try {
        const result = await executeOpenClawAgent('khatib', prompt);
        if (result.success && result.stdout) {
          body = result.stdout;
        } else {
          body = getFallbackBody(step, lead, scoreInfo);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Agent error';
        results.errors.push(`Khatib error for ${lead.id}: ${msg}`);
        body = getFallbackBody(step, lead, scoreInfo);
      }

      if (body) {
        await sendEmail(lead.email, lead.company || lead.name, subject, body);
      }

      const stepLabel = step === 'j3' ? 'J+3' : 'J+7';
      const stepNote = `\nRelance ${stepLabel} envoyée le ${new Date().toISOString().split('T')[0]}`;
      rawDb.prepare(`
        UPDATE leads SET
          email_sent_count = COALESCE(email_sent_count, 0) + 1,
          last_contacted_at = ?,
          notes = COALESCE(notes, '') || ?,
          updated_at = ?
        WHERE id = ?
      `).run(now, stepNote, now, lead.id);

      results[step]++;
    }

    logger.info('followup', 'Cron completed', results);
    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('followup', 'Cron failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message, data: results }, { status: 500 });
  }
}

function getFallbackBody(step: 'j3' | 'j7', lead: GmbLead, scoreInfo: string): string {
  if (step === 'j3') {
    return `Bonjour,\n\nJe vous avais contacté la semaine dernière au sujet de votre site (${scoreInfo}).\n\n15 minutes suffisent pour identifier vos quick wins : ${CAL_LINK}\n\nCordialement,\n${MAILJET_FROM_NAME}`;
  }
  return `Bonjour,\n\nUn client similaire a augmenté ses leads de 40% en 3 mois après une refonte mobile.\n\nVotre site a un ${scoreInfo}. Un audit gratuit pourrait révéler des opportunités similaires : ${CAL_LINK}\n\nCordialement,\n${MAILJET_FROM_NAME}`;
}
