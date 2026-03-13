'use client';

import type { TimeEntry, TimeCategory } from '@/lib/db/schema_projects';
import { CATEGORY_COLORS } from '@/lib/db/schema_projects';

const CATEGORIES: TimeCategory[] = ['Design', 'Dev', 'QA', 'Réunion', 'Autre'];

interface CategoryBreakdownProps {
  entries: TimeEntry[];
}

export function CategoryBreakdown({ entries }: CategoryBreakdownProps) {
  const total = entries.reduce((s, e) => s + (e.hours ?? 0), 0);

  if (total === 0) {
    return <p className="text-xs text-zinc-600 italic">Aucune entrée de temps</p>;
  }

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = entries.filter(e => e.category === cat).reduce((s, e) => s + (e.hours ?? 0), 0);
    return acc;
  }, {} as Record<TimeCategory, number>).valueOf() as Record<TimeCategory, number>;

  const active = CATEGORIES.filter(c => byCategory[c] > 0);

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {active.map(cat => (
          <div
            key={cat}
            className={`${CATEGORY_COLORS[cat]} transition-all duration-500`}
            style={{ width: `${(byCategory[cat] / total) * 100}%` }}
            title={`${cat}: ${byCategory[cat]}h`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {active.map(cat => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat]}`} />
            <span className="text-[10px] text-zinc-500">{cat}</span>
            <span className="text-[10px] font-semibold text-zinc-400">{byCategory[cat]}h</span>
            <span className="text-[10px] text-zinc-600">({Math.round((byCategory[cat] / total) * 100)}%)</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] font-bold text-zinc-300">Total: {total}h</span>
        </div>
      </div>
    </div>
  );
}
