'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Instagram, Send, Loader2, User, Bot, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp, ExternalLink,
  RotateCcw, Sparkles, Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import type { Lead } from '@/lib/db/schema_leads';

interface ChatMessage {
  id: string;
  role: 'user' | 'director' | 'system';
  type: 'text' | 'plan' | 'log' | 'report' | 'lead_card';
  content: string;
  meta?: Record<string, unknown>;
  timestamp: number;
}

interface LogEntry {
  type: string;
  message: string;
}

const CRON_SECRET = process.env.NEXT_PUBLIC_CRON_SECRET || 'altctrl-cron-secret';

const PROMPT_EXAMPLES = [
  'Trouve 5 restaurants à Genève sans site web',
  'Prospection coiffeurs à Annecy — 3 leads',
  'Cherche 8 boutiques à Lyon sur Instagram',
  'Salons de beauté à Lausanne — 5 DMs',
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlanCard({ meta }: { meta: Record<string, unknown> }) {
  const m = meta as { niche?: string; ville?: string; targetLeads?: number; strategy?: string };
  return (
    <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 mt-1 space-y-3">
      <div className="flex items-center gap-2 text-pink-400 text-sm font-semibold">
        <Target className="w-4 h-4" />
        Plan de campagne
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
          <div className="text-xs text-zinc-500 mb-0.5">Niche</div>
          <div className="text-sm font-semibold text-zinc-200 capitalize">{m.niche || '—'}</div>
        </div>
        <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
          <div className="text-xs text-zinc-500 mb-0.5">Ville</div>
          <div className="text-sm font-semibold text-zinc-200">{m.ville || '—'}</div>
        </div>
        <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
          <div className="text-xs text-zinc-500 mb-0.5">Objectif</div>
          <div className="text-sm font-semibold text-pink-400">{m.targetLeads ?? '—'} leads</div>
        </div>
      </div>
      {m.strategy && (
        <p className="text-xs text-zinc-400 italic border-l-2 border-pink-500/30 pl-3">
          {m.strategy}
        </p>
      )}
    </div>
  );
}

function LiveLog({ entries, isRunning }: { entries: LogEntry[]; isRunning: boolean }) {
  const [open, setOpen] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 overflow-hidden mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
          Journal d&apos;exécution ({entries.length} événements)
        </span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div
              ref={logRef}
              className="max-h-52 overflow-y-auto font-mono text-xs p-3 space-y-0.5 border-t border-zinc-800/40"
            >
              {entries.map((e, i) => (
                <div key={i} className={
                  e.type === 'qualify' || e.type === 'done_lead' || e.type === 'complete' ? 'text-emerald-400' :
                  e.type === 'fatal' || e.type === 'error' ? 'text-rose-400' :
                  e.type === 'warn' ? 'text-amber-400' :
                  e.type === 'skip' || e.type === 'filtered' ? 'text-zinc-600' :
                  e.type === 'send' ? 'text-pink-400' :
                  e.type === 'plan' ? 'text-pink-300 font-semibold' :
                  'text-zinc-500'
                }>
                  {e.message}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ProspectionPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [newLeadCount, setNewLeadCount] = useState(0);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const fetchAllLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads?source=Instagram');
      const data = await res.json();
      if (data.success) {
        setAllLeads(data.data.leads.sort((a: Lead, b: Lead) => b.createdAt - a.createdAt));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAllLeads();
  }, [fetchAllLeads]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const full: ChatMessage = { ...msg, id: Math.random().toString(36).slice(2), timestamp: Date.now() };
    setMessages(prev => [...prev, full]);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isRunning) return;

    setInput('');
    setLogEntries([]);
    setNewLeadCount(0);
    setIsRunning(true);

    // Message utilisateur
    addMessage({ role: 'user', type: 'text', content: text });

    try {
      const res = await fetch('/api/instagram/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-key': CRON_SECRET,
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) {
        addMessage({ role: 'director', type: 'text', content: `Erreur serveur (${res.status}). Vérifiez que CHROME_DEBUG_URL est configuré sur le VPS.` });
        setIsRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let planShown = false;
      let currentLogBatch: LogEntry[] = [];

      const flushLog = () => {
        if (currentLogBatch.length > 0) {
          setLogEntries(prev => [...prev, ...currentLogBatch]);
          currentLogBatch = [];
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'thinking') {
              addMessage({ role: 'director', type: 'text', content: event.message });

            } else if (event.type === 'plan' && !planShown) {
              planShown = true;
              addMessage({ role: 'director', type: 'plan', content: event.detail || event.message, meta: event });

            } else if (event.type === 'start_campaign') {
              addMessage({ role: 'system', type: 'text', content: event.message });

            } else if (event.type === 'report') {
              flushLog();
              addMessage({ role: 'director', type: 'report', content: event.message, meta: event.results as Record<string, unknown> });
              // Refresh leads
              await fetchAllLeads();

            } else if (event.type === 'done_lead' && event.dbLeadId) {
              setNewLeadCount(c => c + 1);
              fetchAllLeads();
              currentLogBatch.push({ type: event.type, message: String(event.message || '') });

            } else if (event.type === 'fatal') {
              flushLog();
              addMessage({ role: 'system', type: 'text', content: event.message });

            } else if (event.message) {
              currentLogBatch.push({ type: event.type, message: String(event.message) });
              if (currentLogBatch.length >= 5) flushLog();
            }
          } catch { /* JSON parse error — ignorer */ }
        }
      }

      flushLog();
    } catch (err: any) {
      addMessage({ role: 'director', type: 'text', content: `Erreur de connexion : ${err.message}` });
    } finally {
      setIsRunning(false);
    }
  }, [input, isRunning, addMessage, fetchAllLeads]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reset = () => {
    setMessages([]);
    setLogEntries([]);
    setNewLeadCount(0);
    inputRef.current?.focus();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full max-h-screen bg-zinc-950">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center">
            <Instagram className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">Directeur Marketing Digital</h1>
            <p className="text-xs text-zinc-500">Instagram DM Automation — Chrome CDP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              Campagne en cours
            </span>
          )}
          <button
            onClick={() => setShowHistory(s => !s)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showHistory ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'border-zinc-800 text-zinc-500 hover:text-zinc-400'}`}
          >
            Historique ({allLeads.length})
          </button>
          {messages.length > 0 && !isRunning && (
            <button
              onClick={reset}
              className="p-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Chat principal ── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Zone de messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* État vide */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-pink-400" />
                </div>
                <div className="text-center">
                  <h2 className="text-zinc-200 font-semibold mb-1">Donnez votre mission</h2>
                  <p className="text-sm text-zinc-500 max-w-sm">
                    Le Directeur Marketing planifie et exécute votre prospection Instagram de A à Z.
                    Chrome doit être connecté sur le VPS (port 9222).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {PROMPT_EXAMPLES.map(ex => (
                    <button
                      key={ex}
                      onClick={() => { setInput(ex); inputRef.current?.focus(); }}
                      className="text-left text-xs px-3 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === 'user'
                    ? 'bg-orange-500/20 border border-orange-500/30'
                    : msg.role === 'system'
                    ? 'bg-zinc-800 border border-zinc-700'
                    : 'bg-pink-500/15 border border-pink-500/25'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-4 h-4 text-orange-400" />
                    : msg.role === 'system'
                    ? <Instagram className="w-4 h-4 text-zinc-500" />
                    : <Bot className="w-4 h-4 text-pink-400" />
                  }
                </div>

                {/* Bulle */}
                <div className={`flex-1 max-w-lg ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {msg.role !== 'user' && (
                    <span className="text-xs text-zinc-600 ml-1">
                      {msg.role === 'director' ? 'Directeur Marketing' : 'Système'}
                    </span>
                  )}

                  {msg.type === 'plan' && msg.meta ? (
                    <div className="w-full">
                      <div className={`rounded-2xl px-4 py-3 text-sm text-zinc-300 bg-zinc-800/60 border border-zinc-700/40`}>
                        {msg.content}
                      </div>
                      <PlanCard meta={msg.meta} />
                    </div>
                  ) : msg.type === 'report' ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 w-full">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Rapport de mission
                      </div>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{msg.content}</p>
                      {msg.meta && (() => {
                        const r = msg.meta as { sent?: number; filtered?: number; failed?: number };
                        return (
                          <div className="flex gap-4 mt-3 pt-3 border-t border-emerald-500/10 text-xs">
                            <span className="text-zinc-500">
                              Envoyés : <span className="text-emerald-400 font-semibold">{r.sent ?? 0}</span>
                            </span>
                            <span className="text-zinc-500">
                              Filtrés : <span className="text-zinc-400">{r.filtered ?? 0}</span>
                            </span>
                            <span className="text-zinc-500">
                              Échecs : <span className="text-rose-400">{r.failed ?? 0}</span>
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className={`rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-orange-500/15 border border-orange-500/20 text-zinc-200'
                        : msg.role === 'system'
                        ? 'bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 italic text-xs'
                        : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-300'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live log */}
            {logEntries.length > 0 && (
              <div className="ml-11">
                <LiveLog entries={logEntries} isRunning={isRunning} />
              </div>
            )}

            {/* Indicateur leads découverts */}
            {newLeadCount > 0 && (
              <div className="ml-11">
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {newLeadCount} lead{newLeadCount > 1 ? 's' : ''} créé{newLeadCount > 1 ? 's' : ''} en DB — visible dans l&apos;historique
                </div>
              </div>
            )}

            {/* Indicateur typing */}
            {isRunning && messages.length > 0 && logEntries.length === 0 && (
              <div className="flex gap-3 ml-11">
                <div className="flex gap-1 items-center px-4 py-3 rounded-2xl bg-zinc-800/60 border border-zinc-700/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-zinc-800/60">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRunning}
                placeholder={isRunning ? 'Campagne en cours...' : 'Décrivez votre mission Instagram (ex : Trouve 5 restaurants à Genève sans site web)'}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-zinc-700/60 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-pink-500/40 focus:bg-zinc-800/80 transition-all disabled:opacity-50 max-h-32 overflow-y-auto"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isRunning}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {isRunning
                  ? <Loader2 className="w-4.5 h-4.5 text-white animate-spin" />
                  : <Send className="w-4.5 h-4.5 text-white" />
                }
              </button>
            </div>
            <p className="text-xs text-zinc-700 mt-2 text-center">
              Entrée pour envoyer · Shift+Entrée pour nouvelle ligne · Chrome CDP requis sur le VPS
            </p>
          </div>
        </div>

        {/* ── Panneau historique (sidebar droite) ── */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 border-l border-zinc-800/60 overflow-hidden"
            >
              <div className="w-80 h-full flex flex-col">
                <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Leads Instagram ({allLeads.length})</span>
                  <button onClick={fetchAllLeads} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {allLeads.length === 0 && (
                    <p className="text-xs text-zinc-600 text-center py-8">Aucun lead Instagram</p>
                  )}
                  {allLeads.map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="w-full flex items-center gap-2.5 rounded-xl p-2.5 text-left hover:bg-zinc-800/60 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                        <Instagram className="w-4 h-4 text-pink-400/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-zinc-300 truncate">{lead.name}</div>
                        <div className="text-xs text-zinc-600 truncate">
                          {lead.status} · {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={() => fetchAllLeads()}
          onUpdated={() => fetchAllLeads()}
          onDeleted={() => { setSelectedLead(null); fetchAllLeads(); }}
        />
      )}
    </div>
  );
}
