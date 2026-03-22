'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Clock, CheckCircle, XCircle, 
  Users, Cpu, TrendingUp, Calendar, Filter,
  ChevronDown, ChevronUp, Zap, BarChart3
} from 'lucide-react';
import { useAgentActivity } from '@/hooks/useAgentActivity';

interface AgentActivityPanelProps {
  isDark: boolean;
  agentId?: string; // Si undefined = vue tous agents
}

const getTheme = (isDark: boolean) => ({
  glass: isDark 
    ? 'bg-white/[0.03] border-white/[0.08]' 
    : 'bg-white/60 border-white/40',
  textMuted: isDark ? 'text-neutral-400' : 'text-neutral-500',
  textMain: isDark ? 'text-neutral-200' : 'text-neutral-800',
  textHeading: isDark ? 'text-neutral-100' : 'text-neutral-900',
  borderLight: isDark ? 'border-white/[0.05]' : 'border-neutral-200/60',
});

const activityTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  DIRECT_EXECUTION: { icon: Cpu, label: 'Exécution Directe', color: 'text-cyan-400' },
  SWARM_LEADER: { icon: Users, label: 'Lead Essaim', color: 'text-fuchsia-400' },
  MICRO_WORKER: { icon: Zap, label: 'Micro-Worker', color: 'text-yellow-400' },
  QA_VALIDATION: { icon: CheckCircle, label: 'QA Validation', color: 'text-emerald-400' },
  QA_REJECTION: { icon: XCircle, label: 'QA Rejet', color: 'text-rose-400' },
  DIRECTOR_TAKEOVER: { icon: Activity, label: 'Takeover Directeur', color: 'text-fuchsia-400' },
};

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({ isDark, agentId }) => {
  const t = getTheme(isDark);
  const { activities, metrics, loading, hasMore, loadMore, timeframe, setTimeframe } = useAgentActivity(agentId);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  const formatDuration = (ms?: number) => {
    if (!ms) return '--';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const formatTokens = (n?: number) => {
    if (!n) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header avec Stats */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${t.glass} backdrop-blur-xl rounded-2xl border p-4`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${t.textHeading} font-semibold flex items-center gap-2`}>
            <BarChart3 className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
            {agentId ? `Activité: ${agentId}` : 'Activité Globale'}
          </h2>
          
          <div className="flex gap-2">
            {(['1h', '24h', '7d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  timeframe === tf
                    ? (isDark ? 'bg-white/10 text-white' : 'bg-cyan-100 text-cyan-700')
                    : t.textMuted
                }`}
              >
                {tf === '1h' ? '1H' : tf === '24h' ? '24H' : tf === '7d' ? '7J' : '30J'}
              </button>
            ))}
          </div>
        </div>

        {metrics && (
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Tâches"
              value={metrics.totalTasks}
              subValue={`${metrics.successRate.toFixed(1)}% succès`}
              icon={CheckCircle}
              color="emerald"
              isDark={isDark}
            />
            <StatCard
              label="Tokens"
              value={formatTokens(metrics.totalTokensOut)}
              subValue="générés"
              icon={Zap}
              color="yellow"
              isDark={isDark}
            />
            <StatCard
              label="Temps Moyen"
              value={formatDuration(metrics.avgExecutionTimeMs)}
              subValue="par tâche"
              icon={Clock}
              color="blue"
              isDark={isDark}
            />
            <StatCard
              label="Essaims"
              value={metrics.totalSwarmsLed}
              subValue="dirigés"
              icon={Users}
              color="purple"
              isDark={isDark}
            />
          </div>
        )}
      </motion.div>

      {/* Liste des Activités */}
      <div className={`flex-1 ${t.glass} backdrop-blur-xl rounded-2xl border overflow-hidden flex flex-col`}>
        <div className={`p-3 border-b ${t.borderLight} flex items-center justify-between`}>
          <span className={`${t.textMuted} text-xs font-mono uppercase`}>Journal d'Activité</span>
          <span className={`${t.textMuted} text-xs`}>{activities.length} entrées</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {activities.map((activity, idx) => {
              const config = activityTypeConfig[activity.activityType];
              const Icon = config?.icon || Activity;
              const isExpanded = expandedActivity === activity.id;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 border-b ${t.borderLight} cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-white/40'
                  }`}
                  onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white'} border ${t.borderLight}`}>
                      <Icon size={16} className={config?.color || 'text-neutral-400'} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${t.textMain}`}>{config?.label || activity.activityType}</span>
                          {activity.isSwarm && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-fuchsia-500/20 text-fuchsia-400">
                              {activity.swarmSize} workers
                            </span>
                          )}
                        </div>
                        <span className={`${t.textMuted} text-xs`}>
                          {new Date(activity.startedAt).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                      
                      <p className={`${t.textMuted} text-sm mt-1 truncate`}>
                        {activity.prompt.substring(0, 100)}...
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className={t.textMuted}>
                          ⏱️ {formatDuration(activity.executionTimeMs)}
                        </span>
                        <span className={t.textMuted}>
                          📝 {formatTokens(activity.resultSize)} chars
                        </span>
                        {activity.qaResult && (
                          <span className={activity.qaResult === 'VALIDATED' ? 'text-emerald-400' : 'text-rose-400'}>
                            {activity.qaResult === 'VALIDATED' ? '✓ VALIDÉ' : '✗ REJETÉ'}
                          </span>
                        )}
                      </div>

                      {/* Détail expandé */}
                      <AnimatePresence>
                        {isExpanded && activity.result && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 p-3 rounded-lg bg-black/20 font-mono text-xs overflow-hidden"
                          >
                            <pre className="whitespace-pre-wrap break-all">{activity.result.substring(0, 500)}
                              {activity.result.length > 500 && '...'}
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <div>
                      {isExpanded ? <ChevronUp size={16} className={t.textMuted} /> : <ChevronDown size={16} className={t.textMuted} />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {loading && (
            <div className="p-4 text-center">
              <div className="animate-spin h-5 w-5 border-2 border-fuchsia-500 border-t-transparent rounded-full mx-auto" />
            </div>
          )}

          {hasMore && !loading && (
            <button
              onClick={loadMore}
              className={`w-full p-3 text-sm ${t.textMuted} hover:${t.textMain} transition-colors border-t ${t.borderLight}`}
            >
              Charger plus...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subValue, icon: Icon, color, isDark }: any) => {
  const colors: Record<string, string> = {
    emerald: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-100',
    yellow: isDark ? 'text-yellow-400 bg-yellow-500/10' : 'text-yellow-600 bg-yellow-100',
    blue: isDark ? 'text-cyan-400 bg-cyan-500/10' : 'text-cyan-600 bg-cyan-100',
    purple: isDark ? 'text-fuchsia-400 bg-fuchsia-500/10' : 'text-fuchsia-600 bg-fuchsia-100',
  };

  return (
    <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-white/50'} border ${isDark ? 'border-white/5' : 'border-neutral-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${colors[color]}`}>
          <Icon size={14} />
        </div>
        <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{subValue}</div>
    </div>
  );
};

export default AgentActivityPanel;
