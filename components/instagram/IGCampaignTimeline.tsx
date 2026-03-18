'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Send, Search, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IGProfile {
  handle: string;
  score?: number;
  followers?: number;
  reason: string;
  passed: boolean;
}

export interface IGDMEntry {
  handle: string;
  status: 'sending' | 'sent' | 'failed';
  error?: string;
  sentAt?: string;
}

export interface IGTimelineData {
  phase: 'idle' | 'searching' | 'qualifying' | 'sending' | 'complete';
  plan?: { niche: string; ville: string; target: number };
  searchQuery?: string;
  searchCount?: number;
  profiles: IGProfile[];
  dms: IGDMEntry[];
  waitingSec: number;
  summary?: { sent: number; failed: number; filtered: number };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function ScoreBadge({ score }: { score?: number }) {
  if (!score) return null;
  const cls =
    score >= 70 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
    : score >= 50 ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
    : 'bg-rose-500/15 text-rose-400 border-rose-500/25';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold tabular-nums ${cls}`}>
      {score}/100
    </span>
  );
}

function StepCircle({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  if (done) return (
    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    </div>
  );
  if (active) return (
    <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/30">
      <span className="text-[10px] font-bold text-white">{n}</span>
    </div>
  );
  return (
    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-semibold text-zinc-600">{n}</span>
    </div>
  );
}

function StatusPill({ text, variant }: { text: string; variant: 'active' | 'done' | 'idle' }) {
  const cls =
    variant === 'done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : variant === 'active' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20 animate-pulse'
    : 'bg-zinc-800/60 text-zinc-600 border-zinc-700/30';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>{text}</span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  data: IGTimelineData;
  running: boolean;
}

export function IGCampaignTimeline({ data, running }: Props) {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setCountdown(data.waitingSec);
  }, [data.waitingSec]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const qualifiedCount = data.profiles.filter(p => p.passed).length;
  const sentCount = data.dms.filter(d => d.status === 'sent').length;
  const isComplete = data.phase === 'complete';

  const phase1Done = data.searchCount !== undefined;
  const phase1Active = !phase1Done && (data.phase === 'searching' || (running && data.phase !== 'idle'));
  const phase2Done = isComplete || data.phase === 'sending';
  const phase2Active = !phase2Done && data.profiles.length > 0;
  const phase3Done = isComplete;
  const phase3Active = !phase3Done && data.phase === 'sending';

  return (
    <div className="py-3 space-y-0">

      {/* ── Phase 1: Recherche ──────────────────────────────────────────── */}
      <div className="px-1">
        <div className="flex items-center gap-2.5">
          <StepCircle n={1} active={phase1Active} done={phase1Done} />
          <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
            <span className={`text-xs font-semibold ${phase1Active || phase1Done ? 'text-zinc-100' : 'text-zinc-600'}`}>
              Recherche
            </span>
            <StatusPill
              text={phase1Done ? `✓ ${data.searchCount} profils` : phase1Active ? 'En cours...' : '—'}
              variant={phase1Done ? 'done' : phase1Active ? 'active' : 'idle'}
            />
          </div>
        </div>

        {data.searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-8 mt-2 flex items-center gap-2"
          >
            <Search className="w-3 h-3 text-zinc-600 shrink-0" />
            <span className="text-[11px] text-zinc-500 font-mono">"{data.searchQuery}"</span>
            {data.searchCount !== undefined && (
              <span className="text-[11px] text-pink-400 font-semibold">→ {data.searchCount} trouvés</span>
            )}
          </motion.div>
        )}
      </div>

      {/* connector */}
      {(data.profiles.length > 0 || phase2Active || phase2Done) && (
        <div className="ml-4 w-px h-3 bg-zinc-800/80" />
      )}

      {/* ── Phase 2: Qualification ──────────────────────────────────────── */}
      {(data.profiles.length > 0 || phase2Active) && (
        <div className="px-1">
          <div className="flex items-center gap-2.5">
            <StepCircle n={2} active={phase2Active} done={phase2Done} />
            <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
              <span className={`text-xs font-semibold ${phase2Active || phase2Done ? 'text-zinc-100' : 'text-zinc-600'}`}>
                Qualification
              </span>
              <StatusPill
                text={phase2Done ? `✓ ${qualifiedCount} qualifiés` : phase2Active ? `${data.profiles.length} analysés...` : '—'}
                variant={phase2Done ? 'done' : phase2Active ? 'active' : 'idle'}
              />
            </div>
          </div>

          <div className="ml-8 mt-2 space-y-1">
            <AnimatePresence mode="popLayout">
              {data.profiles.map((p, i) => (
                <motion.div
                  key={p.handle}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.06, 0.4) }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
                    p.passed
                      ? 'bg-emerald-500/5 border-emerald-500/10'
                      : 'bg-zinc-900/40 border-zinc-800/40'
                  }`}
                >
                  {p.passed
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                  }
                  <span className={`text-[11px] font-mono font-semibold flex-1 min-w-0 truncate ${
                    p.passed ? 'text-zinc-200' : 'text-zinc-600'
                  }`}>
                    @{p.handle}
                  </span>
                  {p.passed && <ScoreBadge score={p.score} />}
                  {p.passed && p.followers !== undefined && (
                    <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
                      {formatFollowers(p.followers)}
                    </span>
                  )}
                  {!p.passed && p.reason && (
                    <span className="text-[10px] text-zinc-700 truncate max-w-[110px] shrink-0">
                      {p.reason.replace('REJETÉ — ', '').replace('Lien agrégateur détecté ', '').split(' — ')[0]}
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* connector */}
      {(data.dms.length > 0 || phase3Active || (phase2Done && !isComplete)) && (
        <div className="ml-4 w-px h-3 bg-zinc-800/80" />
      )}

      {/* ── Phase 3: Envoi DMs ──────────────────────────────────────────── */}
      {(data.dms.length > 0 || phase3Active) && (
        <div className="px-1">
          <div className="flex items-center gap-2.5">
            <StepCircle n={3} active={phase3Active} done={phase3Done} />
            <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
              <span className={`text-xs font-semibold ${phase3Active || phase3Done ? 'text-zinc-100' : 'text-zinc-600'}`}>
                Envoi DMs
              </span>
              <StatusPill
                text={isComplete ? `✓ ${sentCount} envoyés` : phase3Active ? `${sentCount} / ${data.plan?.target ?? '?'}` : '—'}
                variant={isComplete ? 'done' : phase3Active ? 'active' : 'idle'}
              />
            </div>
          </div>

          <div className="ml-8 mt-2 space-y-1">
            <AnimatePresence mode="popLayout">
              {data.dms.map((dm, i) => (
                <motion.div
                  key={`${dm.handle}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
                    dm.status === 'sent' ? 'bg-emerald-500/5 border-emerald-500/10'
                    : dm.status === 'failed' ? 'bg-rose-500/5 border-rose-500/10'
                    : 'bg-zinc-900/40 border-zinc-800/40'
                  }`}
                >
                  {dm.status === 'sent'
                    ? <Send className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    : dm.status === 'failed'
                    ? <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    : <Loader2 className="w-3.5 h-3.5 text-pink-400 animate-spin shrink-0" />
                  }
                  <span className="text-[11px] font-mono font-semibold flex-1 text-zinc-200 truncate">
                    @{dm.handle}
                  </span>
                  {dm.status === 'sent' && (
                    <span className="text-[10px] text-emerald-500 font-medium shrink-0">Envoyé</span>
                  )}
                  {dm.status === 'sent' && dm.sentAt && (
                    <span className="text-[10px] text-zinc-600 shrink-0">{dm.sentAt}</span>
                  )}
                  {dm.status === 'failed' && dm.error && (
                    <span className="text-[10px] text-rose-500 truncate max-w-[120px] shrink-0">
                      {dm.error}
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Countdown inter-DMs */}
            {countdown > 0 && running && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/40 border border-zinc-800/40"
              >
                <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <span className="text-[11px] text-zinc-600">Prochain DM dans</span>
                <span className="text-[11px] font-mono font-bold text-pink-400 tabular-nums">{countdown}s</span>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* ── Résumé final ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isComplete && data.summary && (
          <>
            <div className="ml-4 w-px h-3 bg-zinc-800/80" />
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-1 px-3 py-3 rounded-xl bg-gradient-to-br from-pink-500/5 to-purple-500/5 border border-pink-500/10"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-pink-400" />
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Résumé</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-pink-400 tabular-nums">{data.summary.sent}</span>
                  <span className="text-[11px] text-zinc-500">DMs envoyés</span>
                </div>
                <span className="text-zinc-700">·</span>
                <span className="text-[11px] text-zinc-500">{data.profiles.length} profils analysés</span>
                <span className="text-zinc-700">·</span>
                <span className="text-[11px] text-zinc-500">{data.summary.filtered} filtrés</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
