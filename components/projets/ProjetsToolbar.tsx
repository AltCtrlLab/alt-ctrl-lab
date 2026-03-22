'use client';

import { LayoutGrid, GitBranch, Plus, Search, RotateCcw } from 'lucide-react';
import type { ProjectType, ProjectPhase, ProjectStatus } from '@/lib/db/schema_projects';

interface ProjetsToolbarProps {
  viewMode: 'cards' | 'timeline';
  onViewChange: (mode: 'cards' | 'timeline') => void;
  search: string;
  onSearchChange: (v: string) => void;
  filterType: ProjectType | '';
  onFilterType: (t: ProjectType | '') => void;
  filterStatus: ProjectStatus | '';
  onFilterStatus: (s: ProjectStatus | '') => void;
  filterPhase: ProjectPhase | '';
  onFilterPhase: (p: ProjectPhase | '') => void;
  filterDate: string;
  onFilterDate: (v: string) => void;
  onNewProjet: () => void;
  totalProjects: number;
}

const TYPES: ProjectType[] = ['Web', 'Branding', 'IA', 'Marketing'];
const STATUSES: ProjectStatus[] = ['Actif', 'En pause', 'Terminé', 'Annulé'];
const PHASES: ProjectPhase[] = ['Discovery', 'Design', 'Développement', 'Testing', 'Livraison'];
const DATE_FILTERS = [
  { value: '', label: 'Toutes dates' },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: 'month', label: 'Ce mois' },
];

export function ProjetsToolbar({
  viewMode, onViewChange,
  search, onSearchChange,
  filterType, onFilterType,
  filterStatus, onFilterStatus,
  filterPhase, onFilterPhase,
  filterDate, onFilterDate,
  onNewProjet, totalProjects,
}: ProjetsToolbarProps) {
  const hasFilters = filterType || filterStatus || filterPhase || filterDate;

  const resetAll = () => {
    onFilterType('');
    onFilterStatus('');
    onFilterPhase('');
    onFilterDate('');
    onSearchChange('');
  };

  const selectCls = 'text-xs bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 focus:outline-none focus:border-fuchsia-500/50 cursor-pointer';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Chercher un projet..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/20 transition-all"
        />
      </div>

      {/* Type filter */}
      <select value={filterType} onChange={e => onFilterType(e.target.value as ProjectType | '')} className={selectCls}>
        <option value="">Tous les types</option>
        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* Status filter */}
      <select value={filterStatus} onChange={e => onFilterStatus(e.target.value as ProjectStatus | '')} className={selectCls}>
        <option value="">Tous les statuts</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Phase filter */}
      <select value={filterPhase} onChange={e => onFilterPhase(e.target.value as ProjectPhase | '')} className={selectCls}>
        <option value="">Toutes les phases</option>
        {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {/* Date filter */}
      <select value={filterDate} onChange={e => onFilterDate(e.target.value)} className={selectCls}>
        {DATE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      {/* Reset */}
      {hasFilters && (
        <button onClick={resetAll} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      )}

      <span className="text-xs text-zinc-600">{totalProjects} projet{totalProjects !== 1 ? 's' : ''}</span>

      <div className="flex-1" />

      {/* View toggle */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
        {(['cards', 'timeline'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => onViewChange(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === mode ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {mode === 'cards' ? <LayoutGrid className="w-3.5 h-3.5" /> : <GitBranch className="w-3.5 h-3.5" />}
            {mode === 'cards' ? 'Cartes' : 'Timeline'}
          </button>
        ))}
      </div>

      {/* New project */}
      <button
        onClick={onNewProjet}
        className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nouveau projet
      </button>
    </div>
  );
}
