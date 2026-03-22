'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Clock,
  GitBranch,
  Activity,
  Loader2,
} from 'lucide-react';

interface ActivityRecord {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  taskId: string;
  activityType: string;
  prompt: string;
  result?: string;
  resultSize?: number;
  tokensInput?: number;
  tokensOutput?: number;
  executionTimeMs?: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  qaResult?: string;
  isSwarm?: boolean;
  swarmSize?: number;
  startedAt: string | Date;
  completedAt?: string | Date;
}

interface AgentTimelineProps {
  isDark: boolean;
  agentId?: string;
}

const getTheme = (isDark: boolean) => ({
  glass: isDark
    ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50'
    : 'bg-white border-neutral-200',
  textMuted: isDark ? 'text-neutral-400' : 'text-neutral-500',
  textMain: isDark ? 'text-neutral-200' : 'text-neutral-800',
  textHeading: isDark ? 'text-neutral-100' : 'text-neutral-900',
  borderLight: isDark ? 'border-white/[0.05]' : 'border-neutral-200/60',
});

const getStatusConfig = (status: string, qaResult?: string, isDark?: boolean) => {
  if (qaResult === 'REJECTED') {
    return {
      icon: AlertTriangle,
      color: isDark ? 'text-amber-400' : 'text-amber-600',
      bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      border: isDark ? 'border-amber-500/30' : 'border-amber-200',
      label: 'QA Rejeté',
    };
  }

  switch (status) {
    case 'SUCCESS':
      return {
        icon: CheckCircle2,
        color: isDark ? 'text-emerald-400' : 'text-emerald-600',
        bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
        border: isDark ? 'border-emerald-500/30' : 'border-emerald-200',
        label: 'Succès',
      };
    case 'FAILED':
      return {
        icon: XCircle,
        color: isDark ? 'text-red-400' : 'text-red-600',
        bg: isDark ? 'bg-red-500/10' : 'bg-red-50',
        border: isDark ? 'border-red-500/30' : 'border-red-200',
        label: 'Échec',
      };
    default:
      return {
        icon: Activity,
        color: isDark ? 'text-cyan-400' : 'text-cyan-600',
        bg: isDark ? 'bg-cyan-500/10' : 'bg-cyan-50',
        border: isDark ? 'border-cyan-500/30' : 'border-cyan-200',
        label: 'En cours',
      };
  }
};

export function AgentTimeline({ isDark, agentId }: AgentTimelineProps) {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const t = getTheme(isDark);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const url = agentId
          ? `/api/agents/activity?agent_id=${agentId}&limit=30`
          : `/api/agents/activity?limit=30`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.data?.activities) {
          setActivities(data.data.activities);
        }
      } catch (err) {
        console.error('[AgentTimeline] Erreur de chargement:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Rafraîchissement toutes les 5 secondes
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, [agentId]);

  const formatTimestamp = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const formatTokens = (tokens?: number) => {
    if (!tokens) return '0';
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  if (loading) {
    return (
      <div
        className={`h-full flex items-center justify-center ${t.glass} backdrop-blur-xl rounded-2xl border`}
      >
        <Loader2 size={32} className={`${t.textMuted} animate-spin`} />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div
        className={`h-full flex flex-col items-center justify-center ${t.glass} backdrop-blur-xl rounded-2xl border p-8`}
      >
        <Activity size={48} className={`${t.textMuted} mb-4 opacity-40`} />
        <p className={`${t.textMain} text-sm`}>Aucune activité récente</p>
        <p className={`${t.textMuted} text-xs mt-1`}>
          Les actions des agents apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div
      className={`h-full overflow-y-auto ${t.glass} backdrop-blur-xl rounded-2xl border p-6`}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`${t.textHeading} text-xl font-semibold tracking-tight`}>
            Chronologie d'activité
          </h2>
          <p className={`${t.textMuted} text-xs mt-1`}>
            {agentId ? `Agent: ${agentId}` : 'Tous les agents'} — Dernières 30 actions
          </p>
        </div>
        <div className={`flex items-center gap-2 ${t.textMuted} text-xs`}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Temps réel
        </div>
      </div>

      {/* Timeline verticale */}
      <div className="relative">
        {/* Ligne verticale */}
        <div
          className={`absolute left-[19px] top-0 bottom-0 w-[2px] ${
            isDark ? 'bg-white/[0.08]' : 'bg-neutral-200'
          }`}
        />

        <div className="space-y-6">
          {activities.map((activity, idx) => {
            const statusConfig = getStatusConfig(
              activity.status,
              activity.qaResult,
              isDark
            );
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="relative flex gap-4"
              >
                {/* Icône de statut */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${statusConfig.bg} ${statusConfig.border} z-10`}
                >
                  <StatusIcon size={18} className={statusConfig.color} />
                </div>

                {/* Contenu de l'activité */}
                <div
                  className={`flex-1 ${t.glass} backdrop-blur-xl rounded-xl border p-4 ${
                    isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-white'
                  } transition-colors`}
                >
                  {/* En-tête */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`${t.textHeading} font-medium text-sm`}>
                          {activity.agentName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                        {activity.isSwarm && (
                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                              isDark
                                ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30'
                                : 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200'
                            } border`}
                          >
                            <GitBranch size={10} />
                            Swarm {activity.swarmSize ? `(${activity.swarmSize})` : ''}
                          </div>
                        )}
                      </div>
                      <span className={`${t.textMuted} text-xs font-mono`}>
                        {activity.agentRole} • {activity.activityType}
                      </span>
                    </div>
                    <div className={`${t.textMuted} text-xs font-mono flex items-center gap-1`}>
                      <Clock size={12} />
                      {formatTimestamp(activity.startedAt)}
                    </div>
                  </div>

                  {/* Prompt */}
                  <p className={`${t.textMain} text-sm leading-relaxed mb-3`}>
                    {activity.prompt.length > 150
                      ? activity.prompt.substring(0, 150) + '...'
                      : activity.prompt}
                  </p>

                  {/* Métriques */}
                  <div className="flex items-center gap-4 text-xs">
                    {activity.executionTimeMs !== undefined && (
                      <div
                        className={`flex items-center gap-1.5 ${t.textMuted} font-mono`}
                      >
                        <Zap size={12} className={isDark ? 'text-yellow-400' : 'text-yellow-600'} />
                        {formatDuration(activity.executionTimeMs)}
                      </div>
                    )}
                    {activity.tokensInput !== undefined && (
                      <div className={`${t.textMuted} font-mono`}>
                        Tokens: {formatTokens(activity.tokensInput + (activity.tokensOutput || 0))}
                      </div>
                    )}
                    {activity.resultSize !== undefined && (
                      <div className={`${t.textMuted} font-mono`}>
                        Résultat: {(activity.resultSize / 1024).toFixed(1)} KB
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
