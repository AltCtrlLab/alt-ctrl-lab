'use client';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getScoreStyle(score: number) {
  if (score >= 7) return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' };
  if (score >= 4) return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400' };
  return { bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-400', dot: 'bg-rose-400' };
}

export function ScoreBadge({ score, size = 'sm', showLabel = false }: ScoreBadgeProps) {
  const style = getScoreStyle(score);
  const sizeClasses = size === 'lg' ? 'text-sm px-3 py-1.5 gap-2' : size === 'md' ? 'text-xs px-2.5 py-1 gap-1.5' : 'text-[10px] px-2 py-0.5 gap-1';

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${style.bg} ${style.border} ${style.text} ${sizeClasses}`}>
      <span className={`rounded-full flex-shrink-0 ${style.dot} ${size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5'}`} />
      {score}/10
      {showLabel && (
        <span className="ml-0.5 font-normal opacity-70">
          {score >= 7 ? 'HOT' : score >= 4 ? 'WARM' : 'COLD'}
        </span>
      )}
    </span>
  );
}
