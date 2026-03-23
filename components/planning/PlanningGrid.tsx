'use client';
import { motion } from 'framer-motion';
import { LoadBar } from './LoadBar';

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

interface Props {
  agents: AgentLoad[];
  weekStart: number;
}

function getDayLabels(weekStart: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + i * 24 * 60 * 60 * 1000);
    days.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
  }
  return days;
}

function getDayKeys(weekStart: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + i * 24 * 60 * 60 * 1000);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function cellColor(hours: number): string {
  if (hours === 0) return 'bg-zinc-900';
  if (hours < 4) return 'bg-emerald-900/30';
  if (hours < 7) return 'bg-amber-900/30';
  return 'bg-rose-900/30';
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function PlanningGrid({ agents, weekStart }: Props) {
  const dayLabels = getDayLabels(weekStart);
  const dayKeys = getDayKeys(weekStart);

  if (agents.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center text-zinc-400">
        Aucun agent disponible pour cette semaine.
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden" role="grid" aria-label="Planning hebdomadaire des agents">
      {/* Header */}
      <div className="grid grid-cols-[200px_repeat(7,1fr)_120px] border-b border-white/[0.08]" role="row">
        <div className="px-4 py-3 text-zinc-400 text-xs font-medium" role="columnheader">Agent</div>
        {dayLabels.map(d => (
          <div key={d} className="px-2 py-3 text-zinc-400 text-xs font-medium text-center" role="columnheader">{d}</div>
        ))}
        <div className="px-4 py-3 text-zinc-400 text-xs font-medium text-right" role="columnheader">Charge</div>
      </div>

      {/* Rows */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}>
        {agents.map(agent => (
          <motion.div
            key={agent.id}
            variants={itemVariants}
            role="row"
            className="grid grid-cols-[200px_repeat(7,1fr)_120px] border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
          >
            {/* Agent info */}
            <div className="px-4 py-3 flex items-center gap-2" role="gridcell">
              <span className="text-lg">{agent.emoji}</span>
              <div>
                <div className="text-zinc-200 text-sm font-medium">{agent.name}</div>
                <div className="text-zinc-400 text-xs">{agent.role}</div>
              </div>
            </div>

            {/* Day cells */}
            {dayKeys.map(key => {
              const hours = agent.dailyHours[key] ?? 0;
              return (
                <div key={key} className="px-2 py-3 flex items-center justify-center" role="gridcell">
                  <div className={`w-full h-8 rounded-lg flex items-center justify-center text-xs ${cellColor(hours)}`}>
                    {hours > 0 ? `${hours}h` : ''}
                  </div>
                </div>
              );
            })}

            {/* Load bar */}
            <div className="px-4 py-3 flex flex-col justify-center gap-1" role="gridcell">
              <LoadBar percent={agent.loadPercent} />
              <span className={`text-xs text-right ${
                agent.loadPercent < 70 ? 'text-emerald-400' :
                agent.loadPercent < 90 ? 'text-amber-400' :
                'text-rose-400'
              }`}>
                {agent.loadPercent}%
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
