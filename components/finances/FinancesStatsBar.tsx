'use client';
import { motion } from 'framer-motion';
import { Euro, Clock, TrendingDown, AlertTriangle } from 'lucide-react';

interface FinancesStats {
  caEncaisse: number;
  caEnAttente: number;
  depensesMois: number;
  margeNette: number;
  facturesEnRetard: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function FinancesStatsBar({ stats }: { stats: FinancesStats | null }) {
  const items = [
    { label: 'CA encaissé', value: stats ? fmt(stats.caEncaisse) : '—', icon: Euro, color: 'text-emerald-400' },
    { label: 'CA en attente', value: stats ? fmt(stats.caEnAttente) : '—', icon: Clock, color: 'text-blue-400' },
    { label: 'Dépenses / mois', value: stats ? fmt(stats.depensesMois) : '—', icon: TrendingDown, color: 'text-amber-400' },
    { label: 'Marge nette', value: stats ? fmt(stats.margeNette) : '—', icon: Euro, color: stats && stats.margeNette >= 0 ? 'text-emerald-400' : 'text-rose-400' },
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
          <p className={`text-xl font-semibold ${item.color}`}>{item.value}</p>
          {item.label === 'CA en attente' && stats && stats.facturesEnRetard > 0 && (
            <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {stats.facturesEnRetard} en retard
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
