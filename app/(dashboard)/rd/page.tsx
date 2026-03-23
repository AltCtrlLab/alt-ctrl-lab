'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Brain, Zap, Lightbulb, Telescope,
  CheckCircle2, AlertCircle, Clock, Loader2,
  ExternalLink, RefreshCw, Play, Target, ArrowRight,
  Sparkles, Activity, BookOpen, GitBranch, X, Filter,
  Copy, ChevronRight, Send, Ban, PenLine,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineStep {
  id: string; label: string;
  status: 'pending' | 'running' | 'done' | 'warn' | 'error';
  detail?: string; ts?: number;
}
interface Innovation {
  id: string; title: string; opportunityScore: number | null; status: string;
  category: string | null; implementationComplexity: string | null;
  altCtrlMutation: string | null; impactAnalysis: string | null;
  technicalArchitecture: string | null; tags: string | null;
  businessValue: string | null; estimatedImplementationDays: number | null;
  createdAt: number;
}
interface Discovery {
  id: string; rawTitle: string; extractedConcept: string; sourcePlatform: string;
  sourceUrl: string; engagementScore: number | null; status: string; discoveredAt: number;
}
interface Pattern {
  id: string; title: string; patternType: string; description: string;
  evidenceCount: number; trendDirection: string | null; actionable: number;
  suggestedAction: string | null; status: string; createdAt: number;
}
interface BusinessInsight {
  id: string; topic: string; source?: string; insight: string; recommendation: string;
  priority: number; applied: number; status: string; note?: string;
  rejected: number; readAt?: number; createdAt: number;
}
interface Stats { discoveries: number; innovations: number; patterns: number; insights: number; }

// ─── Constants ────────────────────────────────────────────────────────────────

const TOPICS = [
  { id: 'instagram-acquisition', label: 'Acquisition Instagram', icon: '📸', color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30' },
  { id: 'dm-copywriting', label: 'Copywriting DM', icon: '✍️', color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30' },
  { id: 'conversion-funnel', label: 'Tunnel de conversion', icon: '🎯', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'internal-analysis', label: 'Opérations internes', icon: '⚙️', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
];

const PIPELINE_STEPS = [
  { id: 'scout', label: 'Scout', desc: 'Scrape les sources tech', icon: Telescope, color: 'text-cyan-400', accent: 'border-cyan-500/30 bg-cyan-500/5' },
  { id: 'elevate', label: 'Élever', desc: 'Mutation IA Top 1%', icon: TrendingUp, color: 'text-fuchsia-400', accent: 'border-fuchsia-500/30 bg-fuchsia-500/5' },
  { id: 'analyze', label: 'Analyser', desc: 'Patterns & tendances', icon: Brain, color: 'text-emerald-400', accent: 'border-emerald-500/30 bg-emerald-500/5' },
];

const COMPLEXITY_COLOR: Record<string, string> = {
  trivial: 'text-emerald-400 bg-emerald-500/10',
  easy: 'text-cyan-400 bg-cyan-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  hard: 'text-amber-400 bg-amber-500/10',
  epic: 'text-rose-400 bg-rose-500/10',
};
const STATUS_COLOR: Record<string, string> = {
  proposed: 'text-amber-400 bg-amber-500/10',
  ceo_review: 'text-fuchsia-400 bg-fuchsia-500/10',
  approved: 'text-emerald-400 bg-emerald-500/10',
  in_progress: 'text-cyan-400 bg-cyan-500/10',
  implemented: 'text-cyan-400 bg-cyan-500/10',
  rejected: 'text-rose-400 bg-rose-500/10',
};
const STATUS_LABEL: Record<string, string> = {
  proposed: 'Proposé', ceo_review: 'En révision', approved: 'Approuvé',
  in_progress: 'En cours', implemented: 'Implémenté', rejected: 'Rejeté', all: 'Tous',
};
const PLATFORM_ICON: Record<string, string> = {
  producthunt: '🚀', github: '🐙', hackernews: '🟠', arxiv: '📄',
  reddit: '👽', twitter: '🐦', blog: '📝', youtube: '▶️', discord: '💬',
};
const TREND_COLOR: Record<string, string> = {
  rising: 'text-emerald-400 bg-emerald-500/10',
  stable: 'text-cyan-400 bg-cyan-500/10',
  declining: 'text-rose-400 bg-rose-500/10',
};

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number | null }) {
  const s = Math.round(score ?? 0);
  const color = s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : s >= 40 ? '#f97316' : '#ef4444';
  const r = 18; const circumference = 2 * Math.PI * r;
  const dash = (s / 100) * circumference;
  return (
    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="28" cy="28" r={r} stroke="#27272a" strokeWidth="4" fill="none" />
        <circle cx="28" cy="28" r={r} stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
      </svg>
      <span className="text-xs font-bold" style={{ color }}>{s}</span>
    </div>
  );
}

// ─── Innovation Modal ─────────────────────────────────────────────────────────

function InnovationModal({ innovation, onClose, onApprove, onReject }: {
  innovation: Innovation; onClose: () => void;
  onApprove: (id: string) => void; onReject: (id: string) => void;
}) {
  const tags: string[] = (() => { try { return JSON.parse(innovation.tags || '[]'); } catch { return []; } })();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 border border-zinc-700/60 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <ScoreRing score={innovation.opportunityScore} />
            <div>
              <h3 className="text-base font-bold text-zinc-100 leading-snug">{innovation.title}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {innovation.status && <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[innovation.status] || 'bg-zinc-800 text-zinc-400'}`}>{STATUS_LABEL[innovation.status] || innovation.status}</span>}
                {innovation.category && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{innovation.category}</span>}
                {innovation.implementationComplexity && <span className={`text-xs px-2 py-0.5 rounded-full ${COMPLEXITY_COLOR[innovation.implementationComplexity] || 'bg-zinc-800 text-zinc-400'}`}>{innovation.implementationComplexity}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-300 transition-colors shrink-0" aria-label="Fermer"><X className="w-4 h-4" /></button>
        </div>
        {innovation.altCtrlMutation && (
          <div className="mb-4 p-3 rounded-xl bg-fuchsia-500/5 border border-fuchsia-500/20">
            <p className="text-xs font-semibold text-fuchsia-400 mb-1">Mutation AltCtrl.Lab</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{innovation.altCtrlMutation}</p>
          </div>
        )}
        {innovation.impactAnalysis && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-zinc-400 mb-1.5">Impact</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{innovation.impactAnalysis}</p>
          </div>
        )}
        {innovation.technicalArchitecture && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-zinc-400 mb-1.5">Architecture technique</p>
            <p className="text-sm text-zinc-400 leading-relaxed font-mono whitespace-pre-wrap">{innovation.technicalArchitecture}</p>
          </div>
        )}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {innovation.businessValue && <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{innovation.businessValue}</span>}
          {innovation.estimatedImplementationDays && <span className="text-xs text-zinc-400">{innovation.estimatedImplementationDays}j estimés</span>}
          {tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{t}</span>)}
        </div>
        {innovation.status === 'proposed' && (
          <div className="flex gap-3 pt-4 border-t border-zinc-800">
            <button onClick={() => onApprove(innovation.id)} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Approuver
            </button>
            <button onClick={() => onReject(innovation.id)} className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <X className="w-4 h-4" /> Rejeter
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RDPage() {
  // Pipeline
  const [running, setRunning] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [, setLogOpen] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Data
  const [stats, setStats] = useState<Stats>({ discoveries: 0, innovations: 0, patterns: 0, insights: 0 });
  const [innovationsList, setInnovationsList] = useState<Innovation[]>([]);
  const [discoveriesList, setDiscoveriesList] = useState<Discovery[]>([]);
  const [patternsList, setPatternsList] = useState<Pattern[]>([]);
  const [insightsList, setInsightsList] = useState<BusinessInsight[]>([]);

  // UI
  const [activeTab, setActiveTab] = useState<'insights' | 'innovations' | 'discoveries' | 'patterns'>('insights');
  const [innovFilter, setInnovFilter] = useState<string>('all');
  const [selectedInnovation, setSelectedInnovation] = useState<Innovation | null>(null);
  const [selectedTopic, setSelectedTopic] = useState('instagram-acquisition');

  // Insight detail + filters
  const [selectedInsight, setSelectedInsight] = useState<BusinessInsight | null>(null);
  const [insightFilter, setInsightFilter] = useState<'all' | 'new' | 'applied' | 'rejected'>('all');
  const [insightPriority, setInsightPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [insightSearch, setInsightSearch] = useState('');
  const [insightNote, setInsightNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [taskToast, setTaskToast] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [ovRes, innovRes, discRes, patRes, insRes] = await Promise.all([
        fetch('/api/rd?action=overview'),
        fetch('/api/rd?action=innovations&status=all&limit=50'),
        fetch('/api/rd?action=discoveries&limit=30'),
        fetch('/api/rd?action=patterns'),
        fetch('/api/rd?action=insights'),
      ]);
      const [ov, innov, disc, pat, ins] = await Promise.all([
        ovRes.json(), innovRes.json(), discRes.json(), patRes.json(), insRes.json(),
      ]);
      if (ov.success) setStats(s => ({
        ...s,
        discoveries: Number(ov.data.stats.totalDiscoveries),
        innovations: Number(ov.data.stats.totalInnovations),
        patterns: Number(ov.data.stats.totalPatterns),
      }));
      if (innov.success) setInnovationsList(innov.data.innovations || []);
      if (disc.success) setDiscoveriesList(disc.data.discoveries || []);
      if (pat.success) setPatternsList(pat.data.patterns || []);
      if (ins.success) {
        setInsightsList(ins.data.insights || []);
        setStats(s => ({ ...s, insights: ins.data.insights?.length || 0 }));
      }
    } catch (err) { console.error('Failed to fetch R&D data:', err); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [pipelineSteps]);

  // ── Run action via SSE ──────────────────────────────────────────────────────

  const runAction = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    if (running) return;
    setRunning(true);
    setActiveAction(action);
    setPipelineSteps([]);
    setLogOpen(true);

    try {
      const res = await fetch('/api/rd/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            if (ev.type === 'step') {
              // Upsert le step dans la liste (running → done/warn/error)
              setPipelineSteps(prev => {
                const existing = prev.findIndex(s => s.id === ev.id);
                const entry: PipelineStep = { id: ev.id, label: ev.label, status: ev.status, detail: ev.detail, ts: ev.ts };
                if (existing >= 0) { const next = [...prev]; next[existing] = entry; return next; }
                return [...prev, entry];
              });
            } else if (ev.type === 'insights') {
              // Insights reçus directement du VPS via le stream → plus besoin de fetch
              setInsightsList(ev.insights || []);
              setStats(s => ({ ...s, insights: (ev.insights || []).length }));
              setSelectedTopic(ev.topic || selectedTopic);
              setActiveTab('insights');
            } else if (ev.type === 'stats') {
              setStats(s => ({ ...s, discoveries: ev.discoveries ?? s.discoveries, innovations: ev.innovations ?? s.innovations, patterns: ev.patterns ?? s.patterns }));
            } else if (ev.type === 'done') {
              setTimeout(fetchAll, 500);
            }
          } catch { /* malformed */ }
        }
      }
    } catch (err: any) {
      setPipelineSteps(prev => [...prev, { id: 'error', label: 'Erreur', status: 'error', detail: err.message, ts: Date.now() }]);
    } finally {
      setRunning(false);
      setActiveAction(null);
    }
  }, [running, fetchAll]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleApprove = async (id: string) => {
    await fetch('/api/rd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve-innovation', payload: { innovationId: id } }) });
    setSelectedInnovation(null);
    fetchAll();
  };
  const handleReject = async (id: string) => {
    await fetch('/api/rd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject-innovation', payload: { innovationId: id, reason: 'Rejeté via dashboard' } }) });
    setSelectedInnovation(null);
    fetchAll();
  };
  const handleApplyInsight = async (id: string) => {
    await fetch('/api/rd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'business-intel', payload: { action: 'apply', id } }) });
    setInsightsList(prev => prev.map(i => i.id === id ? { ...i, applied: 1, status: 'applied' } : i));
    if (selectedInsight?.id === id) setSelectedInsight(prev => prev ? { ...prev, applied: 1, status: 'applied' } : null);
  };

  const handleOpenInsight = async (ins: BusinessInsight) => {
    setSelectedInsight(ins);
    setInsightNote(ins.note ?? '');
    if (ins.status === 'new' || !ins.status) {
      await fetch('/api/rd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read-insight', payload: { insightId: ins.id } }) });
      setInsightsList(prev => prev.map(i => i.id === ins.id ? { ...i, status: 'read' } : i));
    }
  };

  const handleRejectInsight = async (id: string) => {
    await fetch('/api/rd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject-insight', payload: { insightId: id } }) });
    setInsightsList(prev => prev.map(i => i.id === id ? { ...i, rejected: 1, status: 'rejected' } : i));
    setSelectedInsight(null);
  };

  const handleSaveNote = async (id: string, note: string) => {
    setSavingNote(true);
    await fetch('/api/rd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'note-insight', payload: { insightId: id, note } }) });
    setInsightsList(prev => prev.map(i => i.id === id ? { ...i, note } : i));
    if (selectedInsight?.id === id) setSelectedInsight(prev => prev ? { ...prev, note } : null);
    setSavingNote(false);
  };

  const handleCreateTask = async (ins: BusinessInsight) => {
    setCreatingTask(true);
    try {
      await fetch('/api/rd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        action: 'create-task-from-insight',
        payload: { insightId: ins.id, insightText: ins.insight, recommendation: ins.recommendation, topic: ins.topic, priority: ins.priority },
      }) });
      setInsightsList(prev => prev.map(i => i.id === ins.id ? { ...i, applied: 1, status: 'applied' } : i));
      if (selectedInsight?.id === ins.id) setSelectedInsight(prev => prev ? { ...prev, applied: 1, status: 'applied' } : null);
      setTaskToast('Tâche créée dans le War Room !');
      setTimeout(() => setTaskToast(null), 3000);
    } catch (err) { console.error('Failed to create task from insight:', err); }
    setCreatingTask(false);
  };

  const handleCopyReco = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filteredInnovations = innovFilter === 'all' ? innovationsList : innovationsList.filter(i => i.status === innovFilter);

  const topicInsights = insightsList.filter(i => i.topic === selectedTopic);
  const filteredInsights = topicInsights.filter(ins => {
    if (insightFilter === 'new' && (ins.status === 'applied' || ins.status === 'rejected' || ins.applied)) return false;
    if (insightFilter === 'applied' && ins.status !== 'applied' && !ins.applied) return false;
    if (insightFilter === 'rejected' && ins.status !== 'rejected') return false;
    if (insightPriority === 'high' && ins.priority < 8) return false;
    if (insightPriority === 'medium' && (ins.priority < 5 || ins.priority > 7)) return false;
    if (insightPriority === 'low' && ins.priority > 4) return false;
    if (insightSearch) {
      const q = insightSearch.toLowerCase();
      if (!ins.insight.toLowerCase().includes(q) && !ins.recommendation.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const insightStats = {
    total: topicInsights.length,
    newCount: topicInsights.filter(i => !i.status || i.status === 'new' || i.status === 'read').filter(i => !i.applied && !i.rejected).length,
    applied: topicInsights.filter(i => i.applied || i.status === 'applied').length,
    rejected: topicInsights.filter(i => i.rejected || i.status === 'rejected').length,
  };

  // ── Priority helpers ─────────────────────────────────────────────────────────

  const priorityBg = (p: number) =>
    p >= 8 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
    p >= 5 ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' :
             'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';

  const statusBadge = (ins: BusinessInsight) => {
    if (ins.rejected || ins.status === 'rejected') return { label: 'Rejeté', cls: 'bg-zinc-800/80 text-zinc-400' };
    if (ins.applied || ins.status === 'applied') return { label: 'Appliqué', cls: 'bg-emerald-500/10 text-emerald-400' };
    if (ins.status === 'read') return { label: 'Lu', cls: 'bg-zinc-700/60 text-zinc-400' };
    return { label: 'Nouveau', cls: 'bg-cyan-500/10 text-cyan-400' };
  };

  // ── Insight Detail Drawer ─────────────────────────────────────────────────────

  const InsightDrawer = selectedInsight && (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedInsight(null)} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-xl bg-zinc-900 border-l border-zinc-700/60 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${priorityBg(selectedInsight.priority)}`}>
              P{selectedInsight.priority}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(selectedInsight).cls}`}>
              {statusBadge(selectedInsight).label}
            </span>
            <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-800/60">
              {TOPICS.find(t => t.id === selectedInsight.topic)?.icon} {TOPICS.find(t => t.id === selectedInsight.topic)?.label || selectedInsight.topic}
            </span>
          </div>
          <button onClick={() => setSelectedInsight(null)} className="p-1.5 text-zinc-400 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Insight */}
          <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/40 p-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Insight</span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">{selectedInsight.insight}</p>
            {selectedInsight.source && (
              <p className="text-xs text-zinc-400 mt-2">Source : {selectedInsight.source} · {new Date(selectedInsight.createdAt).toLocaleDateString('fr-FR')}</p>
            )}
          </div>

          {/* Recommandation */}
          <div className="rounded-xl bg-fuchsia-500/5 border border-fuchsia-500/20 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wide">Recommandation AltCtrl.Lab</span>
              </div>
              <button
                onClick={() => handleCopyReco(selectedInsight.id, selectedInsight.recommendation)}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-fuchsia-400 transition-colors"
              >
                {copiedId === selectedInsight.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === selectedInsight.id ? 'Copié' : 'Copier'}
              </button>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{selectedInsight.recommendation}</p>
          </div>

          {/* Note CEO */}
          <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/30 p-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <PenLine className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Note CEO</span>
            </div>
            <textarea
              value={insightNote}
              onChange={e => setInsightNote(e.target.value)}
              placeholder="Ajouter une note personnelle sur cet insight..."
              rows={3}
              className="w-full bg-zinc-900/60 border border-zinc-700/40 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => handleSaveNote(selectedInsight.id, insightNote)}
                disabled={savingNote || insightNote === (selectedInsight.note ?? '')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-200 rounded-lg transition-colors"
              >
                {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>

        {/* Drawer footer — Actions */}
        <div className="shrink-0 px-5 py-4 border-t border-zinc-800/60 space-y-2">
          {!(selectedInsight.applied || selectedInsight.status === 'applied') && !(selectedInsight.rejected || selectedInsight.status === 'rejected') && (
            <button
              onClick={() => handleApplyInsight(selectedInsight.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Marquer comme appliqué
            </button>
          )}
          <button
            onClick={() => handleCreateTask(selectedInsight)}
            disabled={creatingTask}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Créer une tâche War Room
          </button>
          {!(selectedInsight.rejected || selectedInsight.status === 'rejected') && (
            <button
              onClick={() => handleRejectInsight(selectedInsight.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 hover:border-rose-500/40 border border-zinc-700/40 text-zinc-400 hover:text-rose-400 text-sm font-medium transition-all"
            >
              <Ban className="w-4 h-4" /> Rejeter cet insight
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-zinc-100">Recherche &amp; Développement</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Intelligence continue — tech &amp; acquisition</p>
          </div>
          <div className="flex items-center gap-2">
            {running && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeAction === 'pipeline' ? 'Pipeline en cours...' : `${activeAction}...`}
              </span>
            )}
            <button onClick={fetchAll} className="p-2 text-zinc-400 hover:text-zinc-300 transition-colors" title="Actualiser" aria-label="Actualiser">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── KPI Bar ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Insights métier', value: stats.insights, icon: Lightbulb, color: 'text-amber-400', accent: 'from-amber-500/5' },
            { label: 'Innovations', value: stats.innovations, icon: Zap, color: 'text-fuchsia-400', accent: 'from-fuchsia-500/5' },
            { label: 'Découvertes', value: stats.discoveries, icon: Telescope, color: 'text-cyan-400', accent: 'from-cyan-500/5' },
            { label: 'Patterns', value: stats.patterns, icon: GitBranch, color: 'text-emerald-400', accent: 'from-emerald-500/5' },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-xl border border-zinc-800/60 bg-gradient-to-br ${kpi.accent} to-zinc-900/50 p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400">{kpi.label}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Pipeline Control ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-fuchsia-400" />
              Pipeline R&amp;D
            </h2>
            <button
              onClick={() => runAction('pipeline')}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {running && activeAction === 'pipeline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Pipeline complet
            </button>
          </div>
          <div className="flex items-center gap-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isCurrentStep = running && (activeAction === step.id || activeAction === 'pipeline');
              return (
                <div key={step.id} className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => runAction(step.id)}
                    disabled={running}
                    className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${
                      isCurrentStep
                        ? `${step.accent} border-current/40`
                        : `border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700`
                    } disabled:opacity-60`}
                  >
                    {isCurrentStep
                      ? <Loader2 className={`w-5 h-5 ${step.color} animate-spin shrink-0`} />
                      : <Icon className={`w-5 h-5 ${step.color} opacity-70 shrink-0`} />
                    }
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isCurrentStep ? step.color : 'text-zinc-200'}`}>{step.label}</p>
                      <p className="text-xs text-zinc-400 truncate">{step.desc}</p>
                    </div>
                  </button>
                  {idx < PIPELINE_STEPS.length - 1 && <ArrowRight className="w-4 h-4 text-zinc-700 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Pipeline Progress ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {(running || pipelineSteps.length > 0) && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border border-zinc-700/40 bg-zinc-900/50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${running ? 'bg-fuchsia-400 animate-pulse' : 'bg-zinc-600'}`} />
                <span className="text-xs font-semibold text-zinc-300">
                  {running ? 'Pipeline en cours...' : 'Dernière exécution'}
                </span>
                <button onClick={() => setPipelineSteps([])} className="ml-auto text-zinc-400 hover:text-zinc-400 transition-colors" title="Effacer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                {pipelineSteps.map((s, i) => (
                  <motion.div key={s.id + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      s.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/15' :
                      s.status === 'running' ? 'bg-fuchsia-500/5 border-fuchsia-500/20' :
                      s.status === 'warn' ? 'bg-amber-500/5 border-amber-500/15' :
                      s.status === 'error' ? 'bg-rose-500/5 border-rose-500/15' :
                      'bg-zinc-800/20 border-zinc-800/40'
                    }`}>
                    <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center">
                      {s.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {s.status === 'running' && <Loader2 className="w-4 h-4 text-fuchsia-400 animate-spin" />}
                      {s.status === 'warn' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                      {s.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                      {s.status === 'pending' && <Clock className="w-4 h-4 text-zinc-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${
                        s.status === 'done' ? 'text-emerald-300' :
                        s.status === 'running' ? 'text-fuchsia-300' :
                        s.status === 'warn' ? 'text-amber-300' :
                        s.status === 'error' ? 'text-rose-300' : 'text-zinc-400'
                      }`}>{s.label}</span>
                      {s.detail && <p className="text-xs text-zinc-400 mt-0.5 truncate">{s.detail}</p>}
                    </div>
                    {s.ts && (
                      <span className="text-xs text-zinc-400 shrink-0">
                        {new Date(s.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </motion.div>
                ))}
                {running && pipelineSteps.length === 0 && (
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Loader2 className="w-4 h-4 text-fuchsia-400 animate-spin shrink-0" />
                    <span className="text-sm text-zinc-400">Démarrage...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-zinc-800">
          {([
            { id: 'insights', label: 'Intelligence Métier', icon: Lightbulb, count: stats.insights },
            { id: 'innovations', label: 'Innovations', icon: Zap, count: stats.innovations },
            { id: 'discoveries', label: 'Découvertes', icon: Telescope, count: stats.discoveries },
            { id: 'patterns', label: 'Patterns', icon: GitBranch, count: stats.patterns },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-fuchsia-400 text-fuchsia-300' : 'border-transparent text-zinc-400 hover:text-zinc-300'
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-zinc-800 text-zinc-400'}`}>{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* ── Tab: Intelligence Métier ──────────────────────────────────────── */}
        {activeTab === 'insights' && (
          <div className="space-y-4">

            {/* Topic pills + Analyser */}
            <div className="flex flex-wrap items-center gap-2">
              {TOPICS.map(t => (
                <button key={t.id} onClick={() => { setSelectedTopic(t.id); setInsightFilter('all'); setInsightSearch(''); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-all ${
                    selectedTopic === t.id ? t.color + ' font-medium' : 'border-zinc-800/60 bg-zinc-900/30 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
                  }`}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
              <button
                onClick={() => runAction('business-intel', { topic: selectedTopic })}
                disabled={running}
                className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {running && activeAction === 'business-intel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Analyser
              </button>
            </div>

            {/* Stats mini-bar */}
            {insightStats.total > 0 && (
              <div className="flex items-center gap-4 text-xs text-zinc-400 px-1">
                <span className="text-cyan-400 font-medium">🆕 {insightStats.newCount} nouveaux</span>
                <span>·</span>
                <span className="text-emerald-400">✅ {insightStats.applied} appliqués</span>
                <span>·</span>
                <span className="text-rose-400">❌ {insightStats.rejected} rejetés</span>
                <span>·</span>
                <span>📊 {insightStats.total} total</span>
              </div>
            )}

            {/* Filter bar */}
            {insightStats.total > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un insight..."
                    value={insightSearch}
                    onChange={e => setInsightSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-800/60 border border-zinc-700/40 rounded-lg text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div className="flex items-center gap-1 bg-zinc-800/40 rounded-lg p-0.5">
                  {(['all', 'new', 'applied', 'rejected'] as const).map(f => (
                    <button key={f} onClick={() => setInsightFilter(f)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${insightFilter === f ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-400 hover:text-zinc-300'}`}>
                      {f === 'all' ? 'Tous' : f === 'new' ? 'Nouveaux' : f === 'applied' ? 'Appliqués' : 'Rejetés'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-zinc-800/40 rounded-lg p-0.5">
                  {(['all', 'high', 'medium', 'low'] as const).map(f => (
                    <button key={f} onClick={() => setInsightPriority(f)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${insightPriority === f ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-400 hover:text-zinc-300'}`}>
                      {f === 'all' ? 'Priorité' : f === 'high' ? 'P8+' : f === 'medium' ? 'P5-7' : 'P1-4'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Insights list */}
            {topicInsights.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-12 text-center">
                <Lightbulb className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 mb-1">Aucun insight pour ce topic</p>
                <p className="text-xs text-zinc-400 mb-4">Lance une analyse IA pour générer des insights personnalisés.</p>
                <button onClick={() => runAction('business-intel', { topic: selectedTopic })} disabled={running}
                  className="text-xs px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg transition-colors">
                  Analyser maintenant
                </button>
              </div>
            ) : filteredInsights.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-8 text-center">
                <Filter className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Aucun insight ne correspond aux filtres actifs.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredInsights.sort((a, b) => b.priority - a.priority).map(insight => {
                  const badge = statusBadge(insight);
                  const isRejected = insight.rejected || insight.status === 'rejected';
                  const isApplied = insight.applied || insight.status === 'applied';
                  const isNew = !isRejected && !isApplied && (!insight.status || insight.status === 'new');
                  return (
                    <motion.div key={insight.id} layout
                      onClick={() => handleOpenInsight(insight)}
                      className={`relative rounded-xl border p-4 cursor-pointer transition-all group ${
                        isRejected ? 'opacity-40 border-zinc-800/30 bg-zinc-900/20' :
                        isApplied ? 'border-emerald-500/20 bg-emerald-500/3 hover:border-emerald-500/30' :
                        'border-zinc-800/60 bg-zinc-900/40 hover:border-fuchsia-500/30 hover:bg-zinc-900/60'
                      }`}>
                      {/* New dot */}
                      {isNew && (
                        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                      <div className="flex items-start gap-3">
                        {/* Priority badge */}
                        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border ${priorityBg(insight.priority)}`}>
                          P{insight.priority}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                            {insight.source && <span className="text-xs text-zinc-400">{insight.source}</span>}
                          </div>
                          <p className={`text-sm text-zinc-200 leading-relaxed line-clamp-2 ${isRejected ? 'line-through text-zinc-400' : ''}`}>
                            {insight.insight}
                          </p>
                          {insight.recommendation && (
                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-1">
                              → {insight.recommendation}
                            </p>
                          )}
                          {insight.note && (
                            <p className="text-xs text-amber-500/70 mt-1 italic line-clamp-1">📝 {insight.note}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2.5">
                            <span className="text-xs text-zinc-400">{new Date(insight.createdAt).toLocaleDateString('fr-FR')}</span>
                            <button
                              onClick={e => { e.stopPropagation(); handleOpenInsight(insight); }}
                              className="flex items-center gap-1 text-xs text-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <BookOpen className="w-3 h-3" /> Lire
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleCopyReco(insight.id, insight.recommendation); }}
                              className="flex items-center gap-1 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {copiedId === insight.id ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              {copiedId === insight.id ? 'Copié' : 'Copier'}
                            </button>
                            {!isApplied && !isRejected && (
                              <button
                                onClick={e => { e.stopPropagation(); handleApplyInsight(insight.id); }}
                                className="flex items-center gap-1 text-xs text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Appliquer
                              </button>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-1 transition-colors" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Innovations ──────────────────────────────────────────────── */}
        {activeTab === 'innovations' && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              {(['all', 'proposed', 'approved', 'in_progress', 'implemented', 'rejected'] as const).map(f => {
                const count = f === 'all' ? innovationsList.length : innovationsList.filter(i => i.status === f).length;
                return (
                  <button key={f} onClick={() => setInnovFilter(f)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      innovFilter === f ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'text-zinc-400 hover:text-zinc-300'
                    }`}>
                    {STATUS_LABEL[f] || f} ({count})
                  </button>
                );
              })}
            </div>
            {filteredInnovations.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-12 text-center">
                <Zap className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 mb-1">Aucune innovation</p>
                <p className="text-xs text-zinc-400 mb-4">Lance le pipeline pour découvrir et élever des innovations.</p>
                <button onClick={() => runAction('pipeline')} disabled={running}
                  className="text-xs px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded-lg transition-colors">
                  Lancer le pipeline
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredInnovations.map(innov => {
                  const tags: string[] = (() => { try { return JSON.parse(innov.tags || '[]'); } catch { return []; } })();
                  return (
                    <motion.button key={innov.id} layout onClick={() => setSelectedInnovation(innov)}
                      className="text-left p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:border-fuchsia-500/30 hover:bg-zinc-900/60 transition-all group">
                      <div className="flex items-start gap-3 mb-3">
                        <ScoreRing score={innov.opportunityScore} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-200 leading-snug group-hover:text-fuchsia-200 transition-colors line-clamp-2">{innov.title}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {innov.status && <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLOR[innov.status] || 'bg-zinc-800 text-zinc-400'}`}>{STATUS_LABEL[innov.status] || innov.status}</span>}
                            {innov.implementationComplexity && <span className={`text-xs px-1.5 py-0.5 rounded-full ${COMPLEXITY_COLOR[innov.implementationComplexity] || ''}`}>{innov.implementationComplexity}</span>}
                          </div>
                        </div>
                      </div>
                      {innov.altCtrlMutation && <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-2">{innov.altCtrlMutation}</p>}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {innov.category && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400">{innov.category}</span>}
                        {tags.slice(0, 2).map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/50 text-zinc-400">{t}</span>)}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Découvertes ─────────────────────────────────────────────── */}
        {activeTab === 'discoveries' && (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40">
            {discoveriesList.length === 0 ? (
              <div className="p-12 text-center">
                <Telescope className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 mb-1">Aucune découverte</p>
                <p className="text-xs text-zinc-400 mb-4">Lance le Scout pour scraper ProductHunt, GitHub, HackerNews.</p>
                <button onClick={() => runAction('scout')} disabled={running}
                  className="text-xs px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-colors">
                  Lancer Scout
                </button>
              </div>
            ) : (
              <>
                <div className="hidden sm:grid grid-cols-[2fr_0.8fr_1.5fr_0.6fr_0.7fr] gap-3 px-4 py-2 border-b border-zinc-800/50 text-xs text-zinc-400 font-medium">
                  <span>Titre / Concept</span><span>Source</span><span>URL</span><span>Engagement</span><span>Statut</span>
                </div>
                <div className="divide-y divide-zinc-800/30">
                  {discoveriesList.map(d => (
                    <div key={d.id} className="grid grid-cols-[2fr_0.8fr_1.5fr_0.6fr_0.7fr] gap-3 items-center px-4 py-3 hover:bg-zinc-800/20 transition-colors">
                      <div>
                        <p className="text-sm text-zinc-300 truncate">{d.rawTitle}</p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{d.extractedConcept}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 w-fit">
                        {PLATFORM_ICON[d.sourcePlatform] || '🔗'} {d.sourcePlatform}
                      </span>
                      <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 truncate" title={d.sourceUrl}>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{d.sourceUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
                      </a>
                      <span className="text-xs text-zinc-400">{d.engagementScore != null ? Math.round(d.engagementScore * 100) + '%' : '—'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                        d.status === 'elevated' ? 'bg-emerald-500/10 text-emerald-400' :
                        d.status === 'analyzing' ? 'bg-cyan-500/10 text-cyan-400' :
                        d.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>{d.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tab: Patterns ────────────────────────────────────────────────── */}
        {activeTab === 'patterns' && (
          <div>
            {patternsList.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-12 text-center">
                <GitBranch className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 mb-1">Aucun pattern détecté</p>
                <p className="text-xs text-zinc-400 mb-4">Lance l&apos;analyse pour détecter les patterns émergents.</p>
                <button onClick={() => runAction('analyze')} disabled={running}
                  className="text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors">
                  Analyser les patterns
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {patternsList.map(p => (
                  <div key={p.id} className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 leading-snug">{p.title}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 mt-1 inline-block">{p.patternType}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {p.trendDirection && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${TREND_COLOR[p.trendDirection] || 'bg-zinc-800 text-zinc-400'}`}>
                            {p.trendDirection === 'rising' ? '↑' : p.trendDirection === 'declining' ? '↓' : '→'} {p.trendDirection}
                          </span>
                        )}
                        {p.actionable === 1 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Actionnable</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{p.description}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <BookOpen className="w-3 h-3" />
                      <span>{p.evidenceCount} preuves</span>
                      {p.suggestedAction && <span className="text-zinc-400 truncate">→ {p.suggestedAction}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Innovation Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedInnovation && (
          <InnovationModal
            innovation={selectedInnovation}
            onClose={() => setSelectedInnovation(null)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>

      {/* ── Insight Drawer ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedInsight && InsightDrawer}
      </AnimatePresence>

      {/* ── Task Toast ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {taskToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-xl"
          >
            <CheckCircle2 className="w-4 h-4" /> {taskToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
