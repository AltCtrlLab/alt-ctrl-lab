'use client';

import { Check } from 'lucide-react';
import type { ProjectPhase } from '@/lib/db/schema_projects';
import { PROJECT_PHASES } from '@/lib/db/schema_projects';

interface PhaseProgressProps {
  currentPhase: ProjectPhase;
  onPhaseChange?: (phase: ProjectPhase) => void;
  interactive?: boolean;
  size?: 'sm' | 'md';
}

export function PhaseProgress({ currentPhase, onPhaseChange, interactive = false, size = 'sm' }: PhaseProgressProps) {
  const currentIdx = PROJECT_PHASES.indexOf(currentPhase);

  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto">
      {PROJECT_PHASES.map((phase, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const dotSize = size === 'md' ? 'w-7 h-7' : 'w-5 h-5';
        const labelSize = size === 'md' ? 'text-[10px]' : 'text-[9px]';

        return (
          <div key={phase} className="flex items-center gap-1 flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => interactive && onPhaseChange?.(phase)}
                disabled={!interactive}
                title={phase}
                className={`${dotSize} rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                } ${
                  isDone
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : isCurrent
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)] animate-pulse'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-700'
                }`}
              >
                {isDone ? (
                  <Check className={size === 'md' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} />
                ) : (
                  <span className={`font-bold ${size === 'md' ? 'text-[10px]' : 'text-[8px]'}`}>{i + 1}</span>
                )}
              </button>
              {size === 'md' && (
                <span className={`${labelSize} text-center whitespace-nowrap ${
                  isCurrent ? 'text-cyan-400 font-semibold' : isDone ? 'text-emerald-400' : 'text-zinc-400'
                }`}>
                  {phase}
                </span>
              )}
            </div>
            {i < PROJECT_PHASES.length - 1 && (
              <div className={`h-px flex-1 min-w-[8px] transition-all duration-300 ${
                isDone ? 'bg-emerald-500/50' : 'bg-zinc-800'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
