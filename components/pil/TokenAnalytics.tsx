'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, DollarSign, Cpu } from 'lucide-react';

interface AgentMetric {
  agentId: string;
  agentName: string;
  tokensIn: number;
  tokensOut: number;
  taskCount: number;
}

interface TokenAnalyticsProps {
  isDark: boolean;
}

export function TokenAnalytics({ isDark }: TokenAnalyticsProps) {
  const [metrics, setMetrics] = useState<AgentMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/tokens')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.agentMetrics) {
          setMetrics(data.data.agentMetrics);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalIn = useMemo(() => metrics.reduce((s, m) => s + m.tokensIn, 0), [metrics]);
  const totalOut = useMemo(() => metrics.reduce((s, m) => s + m.tokensOut, 0), [metrics]);
  const total = totalIn + totalOut;
  const maxTokens = useMemo(() => Math.max(...metrics.map(m => m.tokensIn + m.tokensOut), 1), [metrics]);

  const estimatedCost = (total / 1_000_000 * 3).toFixed(2); // rough $3/1M tokens

  const textH = isDark ? 'text-white' : 'text-neutral-900';
  const textM = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const glass = isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-neutral-200';

  const agentColors = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#a78bfa', '#fb923c', '#4ade80', '#f472b6'];

  return (
    <div className="h-full flex flex-col p-1">
      <h1 className={`text-2xl font-bold mb-4 ${textH}`}>Analytique Tokens</h1>
      <p className={`text-sm mb-4 ${textM}`}>Consommation de tokens par agent — 7 derniers jours</p>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { icon: Cpu, label: 'Tokens Entrants', value: (totalIn / 1000).toFixed(1) + 'K', color: 'text-cyan-400' },
          { icon: TrendingUp, label: 'Tokens Sortants', value: (totalOut / 1000).toFixed(1) + 'K', color: 'text-emerald-400' },
          { icon: BarChart3, label: 'Total', value: (total / 1000).toFixed(1) + 'K', color: 'text-fuchsia-400' },
          { icon: DollarSign, label: 'Coût Estimé', value: '$' + estimatedCost, color: 'text-amber-400' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border ${glass} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} className={kpi.color} />
              <span className={`text-xs ${textM}`}>{kpi.label}</span>
            </div>
            <p className={`text-xl font-bold ${textH}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className={`flex-1 rounded-2xl border ${glass} p-5 overflow-y-auto`}>
        {loading ? (
          <div className={`text-center py-12 ${textM}`}>Chargement des métriques...</div>
        ) : metrics.length === 0 ? (
          <div className={`text-center py-12 ${textM}`}>
            <BarChart3 size={32} className="mx-auto mb-3 opacity-40" />
            <p>Aucune donnée de tokens disponible</p>
            <p className="text-xs mt-1">Lancez des briefs pour générer des métriques</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className={`text-sm font-semibold ${textH}`}>Consommation par Agent</h3>
            {metrics.map((m, i) => {
              const agentTotal = m.tokensIn + m.tokensOut;
              const pct = (agentTotal / maxTokens) * 100;
              const color = agentColors[i % agentColors.length];
              return (
                <div key={m.agentId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${textH}`}>{m.agentName}</span>
                    <span className={`text-xs font-mono ${textM}`}>{(agentTotal / 1000).toFixed(1)}K</span>
                  </div>
                  <div className={`h-3 rounded-full ${isDark ? 'bg-white/[0.06]' : 'bg-neutral-100'} overflow-hidden`}>
                    <div className="h-full rounded-full flex">
                      <div style={{ width: `${(m.tokensIn / maxTokens) * 100}%`, backgroundColor: color, opacity: 0.7 }} className="h-full" />
                      <div style={{ width: `${(m.tokensOut / maxTokens) * 100}%`, backgroundColor: color }} className="h-full" />
                    </div>
                  </div>
                  <div className="flex gap-3 text-[10px]">
                    <span className={textM}>In: {(m.tokensIn / 1000).toFixed(1)}K</span>
                    <span className={textM}>Out: {(m.tokensOut / 1000).toFixed(1)}K</span>
                    <span className={textM}>{m.taskCount} tâches</span>
                  </div>
                </div>
              );
            })}

            {/* Pie chart */}
            <h3 className={`text-sm font-semibold mt-6 ${textH}`}>Répartition</h3>
            <div className="flex items-center gap-6">
              <svg viewBox="0 0 100 100" className="w-32 h-32">
                {(() => {
                  let offset = 0;
                  return metrics.map((m, i) => {
                    const pct = total > 0 ? ((m.tokensIn + m.tokensOut) / total) * 100 : 0;
                    const slice = (
                      <circle
                        key={m.agentId}
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke={agentColors[i % agentColors.length]}
                        strokeWidth="18"
                        strokeDasharray={`${pct * 2.51} ${251 - pct * 2.51}`}
                        strokeDashoffset={-offset * 2.51}
                        opacity={0.8}
                      />
                    );
                    offset += pct;
                    return slice;
                  });
                })()}
              </svg>
              <div className="space-y-1.5">
                {metrics.map((m, i) => (
                  <div key={m.agentId} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: agentColors[i % agentColors.length] }} />
                    <span className={`text-xs ${textM}`}>{m.agentName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
