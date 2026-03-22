'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  TrendingUp,
  Target,
  AlertCircle,
  Award,
  Loader2,
} from 'lucide-react';

interface VaultComponent {
  id: string;
  briefText: string;
  codeContent: string;
  serviceId: string | null;
  createdAt: string;
  successRate: number;
  reuseCount: number;
}

interface VaultAnalyticsData {
  topComponents: VaultComponent[];
  stats: {
    total: number;
    avgSuccessRate: number;
    totalReuses: number;
    staleCount?: number;
  };
}

interface VaultAnalyticsProps {
  isDark: boolean;
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

export function VaultAnalytics({ isDark }: VaultAnalyticsProps) {
  const [data, setData] = useState<VaultAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const t = getTheme(isDark);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/vault/analytics');
        const result = await res.json();

        if (result.success && result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error('[VaultAnalytics] Erreur de chargement:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Rafraîchissement toutes les 30 secondes
    const interval = setInterval(fetchAnalytics, 30_000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const getDaysAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
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

  if (!data) {
    return (
      <div
        className={`h-full flex flex-col items-center justify-center ${t.glass} backdrop-blur-xl rounded-2xl border p-8`}
      >
        <Archive size={48} className={`${t.textMuted} mb-4 opacity-40`} />
        <p className={`${t.textMain} text-sm`}>Erreur de chargement</p>
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
          className={`${t.textHeading} text-xl font-semibold tracking-tight flex items-center gap-3`}
        >
          <Archive className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
          Analytiques du Vault
        </h2>
        <p className={`${t.textMuted} text-xs mt-1`}>
          Composants réutilisables et métriques de performance
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-4`}
        >
          <div className={`flex items-center gap-2 mb-2 ${t.textMuted} text-xs`}>
            <Archive size={14} />
            Total Composants
          </div>
          <p className={`${t.textHeading} text-2xl font-bold tracking-tight`}>
            {data.stats.total}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-4`}
        >
          <div className={`flex items-center gap-2 mb-2 ${t.textMuted} text-xs`}>
            <Target size={14} />
            Taux de Succès Moyen
          </div>
          <p className={`${t.textHeading} text-2xl font-bold tracking-tight`}>
            {data.stats.avgSuccessRate.toFixed(1)}%
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-4`}
        >
          <div className={`flex items-center gap-2 mb-2 ${t.textMuted} text-xs`}>
            <TrendingUp size={14} />
            Total Réutilisations
          </div>
          <p className={`${t.textHeading} text-2xl font-bold tracking-tight`}>
            {data.stats.totalReuses}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-4`}
        >
          <div className={`flex items-center gap-2 mb-2 ${t.textMuted} text-xs`}>
            <AlertCircle size={14} />
            Composants Périmés
          </div>
          <p className={`${t.textHeading} text-2xl font-bold tracking-tight`}>
            {data.stats.staleCount || 0}
          </p>
        </motion.div>
      </div>

      {/* Leaderboard des composants les plus réutilisés */}
      <div>
        <h3
          className={`${t.textHeading} text-sm font-semibold mb-4 flex items-center gap-2`}
        >
          <Award size={16} className={isDark ? 'text-yellow-400' : 'text-yellow-600'} />
          Top 10 — Composants les Plus Réutilisés
        </h3>

        {data.topComponents.length === 0 ? (
          <div
            className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-8 text-center`}
          >
            <Archive size={32} className={`${t.textMuted} mx-auto mb-3 opacity-40`} />
            <p className={`${t.textMain} text-sm`}>Aucun composant dans le vault</p>
            <p className={`${t.textMuted} text-xs mt-1`}>
              Les composants apparaîtront après les premières missions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.topComponents.map((component, idx) => {
              const daysAgo = getDaysAgo(component.createdAt);
              const isStale = daysAgo > 30;

              return (
                <motion.div
                  key={component.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`${t.cardBg} backdrop-blur-xl rounded-xl border ${t.borderLight} p-4 ${
                    isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-white'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          idx === 0
                            ? isDark
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-yellow-100 text-yellow-700'
                            : idx === 1
                            ? isDark
                              ? 'bg-gray-500/20 text-gray-300'
                              : 'bg-gray-100 text-gray-700'
                            : idx === 2
                            ? isDark
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-amber-100 text-amber-700'
                            : isDark
                            ? 'bg-white/[0.05] text-neutral-400'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <p className={`${t.textMain} text-sm font-medium leading-tight`}>
                          {component.briefText.length > 60
                            ? component.briefText.substring(0, 60) + '...'
                            : component.briefText}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs font-mono ${t.textMuted}`}
                          >
                            {component.serviceId || 'N/A'}
                          </span>
                          {isStale && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                isDark
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              } border`}
                            >
                              Périmé ({daysAgo}j)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isDark
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-cyan-50 text-cyan-700'
                        }`}
                      >
                        {component.reuseCount} réutilisations
                      </div>
                      <span className={`text-xs font-mono ${t.textMuted}`}>
                        {(component.successRate * 100).toFixed(0)}% succès
                      </span>
                    </div>
                  </div>

                  <div className={`text-xs ${t.textMuted} flex items-center gap-2 mt-2`}>
                    Créé le {formatDate(component.createdAt)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
