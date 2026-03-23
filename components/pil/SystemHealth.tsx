'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Database, Wifi, WifiOff, Clock, Server, RefreshCw } from 'lucide-react';

interface HealthData {
  sse: { connected: boolean; clients: number };
  uptime: number;
  agents: { total: number; available: number };
  memory: { events: number };
  subsystems?: {
    apiServer: boolean;
    sseStream: boolean;
    database: boolean;
    openclaw: boolean;
    warRoom: boolean;
    vault: boolean;
  };
}

interface SystemHealthProps {
  isDark: boolean;
  isConnected?: boolean;
}

export function SystemHealth({ isDark, isConnected = false }: SystemHealthProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uptimeTick, setUptimeTick] = useState(0);

  const fetchHealth = () => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        if (data.success) setHealth(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHealth();
    const iv = setInterval(fetchHealth, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setUptimeTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const textH = isDark ? 'text-white' : 'text-neutral-900';
  const textM = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const glass = isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-neutral-200';

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const uptime = health ? health.uptime + uptimeTick : uptimeTick;

  const items = [
    {
      icon: isConnected ? Wifi : WifiOff,
      label: 'Connexion SSE',
      value: isConnected ? 'Connecté' : 'Déconnecté',
      status: isConnected ? 'ok' : 'error',
      detail: health ? `${health.sse.clients} client(s)` : '-',
    },
    {
      icon: Database,
      label: 'Base de Données',
      value: 'SQLite OK',
      status: 'ok' as const,
      detail: health ? `${health.memory.events} événements en buffer` : '-',
    },
    {
      icon: Clock,
      label: 'Temps Actif',
      value: formatUptime(uptime),
      status: 'ok' as const,
      detail: 'Depuis le dernier redémarrage',
    },
    {
      icon: Server,
      label: 'Agents',
      value: health ? `${health.agents.available}/${health.agents.total}` : '-/-',
      status: health && health.agents.available < health.agents.total ? 'warning' : 'ok',
      detail: health && health.agents.available < health.agents.total ? 'Certains agents indisponibles' : 'Tous opérationnels',
    },
  ];

  const statusDot = (s: string) =>
    s === 'ok' ? 'bg-emerald-500' : s === 'warning' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className={`text-2xl font-bold ${textH}`}>Santé Système</h1>
          <p className={`text-sm ${textM}`}>Monitoring en temps réel de l'infrastructure</p>
        </div>
        <button onClick={fetchHealth} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'} transition-colors`} aria-label="Actualiser">
          <RefreshCw size={16} className={textM} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {items.map(item => (
          <div key={item.label} className={`rounded-xl border ${glass} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <item.icon size={16} className={item.status === 'ok' ? 'text-emerald-400' : item.status === 'warning' ? 'text-amber-400' : 'text-red-400'} />
              <span className={`text-sm font-medium ${textH}`}>{item.label}</span>
              <div className={`w-2 h-2 rounded-full ml-auto ${statusDot(item.status)}`} />
            </div>
            <p className={`text-lg font-bold ${textH}`}>{item.value}</p>
            <p className={`text-xs mt-1 ${textM}`}>{item.detail}</p>
          </div>
        ))}
      </div>

      {/* Overall status */}
      <div className={`rounded-2xl border ${glass} p-5 flex-1`}>
        <h3 className={`text-sm font-semibold mb-4 ${textH}`}>Status Global</h3>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={`text-lg font-semibold ${textH}`}>
            {isConnected ? 'Système Opérationnel' : 'Connexion Perdue'}
          </span>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Serveur API', ok: health?.subsystems?.apiServer ?? true },
            { label: 'Flux SSE', ok: health?.subsystems?.sseStream ?? isConnected },
            { label: 'Base de Données', ok: health?.subsystems?.database ?? false },
            { label: 'OpenClaw CLI', ok: health?.subsystems?.openclaw ?? false },
            { label: 'Moteur War Room', ok: health?.subsystems?.warRoom ?? true },
            { label: 'Coffre (Mémoire RAG)', ok: health?.subsystems?.vault ?? false },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <Activity size={12} className={s.ok ? 'text-emerald-400' : 'text-red-400'} />
              <span className={`text-sm ${textM}`}>{s.label}</span>
              <span className={`text-xs ml-auto ${s.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {s.ok ? 'OK' : 'DOWN'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
