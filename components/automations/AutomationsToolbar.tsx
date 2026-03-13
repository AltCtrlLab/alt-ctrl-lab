'use client';
import { Plus } from 'lucide-react';

interface Props {
  filterStatus: string;
  onFilterStatus: (s: string) => void;
  onCreate: () => void;
}

export function AutomationsToolbar({ filterStatus, onFilterStatus, onCreate }: Props) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {['', 'Actif', 'Inactif', 'Erreur'].map(s => (
          <button key={s} onClick={() => onFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filterStatus === s ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {s === '' ? 'Tous' : s}
          </button>
        ))}
      </div>
      <button onClick={onCreate}
        className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors">
        <Plus className="w-4 h-4" /> Nouvelle automation
      </button>
    </div>
  );
}
