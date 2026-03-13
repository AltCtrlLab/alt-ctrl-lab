'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Zap,
  Target,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
} from 'lucide-react';

interface HourlyStat {
  hour: string;
  count: number;
  avgExecutionTime: number;
  successRate: number;
}

interface AgentActivity {
  id: string;
  agentId: string;
  agentName: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  executionTimeMs?: number;
  tokensInput?: number;
  tokensOutput?: number;
  qaResult?: string;
  startedAt: string | Date;
}

interface AgentMetrics {
  agentId: string;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  qaRejections: number;
  totalTokensIn: number;
  totalTokensOut: number;
  avgExecutionTimeMs: number;
  successRate: number;
}

interface TeamMetric {
  agentId: string;
  agentName: string;
  tokensIn: number;
  tokensOut: number;
  taskCount: number;
  successRate: number;
  avgExecutionTime: number;
}

interface AgentPerformanceProps {
  isDark: boolean;
  agentId: string;
}

const getTheme = (isDark: boolean) => ({
  glass: isDark
    ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50'
    : 'bg-white border-neutral-200',
  textMuted: isDark ? 'text-neutral-400' : 'text-neutral-500',
  textMain: isDark ? 'text-neutral-200' : 'text-neutral-800',
  textHeading: isDark ? 'text-neutral-100' : 'text-neutral-900',
  borderLight: isDark ? 'border-white/[0.05]' : 'border-neutral-200/60',
  cardBg: isDark ? 'bg-black/20' : 'bg-white/50',
});

const AGENT_NAMES: Record<string, string> = {
  abdulhakim: 'Abdul Hakim',
  musawwir: 'Al-Musawwir',
  matin: 'Al-Matin',
  fatah: 'Al-Fatah',
  hasib: 'Al-Hasib',
  raqim: 'Ar-Raqim',
  banna: 'Al-Banna',
  khatib: 'Al-Khatib',
  sani: 'As-Sani',
};

export function AgentPerformance({ isDark, agentId }: AgentPerformanceProps) {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const t = getTheme(isDark);

  const agentName = AGENT_NAMES[agentId] || agentId;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Récupère les données de l'agent
        const resAgent = await fetch(
          `/api/agents/activity?agent_id=${agentId}&timeframe=30d`
        );
        const dataAgent = await resAgent.json();

        if (dataAgent.success && dataAgent.data) {
          setMetrics(dataAgent.data.metrics);
          setHourlyStats(dataAgent.data.hourlyStats || []);
        }

        // Récupère les métriques de l'équipe pour comparaison
        const resTeam = await fetch('/api/analytics/tokens');
        const dataTeam = await resTeam.json();

        if (dataTeam.success && dataTeam.data?.agentMetrics) {
          setTeamMetrics(dataTeam.data.agentMetrics);
        }
      } catch (err) {
        console.error('[AgentPerformance] Erreur de chargement:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Rafraîchissement toutes les 30 secondes
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [agentId]);

  // Calcul des moyennes d'équipe
  const teamAverage = useMemo(() => {
    if (teamMetrics.length === 0) return null;

    const totalTokens = teamMetrics.reduce(
      (sum, m) => sum + m.tokensIn + m.tokensOut,
      0
    );
    const avgTokens = totalTokens / teamMetrics.length;

    const avgSuccessRate =
      teamMetrics.reduce((sum, m) => sum + m.successRate, 0) /
      teamMetrics.length;

    const avgExecTime =
      teamMetrics.reduce((sum, m) => sum + m.avgExecutionTime, 0) /
      teamMetrics.length;

    return {
      avgTokens,
      avgSuccessRate,
      avgExecTime,
    };
  }, [teamMetrics]);

  // Token efficiency: tokensOut / tokensIn ratio
  const tokenEfficiency = useMemo(() => {
    if (!metrics || metrics.totalTokensIn === 0) return 0;
    return metrics.totalTokensOut / metrics.totalTokensIn;
  }, [metrics]);

  // QA rejection rate
  const qaRejectionRate = useMemo(() => {
    if (!metrics || metrics.totalTasks === 0) return 0;
    return (metrics.qaRejections / metrics.totalTasks) * 100;
  }, [metrics]);

  // Comparaison avec moyenne équipe
  const comparison = useMemo(() => {
    if (!metrics || !teamAverage) return null;

    const agentTokens = metrics.totalTokensIn + metrics.totalTokensOut;
    const tokensDiff =
      ((agentTokens - teamAverage.avgTokens) / teamAverage.avgTokens) * 100;

    const successDiff =
      ((metrics.successRate - teamAverage.avgSuccessRate) /
        teamAverage.avgSuccessRate) *
      100;

    const execTimeDiff =
      ((metrics.avgExecutionTimeMs - teamAverage.avgExecTime) /
        teamAverage.avgExecTime) *
      100;

    return {
      tokensDiff,
      successDiff,
      execTimeDiff,
    };
  }, [metrics, teamAverage]);

  if (loading) {
    return (
      <div
        className={`h-full flex items-center justify-center ${t.glass} backdrop-blur-xl rounded-2xl border`}
      >
        <Loader2 size={32} className={`${t.textMuted} animate-spin`} />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div
        className={`h-full flex flex-col items-center justify-center ${t.glass} backdrop-blur-xl rounded-2xl border p-8`}
      >
        <Activity size={48} className={`${t.textMuted} mb-4 opacity-40`} />
        <p className={`${t.textMain} text-sm`}>Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div
      className={`h-full overflow-y-auto ${t.glass} backdrop-blur-xl rounded-2xl border p-6`}
    >
      {/* En-tête */}
      <div className="mb-6">
        <h2
          className={`${t.textHeading} text-2xl font-bold tracking-tight flex items-center gap-3`}
        >
          <Activity className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          {agentName}
        </h2>
        <p className={`${t.textMuted} text-sm mt-1`}>
          Analyse de performance approfondie — 30 derniers jours
        </p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-4`}
        >
          <div className={`flex items-center gap-2 mb-2 ${t.textMuted} text-xs`}>
            <Target size={14} />
            Taux de Succès
          </div>
          <p className={`${t.textHeading} text-2xl font-bold tracking-tight`}>
            {metrics.successRate.toFixed(1)}%
          </p>
          {comparison && (
            <div
              className={`flex items-center gap-1 text-xs mt-1 ${
                comparison.successDiff >= 0
                  ? isDark
                    ? 'text-emerald-400'
                    : 'text-emerald-600'
                  : isDark
                  ? 'text-red-400'
                  : 'text-red-600'
              }`}
            >
              {comparison.successDiff >= 0 ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              {Math.abs(comparison.successDiff).toFixed(1)}% vs équipe
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-4`}
        >
          <div className={`flex items-center gap-2 mb-2 ${t.textMuted} text-xs`}>
            <Zap size={14} />
            Efficacité Tokens
          </div>
          <p className={`${t.textHeading} text-2xl font-bold tracking-tight`}>
            {tokenEfficiency.toFixed(2)}x
          </p>
          <p className={`${t.textMuted} text-xs mt-1`}>Out / In ratio</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-4`}
        >
          <div className={`flex items-center gap-2 mb-2 ${t.textMuted} text-xs`}>
            <XCircle size={14} />
            Rejets QA
          </div>
          <p className={`${t.textHeading} text-2xl font-bold tracking-tight`}>
            {qaRejectionRate.toFixed(1)}%
          </p>
          <p className={`${t.textMuted} text-xs mt-1`}>
            {metrics.qaRejections} / {metrics.totalTasks} tâches
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-4`}
        >
          <div className={`flex items-center gap-2 mb-2 ${t.textMuted} text-xs`}>
            <Clock size={14} />
            Temps Moyen
          </div>
          <p className={`${t.textHeading} text-2xl font-bold tracking-tight`}>
            {(metrics.avgExecutionTimeMs / 1000).toFixed(1)}s
          </p>
          {comparison && (
            <div
              className={`flex items-center gap-1 text-xs mt-1 ${
                comparison.execTimeDiff <= 0
                  ? isDark
                    ? 'text-emerald-400'
                    : 'text-emerald-600'
                  : isDark
                  ? 'text-red-400'
                  : 'text-red-600'
              }`}
            >
              {comparison.execTimeDiff <= 0 ? (
                <TrendingDown size={12} />
              ) : (
                <TrendingUp size={12} />
              )}
              {Math.abs(comparison.execTimeDiff).toFixed(1)}% vs équipe
            </div>
          )}
        </motion.div>
      </div>

      {/* Graphique: Taux de succès dans le temps */}
      <div className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-5 mb-6`}>
        <h3 className={`${t.textHeading} text-sm font-semibold mb-4 flex items-center gap-2`}>
          <BarChart3 size={16} />
          Évolution du Taux de Succès
        </h3>

        {hourlyStats.length === 0 ? (
          <div className={`text-center py-8 ${t.textMuted}`}>
            <p className="text-sm">Données insuffisantes pour tracer le graphique</p>
          </div>
        ) : (
          <div className="relative h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              {/* Grille de fond */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                  strokeWidth="0.2"
                />
              ))}

              {/* Ligne de succès */}
              <polyline
                points={hourlyStats
                  .slice(-20)
                  .map((stat, idx, arr) => {
                    const x = (idx / (arr.length - 1)) * 100;
                    const y = 100 - stat.successRate;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke={isDark ? '#60a5fa' : '#3b82f6'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {hourlyStats.slice(-20).map((stat, idx, arr) => {
                const x = (idx / (arr.length - 1)) * 100;
                const y = 100 - stat.successRate;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="1.5"
                    fill={isDark ? '#60a5fa' : '#3b82f6'}
                  />
                );
              })}
            </svg>

            {/* Labels Y */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs font-mono pointer-events-none">
              {['100%', '75%', '50%', '25%', '0%'].map((label) => (
                <span key={label} className={t.textMuted}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comparaison avec l'équipe */}
      {teamAverage && comparison && (
        <div className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-5`}>
          <h3 className={`${t.textHeading} text-sm font-semibold mb-4`}>
            Comparaison avec la Moyenne de l'Équipe
          </h3>

          <div className="space-y-4">
            {/* Tokens */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`${t.textMain} text-sm`}>Consommation Tokens</span>
                <span className={`${t.textMuted} text-xs font-mono`}>
                  {((metrics.totalTokensIn + metrics.totalTokensOut) / 1000).toFixed(1)}K vs{' '}
                  {(teamAverage.avgTokens / 1000).toFixed(1)}K
                </span>
              </div>
              <div
                className={`h-2 rounded-full ${
                  isDark ? 'bg-white/[0.06]' : 'bg-neutral-100'
                } overflow-hidden`}
              >
                <div
                  className={`h-full rounded-full ${
                    comparison.tokensDiff >= 0
                      ? isDark
                        ? 'bg-blue-500'
                        : 'bg-blue-600'
                      : isDark
                      ? 'bg-emerald-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      ((metrics.totalTokensIn + metrics.totalTokensOut) /
                        teamAverage.avgTokens) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Succès */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`${t.textMain} text-sm`}>Taux de Succès</span>
                <span className={`${t.textMuted} text-xs font-mono`}>
                  {metrics.successRate.toFixed(1)}% vs {teamAverage.avgSuccessRate.toFixed(1)}%
                </span>
              </div>
              <div
                className={`h-2 rounded-full ${
                  isDark ? 'bg-white/[0.06]' : 'bg-neutral-100'
                } overflow-hidden`}
              >
                <div
                  className={`h-full rounded-full ${
                    comparison.successDiff >= 0
                      ? isDark
                        ? 'bg-emerald-500'
                        : 'bg-emerald-600'
                      : isDark
                      ? 'bg-red-500'
                      : 'bg-red-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (metrics.successRate / teamAverage.avgSuccessRate) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Temps d'exécution */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`${t.textMain} text-sm`}>Temps d'Exécution</span>
                <span className={`${t.textMuted} text-xs font-mono`}>
                  {(metrics.avgExecutionTimeMs / 1000).toFixed(1)}s vs{' '}
                  {(teamAverage.avgExecTime / 1000).toFixed(1)}s
                </span>
              </div>
              <div
                className={`h-2 rounded-full ${
                  isDark ? 'bg-white/[0.06]' : 'bg-neutral-100'
                } overflow-hidden`}
              >
                <div
                  className={`h-full rounded-full ${
                    comparison.execTimeDiff <= 0
                      ? isDark
                        ? 'bg-emerald-500'
                        : 'bg-emerald-600'
                      : isDark
                      ? 'bg-amber-500'
                      : 'bg-amber-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (metrics.avgExecutionTimeMs / teamAverage.avgExecTime) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
