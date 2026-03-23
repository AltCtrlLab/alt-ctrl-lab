'use client';

import { useEffect, useRef, useState } from 'react';
import { Euro, Clock, TrendingUp, FolderKanban } from 'lucide-react';

interface ProjetsStats {
  revenueEnCours: number;
  heuresTotales: number;
  projetsActifs: number;
  margeEstimee: number | null;
}

function CountUp({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 700;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(+(eased * value).toFixed(decimals));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, decimals]);

  return <>{decimals > 0 ? display.toFixed(decimals) : display}{suffix}</>;
}

function StatCard({ label, value, suffix, prefix, icon: Icon, accent, sub, na }: {
  label: string; value: number; suffix?: string; prefix?: string; icon: React.ElementType;
  accent: string; sub?: string; na?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-200">
      <div className={`p-2.5 rounded-lg flex-shrink-0 ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-zinc-100">
          {na ? <span className="text-zinc-400 text-lg">—</span> : <>{prefix}<CountUp value={value} suffix={suffix} decimals={suffix === 'h' ? 1 : 0} /></>}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
      </div>
    </div>
  );
}

export function ProjetsStatsBar({ stats }: { stats: ProjetsStats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.03] border border-white/[0.08] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Revenus en cours" value={stats.revenueEnCours} suffix=" €" icon={Euro} accent="bg-fuchsia-500/20 text-fuchsia-400" sub="Projets actifs" />
      <StatCard label="Heures loguées" value={stats.heuresTotales} suffix="h" icon={Clock} accent="bg-cyan-500/20 text-cyan-400" sub="Projets actifs" />
      <StatCard label="Projets actifs" value={stats.projetsActifs} icon={FolderKanban} accent="bg-cyan-500/20 text-cyan-400" />
      <StatCard
        label="Marge estimée"
        value={stats.margeEstimee ?? 0}
        suffix="%"
        icon={TrendingUp}
        accent="bg-emerald-500/20 text-emerald-400"
        sub="Heures restantes"
        na={stats.margeEstimee === null}
      />
    </div>
  );
}
