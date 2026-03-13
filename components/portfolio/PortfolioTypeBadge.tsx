'use client';
import type { PortfolioProjectType } from '@/lib/db/schema_portfolio';

const META: Record<PortfolioProjectType, { color: string; bg: string }> = {
  'Web': { color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  'Branding': { color: 'text-pink-400', bg: 'bg-pink-900/30' },
  'IA': { color: 'text-violet-400', bg: 'bg-violet-900/30' },
  'Marketing': { color: 'text-amber-400', bg: 'bg-amber-900/30' },
};

export function PortfolioTypeBadge({ type }: { type: PortfolioProjectType }) {
  const meta = META[type] ?? { color: 'text-zinc-400', bg: 'bg-zinc-800' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color} ${meta.bg}`}>
      {type}
    </span>
  );
}
