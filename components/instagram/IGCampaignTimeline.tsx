'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Send, Search, Loader2, Sparkles, Copy, Check, ExternalLink } from 'lucide-react';
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
  profileUrl?: string;
  status: 'sending' | 'sent' | 'failed' | 'preview';
  error?: string;
  sentAt?: string;
  dmText?: string;
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700 hover:text-zinc-200'
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  );
}

function StepCircle({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  if (done) return (
    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    </div>
  );
  if (active) return (
    <div className="w-6 h-6 rounded-full bg-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-fuchsia-500/30">
      <span className="text-[10px] font-bold text-white">{n}</span>
    </div>
  );
  return (
    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-semibold text-zinc-400">{n}</span>
    </div>
  );
}

function StatusPill({ text, variant }: { text: string; variant: 'active' | 'done' | 'idle' }) {
  const cls =
    variant === 'done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : variant === 'active' ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 animate-pulse'
    : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/30';
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
            <span className={`text-xs font-semibold ${phase1Active || phase1Done ? 'text-zinc-100' : 'text-zinc-400'}`}>
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
            <Search className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-400 font-mono">"{data.searchQuery}"</span>
            {data.searchCount !== undefined && (
              <span className="text-[11px] text-fuchsia-400 font-semibold">→ {data.searchCount} trouvés</span>
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
              <span className={`text-xs font-semibold ${phase2Active || phase2Done ? 'text-zinc-100' : 'text-zinc-400'}`}>
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
                    p.passed ? 'text-zinc-200' : 'text-zinc-400'
                  }`}>
                    @{p.handle}
                  </span>
                  {p.passed && <ScoreBadge score={p.score} />}
                  {p.passed && p.followers !== undefined && (
                    <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">
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
              <span className={`text-xs font-semibold ${phase3Active || phase3Done ? 'text-zinc-100' : 'text-zinc-400'}`}>
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
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden"
                >
                  {/* Header */}
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 border-b border-zinc-800/60 ${
                    dm.status === 'sent' ? 'bg-emerald-500/5'
                    : dm.status === 'failed' ? 'bg-rose-500/5'
                    : dm.status === 'preview' ? 'bg-fuchsia-500/5'
                    : ''
                  }`}>
                    {dm.status === 'sent'
                      ? <Send className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      : dm.status === 'failed'
                      ? <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      : dm.status === 'preview'
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                      : <Loader2 className="w-3.5 h-3.5 text-fuchsia-400 animate-spin shrink-0" />
                    }
                    <span className="text-[11px] font-mono font-semibold flex-1 text-zinc-200 truncate">
                      @{dm.handle}
                    </span>
                    {dm.profileUrl && (
                      <a
                        href={dm.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-zinc-400 hover:text-fuchsia-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {dm.status === 'sent' && dm.sentAt && (
                      <span className="text-[10px] text-zinc-400 shrink-0">{dm.sentAt}</span>
                    )}
                    {dm.status === 'failed' && dm.error && (
                      <span className="text-[10px] text-rose-500 truncate max-w-[100px] shrink-0">{dm.error}</span>
                    )}
                  </div>

                  {/* DM text (preview ou sent) */}
                  {dm.dmText && (
                    <div className="px-3 py-2.5 space-y-2">
                      <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                        {dm.dmText}
                      </pre>
                      <div className="flex justify-end">
                        <CopyButton text={dm.dmText} />
                      </div>
                    </div>
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
                <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-[11px] text-zinc-400">Prochain DM dans</span>
                <span className="text-[11px] font-mono font-bold text-fuchsia-400 tabular-nums">{countdown}s</span>
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
              className="mx-1 px-3 py-3 rounded-xl bg-gradient-to-br from-fuchsia-500/5 to-fuchsia-500/5 border border-fuchsia-500/10"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-fuchsia-400" />
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Résumé</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-fuchsia-400 tabular-nums">{data.summary.sent}</span>
                  <span className="text-[11px] text-zinc-400">DMs envoyés</span>
                </div>
                <span className="text-zinc-700">·</span>
                <span className="text-[11px] text-zinc-400">{data.profiles.length} profils analysés</span>
                <span className="text-zinc-700">·</span>
                <span className="text-[11px] text-zinc-400">{data.summary.filtered} filtrés</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
