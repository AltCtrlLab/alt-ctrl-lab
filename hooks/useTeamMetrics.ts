'use client';

import { useState, useEffect } from 'react';

interface AgentRealMetrics {
  agentId: string;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  qaRejections: number;
  totalTokensIn: number;
  totalTokensOut: number;
  avgExecutionTimeMs: number;
  successRate: number;
  totalSwarmsLed: number;
}

export interface RosterAgent {
  id: string;
  name: string;
  role: string;
  bio: string;
  icon: string;
  level: number;
  xpProgress: number;
  successRate: number;
  tokens: string;
  perks: string[];
  isCEO: boolean;
  color: string;
  shadow: string;
  totalTasks: number;
  qaRejections: number;
}

export function useTeamMetrics(agents: { id: string; name: string; role: string; emoji: string; type: string; director?: string }[]): RosterAgent[] {
  const [metrics, setMetrics] = useState<Record<string, AgentRealMetrics>>({});

  useEffect(() => {
    if (agents.length === 0) return;

    const fetchAll = async () => {
      try {
        const res = await fetch('/api/analytics/tokens');
        const data = await res.json();
        if (data.success && data.data?.agentMetrics) {
          const map: Record<string, AgentRealMetrics> = {};
          for (const m of data.data.agentMetrics) {
            map[m.agentId] = {
              agentId: m.agentId,
              totalTasks: m.taskCount,
              successfulTasks: Math.round(m.taskCount * (m.successRate / 100)),
              failedTasks: m.taskCount - Math.round(m.taskCount * (m.successRate / 100)),
              qaRejections: 0,
              totalTokensIn: m.tokensIn,
              totalTokensOut: m.tokensOut,
              avgExecutionTimeMs: m.avgExecutionTime,
              successRate: m.successRate,
              totalSwarmsLed: 0,
            };
          }
          setMetrics(map);
        }
      } catch { /* silencieux */ }
    };

    fetchAll();
    const iv = setInterval(fetchAll, 30_000);
    return () => clearInterval(iv);
  }, [agents.length]);

  return agents.map(agent => {
    const m = metrics[agent.id];
    const totalTasks = m?.totalTasks || 0;
    const level = Math.min(99, Math.floor(totalTasks / 5) + (agent.type === 'director' ? 10 : 1));
    const nextLevel = (level + 1) * 5;
    const xpProgress = totalTasks > 0 ? Math.min(100, Math.floor((totalTasks % (nextLevel - level * 5)) / ((nextLevel - level * 5) || 1) * 100)) : 0;
    const totalTokens = (m?.totalTokensIn || 0) + (m?.totalTokensOut || 0);
    const tokensStr = totalTokens >= 1_000_000 ? (totalTokens / 1_000_000).toFixed(1) + 'M' : totalTokens >= 1_000 ? (totalTokens / 1_000).toFixed(1) + 'K' : totalTokens.toString();

    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      bio: agent.type === 'director'
        ? `Directeur ${agent.role.split('(')[1]?.replace(')', '') || 'Senior'}`
        : `Exécutant sous la supervision de ${agent.director || 'CEO'}`,
      icon: agent.emoji,
      level,
      xpProgress,
      successRate: m?.successRate || 0,
      tokens: tokensStr,
      perks: agent.type === 'director' ? ['Vision Stratégique', 'Lead Équipe'] : ['Exécution Rapide', 'Qualité Code'],
      isCEO: agent.id === 'abdulhakim',
      color: agent.type === 'director'
        ? (agent.id === 'abdulhakim' ? 'text-yellow-500' : 'text-blue-500')
        : 'text-emerald-500',
      shadow: agent.type === 'director'
        ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]'
        : 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      totalTasks,
      qaRejections: m?.qaRejections || 0,
    };
  });
}
