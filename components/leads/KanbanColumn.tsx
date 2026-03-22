'use client';

import { useState } from 'react';
import type { Lead, LeadStatus } from '@/lib/db/schema_leads';
import { STATUS_META } from '@/lib/db/schema_leads';
import { LeadCard } from './LeadCard';

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onDrop: (leadId: string, newStatus: LeadStatus) => void;
}

export function KanbanColumn({ status, leads, onCardClick, onDrop }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const meta = STATUS_META[status];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) onDrop(leadId, status);
  };

  return (
    <div
      className={`flex-shrink-0 w-[260px] flex flex-col rounded-xl border transition-all duration-200 ${
        isDragOver
          ? 'border-fuchsia-500/50 bg-fuchsia-500/5'
          : 'border-zinc-800 bg-zinc-900/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-t-xl border-b ${meta.border} ${meta.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <span className={`text-xs font-semibold ${meta.color}`}>{status}</span>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-[80px] max-h-[calc(100vh-280px)]">
        {leads.length === 0 ? (
          <div className="h-16 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center">
            <p className="text-[10px] text-zinc-700">Déposer ici</p>
          </div>
        ) : (
          leads.map((lead, i) => (
            <div
              key={lead.id}
              draggable
              onDragStart={e => e.dataTransfer.setData('leadId', lead.id)}
              className="cursor-grab active:cursor-grabbing"
            >
              <LeadCard lead={lead} index={i} onClick={onCardClick} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
