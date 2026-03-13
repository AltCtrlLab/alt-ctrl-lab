/**
 * Logique de scoring leads — fichier client-safe (pas d'imports Node.js)
 */

export type ScoreCriteria = {
  budget?: '<2k' | '2-5k' | '5-10k' | '>10k' | null;
  timeline?: '>6w' | '4-6w' | '<4w' | null;
  besoin?: 'Détaillé' | 'Vague' | 'Flou' | null;
  fit?: 'Premium/Tech' | 'Standard' | 'Low-end' | null;
  decideur?: 'CEO/Founder' | 'Intermédiaire' | null;
};

export function computeLeadScore(criteria: ScoreCriteria): number {
  let score = 0;
  if (criteria.budget === '>10k') score += 3;
  else if (criteria.budget === '5-10k') score += 2;
  else if (criteria.budget === '2-5k') score += 1;

  if (criteria.timeline === '>6w') score += 2;
  else if (criteria.timeline === '4-6w') score += 1;

  if (criteria.besoin === 'Détaillé') score += 2;
  else if (criteria.besoin === 'Vague') score += 1;

  if (criteria.fit === 'Premium/Tech') score += 2;
  else if (criteria.fit === 'Standard') score += 1;

  if (criteria.decideur === 'CEO/Founder') score += 1;

  return score; // max 10
}
