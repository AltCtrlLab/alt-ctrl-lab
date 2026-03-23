'use client';

import { Clock, AlertTriangle } from 'lucide-react';

interface DeadlineCountdownProps {
  deadline: number | null;
  compact?: boolean;
}

export function DeadlineCountdown({ deadline, compact = false }: DeadlineCountdownProps) {
  if (!deadline) {
    return compact ? null : (
      <span className="text-[10px] text-zinc-400">Pas de deadline</span>
    );
  }

  const daysLeft = Math.ceil((deadline - Date.now()) / 86400000);
  const passed = daysLeft < 0;
  const urgent = daysLeft >= 0 && daysLeft <= 7;
  const warning = daysLeft >= 0 && daysLeft <= 14;

  const color = passed ? 'text-rose-400' : urgent ? 'text-rose-400' : warning ? 'text-amber-400' : 'text-emerald-400';
  const Icon = passed || urgent ? AlertTriangle : Clock;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${color}`}>
        <Icon className="w-3 h-3" />
        {passed ? `${Math.abs(daysLeft)}j dépassé` : `${daysLeft}j`}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-xs font-semibold">
        {passed
          ? `Dépassé de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''}`
          : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`
        }
      </span>
      <span className="text-[10px] text-zinc-400">
        ({new Date(deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })})
      </span>
    </div>
  );
}
