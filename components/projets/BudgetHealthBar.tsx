'use client';

interface BudgetHealthBarProps {
  hoursActual: number;
  hoursEstimated: number;
  showLabel?: boolean;
}

export function BudgetHealthBar({ hoursActual, hoursEstimated, showLabel = true }: BudgetHealthBarProps) {
  if (!hoursEstimated || hoursEstimated === 0) {
    return (
      <div className="space-y-1">
        {showLabel && <div className="flex justify-between text-[10px] text-zinc-400"><span>Heures</span><span>Non estimé</span></div>}
        <div className="h-1.5 rounded-full bg-zinc-800" />
      </div>
    );
  }

  const pct = Math.min((hoursActual / hoursEstimated) * 100, 120);
  const over = hoursActual > hoursEstimated;
  const warning = pct >= 80 && !over;

  const barColor = over
    ? 'bg-rose-500'
    : warning
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  const labelColor = over ? 'text-rose-400' : warning ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-[10px]">
          <span className="text-zinc-400">Heures</span>
          <span className={labelColor}>
            {hoursActual}h / {hoursEstimated}h
            {over && <span className="ml-1 font-semibold">({Math.round(pct - 100)}% dépassé)</span>}
          </span>
        </div>
      )}
      <div className="relative h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        {/* Overrun indicator */}
        {over && (
          <div className="absolute inset-y-0 right-0 w-1 bg-rose-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}
