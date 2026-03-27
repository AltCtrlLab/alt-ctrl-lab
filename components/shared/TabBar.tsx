'use client';

import type { ElementType } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: ElementType;
  count?: number;
}

interface Props {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div role="tablist" className="flex gap-0 border-b border-zinc-800 overflow-x-auto scrollbar-hide">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
              isActive
                ? 'text-fuchsia-400 border-fuchsia-500'
                : 'text-zinc-400 border-transparent hover:text-zinc-300'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
