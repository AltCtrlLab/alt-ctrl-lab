'use client';

import { useState } from 'react';
import type { Lead, LeadStatus } from '@/lib/db/schema_leads';
import { LeadCard } from './LeadCard';

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onDrop: (leadId: string, newStatus: LeadStatus) => void;
}

export function KanbanColumn({ status, leads, onCardClick, onDrop }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

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
      className={`flex-shrink-0 w-80 flex flex-col gap-4 transition-all duration-200 ${
        isDragOver ? 'opacity-80' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h4 className="font-headline font-bold text-sm uppercase tracking-wider text-zinc-400">
            {status}
          </h4>
          <span className="bg-surface-container px-2 py-0.5 rounded-full text-[10px] text-zinc-500 font-bold">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className={`flex flex-col gap-3 min-h-[80px] max-h-[calc(100vh-320px)] overflow-y-auto ${
        isDragOver ? 'ring-1 ring-fuchsia-500/30 rounded-xl p-1 bg-fuchsia-500/5' : ''
      }`}>
        {leads.length === 0 ? (
          <div className="bg-surface-container/30 border-2 border-dashed border-white/5 rounded-xl h-32 flex items-center justify-center">
            <p className="text-zinc-600 text-xs italic">Déposer ici</p>
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
