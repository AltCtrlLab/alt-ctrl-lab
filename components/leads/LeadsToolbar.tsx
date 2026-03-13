'use client';

import { LayoutGrid, Table2, Plus, Search } from 'lucide-react';
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
  onNewLead: () => void;
  totalLeads: number;
}

const STATUSES = ['', 'Nouveau', 'Qualifié', 'À creuser', 'Discovery fait', 'Proposition envoyée', 'Relance 1', 'Relance 2', 'Signé', 'Perdu'] as const;
const SOURCES = ['', 'LinkedIn', 'Email', 'Instagram', 'GMB', 'Referral', 'Site'] as const;

export function LeadsToolbar({
  viewMode, onViewChange,
  search, onSearchChange,
  filterStatus, onFilterStatus,
  filterSource, onFilterSource,
  onNewLead, totalLeads,
}: LeadsToolbarProps) {
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
          className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
        />
      </div>

      {/* Status filter */}
      <select
        value={filterStatus}
        onChange={e => onFilterStatus(e.target.value as any)}
        className="text-xs bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 focus:outline-none focus:border-violet-500/50 cursor-pointer"
      >
        <option value="">Tous les statuts</option>
        {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Source filter */}
      <select
        value={filterSource}
        onChange={e => onFilterSource(e.target.value as any)}
        className="text-xs bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-400 focus:outline-none focus:border-violet-500/50 cursor-pointer"
      >
        <option value="">Toutes les sources</option>
        {SOURCES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Count */}
      <span className="text-xs text-zinc-600">{totalLeads} lead{totalLeads !== 1 ? 's' : ''}</span>

      <div className="flex-1" />

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
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nouveau lead
      </button>
    </div>
  );
}
