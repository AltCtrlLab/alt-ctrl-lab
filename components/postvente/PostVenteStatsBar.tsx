'use client';
import { motion } from 'framer-motion';
import { ClipboardList, Star, AlertTriangle, TrendingUp } from 'lucide-react';

interface PostVenteStats {
  aFaire: number;
  scoreNpsMoyen: number | null;
  overdueCount: number;
  upsellsIdentifies: number;
}

export function PostVenteStatsBar({ stats }: { stats: PostVenteStats | null }) {
  const items = [
    { label: 'À faire', value: stats?.aFaire ?? '—', icon: ClipboardList, color: 'text-cyan-400' },
    { label: 'NPS moyen', value: stats?.scoreNpsMoyen != null ? `${stats.scoreNpsMoyen}/10` : '—', icon: Star, color: 'text-fuchsia-400' },
    { label: 'En retard', value: stats?.overdueCount ?? '—', icon: AlertTriangle, color: stats && stats.overdueCount > 0 ? 'text-rose-400' : 'text-zinc-400' },
    { label: 'Upsells', value: stats?.upsellsIdentifies ?? '—', icon: TrendingUp, color: 'text-emerald-400' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map((item, i) => (
        <motion.div key={item.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <item.icon className={`w-4 h-4 ${item.color}`} />
            <span className="text-xs text-zinc-400">{item.label}</span>
          </div>
          <p className={`text-2xl font-semibold ${item.color}`}>{item.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
