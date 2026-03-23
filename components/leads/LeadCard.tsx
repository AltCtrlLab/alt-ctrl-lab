'use client';

import { motion } from 'framer-motion';
import { Building2, Calendar, Euro } from 'lucide-react';
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
  const isHighValue = (lead.score ?? 0) > 7 || (lead.propositionAmount ?? 0) >= 20000;
  const isHot = (lead.score ?? 0) > 8;
  const borderColor = isHighValue ? 'border-fuchsia-500' : 'border-zinc-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      role="button"
      tabIndex={0}
      onClick={() => onClick(lead)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(lead); } }}
      className={`group bg-zinc-800/60 border-l-4 ${borderColor} p-4 rounded-xl cursor-pointer transition-all duration-200 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:outline-none`}
    >
      {/* Top row: tag + amount */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          {lead.source && (
            <span className="bg-zinc-700 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">
              {lead.source}
            </span>
          )}
          {isHot && (
            <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full text-[9px] font-bold">
              HOT
            </span>
          )}
        </div>
        {(lead.propositionAmount || lead.budget) && (
          <span className="text-xs font-bold text-zinc-300">
            {lead.propositionAmount
              ? `€${lead.propositionAmount.toLocaleString('fr-FR')}`
              : lead.budget}
          </span>
        )}
      </div>

      {/* Name + company */}
      <h5 className="font-bold text-zinc-100 text-sm mb-1 group-hover:text-white transition-colors truncate">
        {lead.name}
      </h5>
      {lead.company && (
        <div className="flex items-center gap-1 mb-3">
          <Building2 className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          <p className="text-xs text-zinc-400 truncate">{lead.company}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScoreBadge score={lead.score} />
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {daysAgo(lead.createdAt as number)}
          </span>
        </div>
        <RelanceAlert lead={lead} compact />
      </div>
    </motion.div>
  );
}
