'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Zap, Target, Users, TrendingUp, TrendingDown } from 'lucide-react';

interface MissionControlProps {
  isDark: boolean;
  stats: {
    totalTokens: number;
    completedTasks: number;
    runningTasks: number;
    failedTasks: number;
    qaRate: string;
  };
  agents: {
    id: string;
    name: string;
    role: string;
    type: string;
  }[];
  isConnected: boolean;
}

interface Snapshot {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalTokens: number;
  successRate: number;
  activeAgents: number;
  createdAt: string;
}

const MissionControl: React.FC<MissionControlProps> = ({
  isDark,
  stats,
  agents,
  isConnected,
}) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  useEffect(() => {
    fetch('/api/metrics/history?days=7')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.snapshots) {
          setSnapshots(data.data.snapshots.reverse()); // chronologique
        }
      })
      .catch(() => {});
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  // Sparkline depuis les vrais snapshots
  const sparklineFromSnapshots = (field: keyof Snapshot): number[] => {
    if (snapshots.length === 0) return [0, 0, 0];
    return snapshots.slice(-12).map(s => Number(s[field]) || 0);
  };

  const generateSparklinePath = (data: number[]): string => {
    if (data.length < 2) return '';
    const width = 120, height = 40;
    const max = Math.max(...data), min = Math.min(...data);
    const range = max - min || 1;
    return data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
  };

  // Calcul growth % réel
  const calcGrowth = (field: keyof Snapshot): string => {
    if (snapshots.length < 2) return '--';
    const recent = snapshots.slice(-3);
    const older = snapshots.slice(0, 3);
    const avgRecent = recent.reduce((s, snap) => s + Number(snap[field]), 0) / recent.length;
    const avgOlder = older.reduce((s, snap) => s + Number(snap[field]), 0) / older.length;
    if (avgOlder === 0) return '+0%';
    const pct = ((avgRecent - avgOlder) / avgOlder * 100).toFixed(0);
    return Number(pct) >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const successRate = parseFloat(stats.qaRate) || 0;
  const gaugeRadius = 28;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeProgress = (successRate / 100) * gaugeCircumference;

  const glass = isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white/60 border-neutral-200';
  const textH = isDark ? 'text-white' : 'text-neutral-900';
  const textM = isDark ? 'text-white/40' : 'text-neutral-500';

  const tokensGrowth = calcGrowth('totalTokens');
  const isTokensUp = tokensGrowth.startsWith('+');

  return (
    <div className="w-full space-y-6">
      <h1 className={`text-2xl font-bold ${textH}`}>Centre de Briefs</h1>
      <p className={`text-sm ${textM}`}>Tableau de bord temps réel de l'agence</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tâches Complétées */}
        <div className={`rounded-2xl backdrop-blur border ${glass} p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider ${textM}`}>Tâches Complétées</span>
            <Activity className={`w-4 h-4 ${textM}`} />
          </div>
          <div className={`text-3xl font-bold ${textH}`}>{stats.completedTasks.toLocaleString()}</div>
          <div className="flex items-end justify-center h-10">
            <svg width="120" height="40" viewBox="0 0 120 40" className="w-full" preserveAspectRatio="none">
              <polyline points={generateSparklinePath(sparklineFromSnapshots('completedTasks'))} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Tokens Consommés */}
        <div className={`rounded-2xl backdrop-blur border ${glass} p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider ${textM}`}>Tokens Consommés</span>
            <Zap className={`w-4 h-4 ${textM}`} />
          </div>
          <div className={`text-3xl font-bold ${textH}`}>{formatNumber(stats.totalTokens)}</div>
          <div className="flex items-center gap-2">
            {isTokensUp ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
            <span className={`text-sm ${isTokensUp ? 'text-emerald-400' : 'text-red-400'}`}>{tokensGrowth}</span>
            {snapshots.length > 0 && <span className={`text-xs ${textM}`}>vs période précédente</span>}
          </div>
        </div>

        {/* Taux de Succès */}
        <div className={`rounded-2xl backdrop-blur border ${glass} p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider ${textM}`}>Taux de Succès</span>
            <Target className={`w-4 h-4 ${textM}`} />
          </div>
          <div className={`text-3xl font-bold ${textH}`}>{stats.qaRate}%</div>
          <div className="flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={gaugeRadius} fill="none" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeWidth="8" />
              <circle cx="40" cy="40" r={gaugeRadius} fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={gaugeCircumference} strokeDashoffset={gaugeCircumference - gaugeProgress} transform="rotate(-90 40 40)" />
            </svg>
          </div>
        </div>

        {/* Agents Actifs */}
        <div className={`rounded-2xl backdrop-blur border ${glass} p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider ${textM}`}>Agents Actifs</span>
            <Users className={`w-4 h-4 ${textM}`} />
          </div>
          <div className={`text-3xl font-bold ${textH}`}>{agents.length}</div>
          <div className="flex items-center gap-2 flex-wrap">
            {agents.map(agent => (
              <div key={agent.id} className={`w-3 h-3 rounded-full ${
                agent.type === 'director' ? 'bg-fuchsia-500' : 'bg-emerald-500'
              }`} title={`${agent.name} (${agent.role})`} />
            ))}
          </div>
        </div>
      </div>

      {/* Status connexion */}
      <div className="flex items-center gap-3 px-4">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
        <span className={`text-sm ${textM}`}>
          {isConnected ? 'Flux SSE connecté' : 'Déconnecté'}
        </span>
        {snapshots.length > 0 && (
          <span className={`text-xs ${textM} ml-auto`}>
            {snapshots.length} snapshots historiques chargés
          </span>
        )}
      </div>
    </div>
  );
};

export default MissionControl;
