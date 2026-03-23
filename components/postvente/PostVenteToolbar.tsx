'use client';
import { Plus } from 'lucide-react';

interface Props {
  filterStatus: string;
  onFilterStatus: (s: string) => void;
  filterType: string;
  onFilterType: (t: string) => void;
  onCreate: () => void;
}

export function PostVenteToolbar({ filterStatus, onFilterStatus, filterType, onFilterType, onCreate }: Props) {
  return (
    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {['', 'À faire', 'Fait', 'Annulé'].map(s => (
            <button key={s} onClick={() => onFilterStatus(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors ${filterStatus === s ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300'}`}>
              {s === '' ? 'Tous' : s}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-zinc-800" />
        <div className="flex items-center gap-1 flex-wrap">
          {['', 'Check-in', 'Upsell', 'NPS', 'Support', 'Renouvellement'].map(t => (
            <button key={t} onClick={() => onFilterType(t)}
              className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors ${filterType === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-300'}`}>
              {t === '' ? 'Tous types' : t}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onCreate}
        className="flex items-center gap-2 px-3 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors">
        <Plus className="w-4 h-4" /> Nouveau suivi
      </button>
    </div>
  );
}
