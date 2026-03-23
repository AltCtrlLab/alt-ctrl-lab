'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Plus, Pencil, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changesJson: string | null;
  ip: string | null;
  createdAt: number;
}

const ACTION_CONFIG: Record<string, { icon: typeof Plus; color: string; label: string }> = {
  create: { icon: Plus, color: 'text-emerald-400', label: 'Créé' },
  update: { icon: Pencil, color: 'text-amber-400', label: 'Modifié' },
  delete: { icon: Trash2, color: 'text-rose-400', label: 'Supprimé' },
};

interface AuditTimelineProps {
  entityType: string;
  entityId: string;
  className?: string;
}

export function AuditTimeline({ entityType, entityId, className = '' }: AuditTimelineProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAudit() {
      try {
        const res = await fetch(`/api/audit?entityType=${entityType}&entityId=${entityId}&limit=20`);
        const data = await res.json();
        if (data.success) {
          setEntries(data.data.entries);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchAudit();
  }, [entityType, entityId]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-6 ${className}`}>
        <div className="w-5 h-5 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-6 text-zinc-400 ${className}`}>
        <History className="w-6 h-6 mb-1 opacity-40" />
        <p className="text-xs">Aucun historique</p>
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-zinc-400" />
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Historique</h4>
      </div>

      <div className="relative pl-4 border-l border-white/[0.08]">
        {entries.map((entry, i) => {
          const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.update;
          const Icon = config.icon;
          const isExpanded = expanded === entry.id;

          let changes: Record<string, unknown> | null = null;
          if (entry.changesJson) {
            try { changes = JSON.parse(entry.changesJson); } catch { /* malformed */ }
          }

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="relative pb-3 last:pb-0"
            >
              {/* Timeline dot */}
              <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${config.color.replace('text-', 'bg-')}`} />

              <div
                className="group cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : entry.id)}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3 h-3 ${config.color}`} />
                  <span className="text-xs font-medium text-zinc-300">{config.label}</span>
                  <span className="text-[10px] text-zinc-400">{formatRelativeTime(entry.createdAt)}</span>
                </div>

                {/* Expanded changes */}
                {isExpanded && changes && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-1.5 ml-5 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] overflow-hidden"
                  >
                    <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                      {JSON.stringify(changes, null, 2)}
                    </pre>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
