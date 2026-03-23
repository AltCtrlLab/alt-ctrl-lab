'use client';

export function NpsScore({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-zinc-400">—</span>;
  const color = score < 6 ? 'text-rose-400 bg-rose-900/30' : score < 8 ? 'text-amber-400 bg-amber-900/30' : 'text-emerald-400 bg-emerald-900/30';
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${color}`}>
      {score}
    </span>
  );
}
