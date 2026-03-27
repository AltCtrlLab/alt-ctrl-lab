'use client';

import { useState, useEffect } from 'react';
import { HeartPulse, RefreshCw } from 'lucide-react';

interface ClientHealth {
  clientName: string;
  score: number;
  tier: 'healthy' | 'watch' | 'at-risk' | 'critical';
  factors: { payment: number; project: number; engagement: number; satisfaction: number };
}

const TIER_COLORS: Record<string, string> = {
  healthy: 'bg-emerald-500',
  watch: 'bg-amber-500',
  'at-risk': 'bg-orange-500',
  critical: 'bg-rose-500',
};

const TIER_BG: Record<string, string> = {
  healthy: 'bg-emerald-500/20 border-emerald-500/30',
  watch: 'bg-amber-500/20 border-amber-500/30',
  'at-risk': 'bg-orange-500/20 border-orange-500/30',
  critical: 'bg-rose-500/20 border-rose-500/30',
};

export function ClientHealthWidget() {
  const [clients, setClients] = useState<ClientHealth[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/client-health');
      const json = await res.json();
      if (json.success) setClients(json.data?.clients ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-10 bg-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!clients.length) return null;

  const tierCounts = clients.reduce((acc, c) => {
    acc[c.tier] = (acc[c.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Santé Clients</h3>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      </div>

      {/* Tier summary */}
      <div className="flex gap-3 mb-4">
        {(['healthy', 'watch', 'at-risk', 'critical'] as const).map(tier => (
          <div key={tier} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className={`w-2.5 h-2.5 rounded-full ${TIER_COLORS[tier]}`} />
            <span>{tierCounts[tier] || 0}</span>
          </div>
        ))}
      </div>

      {/* Client tiles grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {clients.slice(0, 15).map(client => (
          <div
            key={client.clientName}
            className={`relative group px-2.5 py-2 rounded-lg border text-center cursor-default transition-colors ${TIER_BG[client.tier]}`}
            title={`${client.clientName}: ${client.score}/100 — P:${client.factors.payment} J:${client.factors.project} E:${client.factors.engagement} S:${client.factors.satisfaction}`}
          >
            <p className="text-[10px] font-medium text-zinc-200 truncate">{client.clientName}</p>
            <p className="text-lg font-bold text-zinc-100">{client.score}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
