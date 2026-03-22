/**
 * Nurture email sequence templates.
 * Each step is a prompt for the Khatib agent to generate a personalized email.
 */

export interface NurtureStep {
  day: number;
  key: 'j1' | 'j3' | 'j7' | 'j14';
  subjectTemplate: string;
  promptTemplate: string;
  isBreakup?: boolean;
}

const CAL_LINK = 'https://cal.com/altctrllab/discovery';

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

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] || '');
}
