/**
 * Behavioral Lead Scoring v2 — combines static criteria + behavioral signals.
 * Client-safe: no Node.js imports.
 */

import { computeLeadScore, type ScoreCriteria } from './scoring';

export interface BehavioralSignals {
  visitedPricing: boolean;
  totalPageViews: number;
  emailOpenedCount: number;
  emailClickedCount: number;
  behavioralScore: number;
  daysSinceLastVisit: number | null;
}

/**
 * Compute a combined lead score (0-100) from static criteria + behavioral signals.
 * Static score (max 10) is weighted x5 = 50 points max.
 * Behavioral signals contribute up to 50 points.
 */
export function computeFullLeadScore(
  criteria: ScoreCriteria,
  signals: BehavioralSignals,
): { total: number; static: number; behavioral: number; tier: 'hot' | 'warm' | 'cold' | 'dead' } {
  const staticScore = computeLeadScore(criteria); // 0-10
  const staticNormalized = staticScore * 5; // 0-50

  let behavScore = 0;

  // Pricing page visit = strong buying intent (+15)
  if (signals.visitedPricing) behavScore += 15;

  // Page views: 1pt per view, max 10
  behavScore += Math.min(signals.totalPageViews, 10);

  // Email engagement: opened +2 each (max 8), clicked +3 each (max 12)
  behavScore += Math.min(signals.emailOpenedCount * 2, 8);
  behavScore += Math.min(signals.emailClickedCount * 3, 12);

  // Recency bonus: visited in last 3 days = +5
  if (signals.daysSinceLastVisit !== null && signals.daysSinceLastVisit <= 3) {
    behavScore += 5;
  }

  // Cap behavioral at 50
  const behavNormalized = Math.min(behavScore, 50);
  const total = staticNormalized + behavNormalized;

  // Tier classification
  let tier: 'hot' | 'warm' | 'cold' | 'dead';
  if (total >= 60) tier = 'hot';
  else if (total >= 35) tier = 'warm';
  else if (total >= 15) tier = 'cold';
  else tier = 'dead';

  return { total, static: staticNormalized, behavioral: behavNormalized, tier };
}
