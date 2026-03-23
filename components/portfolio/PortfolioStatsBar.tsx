'use client';
import { motion } from 'framer-motion';
import { Globe, Star, LayoutGrid } from 'lucide-react';

interface PortfolioStats {
  totalPublie: number;
  parType: Record<string, number>;
  featured: number;
}

export function PortfolioStatsBar({ stats }: { stats: PortfolioStats | null }) {
  const typeStr = stats ? Object.entries(stats.parType).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—' : '—';
  const items = [
    { label: 'Publiés', value: stats?.totalPublie ?? '—', icon: Globe, color: 'text-amber-400' },
    { label: 'Par type', value: typeStr, icon: LayoutGrid, color: 'text-cyan-400' },
    { label: 'Featured', value: stats?.featured ?? '—', icon: Star, color: 'text-yellow-400' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {items.map((item, i) => (
        <motion.div key={item.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <item.icon className={`w-4 h-4 ${item.color}`} />
            <span className="text-xs text-zinc-400">{item.label}</span>
          </div>
          <p className={`text-lg font-semibold ${item.color} truncate`}>{item.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
