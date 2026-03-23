'use client';
import { motion } from 'framer-motion';
import type { Followup } from '@/lib/db/schema_postvente';
import { FollowupTypeBadge } from './FollowupTypeBadge';
import { NpsScore } from './NpsScore';
import { OverdueAlert } from './OverdueAlert';

interface Props {
  followups: Followup[];
  onSelect: (f: Followup) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  'Haute': 'text-rose-400',
  'Normale': 'text-zinc-400',
  'Basse': 'text-zinc-400',
};

function fmtDate(ts: number | null | undefined) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('fr-FR');
}

export function FollowupList({ followups, onSelect }: Props) {
  if (followups.length === 0) {
    return <p className="text-zinc-400 text-sm text-center py-12">Aucun suivi</p>;
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
            <th className="text-left px-4 py-3">Client</th>
            <th className="text-left px-4 py-3">Type</th>
            <th className="text-left px-4 py-3">Priorité</th>
            <th className="text-left px-4 py-3">Planifié</th>
            <th className="text-left px-4 py-3">NPS</th>
            <th className="text-left px-4 py-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {followups.map((f, i) => (
            <motion.tr key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              tabIndex={0}
              onClick={() => onSelect(f)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(f); } }}
              className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors focus-visible:bg-white/[0.05] focus-visible:outline-none">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200">{f.clientName}</span>
                  <OverdueAlert scheduledAt={f.scheduledAt} status={f.status} />
                </div>
              </td>
              <td className="px-4 py-3"><FollowupTypeBadge type={f.type as any} /></td>
              <td className={`px-4 py-3 text-xs font-medium ${PRIORITY_COLORS[f.priority] ?? 'text-zinc-400'}`}>{f.priority}</td>
              <td className="px-4 py-3 text-zinc-400">{fmtDate(f.scheduledAt)}</td>
              <td className="px-4 py-3"><NpsScore score={f.scoreNps} /></td>
              <td className="px-4 py-3">
                <span className={`text-xs ${f.status === 'Fait' ? 'text-emerald-400' : f.status === 'Annulé' ? 'text-zinc-400' : 'text-zinc-300'}`}>
                  {f.status}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
