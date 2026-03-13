'use client';

import type { Lead, LeadStatus } from '@/lib/db/schema_leads';
import { LEAD_STATUSES } from '@/lib/db/schema_leads';
import { KanbanColumn } from './KanbanColumn';

interface LeadsKanbanProps {
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
}

export function LeadsKanban({ leads, onCardClick, onStatusChange }: LeadsKanbanProps) {
  const grouped = LEAD_STATUSES.reduce((acc, status) => {
    acc[status] = leads.filter(l => l.status === status);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
      {LEAD_STATUSES.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          leads={grouped[status]}
          onCardClick={onCardClick}
          onDrop={onStatusChange}
        />
      ))}
    </div>
  );
}
