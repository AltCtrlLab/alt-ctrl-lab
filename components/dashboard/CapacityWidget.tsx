'use client';

import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, AlertTriangle } from 'lucide-react';

interface WeekCapacity {
  weekLabel: string;
  hoursPlanned: number;
  hoursAvailable: number;
  loadPercent: number;
  projects: string[];
}

interface CapacityData {
  weeks: WeekCapacity[];
  totalActiveProjects: number;
  avgLoad: number;
}

export function CapacityWidget() {
  const [data, setData] = useState<CapacityData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/capacity');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-6 bg-zinc-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  function barColor(pct: number): string {
    if (pct > 120) return 'bg-rose-500';
    if (pct > 90) return 'bg-amber-500';
    if (pct > 60) return 'bg-cyan-500';
    return 'bg-emerald-500';
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Charge & Capacité</h3>
        </div>
        <div className="flex items-center gap-2">
          {data.avgLoad > 100 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <AlertTriangle className="w-3 h-3" /> Surchargé
            </span>
          )}
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mb-4 text-xs text-zinc-400">
        <span>{data.totalActiveProjects} projets actifs</span>
        <span>Charge moy. {data.avgLoad}%</span>
      </div>

      {/* Week bars */}
      <div className="space-y-2.5">
        {data.weeks.slice(0, 6).map(week => (
          <div key={week.weekLabel} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-400 font-medium">{week.weekLabel}</span>
              <span className={`text-[10px] font-bold ${week.loadPercent > 100 ? 'text-rose-400' : 'text-zinc-300'}`}>
                {week.loadPercent}%
              </span>
            </div>
            <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(week.loadPercent)}`}
                style={{ width: `${Math.min(week.loadPercent, 150)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
