/**
 * Nurture email sequence templates.
 * Each step is a prompt for the Khatib agent to generate a personalized email.
 */

export type NurtureKey = 'j1' | 'j3' | 'j3_engaged' | 'j7' | 'j7_engaged' | 'j14';

export interface NurtureStep {
  day: number;
  key: NurtureKey;
  subjectTemplate: string;
  promptTemplate: string;
  isBreakup?: boolean;
  /** If set, this step is used when lead has engaged (opened/clicked email) */
  requiresEngagement?: boolean;
}

const CAL_LINK = 'https://cal.com/altctrllab/discovery';

/**
 * Standard nurture sequence (no engagement detected).
 */
export const NURTURE_STEPS: NurtureStep[] = [
  {
    day: 1,
    key: 'j1',
    subjectTemplate: 'Bienvenue {{company}} — AltCtrl.Lab',
    promptTemplate: `Rédige un email de bienvenue chaleureux (3 paragraphes, 100 mots max) pour {{company}} (contact : {{name}}).
Ils viennent de nous contacter via {{source}}.
Présente brièvement AltCtrl.Lab : agence digitale premium spécialisée en web, branding et IA.
Termine en proposant un call découverte gratuit → ${CAL_LINK}.
Ton humain et professionnel. En français.`,
  },
  {
    day: 3,
    key: 'j3',
    subjectTemplate: 'Comment une PME a doublé ses leads en 3 mois — {{company}}',
    promptTemplate: `Rédige un email de nurture (3 paragraphes, 120 mots max) pour {{company}} (contact : {{name}}).
Partage un résultat concret : "Un client similaire a doublé ses leads qualifiés en 3 mois après une refonte web + stratégie SEO."
Explique brièvement les 3 leviers utilisés.
Pas de pitch agressif. Juste de la valeur.
Termine par une question ouverte : "Quels sont vos objectifs digitaux cette année ?".
En français.`,
  },
  {
    day: 7,
    key: 'j7',
    subjectTemplate: '15 min pour diagnostiquer votre potentiel digital — {{company}}',
    promptTemplate: `Rédige un email (2 paragraphes, 80 mots max) pour proposer un call découverte de 15 min à {{company}} (contact : {{name}}).
Mentionne que c'est gratuit et sans engagement.
Propose 2-3 bénéfices concrets du call : audit rapide du site, identification des quick wins, benchmark secteur.
Lien de réservation → ${CAL_LINK}.
Ton direct, pas de fluff. En français.`,
  },
  {
    day: 14,
    key: 'j14',
    subjectTemplate: 'Dernière prise de contact — {{company}}',
    promptTemplate: `Rédige un email de clôture poli (2 paragraphes, 60 mots max) pour {{company}} (contact : {{name}}).
C'est le dernier email de la séquence. Mentionne qu'on ne les dérangera plus.
Laisse la porte ouverte : "Si vos besoins évoluent, nous serons là."
Lien audit gratuit → ${CAL_LINK}.
Ton respectueux. En français.`,
    isBreakup: true,
  },
];

/**
 * Adaptive branch — used when lead has engaged (opened email or clicked link).
 * More aggressive CTA since they showed interest.
 */
export const NURTURE_STEPS_ENGAGED: NurtureStep[] = [
  // J+1 is the same for everyone
  NURTURE_STEPS[0],
  {
    day: 3,
    key: 'j3_engaged',
    requiresEngagement: true,
    subjectTemplate: 'Merci pour votre intérêt — on passe à l\'action ? {{company}}',
    promptTemplate: `Rédige un email de suivi (2 paragraphes, 80 mots max) pour {{company}} (contact : {{name}}).
Le prospect a ouvert notre précédent email → il est intéressé !
Sois plus direct : propose un call découverte de 15 min CETTE SEMAINE.
Mentionne 1 bénéfice concret : "On a aidé une PME similaire à gagner +35% de conversions en 6 semaines."
CTA fort : ${CAL_LINK}
Ton enthousiaste mais pas pushy. En français.`,
  },
  {
    day: 7,
    key: 'j7_engaged',
    requiresEngagement: true,
    subjectTemplate: 'Un audit gratuit de votre site — {{company}}',
    promptTemplate: `Rédige un email court (2 paragraphes, 70 mots max) pour {{company}} (contact : {{name}}).
Le prospect a montré de l'intérêt (ouverture emails).
Propose un mini-audit GRATUIT de leur site web qu'on leur envoie par email.
"Sans rendez-vous nécessaire — on vous l'envoie directement."
Si besoin d'en discuter ensuite → ${CAL_LINK}
Ton direct et généreux. En français.`,
  },
  // J+14 breakup is the same
  NURTURE_STEPS[3],
];

/**
 * Select the right nurture step based on engagement signals.
 */
export function selectNurtureStep(
  currentStep: number,
  hasEngaged: boolean,
): NurtureStep | undefined {
  const sequence = hasEngaged ? NURTURE_STEPS_ENGAGED : NURTURE_STEPS;
  return sequence[currentStep];
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] || '');
}
