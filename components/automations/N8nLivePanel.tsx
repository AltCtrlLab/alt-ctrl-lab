'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, XCircle, Clock, Activity, Zap, Play } from 'lucide-react';

interface N8nAutomation {
  id: string;
  name: string;
  status: string;
  n8n_workflow_id: string;
  last_run_at: number | null;
  run_count: number;
  error_count: number;
  lastExec: {
    status: string;
    startedAt: string;
    stoppedAt: string | null;
    duration: number | null;
  } | null;
  runsLast7d: number;
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'Jamais';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `il y a ${d}j`;
  if (h > 0) return `il y a ${h}h`;
  if (m > 0) return `il y a ${m}min`;
  return 'à l\'instant';
}

export function N8nLivePanel() {
  const [automations, setAutomations] = useState<N8nAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'n8n' | 'local'>('local');
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/n8n/executions');
      const data = await res.json();
      if (data.success) {
        setAutomations(data.data.automations);
        setSource(data.data.source);
      }
    } catch (err) {
      console.error('N8nLivePanel fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 60000);
    return () => clearInterval(interval);
  }, [fetch_]);

  async function triggerWorkflow(workflowId: string, name: string) {
    setTriggering(workflowId);
    try {
      const res = await fetch('/api/n8n/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Erreur: ${data.error}`);
      } else {
        setTimeout(fetch_, 2000);
      }
    } catch (err) {
      console.error('Trigger error:', err);
    } finally {
      setTriggering(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-fuchsia-400 animate-pulse" />
          <span className="text-sm font-medium text-zinc-300">n8n Live Executions</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const active = automations.filter(a => a.status === 'Actif');
  const inactive = automations.filter(a => a.status !== 'Actif');

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-fuchsia-400" />
          <span className="text-sm font-semibold text-zinc-100">n8n Live Executions</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${source === 'n8n' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
            {source === 'n8n' ? '● Live' : '○ Local'}
          </span>
        </div>
        <button onClick={fetch_} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {automations.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            Aucun workflow n8n trouvé. Les workflows seront ajoutés automatiquement au premier webhook reçu.
          </div>
        )}
        {automations.map(auto => (
          <motion.div
            key={auto.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors"
          >
            {/* Status icon */}
            <div className="shrink-0">
              {auto.status === 'Actif' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : auto.status === 'Erreur' ? (
                <XCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Clock className="w-4 h-4 text-zinc-500" />
              )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-200 truncate">{auto.name}</div>
              <div className="text-xs text-zinc-500 font-mono">{auto.n8n_workflow_id}</div>
            </div>

            {/* Last run */}
            <div className="text-right shrink-0">
              <div className="text-xs text-zinc-400">{timeAgo(auto.last_run_at)}</div>
              <div className="text-xs text-zinc-600">
                {auto.run_count > 0 ? `${auto.run_count} exéc.` : 'jamais'}
                {auto.error_count > 0 && (
                  <span className="text-rose-400 ml-1">{auto.error_count} err.</span>
                )}
              </div>
            </div>

            {/* 7d runs */}
            {auto.runsLast7d > 0 && (
              <div className="shrink-0">
                <span className="text-xs bg-fuchsia-500/10 text-fuchsia-400 px-1.5 py-0.5 rounded">
                  {auto.runsLast7d}× /7j
                </span>
              </div>
            )}

            {/* Trigger button */}
            <button
              onClick={() => triggerWorkflow(auto.n8n_workflow_id, auto.name)}
              disabled={triggering === auto.n8n_workflow_id}
              className="shrink-0 p-1.5 rounded-lg bg-zinc-800 hover:bg-fuchsia-500/20 hover:text-fuchsia-400 text-zinc-500 transition-colors disabled:opacity-50"
              title="Déclencher manuellement"
            >
              {triggering === auto.n8n_workflow_id ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {automations.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
          <span>{active.length} actif{active.length > 1 ? 's' : ''}</span>
          <span>{inactive.length} inactif{inactive.length > 1 ? 's' : ''}</span>
          <span className="ml-auto">Auto-refresh 60s</span>
        </div>
      )}
    </div>
  );
}
