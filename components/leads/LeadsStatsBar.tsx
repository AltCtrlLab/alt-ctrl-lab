'use client';

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, Users, Euro, Clock, AlertTriangle } from 'lucide-react';

interface LeadsStats {
  totalLeads: number;
  tauxConversion: number;
  panierMoyen: number;
  delaiMoyenJours: number;
  overdueRelances: number;
}

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 600;
    const start = performance.now();
    startRef.current = start;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <>{display}{suffix}</>;
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: React.ElementType;
  accent: string;
  sub?: string;
  alert?: boolean;
}

function StatCard({ label, value, suffix, prefix, icon: Icon, accent, sub, alert }: StatCardProps) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
      alert && value > 0
        ? 'bg-rose-500/5 border-rose-500/20'
        : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'
    }`}>
      <div className={`p-2.5 rounded-lg flex-shrink-0 ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold ${alert && value > 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
          {prefix}<CountUp value={value} suffix={suffix} />
        </p>
        <p className="text-xs text-zinc-400 mt-0.5 truncate">{label}</p>
        {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

interface LeadsStatsBarProps {
  stats: LeadsStats | null;
}

export function LeadsStatsBar({ stats }: LeadsStatsBarProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.03] border border-white/[0.08] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <StatCard label="Total leads" value={stats.totalLeads} icon={Users} accent="bg-fuchsia-500/20 text-fuchsia-400" />
      <StatCard label="Taux de conversion" value={stats.tauxConversion} suffix="%" icon={TrendingUp} accent="bg-emerald-500/20 text-emerald-400" sub="Leads → Signés" />
      <StatCard label="Panier moyen" value={stats.panierMoyen} suffix=" €" icon={Euro} accent="bg-zinc-500/20 text-zinc-400" sub="Sur leads signés" />
      <StatCard label="Délai moyen" value={stats.delaiMoyenJours} suffix="j" icon={Clock} accent="bg-amber-500/20 text-amber-400" sub="Lead → Signé" />
      <StatCard label="Relances en retard" value={stats.overdueRelances} icon={AlertTriangle} accent="bg-rose-500/20 text-rose-400" alert />
    </div>
  );
}
