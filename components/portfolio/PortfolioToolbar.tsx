'use client';
import { Plus } from 'lucide-react';

interface Props {
  filterType: string;
  onFilterType: (t: string) => void;
  onCreate: () => void;
}

export function PortfolioToolbar({ filterType, onFilterType, onCreate }: Props) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {['', 'Web', 'Branding', 'IA', 'Marketing'].map(t => (
          <button key={t} onClick={() => onFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filterType === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t === '' ? 'Tous' : t}
          </button>
        ))}
      </div>
      <button onClick={onCreate}
        className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors">
        <Plus className="w-4 h-4" /> Ajouter
      </button>
    </div>
  );
}
