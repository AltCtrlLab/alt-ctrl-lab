'use client';

import { LayoutGrid, Table2, Plus, Search, Download, RotateCcw } from 'lucide-react';
import type { LeadSource, LeadStatus } from '@/lib/db/schema_leads';

interface LeadsToolbarProps {
  viewMode: 'kanban' | 'table';
  onViewChange: (mode: 'kanban' | 'table') => void;
  search: string;
  onSearchChange: (v: string) => void;
  filterStatus: LeadStatus | '';
  onFilterStatus: (s: LeadStatus | '') => void;
  filterSource: LeadSource | '';
  onFilterSource: (s: LeadSource | '') => void;
  filterDate: string;
  onFilterDate: (v: string) => void;
  filterScore: string;
  onFilterScore: (v: string) => void;
  onNewLead: () => void;
  onExport: () => void;
  totalLeads: number;
}

const STATUSES = ['', 'Nouveau', 'Qualifié', 'À creuser', 'Discovery fait', 'Proposition envoyée', 'Relance 1', 'Relance 2', 'Signé', 'Perdu'] as const;
const SOURCES = ['', 'LinkedIn', 'Email', 'Instagram', 'GMB', 'Referral', 'Site'] as const;
const DATE_FILTERS = [
  { value: '', label: 'Toutes dates' },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: 'month', label: 'Ce mois' },
];
const SCORE_FILTERS = [
  { value: '', label: 'Tous scores' },
  { value: '5', label: 'Score > 5' },
  { value: '7', label: 'Score > 7' },
];

export function LeadsToolbar({
  viewMode, onViewChange,
  search, onSearchChange,
  filterStatus, onFilterStatus,
  filterSource, onFilterSource,
  filterDate, onFilterDate,
  filterScore, onFilterScore,
  onNewLead, onExport, totalLeads,
}: LeadsToolbarProps) {
  const hasFilters = filterStatus || filterSource || filterDate || filterScore;

  const resetAll = () => {
    onFilterStatus('');
    onFilterSource('');
    onFilterDate('');
    onFilterScore('');
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
          placeholder="Chercher un lead..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/20 transition-all"
        />
      </div>

      {/* Status filter */}
      <select value={filterStatus} onChange={e => onFilterStatus(e.target.value as LeadStatus | '')} className={selectCls}>
        <option value="">Tous les statuts</option>
        {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Source filter */}
      <select value={filterSource} onChange={e => onFilterSource(e.target.value as LeadSource | '')} className={selectCls}>
        <option value="">Toutes les sources</option>
        {SOURCES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Date filter */}
      <select value={filterDate} onChange={e => onFilterDate(e.target.value)} className={selectCls}>
        {DATE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      {/* Score filter */}
      <select value={filterScore} onChange={e => onFilterScore(e.target.value)} className={selectCls}>
        {SCORE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      {/* Reset */}
      {hasFilters && (
        <button onClick={resetAll} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      )}

      {/* Count */}
      <span className="text-xs text-zinc-600">{totalLeads} lead{totalLeads !== 1 ? 's' : ''}</span>

      <div className="flex-1" />

      {/* Export CSV */}
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        CSV
      </button>

      {/* View toggle */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
        {(['kanban', 'table'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => onViewChange(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === mode ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {mode === 'kanban' ? <LayoutGrid className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
            {mode === 'kanban' ? 'Kanban' : 'Table'}
          </button>
        ))}
      </div>

      {/* New lead */}
      <button
        onClick={onNewLead}
        className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nouveau lead
      </button>
    </div>
  );
}
