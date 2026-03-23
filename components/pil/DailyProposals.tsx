'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Rocket, Lightbulb, CheckCircle, XCircle, ExternalLink,
  ChevronDown, ChevronUp, Sparkles, Loader2, Code2, Zap,
  TrendingUp, Clock, Star, Play, RefreshCw, Settings,
  Search, ArrowUpCircle, BarChart3, Wifi, WifiOff, PenLine, X,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Innovation {
  id: string;
  title: string;
  originalConcept: string;
  altCtrlMutation: string;
  technicalArchitecture?: string;
  impactAnalysis?: string;
  businessValue?: string;
  opportunityScore: number;
  noveltyScore: number;
  feasibilityScore: number;
  implementationComplexity: string;
  estimatedImplementationDays: number;
  category: string;
  status: string;
  elevatedBy: string;
  createdAt: string;
  sourceUrl?: string;
  sourcePlatform?: string;
}

interface SchedulerConfig {
  enabled: boolean;
  mode: 'manual' | 'scheduled';
  schedule: { scoutIntervalHours: number; elevateIntervalHours: number; analysisIntervalHours: number };
  nextRunAt: string | null;
  lastRunAt: string | null;
  isRunning: boolean;
}

interface AgentEvent {
  eventType: string;
  impactDescription: string;
  createdAt: string;
}

interface RDMetrics {
  discoveries: number;
  innovations: { total: number; proposed: number; approved: number; implemented: number };
  averageOpportunityScore: string;
}

interface DailyProposalsProps { isDark: boolean }

// ─── Theme ─────────────────────────────────────────────────────────────────

const t = (isDark: boolean) => ({
  glass: isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white/60 border-white/40',
  card: isDark ? 'bg-zinc-900/60 border-zinc-800/60' : 'bg-white border-neutral-200',
  muted: isDark ? 'text-neutral-400' : 'text-neutral-500',
  main: isDark ? 'text-neutral-200' : 'text-neutral-800',
  heading: isDark ? 'text-neutral-100' : 'text-neutral-900',
  input: isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-neutral-300 text-neutral-900',
});

const complexityColors: Record<string, string> = {
  trivial: 'text-emerald-400', easy: 'text-green-400',
  medium: 'text-amber-400', hard: 'text-amber-400', epic: 'text-rose-400',
};

const scoreColor = (s: number) => s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : 'text-rose-400';

const platformIcons: Record<string, string> = {
  producthunt: '🚀', github: '⚫', hackernews: '🟠', twitter: '𝕏', arxiv: '📄',
};

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

// ─── Agent Card ────────────────────────────────────────────────────────────

function AgentCard({
  name, role, emoji, color, lastEvent, isRunning, isDark,
}: {
  name: string; role: string; emoji: string; color: string;
  lastEvent?: AgentEvent; isRunning: boolean; isDark: boolean;
}) {
  const th = t(isDark);
  let found = 0;
  let lastRan = '';

  if (lastEvent) {
    try {
      const parsed = JSON.parse(lastEvent.impactDescription);
      found = parsed.discoveriesFound ?? parsed.innovationsCreated ?? 0;
    } catch { found = 0; }
    lastRan = fmt(lastEvent.createdAt);
  }

  return (
    <div className={`${th.card} rounded-xl border p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <p className={`font-semibold text-sm ${th.heading}`}>{name}</p>
            <p className={`text-xs ${th.muted}`}>{role}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
          isRunning ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          {isRunning
            ? <><Loader2 size={11} className="animate-spin" /> En cours</>
            : <><Wifi size={11} /> Actif</>}
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-2 text-xs ${th.muted}`}>
        <div className={`${isDark ? 'bg-white/5' : 'bg-neutral-100'} rounded-lg p-2`}>
          <p className="mb-0.5">Dernière run</p>
          <p className={`font-medium ${th.main}`}>{lastRan || '—'}</p>
        </div>
        <div className={`${isDark ? 'bg-white/5' : 'bg-neutral-100'} rounded-lg p-2`}>
          <p className="mb-0.5">Trouvé</p>
          <p className={`font-bold text-base ${color}`}>{lastEvent ? found : '—'}</p>
        </div>
      </div>

      <div className={`text-xs ${th.muted}`}>
        Sources : {name === 'AbdulKhabir'
          ? '🟠 HackerNews · ⚫ GitHub · 🚀 Product Hunt'
          : '🔬 Discoveries pipeline'}
      </div>
    </div>
  );
}

// ─── Cycle Control ─────────────────────────────────────────────────────────

function CycleControl({ isDark }: { isDark: boolean }) {
  const th = t(isDark);
  const [config, setConfig] = useState<SchedulerConfig | null>(null);
  const [intervalHours, setIntervalHours] = useState(6);
  const [running, setRunning] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/rd/scheduler');
    const d = await res.json();
    if (d.success) {
      setConfig(d.data);
      setIntervalHours(d.data.schedule.scoutIntervalHours);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const trigger = async (action: string, label: string) => {
    setRunning(action);
    setMsg('');
    const res = await fetch('/api/rd/scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const d = await res.json();
    setMsg(d.success ? `✅ ${d.message || label + ' terminé'}` : `❌ ${d.error}`);
    setRunning(null);
    fetchConfig();
  };

  const saveInterval = async () => {
    await fetch('/api/rd/scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_config',
        config: { schedule: { scoutIntervalHours: intervalHours, elevateIntervalHours: intervalHours * 2, analysisIntervalHours: 24 } },
      }),
    });
    setMsg(`✅ Intervalle mis à jour : ${intervalHours}h`);
    fetchConfig();
  };

  const isRunning = config?.isRunning || running !== null;

  return (
    <div className={`${th.card} rounded-xl border p-4 space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold text-sm flex items-center gap-2 ${th.heading}`}>
          <Settings size={15} className="text-cyan-400" />
          Contrôle du Cycle R&D
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full ${
          isRunning ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-700/50 text-zinc-400'
        }`}>
          {isRunning ? '⚡ En exécution' : `Mode: ${config?.mode === 'manual' ? 'Manuel' : 'Auto'}`}
        </span>
      </div>

      {/* Stats rapides */}
      {config && (
        <div className={`grid grid-cols-2 gap-2 text-xs ${th.muted}`}>
          <div className={`${isDark ? 'bg-white/5' : 'bg-neutral-100'} rounded-lg p-2`}>
            <p className="mb-0.5">Dernière exécution</p>
            <p className={`font-medium ${th.main}`}>{config.lastRunAt ? fmt(config.lastRunAt) : 'Jamais'}</p>
          </div>
          <div className={`${isDark ? 'bg-white/5' : 'bg-neutral-100'} rounded-lg p-2`}>
            <p className="mb-0.5">Prochaine</p>
            <p className={`font-medium ${th.main}`}>{config.nextRunAt ? fmt(config.nextRunAt) : 'Non programmé'}</p>
          </div>
        </div>
      )}

      {/* Intervalle */}
      <div className="flex items-center gap-2">
        <label className={`text-xs ${th.muted} whitespace-nowrap`}>Intervalle scout :</label>
        <input
          type="number"
          min={1} max={72}
          value={intervalHours}
          onChange={e => setIntervalHours(Number(e.target.value))}
          className={`${th.input} border rounded-lg px-2 py-1 text-sm w-16 text-center`}
        />
        <span className={`text-xs ${th.muted}`}>h</span>
        <button
          onClick={saveInterval}
          className="px-3 py-1 text-xs rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors"
        >
          Sauvegarder
        </button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => trigger('trigger_scout', 'Scouting')}
          disabled={isRunning}
          className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
        >
          {running === 'trigger_scout'
            ? <Loader2 size={16} className="animate-spin" />
            : <Search size={16} />}
          Scout
        </button>
        <button
          onClick={() => trigger('trigger_elevate', 'Élévation')}
          disabled={isRunning}
          className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 hover:bg-fuchsia-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
        >
          {running === 'trigger_elevate'
            ? <Loader2 size={16} className="animate-spin" />
            : <ArrowUpCircle size={16} />}
          Élever
        </button>
        <button
          onClick={() => trigger('trigger_pipeline', 'Pipeline complet')}
          disabled={isRunning}
          className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
        >
          {running === 'trigger_pipeline'
            ? <Loader2 size={16} className="animate-spin" />
            : <Play size={16} />}
          Pipeline
        </button>
      </div>

      {msg && (
        <p className={`text-xs rounded-lg px-3 py-2 ${
          msg.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
        }`}>{msg}</p>
      )}
    </div>
  );
}

// ─── Innovation Card ────────────────────────────────────────────────────────

function InnovationCard({
  inn, isDark, isDispatched, onApprove, onReject, onApproveWithRefinement, isProcessing, expandedId, setExpandedId,
}: {
  inn: Innovation; isDark: boolean; isDispatched: boolean;
  onApprove: (id: string) => void; onReject: (id: string) => void;
  onApproveWithRefinement: (id: string) => void;
  isProcessing: boolean; expandedId: string | null; setExpandedId: (id: string | null) => void;
}) {
  const th = t(isDark);
  const isExpanded = expandedId === inn.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`${th.glass} backdrop-blur-xl rounded-2xl border overflow-hidden`}
    >
      <div className="p-4 cursor-pointer" role="button" tabIndex={0} aria-expanded={isExpanded} onClick={() => setExpandedId(isExpanded ? null : inn.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : inn.id); } }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span>{platformIcons[inn.sourcePlatform || 'github'] || '🔬'}</span>
              <h3 className={`font-semibold text-sm ${th.main}`}>
                {inn.title.replace('[SYSTEM_UPGRADE] ', '')}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className={`font-bold ${scoreColor(inn.opportunityScore)}`}>
                Score {inn.opportunityScore}/100
              </span>
              <span className={th.muted}>·</span>
              <span className={complexityColors[inn.implementationComplexity] || 'text-neutral-400'}>
                {inn.implementationComplexity} · {inn.estimatedImplementationDays}j
              </span>
              <span className={th.muted}>·</span>
              <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300">{inn.category}</span>
            </div>
          </div>
          <div className="shrink-0">
            {isExpanded ? <ChevronUp size={18} className={th.muted} /> : <ChevronDown size={18} className={th.muted} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="px-4 py-3 flex gap-4 bg-black/10 text-xs">
              <span className="flex items-center gap-1">
                <Star size={11} className="text-yellow-400" />
                Nouveauté <strong className="text-yellow-300 ml-1">{inn.noveltyScore}/10</strong>
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp size={11} className="text-cyan-400" />
                Faisabilité <strong className="text-cyan-300 ml-1">{inn.feasibilityScore}/10</strong>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} className="text-neutral-400" />
                {inn.estimatedImplementationDays}j
              </span>
              {inn.sourceUrl && (
                <a href={inn.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                  onClick={e => e.stopPropagation()}>
                  <ExternalLink size={11} /> Source
                </a>
              )}
            </div>

            <div className="p-4 bg-black/20">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb size={13} className="text-neutral-500" />
                <span className={`text-xs font-medium uppercase tracking-wider ${th.muted}`}>Signal détecté</span>
              </div>
              <p className={`text-sm italic ${th.muted}`}>{inn.originalConcept}</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-fuchsia-500/10 to-cyan-500/10 border-y border-fuchsia-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Rocket size={14} className="text-fuchsia-400" />
                <span className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider">Innovation Alt Ctrl Lab</span>
                <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-xs">Top 1%</span>
              </div>
              <p className={`text-sm ${th.main} leading-relaxed`}>{inn.altCtrlMutation}</p>

              {inn.technicalArchitecture && (
                <div className="mt-3 p-3 rounded-lg bg-black/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Code2 size={12} className="text-cyan-400" />
                    <span className="text-xs font-medium text-cyan-400">Stack technique</span>
                  </div>
                  <p className={`text-xs ${th.muted}`}>{inn.technicalArchitecture}</p>
                </div>
              )}

              {inn.businessValue && (
                <div className="mt-2 p-3 rounded-lg bg-emerald-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={12} className="text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">Valeur business</span>
                  </div>
                  <p className={`text-xs ${th.muted}`}>{inn.businessValue}</p>
                </div>
              )}
            </div>

            <div className="p-4 flex items-center justify-end gap-2 flex-wrap">
              <button onClick={() => onReject(inn.id)} disabled={isProcessing}
                className={`px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
                  ${isDark ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}
                  disabled:opacity-50`}>
                <XCircle size={14} /> Rejeter
              </button>

              {isDispatched ? (
                <div className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 bg-emerald-500/20 text-emerald-300">
                  <Loader2 size={14} className="animate-spin" /> War Room en cours...
                </div>
              ) : (
                <>
                  <button onClick={() => onApproveWithRefinement(inn.id)} disabled={isProcessing}
                    className={`px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
                      ${isDark ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}
                      disabled:opacity-50`}>
                    <PenLine size={14} /> Affiner & Approuver
                  </button>
                  <button onClick={() => onApprove(inn.id)} disabled={isProcessing}
                    className={`px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
                      ${isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}
                      disabled:opacity-50`}>
                    {isProcessing
                      ? <><Loader2 size={14} className="animate-spin" /> Traitement...</>
                      : <><CheckCircle size={14} /> Approuver → War Room</>}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const DailyProposals: React.FC<DailyProposalsProps> = ({ isDark }) => {
  const th = t(isDark);
  const [innovations, setInnovations] = useState<Innovation[]>([]);
  const [inProgress, setInProgress] = useState<Innovation[]>([]);
  const [metrics, setMetrics] = useState<RDMetrics | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [refinementModal, setRefinementModal] = useState<{ id: string; title: string } | null>(null);
  const [refinementText, setRefinementText] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [propRes, inpRes, metRes] = await Promise.all([
        fetch('/api/rd?action=innovations&status=proposed'),
        fetch('/api/rd?action=innovations&status=in_progress'),
        fetch('/api/rd/metrics?period=7d'),
      ]);
      const [propData, inpData, metData] = await Promise.all([
        propRes.json(), inpRes.json(), metRes.json(),
      ]);
      if (propData.success) setInnovations(propData.data.innovations || []);
      if (inpData.success) setInProgress(inpData.data.innovations || []);
      if (metData.success) {
        setMetrics(metData.data.summary);
        setEvents(metData.data.recentEvents || []);
      }
      // Sync scheduler running state
      const schRes = await fetch('/api/rd/scheduler');
      const schData = await schRes.json();
      if (schData.success) setSchedulerRunning(schData.data.isRunning);
    } catch (err) {
      console.error('RD fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 20000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const lastScoutEvent = events.find(e => e.eventType === 'scout_completed');
  const lastElevateEvent = events.find(e => e.eventType === 'elevate_completed');

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/rd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-innovation', payload: { innovationId: id } }),
      });
      const data = await res.json();
      if (data.success) {
        setDispatchedIds(prev => new Set(prev).add(id));
        setTimeout(fetchAll, 3000);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveWithRefinement = (id: string) => {
    const inn = innovations.find(i => i.id === id);
    setRefinementText('');
    setRefinementModal({ id, title: inn?.title.replace('[SYSTEM_UPGRADE] ', '') || '' });
  };

  const submitRefinement = async () => {
    if (!refinementModal || !refinementText.trim()) return;
    setProcessingId(refinementModal.id);
    setRefinementModal(null);
    try {
      const res = await fetch('/api/rd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve-with-refinement',
          payload: { innovationId: refinementModal.id, refinement: refinementText.trim() },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDispatchedIds(prev => new Set(prev).add(refinementModal.id));
        setTimeout(fetchAll, 3000);
      }
    } finally {
      setProcessingId(null);
      setRefinementText('');
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await fetch('/api/rd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject-innovation', payload: { innovationId: id } }),
      });
      await fetchAll();
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin text-fuchsia-400 w-8 h-8" />
      </div>
    );
  }

  return (
    <>
    {/* Refinement Modal */}
    {refinementModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setRefinementModal(null)}>
        <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <PenLine size={16} className="text-amber-400" /> Affiner avant approbation
              </h3>
              <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{refinementModal.title}</p>
            </div>
            <button onClick={() => setRefinementModal(null)} className="text-neutral-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Ta précision / directive complémentaire
            </label>
            <textarea
              autoFocus
              value={refinementText}
              onChange={e => setRefinementText(e.target.value)}
              placeholder="Ex: Concentre-toi sur l'intégration avec notre pipeline existant. Priorité à la vitesse d'exécution. Inclure une phase de test automatique..."
              rows={5}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
            />
            <p className="text-xs text-neutral-600">
              Cette précision sera ajoutée au brief envoyé au War Room et guidera l'implémentation.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setRefinementModal(null)}
              className="px-4 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors">
              Annuler
            </button>
            <button
              onClick={submitRefinement}
              disabled={!refinementText.trim()}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle size={14} /> Approuver avec précision → War Room
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="space-y-6 pb-6">

      {/* ── Header stats ─────────────────────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Découvertes', value: metrics.discoveries, color: 'text-cyan-400', icon: Search },
            { label: 'Innovations', value: metrics.innovations.total, color: 'text-fuchsia-400', icon: Brain },
            { label: 'En attente', value: metrics.innovations.proposed, color: 'text-amber-400', icon: Clock },
            { label: 'Score moyen', value: `${parseFloat(metrics.averageOpportunityScore).toFixed(0)}/100`, color: 'text-emerald-400', icon: BarChart3 },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className={`${th.card} rounded-xl border p-3 text-center`}>
              <Icon size={18} className={`${color} mx-auto mb-1`} />
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className={`text-xs ${th.muted}`}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Agent cards + Cycle control ──────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <AgentCard
          name="AbdulKhabir" role="Scout — Veille Web"
          emoji="🔭" color="text-cyan-400"
          lastEvent={lastScoutEvent}
          isRunning={schedulerRunning}
          isDark={isDark}
        />
        <AgentCard
          name="AbdulBasir" role="Elevateur — Analyse"
          emoji="⚗️" color="text-fuchsia-400"
          lastEvent={lastElevateEvent}
          isRunning={schedulerRunning}
          isDark={isDark}
        />
        <CycleControl isDark={isDark} />
      </div>

      {/* ── En cours d'implémentation ─────────────────────────────── */}
      {inProgress.length > 0 && (
        <div className="space-y-2">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${th.heading}`}>
            <Loader2 size={14} className="text-amber-400 animate-spin" />
            War Room en cours ({inProgress.length})
          </h3>
          {inProgress.map(inn => (
            <div key={inn.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${th.main}`}>
                  {inn.title.replace('[SYSTEM_UPGRADE] ', '')}
                </p>
                <p className={`text-xs ${th.muted} mt-0.5`}>
                  Score {inn.opportunityScore}/100 · Agents en exécution...
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <Loader2 size={12} className="animate-spin" /> War Room actif
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Propositions à valider ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-semibold flex items-center gap-2 ${th.heading}`}>
            <Sparkles size={18} className="text-fuchsia-400" />
            Innovations à valider ({innovations.length})
          </h2>
          <button onClick={fetchAll} className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${th.muted}`} aria-label="Actualiser">
            <RefreshCw size={14} />
          </button>
        </div>

        {innovations.length === 0 ? (
          <div className={`${th.glass} backdrop-blur-xl rounded-2xl border p-8 text-center`}>
            <Sparkles className="w-8 h-8 text-fuchsia-400 mx-auto mb-3" />
            <p className={`text-sm ${th.muted}`}>
              Aucune innovation en attente. Lance un cycle de scouting ci-dessus.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {innovations.map(inn => (
              <InnovationCard
                key={inn.id}
                inn={inn}
                isDark={isDark}
                isDispatched={dispatchedIds.has(inn.id)}
                onApprove={handleApprove}
                onReject={handleReject}
                onApproveWithRefinement={handleApproveWithRefinement}
                isProcessing={processingId === inn.id}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
    </>
  );
};

export default DailyProposals;
