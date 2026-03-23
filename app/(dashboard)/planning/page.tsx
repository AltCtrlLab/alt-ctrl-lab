'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { PlanningGrid } from '@/components/planning/PlanningGrid';
import { StatsBar } from '@/components/ui/StatsBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

interface AgentLoad {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  projects: Array<{ id: string; clientName: string; projectType: string; phase: string }>;
  hoursLogged: number;
  hoursEstimated: number;
  weeklyCapacity: number;
  loadPercent: number;
  dailyHours: Record<string, number>;
}

interface PlanningData {
  weekStart: number;
  weekEnd: number;
  agents: AgentLoad[];
  summary: {
    totalCapacity: number;
    totalUsed: number;
    overallLoadPercent: number;
    canTakeNew: boolean;
  };
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function PlanningPage() {
  const [data, setData] = useState<PlanningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/planning?weekStart=${weekStart.toISOString()}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch { /* ignore */ }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const weekLabel = `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${
    new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }`;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-zinc-400" />
            <h1 className="text-lg font-semibold text-zinc-100">Planning</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors" aria-label="Précédent">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-zinc-300 text-sm font-medium min-w-[200px] text-center">{weekLabel}</span>
            <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors" aria-label="Suivant">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <Breadcrumbs />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary stats */}
        {data?.summary && (
          <StatsBar
            items={[
              { label: 'Capacité totale', value: `${data.summary.totalCapacity}h`, icon: CalendarClock, color: 'text-zinc-400' },
              { label: 'Heures utilisées', value: `${data.summary.totalUsed}h`, icon: CalendarClock, color: 'text-fuchsia-400' },
              { label: 'Charge globale', value: `${data.summary.overallLoadPercent}%`, icon: CalendarClock, color: data.summary.overallLoadPercent < 70 ? 'text-emerald-400' : data.summary.overallLoadPercent < 90 ? 'text-amber-400' : 'text-rose-400' },
            ]}
            loading={loading}
          />
        )}

        {/* Can take new project? */}
        {data?.summary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 p-4 rounded-xl border ${
              data.summary.canTakeNew
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-rose-500/5 border-rose-500/20'
            }`}
          >
            {data.summary.canTakeNew ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span className={data.summary.canTakeNew ? 'text-emerald-300' : 'text-rose-300'}>
              {data.summary.canTakeNew
                ? 'Capacité disponible — un nouveau projet peut être accepté cette semaine.'
                : 'Équipe chargée — il vaut mieux reporter les nouveaux projets.'}
            </span>
          </motion.div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-zinc-900/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data?.agents && data.agents.length > 0 ? (
          <PlanningGrid agents={data.agents} weekStart={data.weekStart} />
        ) : (
          <EmptyState
            icon={CalendarClock}
            color="zinc"
            message="Aucune donnée de planning"
            submessage="Assignez des agents aux projets et enregistrez des time entries pour voir la charge."
          />
        )}
      </div>
    </div>
  );
}
