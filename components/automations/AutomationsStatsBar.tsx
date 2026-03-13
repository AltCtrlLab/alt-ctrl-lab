'use client';
import { motion } from 'framer-motion';
import { Zap, CheckCircle2, Activity, AlertTriangle } from 'lucide-react';

interface AutomationsStats {
  totalActif: number;
  tauxSucces: number;
  execsMois: number;
  enErreur: number;
}

export function AutomationsStatsBar({ stats }: { stats: AutomationsStats | null }) {
  const items = [
    { label: 'Actives', value: stats?.totalActif ?? '—', icon: Zap, color: 'text-emerald-400' },
    { label: 'Taux succès', value: stats ? `${stats.tauxSucces}%` : '—', icon: CheckCircle2, color: 'text-blue-400' },
    { label: 'Exécutions', value: stats?.execsMois ?? '—', icon: Activity, color: 'text-violet-400' },
    { label: 'En erreur', value: stats?.enErreur ?? '—', icon: AlertTriangle, color: stats && stats.enErreur > 0 ? 'text-rose-400' : 'text-zinc-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map((item, i) => (
        <motion.div key={item.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <item.icon className={`w-4 h-4 ${item.color}`} />
            <span className="text-xs text-zinc-500">{item.label}</span>
          </div>
          <p className={`text-2xl font-semibold ${item.color}`}>{item.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
