'use client';
import { motion } from 'framer-motion';
import { Play, AlertCircle } from 'lucide-react';
import type { Automation } from '@/lib/db/schema_automations';
import { AutomationStatusBadge } from './AutomationStatusBadge';
import { ToolBadge } from './ToolBadge';

interface Props {
  automation: Automation;
  onClick: () => void;
  index: number;
}

function fmtDate(ts: number | null | undefined) {
  if (!ts) return 'Jamais';
  const diff = Date.now() - ts;
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)}min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString('fr-FR');
}

export function AutomationCard({ automation, onClick, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ delay: index * 0.05 }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-100 line-clamp-1 flex-1 mr-2">{automation.name}</h3>
        <AutomationStatusBadge status={automation.status as any} />
      </div>
      {automation.description && (
        <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{automation.description}</p>
      )}
      <div className="flex items-center justify-between">
        <ToolBadge tool={automation.tool as any} />
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><Play className="w-3 h-3" />{automation.runCount ?? 0}</span>
          {(automation.errorCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-rose-400"><AlertCircle className="w-3 h-3" />{automation.errorCount}</span>
          )}
        </div>
      </div>
      <p className="text-[10px] text-zinc-400 mt-2">Dernier run : {fmtDate(automation.lastRunAt)}</p>
    </motion.div>
  );
}
