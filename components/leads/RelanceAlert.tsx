'use client';

import { AlertTriangle, Bell } from 'lucide-react';
import type { Lead } from '@/lib/db/schema_leads';

const J3 = 3 * 24 * 60 * 60 * 1000;
const J7 = 7 * 24 * 60 * 60 * 1000;

export function getRelanceInfo(lead: Lead): { type: 'overdue' | 'warning' | null; label: string; daysOverdue: number } {
  const now = Date.now();

  if (lead.status === 'Proposition envoyée' && lead.propositionSentAt) {
    const elapsed = now - (lead.propositionSentAt as number);
    if (elapsed > J3) {
      const days = Math.floor(elapsed / 86400000);
      return { type: 'overdue', label: `Relance J+${days}`, daysOverdue: days - 3 };
    }
  }
  if (lead.status === 'Relance 1' && lead.relance1SentAt) {
    const elapsed = now - (lead.relance1SentAt as number);
    if (elapsed > J7) {
      const days = Math.floor(elapsed / 86400000);
      return { type: 'overdue', label: `Relance 2 J+${days}`, daysOverdue: days - 7 };
    }
  }
  return { type: null, label: '', daysOverdue: 0 };
}

interface RelanceAlertProps {
  lead: Lead;
  compact?: boolean;
}

export function RelanceAlert({ lead, compact = false }: RelanceAlertProps) {
  const info = getRelanceInfo(lead);
  if (!info.type) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400">
        <AlertTriangle className="w-2.5 h-2.5" />
        {info.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
      <Bell className="w-3 h-3 text-rose-400 flex-shrink-0" />
      <span className="text-xs text-rose-300 font-medium">{info.label} en retard</span>
    </div>
  );
}
