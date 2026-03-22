/**
 * Resource planning constants for agent capacity tracking.
 */

export const DEFAULT_WEEKLY_CAPACITY = 40; // hours per week per agent

export const AGENT_CAPACITY: Record<string, number> = {
  musawwir: 40,
  matin: 40,
  fatah: 40,
  hasib: 40,
  raqim: 40,
  banna: 40,
  khatib: 40,
  sani: 40,
};

export const LOAD_THRESHOLDS = {
  green: 70,   // < 70% = capacity available
  orange: 90,  // 70-90% = getting tight
  // > 90% = overloaded (red)
} as const;

export function getLoadColor(percent: number): 'emerald' | 'amber' | 'rose' {
  if (percent < LOAD_THRESHOLDS.green) return 'emerald';
  if (percent < LOAD_THRESHOLDS.orange) return 'amber';
  return 'rose';
}
