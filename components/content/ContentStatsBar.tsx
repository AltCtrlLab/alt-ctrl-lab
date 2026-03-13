'use client';
import { motion } from 'framer-motion';
import { CheckCircle2, Calendar, Lightbulb, TrendingUp } from 'lucide-react';

interface ContentStats {
  totalPublie: number;
  totalPlanifie: number;
  totalIdees: number;
  tauxPublication: number;
}

export function ContentStatsBar({ stats }: { stats: ContentStats | null }) {
  const items = [
    { label: 'Publiés', value: stats?.totalPublie ?? '—', icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Planifiés', value: stats?.totalPlanifie ?? '—', icon: Calendar, color: 'text-blue-400' },
    { label: 'Idées', value: stats?.totalIdees ?? '—', icon: Lightbulb, color: 'text-amber-400' },
    { label: 'Taux publication', value: stats ? `${stats.tauxPublication}%` : '—', icon: TrendingUp, color: 'text-pink-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
        >
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
