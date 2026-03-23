'use client';

import { Check, ChevronRight } from 'lucide-react';
import type { LeadStatus } from '@/lib/db/schema_leads';
import { LEAD_STATUSES, STATUS_META } from '@/lib/db/schema_leads';

interface StatusStepperProps {
  currentStatus: LeadStatus;
  onStatusChange: (status: LeadStatus) => void;
  disabled?: boolean;
}

// Statuts du pipeline principal (sans Low priority et Perdu)
const PIPELINE_STATUSES: LeadStatus[] = [
  'Nouveau', 'Qualifié', 'Discovery fait', 'Proposition envoyée', 'Relance 1', 'Relance 2', 'Signé',
];

export function StatusStepper({ currentStatus, onStatusChange, disabled }: StatusStepperProps) {
  const currentIdx = PIPELINE_STATUSES.indexOf(currentStatus);

  return (
    <div className="space-y-3">
      {/* Pipeline steps */}
      <div className="flex items-center gap-1 flex-wrap">
        {PIPELINE_STATUSES.map((status, i) => {
          const meta = STATUS_META[status];
          const isDone = currentIdx > i;
          const isCurrent = currentIdx === i;
          return (
            <div key={status} className="flex items-center gap-1">
              <button
                onClick={() => !disabled && onStatusChange(status)}
                disabled={disabled}
                className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                  isCurrent
                    ? `${meta.bg} ${meta.border} ${meta.color}`
                    : isDone
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-400'
                } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                {isDone && <Check className="w-2.5 h-2.5" />}
                {status}
              </button>
              {i < PIPELINE_STATUSES.length - 1 && (
                <ChevronRight className="w-3 h-3 text-zinc-700 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Out-of-pipeline statuses */}
      <div className="flex gap-2">
        {(['À creuser', 'Low priority', 'Perdu'] as LeadStatus[]).map(status => {
          const meta = STATUS_META[status];
          const isCurrent = currentStatus === status;
          return (
            <button
              key={status}
              onClick={() => !disabled && onStatusChange(status)}
              disabled={disabled}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                isCurrent
                  ? `${meta.bg} ${meta.border} ${meta.color}`
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-400'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {status}
            </button>
          );
        })}
      </div>
    </div>
  );
}
