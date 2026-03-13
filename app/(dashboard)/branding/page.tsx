'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Palette, Loader2, CheckCircle2, XCircle, Clock, Send, Wifi, WifiOff } from 'lucide-react';

interface Task {
  id: string;
  agentName: string;
  status: string;
  prompt: string;
  result: string | null;
  error: string | null;
  iteration: number;
  stage: string;
  createdAt: number;
  updatedAt: number;
}

const STAGE_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  DIRECTOR_PLANNING: 'Planification en cours...',
  EXECUTOR_DRAFTING: 'Création en cours...',
  DIRECTOR_QA: 'Audit qualité...',
  EXECUTOR_REVISING: 'Révision en cours...',
  COMPLETED: 'Livrable validé',
  FAILED: 'Échec',
  FAILED_QA: 'Échec',
};

const ACTIVE_STATUSES = ['PENDING', 'DIRECTOR_PLANNING', 'EXECUTOR_DRAFTING', 'DIRECTOR_QA', 'EXECUTOR_REVISING'];
const DONE_STATUSES = ['COMPLETED', 'FAILED', 'FAILED_QA'];

function formatElapsed(createdAt: number): string {
  const secs = Math.floor((Date.now() - createdAt) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}min`;
  return `${Math.floor(secs / 3600)}h`;
}

function extractBrief(prompt: string): string {
  const match = prompt.match(/Brief:\n([\s\S]*)/);
  if (match) return match[1].trim().slice(0, 120);
  return prompt.trim().slice(0, 120);
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl transition-all
      ${type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

export default function BrandingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [brief, setBrief] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/agents?action=get_tasks');
      const json = await res.json();
      if (json.success && json.data?.tasks) {
        const filtered = (json.data.tasks as Task[]).filter(
          t => t.agentName.includes('musawwir') || t.agentName.includes('raqim')
        );
        setTasks(filtered);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    const es = new EventSource('/api/agents/stream');
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener('task_update', () => {
      fetchTasks();
    });

    return () => {
      es.close();
    };
  }, [fetchTasks]);

  async function submitBrief() {
    if (!brief.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ director_id: 'musawwir', executor_id: 'raqim', brief: brief.trim(), timeout: 900 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur serveur');
      setBrief('');
      setToast({ message: 'Brief envoyé !', type: 'success' });
      setTimeout(fetchTasks, 1000);
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur inconnue', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function toggleResult(id: string) {
    setExpandedResults(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function archiveTask(id: string) {
    setArchived(prev => new Set([...prev, id]));
  }

  const activeTasks = tasks.filter(t => ACTIVE_STATUSES.includes(t.status) && !archived.has(t.id));
  const doneTasks = tasks
    .filter(t => DONE_STATUSES.includes(t.status) && !archived.has(t.id))
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center justify-center">
              <Palette className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-100">Abdul Musawwir</h1>
              <p className="text-xs text-zinc-500">Direction artistique &amp; branding</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {connected ? (
              <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Connecté</span></>
            ) : (
              <><WifiOff className="w-3.5 h-3.5" /><span>Déconnecté</span></>
            )}
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Brief input */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-3">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Nouveau brief</p>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            disabled={submitting}
            placeholder="Décris ta mission à Abdul Musawwir…"
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-pink-500/40 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={submitBrief}
            disabled={submitting || !brief.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/25 hover:border-pink-500/40 text-pink-300 text-sm font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Envoi…' : 'Envoyer à Musawwir'}
          </button>
        </div>

        {/* Active tasks */}
        <section>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">En cours ({activeTasks.length})</p>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
            </div>
          ) : activeTasks.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center">
              <Palette className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Aucune mission active</p>
              <p className="text-xs text-zinc-600 mt-1">Envoie un brief pour démarrer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTasks.map(task => (
                <div key={task.id} className="bg-blue-500/[0.08] border border-blue-500/25 rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-blue-300">{STAGE_LABELS[task.status] ?? task.status}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatElapsed(task.createdAt)}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 pl-6">{extractBrief(task.prompt)}…</p>
                  <p className="text-xs text-zinc-600 pl-6">Agent: {task.agentName} · Itération {task.iteration}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Done tasks */}
        {doneTasks.length > 0 && (
          <section>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Historique ({doneTasks.length})</p>
            <div className="space-y-3">
              {doneTasks.map(task => {
                const isCompleted = task.status === 'COMPLETED';
                const isFailed = task.status === 'FAILED' || task.status === 'FAILED_QA';
                const isExpanded = expandedResults.has(task.id);
                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl p-4 space-y-3 border ${
                      isCompleted
                        ? 'bg-emerald-500/[0.08] border-emerald-500/25'
                        : 'bg-red-500/[0.08] border-red-500/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm font-medium ${isCompleted ? 'text-emerald-300' : 'text-red-300'}`}>
                          {STAGE_LABELS[task.status] ?? task.status}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-600">
                        {new Date(task.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{extractBrief(task.prompt)}…</p>

                    {(task.result || task.error) && (
                      <button
                        onClick={() => toggleResult(task.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
                      >
                        {isExpanded ? 'Masquer le résultat' : 'Voir le résultat'}
                      </button>
                    )}

                    {isExpanded && (task.result || task.error) && (
                      <div className="max-h-64 overflow-y-auto rounded-xl bg-zinc-900/60 border border-white/[0.05] p-3">
                        <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                          {task.result ?? task.error}
                        </pre>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => archiveTask(task.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-400 rounded-lg transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          Rejeter
                        </button>
                        <button
                          onClick={() => archiveTask(task.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 rounded-lg transition-colors font-medium"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Approuver
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
