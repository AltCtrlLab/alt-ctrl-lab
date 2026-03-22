'use client';

import React, { useState, useEffect } from 'react';
import { History, CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

interface Activity {
  id: string;
  agentName: string;
  status: string;
  prompt: string;
  createdAt: number;
  updatedAt: number;
}

const STATUS_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  COMPLETED: { icon: CheckCircle2, color: 'text-emerald-400' },
  FAILED: { icon: XCircle, color: 'text-rose-400' },
  FAILED_QA: { icon: XCircle, color: 'text-rose-400' },
  PENDING: { icon: Clock, color: 'text-amber-400' },
  DIRECTOR_PLANNING: { icon: Loader2, color: 'text-sky-400' },
  EXECUTOR_DRAFTING: { icon: Loader2, color: 'text-sky-400' },
  DIRECTOR_QA: { icon: Loader2, color: 'text-fuchsia-400' },
  EXECUTOR_REVISING: { icon: Loader2, color: 'text-fuchsia-400' },
};

export default function HistoryPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/agents/activity');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setActivities(data.data?.activities ?? data.activities ?? []);
      } catch {
        setError('Impossible de charger l\'historique');
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
            <History className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Historique des taches</h1>
            <p className="text-xs text-zinc-500">Activite recente des agents IA</p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && activities.length === 0 && (
          <EmptyState
            icon={History}
            color="zinc"
            message="Aucune activité récente"
            submessage="L'historique se remplit automatiquement quand les agents IA exécutent des briefs."
          />
        )}

        {/* Activity list */}
        {!loading && activities.length > 0 && (
          <div className="space-y-2">
            {activities.map((item) => {
              const statusInfo = STATUS_ICON[item.status] || STATUS_ICON.PENDING;
              const Icon = statusInfo.icon;
              const isActive = ['DIRECTOR_PLANNING', 'EXECUTOR_DRAFTING', 'DIRECTOR_QA', 'EXECUTOR_REVISING'].includes(item.status);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-zinc-900/30 border border-zinc-800/60 rounded-xl"
                >
                  <Icon className={`w-4 h-4 shrink-0 ${statusInfo.color} ${isActive ? 'animate-spin' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">
                      {item.prompt?.slice(0, 80) || 'Tache sans titre'}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {item.agentName} &middot; {formatRelativeTime(new Date(item.createdAt))}
                    </p>
                  </div>
                  <span className={`text-[10px] uppercase font-medium px-2 py-0.5 rounded-full border ${
                    item.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : item.status.includes('FAIL')
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                  }`}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
