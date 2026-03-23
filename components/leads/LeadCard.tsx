'use client';

import { motion } from 'framer-motion';
import { Building2, Mail, Calendar, Euro } from 'lucide-react';
import type { Lead } from '@/lib/db/schema_leads';
import { ScoreBadge } from './ScoreBadge';
import { RelanceAlert } from './RelanceAlert';

const SOURCE_ICONS: Record<string, string> = {
  LinkedIn: '💼',
  Email: '✉️',
  Instagram: '📸',
  GMB: '🗺️',
  Referral: '🤝',
  Site: '🌐',
};

function daysAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  return `il y a ${d}j`;
}

interface LeadCardProps {
  lead: Lead;
  index?: number;
  onClick: (lead: Lead) => void;
  onStatusChange?: (leadId: string, status: string) => void;
}

export function LeadCard({ lead, index = 0, onClick }: LeadCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      role="button"
      tabIndex={0}
      onClick={() => onClick(lead)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(lead); } }}
      className="group bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3.5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-black/20 focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:outline-none"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-100 text-sm leading-tight truncate group-hover:text-white transition-colors">
            {lead.name}
          </p>
          {lead.company && (
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-zinc-400 flex-shrink-0" />
              <p className="text-[11px] text-zinc-400 truncate">{lead.company}</p>
            </div>
          )}
        </div>
        <ScoreBadge score={lead.score} />
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
          <span>{SOURCE_ICONS[lead.source] ?? '🌐'}</span>
          <span>{lead.source}</span>
        </span>
        {lead.budget && (
          <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
            <Euro className="w-2.5 h-2.5" />
            {lead.budget}
          </span>
        )}
        {lead.propositionAmount && (
          <span className="text-[10px] font-semibold text-fuchsia-400">
            {lead.propositionAmount.toLocaleString('fr-FR')} €
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
          <Calendar className="w-3 h-3" />
          <span>{daysAgo(lead.createdAt as number)}</span>
        </div>
        <RelanceAlert lead={lead} compact />
      </div>
    </motion.div>
  );
}
