'use client';
import { Plus, Kanban, Calendar } from 'lucide-react';

interface Props {
  view: 'kanban' | 'calendar';
  onViewChange: (v: 'kanban' | 'calendar') => void;
  onCreate: () => void;
}

export function ContentToolbar({ view, onViewChange, onCreate }: Props) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        <button
          onClick={() => onViewChange('kanban')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${view === 'kanban' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Kanban className="w-4 h-4" /> Kanban
        </button>
        <button
          onClick={() => onViewChange('calendar')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${view === 'calendar' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Calendar className="w-4 h-4" /> Calendrier
        </button>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-3 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" /> Nouveau contenu
      </button>
    </div>
  );
}
