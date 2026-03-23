'use client';

import { useState, useEffect } from 'react';
import { Bot, Activity, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';
import { getAgent } from '@/lib/constants/agents';
import Link from 'next/link';

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
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 animate-pulse">
        <div className="h-4 w-48 bg-zinc-800 rounded" />
      </div>
    );
  }

  if (!data || data.summary.totalExecutions === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <Bot className="w-4 h-4 text-fuchsia-400" />
          <span className="text-sm">Aucune exécution IA dans les dernières 24h</span>
        </div>
      </div>
    );
  }

  const { summary, byAgent } = data;
  const activeAgents = byAgent.length;
  const mostActive = summary.mostActiveAgent ? getAgent(summary.mostActiveAgent) : null;

  return (
    <Link href="/pil">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 group cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-4 h-4 text-fuchsia-400" />
            <span className="text-sm font-semibold text-zinc-200">Monitoring IA</span>
            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">24h</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="text-zinc-200 font-medium">{summary.totalExecutions}</span>
            <span>exécutions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-200 font-medium">{summary.successRate}%</span>
            <span>succès</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-zinc-200 font-medium">{formatDuration(summary.avgDurationMs)}</span>
            <span>moy.</span>
          </div>
          {summary.totalFailed > 0 && (
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400 font-medium">{summary.totalFailed}</span>
              <span>échecs</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span>{activeAgents} agents actifs</span>
            {mostActive && (
              <span className="text-fuchsia-400">{mostActive.emoji} {mostActive.name}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
