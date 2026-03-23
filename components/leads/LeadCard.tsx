'use client';

import { motion } from 'framer-motion';
import { Building2, Clock } from 'lucide-react';
import type { Lead } from '@/lib/db/schema_leads';
import { STATUS_META } from '@/lib/db/schema_leads';
import { ScoreBadge } from './ScoreBadge';
import { RelanceAlert } from './RelanceAlert';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `il y a ${d}j`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}min`;
  return "à l'instant";
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
  const meta = STATUS_META[lead.status];

  // Border color based on status/value
  const borderColor = lead.status === 'Signé' || lead.status === 'Discovery fait'
    ? 'border-cyan-400'
    : lead.status === 'Proposition envoyée'
      ? 'border-fuchsia-400'
      : isHighValue
        ? 'border-fuchsia-500'
        : 'border-zinc-700';

  // Proposition progress for "Proposition envoyée" leads
  const showProgress = lead.status === 'Proposition envoyée' && lead.propositionAmount;

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
      className={`group bg-[#19191c] border-l-4 ${borderColor} p-4 rounded-xl cursor-pointer transition-all duration-200 hover:bg-[#1f1f22] focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:outline-none`}
    >
      {/* Top row: source tag + amount */}
      <div className="flex justify-between items-start mb-3">
        {lead.source && (
          <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
            {lead.source}
          </span>
        )}
        {(lead.propositionAmount || lead.budget) && (
          <span className="text-xs font-bold text-zinc-300">
            €{lead.propositionAmount
              ? lead.propositionAmount.toLocaleString('fr-FR')
              : lead.budget}
          </span>
        )}
      </div>

      {/* Name */}
      <h5 className="font-bold text-zinc-100 mb-1 group-hover:text-white transition-colors truncate">
        {lead.name}
      </h5>

      {/* Company / contact info */}
      {lead.company && (
        <p className="text-xs text-zinc-400 mb-3 truncate">
          <Building2 className="w-3 h-3 inline mr-1 -mt-0.5" />
          {lead.company}
        </p>
      )}

      {/* HOT badge or special status badges */}
      {(isHot || lead.status === 'Discovery fait') && (
        <div className="flex items-center gap-2 mb-3">
          {isHot && (
            <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
              HOT
            </span>
          )}
          {lead.status === 'Discovery fait' && (
            <span className="bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
              Ready for quote
            </span>
          )}
        </div>
      )}

      {/* Progress bar for proposition leads */}
      {showProgress && (
        <div className="mb-3">
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full rounded-full" style={{ width: '85%' }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScoreBadge score={lead.score} />
        </div>
        <div className="flex items-center gap-2">
          <RelanceAlert lead={lead} compact />
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(lead.createdAt as number)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
