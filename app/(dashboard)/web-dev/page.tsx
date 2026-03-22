'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Code2, Loader2, CheckCircle2, XCircle, Clock, Send, PlusCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { STAGE_LABELS, AGENT_BRIEF_EXAMPLES } from '@/lib/constants/agents';
import { EmptyState } from '@/components/ui/EmptyState';

interface Task {
  id: string;
  agentName: string;
  status: string;
  prompt: string;
  result: string | null;
  error: string | null;
  stage: string;
  createdAt: number;
  updatedAt: number;
}

export default function WebDevPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/agents?action=get_tasks');
      const data = await res.json();
      if (data.success) {
        const matinTasks = (data.data?.tasks ?? []).filter(
          (t: Task) => t.agentName?.toLowerCase().includes('matin')
        );
        setTasks(matinTasks.reverse());
      }
    } catch (err) { console.error('Failed to fetch web-dev tasks:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTasks();
    const id = setInterval(() => {
      if (document.hidden) return;
      fetchTasks();
    }, 15_000);
    return () => clearInterval(id);
  }, [fetchTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || sending) return;
    setSending(true);
    try {
      await fetch('/api/orchestrate/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: prompt.trim(),
          service: 'matin',
        }),
      });
      setPrompt('');
      setTimeout(fetchTasks, 1000);
    } catch (err) { console.error('Failed to submit web-dev task:', err); }
    finally { setSending(false); }
  };

  const activeTasks = tasks.filter(t => !['COMPLETED', 'FAILED', 'FAILED_QA'].includes(t.stage || t.status));
  const doneTasks = tasks.filter(t => ['COMPLETED', 'FAILED', 'FAILED_QA'].includes(t.stage || t.status));

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">Web Dev</h1>
              <p className="text-xs text-zinc-500">Abdul Matin &middot; Architecture & developpement</p>
            </div>
          </div>
          <Link
            href="/brief"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            <PlusCircle size={15} />
            Nouveau Brief
          </Link>
        </div>

        {/* Agent role explanation */}
        <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-2xl p-5 mb-6">
          <p className="text-sm text-zinc-300 leading-relaxed">
            <strong className="text-emerald-300">Abdul Matin</strong> est votre architecte web IA.
            Il développe des composants React, pages Next.js, intégrations API et optimisations de performance.
            Décrivez votre besoin ci-dessous ou cliquez sur un exemple pour démarrer.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {AGENT_BRIEF_EXAMPLES.matin.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all text-left"
              >
                {example.length > 60 ? example.slice(0, 57) + '…' : example}
              </button>
            ))}
          </div>
        </div>

        {/* Quick input */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Decrire une tache dev rapide..."
              disabled={sending}
              className="flex-1 px-4 py-2.5 text-sm bg-zinc-900/60 border border-zinc-800 rounded-xl text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors"
            />
            <button
              type="submit"
              disabled={sending || !prompt.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </form>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        )}

        {/* Empty */}
        {!loading && tasks.length === 0 && (
          <EmptyState
            icon={Code2}
            color="emerald"
            message="Aucune tâche en cours"
            submessage="Utilisez le champ ci-dessus ou créez un brief pour démarrer."
          />
        )}

        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium mb-3">
              En cours ({activeTasks.length})
            </h2>
            <div className="space-y-2">
              {activeTasks.map((t) => (
                <div key={t.id} className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                    <span className="text-[11px] text-sky-400 font-medium">
                      {STAGE_LABELS[t.stage || t.status] || t.stage || t.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-200 line-clamp-2">{t.prompt?.slice(0, 120)}</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    {formatRelativeTime(new Date(t.createdAt))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done tasks */}
        {doneTasks.length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-medium mb-3">
              Terminees ({doneTasks.length})
            </h2>
            <div className="space-y-2">
              {doneTasks.map((t) => {
                const failed = (t.stage || t.status).includes('FAIL');
                return (
                  <div key={t.id} className="p-3 bg-zinc-900/20 border border-zinc-800/40 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      {failed ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className={`text-[11px] font-medium ${failed ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {failed ? 'Echec' : 'Termine'}
                      </span>
                      <span className="text-[11px] text-zinc-600 ml-auto">
                        {formatRelativeTime(new Date(t.updatedAt || t.createdAt))}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-2">{t.prompt?.slice(0, 120)}</p>
                    {t.result && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.result.slice(0, 150)}</p>
                    )}
                    {t.error && (
                      <p className="text-xs text-rose-400/80 mt-1 line-clamp-1">{t.error.slice(0, 100)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
