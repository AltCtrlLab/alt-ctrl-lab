'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Target, AlertCircle, RefreshCw } from 'lucide-react';

interface RevenueData {
  pipeline: number;
  caMois: number;
  caTotal: number;
  signedMois: number;
  totalLeadsMois: number;
  tauxConversionMois: number;
  projectionMensuelle: number;
  budgetProjects: number;
  enRetard: number;
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k€`;
  return `${n}€`;
}

export function RevenueIntelligence() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/revenue');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('RevenueIntelligence load error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 bg-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    {
      label: 'Pipeline',
      value: fmt(data.pipeline),
      sub: `${data.totalLeadsMois} leads ce mois`,
      icon: Target,
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
    },
    {
      label: 'CA mois en cours',
      value: fmt(data.caMois),
      sub: `${data.tauxConversionMois}% conversion`,
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Projection mois',
      value: fmt(data.projectionMensuelle),
      sub: 'basé sur taux historique',
      icon: TrendingUp,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Projets actifs',
      value: fmt(data.budgetProjects),
      sub: data.enRetard > 0 ? `${data.enRetard} facture(s) en retard` : 'aucun retard',
      icon: AlertCircle,
      color: data.enRetard > 0 ? 'text-rose-400' : 'text-zinc-400',
      bg: data.enRetard > 0 ? 'bg-rose-500/10' : 'bg-zinc-800',
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-100">Revenue Intelligence</span>
        </div>
        <button onClick={load} className="text-zinc-400 hover:text-zinc-300 transition-colors" aria-label="Actualiser">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-px bg-zinc-800/50">
        {metrics.map((m, i) => (
          <div key={i} className="bg-zinc-900/80 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-zinc-400 mb-1">{m.label}</p>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{m.sub}</p>
              </div>
              <div className={`p-1.5 rounded-lg ${m.bg}`}>
                <m.icon className={`w-4 h-4 ${m.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
