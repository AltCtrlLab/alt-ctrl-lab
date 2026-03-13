'use client';

import { useState, useEffect } from 'react';
import { computeLeadScore, type ScoreCriteria } from '@/lib/scoring';
import { ScoreBadge } from './ScoreBadge';

const CRITERIA_CONFIG = [
  {
    key: 'budget' as const,
    label: 'Budget',
    options: [
      { value: '>10k', label: '> 10 000 €', points: 3 },
      { value: '5-10k', label: '5 000 – 10 000 €', points: 2 },
      { value: '2-5k', label: '2 000 – 5 000 €', points: 1 },
      { value: '<2k', label: '< 2 000 €', points: 0 },
    ],
  },
  {
    key: 'timeline' as const,
    label: 'Timeline',
    options: [
      { value: '>6w', label: '> 6 semaines', points: 2 },
      { value: '4-6w', label: '4 – 6 semaines', points: 1 },
      { value: '<4w', label: '< 4 semaines', points: 0 },
    ],
  },
  {
    key: 'besoin' as const,
    label: 'Clarté du besoin',
    options: [
      { value: 'Détaillé', label: 'Brief détaillé', points: 2 },
      { value: 'Vague', label: 'Brief vague', points: 1 },
      { value: 'Flou', label: 'Pas de brief clair', points: 0 },
    ],
  },
  {
    key: 'fit' as const,
    label: 'Fit AltCtrl.Lab',
    options: [
      { value: 'Premium/Tech', label: 'Premium / Tech', points: 2 },
      { value: 'Standard', label: 'Standard', points: 1 },
      { value: 'Low-end', label: 'Low-end', points: 0 },
    ],
  },
  {
    key: 'decideur' as const,
    label: 'Décideur',
    options: [
      { value: 'CEO/Founder', label: 'CEO / Founder', points: 1 },
      { value: 'Intermédiaire', label: 'Intermédiaire', points: 0 },
    ],
  },
];

interface ScoreCalculatorProps {
  initialCriteria?: ScoreCriteria;
  onChange?: (criteria: ScoreCriteria, score: number) => void;
}

export function ScoreCalculator({ initialCriteria, onChange }: ScoreCalculatorProps) {
  const [criteria, setCriteria] = useState<ScoreCriteria>(initialCriteria ?? {});
  const score = computeLeadScore(criteria);

  useEffect(() => {
    onChange?.(criteria, score);
  }, [criteria, score, onChange]);

  const setCriterion = (key: keyof ScoreCriteria, value: string) => {
    setCriteria(prev => ({ ...prev, [key]: value as any }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Score de qualification</p>
        <ScoreBadge score={score} size="md" showLabel />
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${(score / 10) * 100}%`,
            background: score >= 7 ? '#10b981' : score >= 4 ? '#f59e0b' : '#f43f5e',
          }}
        />
      </div>

      <div className="space-y-2">
        {CRITERIA_CONFIG.map(c => (
          <div key={c.key} className="space-y-1">
            <label className="text-[11px] text-zinc-500 font-medium">{c.label}</label>
            <div className="flex flex-wrap gap-1.5">
              {c.options.map(opt => {
                const isSelected = criteria[c.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCriterion(c.key, opt.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    {opt.label}
                    <span className={`ml-1 font-semibold ${isSelected ? 'text-violet-400' : 'text-zinc-600'}`}>
                      +{opt.points}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
