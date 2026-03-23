'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getAgent } from '@/lib/constants/agents';

interface MonitoringSummary {
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  totalTokens: number;
  mostActiveAgent: string | null;
  totalFailed: number;
  timeframe: string;
}

interface AgentStats {
  agentId: string;
  totalExecutions: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgDurationMs: number;
}

interface MonitoringData {
  summary: MonitoringSummary;
  byAgent: AgentStats[];
}

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}min`;
}

export function AIMonitoringWidget() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchMonitoring() {
      try {
        const res = await fetch('/api/ai/monitoring?timeframe=24h&limit=5');
        const json = await res.json();
        if (!cancelled && json.success) {
          setData(json.data);
        }
      } catch {
        // Silent — widget is optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMonitoring();
    // Refresh every 60s
    const interval = setInterval(() => {
      if (!document.hidden) fetchMonitoring();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 animate-pulse">
        <div className="h-4 w-32 bg-zinc-800 rounded mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-zinc-800/50 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!data || data.summary.totalExecutions === 0) {
    return (
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-fuchsia-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Monitoring IA</h3>
          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">24h</span>
        </div>
        <p className="text-xs text-zinc-400">Aucune exécution IA dans les dernières 24h.</p>
      </motion.div>
    );
  }

  const { summary, byAgent } = data;
  const topAgents = byAgent.slice(0, 4);
  const mostActive = summary.mostActiveAgent ? getAgent(summary.mostActiveAgent) : null;

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-fuchsia-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Monitoring IA</h3>
          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">24h</span>
        </div>
        {mostActive && (
          <span className="text-[10px] text-zinc-400">
            Agent le plus actif : <span className="text-fuchsia-400">{mostActive.emoji} {mostActive.name}</span>
          </span>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <Activity className="w-3.5 h-3.5 text-fuchsia-400 flex-shrink-0" />
          <div>
            <p className="text-lg font-bold text-zinc-100">{summary.totalExecutions}</p>
            <p className="text-[10px] text-zinc-400">Exécutions</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-lg font-bold text-zinc-100">{summary.successRate}%</p>
            <p className="text-[10px] text-zinc-400">Taux de succès</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <Clock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <div>
            <p className="text-lg font-bold text-zinc-100">{formatDuration(summary.avgDurationMs)}</p>
            <p className="text-[10px] text-zinc-400">Durée moy.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <XCircle className={`w-3.5 h-3.5 flex-shrink-0 ${summary.totalFailed > 0 ? 'text-rose-400' : 'text-zinc-400'}`} />
          <div>
            <p className={`text-lg font-bold ${summary.totalFailed > 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
              {summary.totalFailed}
            </p>
            <p className="text-[10px] text-zinc-400">Échecs</p>
          </div>
        </div>
      </div>

      {/* Per-Agent breakdown */}
      {topAgents.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Par agent</p>
          {topAgents.map(agent => {
            const agentDef = getAgent(agent.agentId);
            return (
              <div key={agent.agentId} className="flex items-center gap-3 text-xs">
                <span className="w-5 text-center">{agentDef?.emoji ?? '🤖'}</span>
                <span className="text-zinc-300 w-20 truncate">{agentDef?.name ?? agent.agentId}</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fuchsia-500 rounded-full transition-all"
                    style={{ width: `${agent.successRate}%` }}
                  />
                </div>
                <span className="text-zinc-400 w-8 text-right">{agent.totalExecutions}</span>
                <span className={`w-10 text-right ${agent.successRate >= 80 ? 'text-emerald-400' : agent.successRate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {agent.successRate}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
