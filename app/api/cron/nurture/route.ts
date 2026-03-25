export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { executeOpenClawAgent } from '@/lib/worker/exec-agent';
import { logger } from '@/lib/logger';
import { selectNurtureStep, renderTemplate } from '@/lib/constants/nurture-templates';

const CRON_SECRET = process.env.CRON_SECRET || 'altctrl-cron-secret';
const DAY_MS = 86_400_000;

/**
 * POST /api/cron/nurture
 * Daily cron — Séquence de nurture multi-step pour les leads non-GMB.
 * GMB leads are handled by /api/cron/followup.
 *   J+1  → email de bienvenue (Khatib)
 *   J+3  → contenu de valeur (case study)
 *   J+7  → proposition call découverte
 *   J+14 → dernier touchpoint → archive si pas d'engagement
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const results: Record<string, number | string[]> = { j1: 0, j3: 0, j3_engaged: 0, j7: 0, j7_engaged: 0, j14: 0, errors: [] as string[] };

  try {
    const rawDb = (getDb() as any).$client;

    // Leads éligibles : Nouveau, avec email, non-GMB, pas encore terminé la séquence
    const leads = rawDb.prepare(`
      SELECT id, name, company, email, source, nurture_step, nurture_started_at, created_at,
             COALESCE(email_opened_count, 0) as email_opened_count,
             COALESCE(email_clicked_count, 0) as email_clicked_count,
             COALESCE(visited_pricing, 0) as visited_pricing
      FROM leads
      WHERE status = 'Nouveau'
        AND email IS NOT NULL
        AND email != ''
        AND source != 'GMB'
        AND (nurture_step IS NULL OR nurture_step < 4)
    `).all() as Array<{
      id: string;
      name: string;
      company: string | null;
      email: string;
      source: string;
      nurture_step: number | null;
      nurture_started_at: number | null;
      created_at: number;
      email_opened_count: number;
      email_clicked_count: number;
      visited_pricing: number;
    }>;

    for (const lead of leads) {
      const currentStep = lead.nurture_step ?? 0;
      const startedAt = lead.nurture_started_at ?? lead.created_at;
      const daysSinceStart = (now - startedAt) / DAY_MS;

      // Adaptive: check if lead has engaged (opened/clicked emails or visited pricing)
      const hasEngaged = lead.email_opened_count > 0 || lead.email_clicked_count > 0 || lead.visited_pricing > 0;

      // Select step from the right branch (standard vs engaged)
      const step = selectNurtureStep(currentStep, hasEngaged);
      if (!step) continue;

      // Check if enough days have passed for this step
      if (daysSinceStart < step.day) continue;

      const vars = {
        name: lead.name,
        company: lead.company || lead.name,
        source: lead.source,
      };

      const subject = renderTemplate(step.subjectTemplate, vars);
      const prompt = renderTemplate(step.promptTemplate, vars);

      let body = '';
      try {
        const result = await executeOpenClawAgent('khatib', prompt);
        if (result.success && result.stdout) {
          body = result.stdout;
        } else {
          // Fallback: use prompt as guidance but send a simpler template
          body = getFallbackBody(step.key, vars);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Agent error';
        (results.errors as string[]).push(`${step.key} agent error for ${lead.id}: ${msg}`);
        body = getFallbackBody(step.key, vars);
      }

      if (body) {
        await sendEmail(lead.email, lead.company || lead.name, subject, body);
      }

      // Update lead nurture state
      const newStep = currentStep + 1;
      const updates: Record<string, unknown> = {
        nurture_step: newStep,
        last_contacted_at: now,
        updated_at: now,
      };

      // Set nurture_started_at on first step
      if (currentStep === 0 && !lead.nurture_started_at) {
        updates.nurture_started_at = startedAt;
      }

      // J+14 breakup — archive if no engagement
      const todayStr = new Date().toISOString().split('T')[0];
      if (step.isBreakup) {
        const breakupNote = `\nNurture J+14 terminé — archivé le ${todayStr}`;
        rawDb.prepare(`
          UPDATE leads SET
            nurture_step = ?,
            status = 'Archivé',
            last_contacted_at = ?,
            nurture_started_at = COALESCE(nurture_started_at, ?),
            notes = COALESCE(notes, '') || ?,
            updated_at = ?
          WHERE id = ?
        `).run(newStep, now, startedAt, breakupNote, now, lead.id);
      } else {
        const stepNote = `\nNurture ${step.key.toUpperCase()} envoyé le ${todayStr}`;
        rawDb.prepare(`
          UPDATE leads SET
            nurture_step = ?,
            last_contacted_at = ?,
            nurture_started_at = COALESCE(nurture_started_at, ?),
            email_sent_count = COALESCE(email_sent_count, 0) + 1,
            notes = COALESCE(notes, '') || ?,
            updated_at = ?
          WHERE id = ?
        `).run(newStep, now, startedAt, stepNote, now, lead.id);
      }

      (results[step.key] as number)++;
    }

    logger.info('nurture', 'Cron completed', results);
    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('nurture', 'Cron failed', {}, err instanceof Error ? err : undefined);
    return NextResponse.json({ success: false, error: message, data: results }, { status: 500 });
  }
}

function getFallbackBody(step: string, vars: Record<string, string>): string {
  const name = vars.company || vars.name;
  switch (step) {
    case 'j1':
      return `Bonjour,\n\nMerci pour votre intérêt envers Alt Ctrl Lab. Nous sommes une agence digitale premium spécialisée en web, branding et IA.\n\nNous serions ravis d'échanger avec vous sur vos projets digitaux.\n\nCordialement,\nAlt Ctrl Lab`;
    case 'j3':
      return `Bonjour,\n\nUn de nos clients dans un secteur similaire a doublé ses leads qualifiés en 3 mois grâce à une refonte web stratégique.\n\nQuels sont vos objectifs digitaux cette année ?\n\nCordialement,\nAlt Ctrl Lab`;
    case 'j7':
      return `Bonjour ${name},\n\n15 minutes suffisent pour identifier les quick wins de votre présence digitale.\n\nRéservez un créneau gratuit : https://cal.com/altctrllab/discovery\n\nCordialement,\nAlt Ctrl Lab`;
    case 'j14':
      return `Bonjour,\n\nC'est notre dernier message. Si vos besoins évoluent, nous serons là.\n\nAudit gratuit : https://cal.com/altctrllab/discovery\n\nBonne continuation,\nAlt Ctrl Lab`;
    default:
      return '';
  }
}
