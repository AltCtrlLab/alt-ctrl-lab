'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Megaphone, Loader2, CheckCircle2, XCircle, Clock, Send, Wifi, WifiOff } from 'lucide-react';
import { STAGE_LABELS, ACTIVE_STATUSES, DONE_STATUSES, AGENT_BRIEF_EXAMPLES } from '@/lib/constants/agents';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatElapsed } from '@/lib/utils';

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

function extractBrief(prompt: string): string {
  const match = prompt.match(/Brief:\n([\s\S]*)/);
  if (match) return match[1].trim().slice(0, 120);
  return prompt.trim().slice(0, 120);
}

export function AgentFatahTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [brief, setBrief] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/agents?action=get_tasks');
      const json = await res.json();
      if (json.success && json.data?.tasks) {
        const filtered = (json.data.tasks as Task[]).filter(
          t => t.agentName.includes('fatah') || t.agentName.includes('khatib')
        );
        setTasks(filtered);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTasks();
    const es = new EventSource('/api/agents/stream');
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener('task_update', () => { fetchTasks(); });
    return () => { es.close(); };
  }, [fetchTasks]);

  async function submitBrief() {
    if (!brief.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orchestrate/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ director_id: 'fatah', executor_id: 'khatib', brief: brief.trim(), timeout: 900 }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      setBrief('');
      setTimeout(fetchTasks, 1000);
    } catch { /* silent */ } finally { setSubmitting(false); }
  }

  function toggleResult(id: string) {
    setExpandedResults(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function approveTask(id: string) {
    try { await fetch('/api/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_task', taskId: id, status: 'APPROVED' }) }); } catch { /* silent */ }
    setArchived(prev => new Set([...prev, id]));
  }

  async function rejectTask(id: string) {
    try { await fetch('/api/agents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_task', taskId: id, status: 'REJECTED' }) }); } catch { /* silent */ }
    setArchived(prev => new Set([...prev, id]));
  }

  const activeTasks = tasks.filter(t => (ACTIVE_STATUSES as readonly string[]).includes(t.status) && !archived.has(t.id));
  const doneTasks = tasks.filter(t => (DONE_STATUSES as readonly string[]).includes(t.status) && !archived.has(t.id)).slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Connection status */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        {connected ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Connecté</span></> : <><WifiOff className="w-3.5 h-3.5" /><span>Déconnecté</span></>}
      </div>

      {/* Agent description */}
      <div className="bg-amber-500/[0.04] border border-amber-500/10 rounded-2xl p-5">
        <p className="text-sm text-zinc-300 leading-relaxed">
          <strong className="text-amber-300">Abdul Fatah</strong> est votre stratège marketing IA.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {AGENT_BRIEF_EXAMPLES.fatah.map((example) => (
            <button key={example} type="button" onClick={() => setBrief(example)}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-all text-left">
              {example.length > 60 ? example.slice(0, 57) + '…' : example}
            </button>
          ))}
        </div>
      </div>

      {/* Brief input */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-3">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Nouveau brief</p>
        <textarea value={brief} onChange={e => setBrief(e.target.value)} disabled={submitting}
          placeholder="Décris ton brief à Abdul Fatah…" rows={4}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-amber-500/40 disabled:opacity-50" />
        <button onClick={submitBrief} disabled={submitting || !brief.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-sm font-medium rounded-xl transition-all disabled:opacity-40">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? 'Envoi…' : 'Envoyer à Fatah'}
        </button>
      </div>

      {/* Active tasks */}
      <section>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">En cours ({activeTasks.length})</p>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
        ) : activeTasks.length === 0 ? (
          <EmptyState icon={Megaphone} color="amber" message="Aucun brief en cours" submessage="Envoie un brief ci-dessus." />
        ) : (
          <div className="space-y-3">
            {activeTasks.map(task => (
              <div key={task.id} className="bg-cyan-500/[0.08] border border-cyan-500/25 rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-cyan-400" /><span className="text-sm font-medium text-cyan-300">{STAGE_LABELS[task.status] ?? task.status}</span></div>
                  <div className="flex items-center gap-1 text-xs text-zinc-400"><Clock className="w-3 h-3" />{formatElapsed(task.createdAt)}</div>
                </div>
                <p className="text-xs text-zinc-400 pl-6">{extractBrief(task.prompt)}…</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      {doneTasks.length > 0 && (
        <section>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Historique ({doneTasks.length})</p>
          <div className="space-y-3">
            {doneTasks.map(task => {
              const ok = task.status === 'COMPLETED';
              const isExpanded = expandedResults.has(task.id);
              return (
                <div key={task.id} className={`rounded-2xl p-4 space-y-3 border ${ok ? 'bg-emerald-500/[0.08] border-emerald-500/25' : 'bg-red-500/[0.08] border-red-500/25'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                      <span className={`text-sm font-medium ${ok ? 'text-emerald-300' : 'text-red-300'}`}>{STAGE_LABELS[task.status] ?? task.status}</span>
                    </div>
                    <span className="text-xs text-zinc-400">{new Date(task.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{extractBrief(task.prompt)}…</p>
                  {(task.result || task.error) && (
                    <button onClick={() => toggleResult(task.id)} className="text-xs text-zinc-400 hover:text-zinc-300 underline underline-offset-2">
                      {isExpanded ? 'Masquer' : 'Voir le résultat'}
                    </button>
                  )}
                  {isExpanded && (task.result || task.error) && (
                    <div className="max-h-64 overflow-y-auto rounded-xl bg-zinc-900/60 border border-white/[0.05] p-3">
                      <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">{task.result ?? task.error}</pre>
                    </div>
                  )}
                  {ok && (
                    <div className="flex gap-2">
                      <button onClick={() => rejectTask(task.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-400 rounded-lg"><XCircle className="w-3 h-3" /> Rejeter</button>
                      <button onClick={() => approveTask(task.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 rounded-lg font-medium"><CheckCircle2 className="w-3 h-3" /> Approuver</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
