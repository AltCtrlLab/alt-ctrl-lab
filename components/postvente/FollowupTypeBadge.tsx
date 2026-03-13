'use client';
import type { FollowupType } from '@/lib/db/schema_postvente';

const META: Record<FollowupType, { color: string; bg: string }> = {
  'Check-in': { color: 'text-blue-400', bg: 'bg-blue-900/30' },
  'Upsell': { color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  'NPS': { color: 'text-violet-400', bg: 'bg-violet-900/30' },
  'Support': { color: 'text-amber-400', bg: 'bg-amber-900/30' },
  'Renouvellement': { color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
};

export function FollowupTypeBadge({ type }: { type: FollowupType }) {
  const meta = META[type] ?? { color: 'text-zinc-400', bg: 'bg-zinc-800' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color} ${meta.bg}`}>
      {type}
    </span>
  );
}
