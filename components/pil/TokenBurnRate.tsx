'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingUp } from 'lucide-react';

interface TokenBurnRateProps {
  isDark: boolean;
}

interface SystemMetrics {
  tokensPerSecond: number;
  totalTokens: number;
  totalTasks: number;
  activeAgents: number;
}

/**
 * Live token burn rate ticker pour l'OpsHeader.
 * Affiche: "XX.X T/s — $X.XX/h"
 * Rouge si > 100 T/s (alerte coût)
 */
export function TokenBurnRate({ isDark }: TokenBurnRateProps) {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    tokensPerSecond: 0,
    totalTokens: 0,
    totalTasks: 0,
    activeAgents: 0,
  });
  const [isHighBurn, setIsHighBurn] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics/system');
        const data = await res.json();

        if (data.success && data.data) {
          const tokensPerSec =
            typeof data.data.tokensPerSecond === 'string'
              ? parseFloat(data.data.tokensPerSecond)
              : data.data.tokensPerSecond || 0;

          setMetrics({
            tokensPerSecond: tokensPerSec,
            totalTokens: data.data.totalTokens || 0,
            totalTasks: data.data.totalTasks || 0,
            activeAgents: data.data.activeAgents || 0,
          });

          setIsHighBurn(tokensPerSec > 100);
        }
      } catch (err) {
        console.error('[TokenBurnRate] Erreur de chargement:', err);
      }
    };

    fetchMetrics();

    // Rafraîchissement toutes les 5 secondes
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calcul du coût horaire: (tokens/s * 3600s) / 1M * $3
  const costPerHour = ((metrics.tokensPerSecond * 3600) / 1_000_000) * 3;

  const textColor = isHighBurn
    ? isDark
      ? 'text-red-400'
      : 'text-red-600'
    : isDark
    ? 'text-neutral-200'
    : 'text-neutral-800';

  const glowClass = isHighBurn
    ? isDark
      ? 'shadow-[0_0_20px_rgba(239,68,68,0.4)]'
      : 'shadow-[0_0_15px_rgba(220,38,38,0.3)]'
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        px-4 py-2.5 backdrop-blur-xl rounded-full border transition-all duration-300
        ${
          isDark
            ? 'bg-white/[0.03] border-white/[0.08]'
            : 'bg-white border-neutral-200'
        }
        ${glowClass}
        flex items-center gap-3
      `}
    >
      {/* Icône animée */}
      <div className="relative">
        <Flame
          size={18}
          className={`${
            isHighBurn
              ? isDark
                ? 'text-red-400'
                : 'text-red-600'
              : isDark
              ? 'text-amber-400'
              : 'text-amber-600'
          } ${isHighBurn ? 'animate-pulse' : ''}`}
        />
        {isHighBurn && (
          <div className="absolute inset-0 animate-ping">
            <Flame
              size={18}
              className={isDark ? 'text-red-400' : 'text-red-600'}
              style={{ opacity: 0.4 }}
            />
          </div>
        )}
      </div>

      {/* Affichage des métriques */}
      <div className="flex items-center gap-2 font-mono">
        <span className={`text-sm font-bold ${textColor}`}>
          {metrics.tokensPerSecond.toFixed(1)} T/s
        </span>
        <span
          className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}
        >
          —
        </span>
        <span className={`text-sm font-semibold ${textColor}`}>
          ${costPerHour.toFixed(2)}/h
        </span>
      </div>

      {/* Indicateur de tendance (optionnel) */}
      {metrics.tokensPerSecond > 0 && (
        <TrendingUp
          size={14}
          className={`${
            isHighBurn
              ? isDark
                ? 'text-red-400'
                : 'text-red-600'
              : isDark
              ? 'text-emerald-400'
              : 'text-emerald-600'
          }`}
        />
      )}
    </motion.div>
  );
}
