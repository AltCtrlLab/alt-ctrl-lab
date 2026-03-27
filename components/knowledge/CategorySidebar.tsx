'use client';

import { BookOpen, FileText, LayoutTemplate, ScrollText, GitBranch } from 'lucide-react';

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  process:  { label: 'Process',  icon: GitBranch,      color: 'emerald' },
  template: { label: 'Template', icon: LayoutTemplate,  color: 'sky' },
  runbook:  { label: 'Runbook',  icon: ScrollText,      color: 'amber' },
  decision: { label: 'Decision', icon: FileText,         color: 'fuchsia' },
};

interface CategorySidebarProps {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
  counts: Record<string, number>;
}

export function CategorySidebar({ categories, active, onChange, counts }: CategorySidebarProps) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <aside className="w-56 shrink-0 space-y-1">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 px-3">Categories</p>

      {/* "Tous" button */}
      <button
        onClick={() => onChange('')}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
          active === ''
            ? 'bg-fuchsia-500/10 border border-fuchsia-500/25 text-fuchsia-300'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Tous</span>
        <span className="text-[10px] tabular-nums text-zinc-500">{total}</span>
      </button>

      {categories.map((cat) => {
        const meta = CATEGORY_META[cat] ?? { label: cat, icon: FileText, color: 'zinc' };
        const Icon = meta.icon;
        const isActive = active === cat;

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
              isActive
                ? `bg-${meta.color}-500/10 border border-${meta.color}-500/25 text-${meta.color}-300`
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="flex-1 text-left capitalize">{meta.label}</span>
            <span className="text-[10px] tabular-nums text-zinc-500">{counts[cat] ?? 0}</span>
          </button>
        );
      })}
    </aside>
  );
}
