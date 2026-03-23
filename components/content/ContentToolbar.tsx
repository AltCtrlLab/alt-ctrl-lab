'use client';
import { Plus, Kanban, Calendar, List } from 'lucide-react';

interface Props {
  view: 'kanban' | 'calendar' | 'list';
  onViewChange: (v: 'kanban' | 'calendar' | 'list') => void;
  onCreate: () => void;
}

export function ContentToolbar({ view, onViewChange, onCreate }: Props) {
  const views = [
    { key: 'kanban' as const, label: 'Kanban', icon: Kanban },
    { key: 'list' as const, label: 'Liste', icon: List },
    { key: 'calendar' as const, label: 'Calendrier', icon: Calendar },
  ];

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {views.map(v => {
          const Icon = v.icon;
          return (
            <button
              key={v.key}
              onClick={() => onViewChange(v.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${view === v.key ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              <Icon className="w-4 h-4" /> {v.label}
            </button>
          );
        })}
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-3 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" /> Nouveau contenu
      </button>
    </div>
  );
}
