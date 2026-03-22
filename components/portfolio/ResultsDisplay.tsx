'use client';

interface Props {
  results: string | null | undefined;
}

const COLORS = [
  'text-emerald-400 bg-emerald-900/30',
  'text-cyan-400 bg-cyan-900/30',
  'text-fuchsia-400 bg-fuchsia-900/30',
  'text-amber-400 bg-amber-900/30',
];

export function ResultsDisplay({ results }: Props) {
  if (!results) return null;
  let parsed: Record<string, string> = {};
  try { parsed = JSON.parse(results); } catch { return null; }
  const entries = Object.entries(parsed);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([key, val], i) => (
        <span key={key} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COLORS[i % COLORS.length]}`}>
          {key}: {val}
        </span>
      ))}
    </div>
  );
}
