'use client';

import type { ScoreCriteria } from '@/lib/scoring';

const BREAKDOWN_ROWS: {
  key: keyof ScoreCriteria;
  label: string;
  maxPoints: number;
  labels: Record<string, { label: string; pts: number }>;
}[] = [
  {
    key: 'budget',
    label: 'Budget',
    maxPoints: 3,
    labels: {
      '>10k': { label: '> 10 000 €', pts: 3 },
      '5-10k': { label: '5 000 – 10 000 €', pts: 2 },
      '2-5k': { label: '2 000 – 5 000 €', pts: 1 },
      '<2k': { label: '< 2 000 €', pts: 0 },
    },
  },
  {
    key: 'timeline',
    label: 'Timeline',
    maxPoints: 2,
    labels: {
      '>6w': { label: '> 6 semaines', pts: 2 },
      '4-6w': { label: '4 – 6 semaines', pts: 1 },
      '<4w': { label: '< 4 semaines', pts: 0 },
    },
  },
  {
    key: 'besoin',
    label: 'Clarté du besoin',
    maxPoints: 2,
    labels: {
      'Détaillé': { label: 'Brief détaillé', pts: 2 },
      'Vague': { label: 'Brief vague', pts: 1 },
      'Flou': { label: 'Pas de brief', pts: 0 },
    },
  },
  {
    key: 'fit',
    label: 'Fit AltCtrl.Lab',
    maxPoints: 2,
    labels: {
      'Premium/Tech': { label: 'Premium / Tech', pts: 2 },
      'Standard': { label: 'Standard', pts: 1 },
      'Low-end': { label: 'Low-end', pts: 0 },
    },
  },
  {
    key: 'decideur',
    label: 'Décideur',
    maxPoints: 1,
    labels: {
      'CEO/Founder': { label: 'CEO / Founder', pts: 1 },
      'Intermédiaire': { label: 'Intermédiaire', pts: 0 },
    },
  },
];

interface ScoreBreakdownProps {
  criteria: ScoreCriteria | null;
}

export function ScoreBreakdown({ criteria }: ScoreBreakdownProps) {
  if (!criteria) {
    return <p className="text-xs text-zinc-400 italic">Score non calculé — critères manquants.</p>;
  }

  return (
    <div className="space-y-2.5">
      {BREAKDOWN_ROWS.map(row => {
        const val = criteria[row.key] as string | undefined;
        const info = val ? row.labels[val] : null;
        const pts = info?.pts ?? 0;
        const pct = (pts / row.maxPoints) * 100;

        return (
          <div key={row.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-zinc-400">{row.label}</span>
              <div className="flex items-center gap-2">
                {info && <span className="text-[10px] text-zinc-400 italic">{info.label}</span>}
                <span className={`text-xs font-bold ${pts > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  +{pts}/{row.maxPoints}
                </span>
              </div>
            </div>
            <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : pct > 0 ? '#818cf8' : '#27272a',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
