'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { Lead, LeadStatus } from '@/lib/db/schema_leads';
import { STATUS_META } from '@/lib/db/schema_leads';
import { ScoreBadge } from './ScoreBadge';
import { RelanceAlert } from './RelanceAlert';

type SortKey = 'name' | 'score' | 'createdAt' | 'propositionAmount';

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

interface LeadsTableProps {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
}

export function LeadsTable({ leads, onRowClick, selectedIds, onToggle, onToggleAll }: LeadsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const hasBulk = selectedIds !== undefined && onToggle !== undefined;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...leads].sort((a, b) => {
    let va: string | number = (a as Record<string, unknown>)[sortKey] as string | number ?? 0;
    let vb: string | number = (b as Record<string, unknown>)[sortKey] as string | number ?? 0;
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const allSelected = hasBulk && leads.length > 0 && leads.every(l => selectedIds!.has(l.id));

  const SortIcon = ({ k }: { k: SortKey }) => (
    sortKey === k
      ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3 opacity-30" />
  );

  const ThBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-zinc-200 transition-colors">
      {label} <SortIcon k={k} />
    </button>
  );

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              {hasBulk && (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onToggleAll?.()}
                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-fuchsia-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold w-[220px]">
                <ThBtn label="Nom" k="name" />
              </th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold">Statut</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold">
                <ThBtn label="Score" k="score" />
              </th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold">Source</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-semibold">
                <ThBtn label="Montant" k="propositionAmount" />
              </th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold">
                <ThBtn label="Date" k="createdAt" />
              </th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold">Alerte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {sorted.map((lead, i) => {
              const meta = STATUS_META[lead.status as LeadStatus];
              const isSelected = hasBulk && selectedIds!.has(lead.id);
              return (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`group hover:bg-zinc-800/30 cursor-pointer transition-colors ${isSelected ? 'bg-fuchsia-500/5' : ''}`}
                >
                  {hasBulk && (
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle!(lead.id)}
                        className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-fuchsia-500 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3" onClick={() => onRowClick(lead)}>
                    <div>
                      <p className="font-medium text-zinc-200 group-hover:text-white transition-colors">{lead.name}</p>
                      {lead.company && <p className="text-[11px] text-zinc-600">{lead.company}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={() => onRowClick(lead)}>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full border ${meta?.bg} ${meta?.border} ${meta?.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta?.dot}`} />
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={() => onRowClick(lead)}>
                    <ScoreBadge score={lead.score} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500" onClick={() => onRowClick(lead)}>{lead.source}</td>
                  <td className="px-4 py-3 text-right" onClick={() => onRowClick(lead)}>
                    {lead.propositionAmount
                      ? <span className="text-xs font-semibold text-fuchsia-400">{lead.propositionAmount.toLocaleString('fr-FR')} &euro;</span>
                      : <span className="text-xs text-zinc-700">&mdash;</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500" onClick={() => onRowClick(lead)}>
                    {formatDate(lead.createdAt as number)}
                  </td>
                  <td className="px-4 py-3" onClick={() => onRowClick(lead)}>
                    <RelanceAlert lead={lead} compact />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center py-12 text-zinc-600 text-sm">Aucun lead</div>
        )}
      </div>
    </div>
  );
}
