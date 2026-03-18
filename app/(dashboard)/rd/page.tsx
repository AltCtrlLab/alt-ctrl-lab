'use client';

import { useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchedulerConfig {
  enabled: boolean;
  mode: 'manual' | 'scheduled';
  schedule: {
    scoutIntervalHours: number;
    elevateIntervalHours: number;
    analysisIntervalHours: number;
  };
  nextRunAt: string | null;
  lastRunAt: string | null;
  isRunning: boolean;
}

interface RDStats {
  discoveries: number;
  innovations: {
    total: number;
    proposed: number;
    approved: number;
    implemented: number;
  };
  averageOpportunityScore: string;
}

interface BusinessInsight {
  id: string;
  topic: string;
  source?: string;
  insight: string;
  recommendation: string;
  priority: number;
  applied: number;
  createdAt: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TOPICS: Array<{ id: string; label: string }> = [
  { id: 'instagram-acquisition', label: 'Acquisition Instagram' },
  { id: 'dm-copywriting', label: 'Copywriting DM' },
  { id: 'conversion-funnel', label: 'Tunnel de conversion' },
  { id: 'internal-analysis', label: 'Opérations internes' },
];

// ─── Composants utilitaires ──────────────────────────────────────────────────

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="text-2xl font-semibold text-white tabular-nums">{value}</div>
      <div className="text-zinc-500 text-xs uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  const color = priority >= 8 ? 'text-white bg-zinc-700' : priority >= 5 ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-500 bg-zinc-900 border border-zinc-800';
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${color}`}>
      P{priority}
    </span>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function RDPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'tech'>('business');
  const [config, setConfig] = useState<SchedulerConfig | null>(null);
  const [stats, setStats] = useState<RDStats | null>(null);
  const [techLoading, setTechLoading] = useState(false);
  const [techMessage, setTechMessage] = useState('');

  // Business intel state
  const [selectedTopic, setSelectedTopic] = useState('instagram-acquisition');
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [biLoading, setBiLoading] = useState(false);
  const [biMessage, setBiMessage] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchStats();
    fetchInsights();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/rd/scheduler');
      const data = await res.json();
      if (data.success) setConfig(data.data);
    } catch { /* silent */ }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/rd/metrics?period=7d');
      const data = await res.json();
      if (data.success) setStats(data.data.summary);
    } catch { /* silent */ }
  };

  const fetchInsights = async (topic?: string) => {
    try {
      const res = await fetch('/api/rd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'business-intel', payload: { action: 'get', topic } }),
      });
      const data = await res.json();
      if (data.success) setInsights(data.data.insights);
    } catch { /* silent */ }
  };

  const triggerTechAction = async (action: string) => {
    setTechLoading(true);
    setTechMessage('');
    try {
      const res = await fetch('/api/rd/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setTechMessage(data.success ? data.message : data.error);
      fetchConfig();
      fetchStats();
    } catch (e) {
      setTechMessage(`Erreur: ${e}`);
    } finally {
      setTechLoading(false);
    }
  };

  const launchBusinessIntel = async () => {
    setBiLoading(true);
    setBiMessage('');
    try {
      const res = await fetch('/api/rd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'business-intel', payload: { topic: selectedTopic } }),
      });
      const data = await res.json();
      if (data.success && data.data.insights?.length) {
        setBiMessage(`${data.data.insights.length} insights générés`);
        fetchInsights(selectedTopic);
      } else {
        setBiMessage(data.data?.error || 'Aucun insight généré');
      }
    } catch (e) {
      setBiMessage(`Erreur: ${e}`);
    } finally {
      setBiLoading(false);
    }
  };

  const applyInsight = async (id: string) => {
    await fetch('/api/rd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'business-intel', payload: { action: 'apply', id } }),
    });
    setInsights(prev => prev.map(ins => ins.id === id ? { ...ins, applied: 1 } : ins));
  };

  const filteredInsights = selectedTopic
    ? insights.filter(ins => ins.topic === selectedTopic)
    : insights;

  const appliedCount = insights.filter(ins => ins.applied).length;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">R&D</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Intelligence continue — tech & métier</p>
        </div>
        {config && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
            config.isRunning
              ? 'border-amber-800 text-amber-400 bg-amber-950/30'
              : 'border-zinc-700 text-zinc-400 bg-zinc-900'
          }`}>
            {config.isRunning ? 'En cours' : 'Idle'}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-zinc-800">
        {(['business', 'tech'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-white text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'business' ? 'Intelligence Métier' : 'Tech Trends'}
          </button>
        ))}
      </div>

      {/* ── Tab : Intelligence Métier ── */}
      {activeTab === 'business' && (
        <div className="space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard value={insights.length} label="Insights totaux" />
            <StatCard value={appliedCount} label="Appliqués" />
            <StatCard value={insights.filter(i => i.priority >= 8).length} label="Priorité haute" />
            <StatCard value={TOPICS.length} label="Topics" />
          </div>

          {/* Topic selector + action */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Topic à analyser</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTopic(t.id); fetchInsights(t.id); }}
                    className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                      selectedTopic === t.id
                        ? 'border-zinc-500 text-white bg-zinc-800'
                        : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-zinc-500 text-sm">
                Lance une analyse approfondie via l'agent IA sur le topic sélectionné.
              </p>
              <button
                onClick={launchBusinessIntel}
                disabled={biLoading}
                className="text-sm px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-4"
              >
                {biLoading ? 'Analyse en cours...' : 'Analyser'}
              </button>
            </div>

            {biMessage && (
              <p className="text-xs text-zinc-400 border-t border-zinc-800 pt-3">{biMessage}</p>
            )}
          </div>

          {/* Insights list */}
          {filteredInsights.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{filteredInsights.length} insights — {TOPICS.find(t => t.id === selectedTopic)?.label || selectedTopic}</p>
              {filteredInsights.map(ins => (
                <div
                  key={ins.id}
                  className={`bg-zinc-900 border rounded-lg p-4 space-y-2 transition-opacity ${ins.applied ? 'opacity-50 border-zinc-800' : 'border-zinc-800 hover:border-zinc-700'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-white leading-snug">{ins.insight}</p>
                    <PriorityBadge priority={ins.priority} />
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{ins.recommendation}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      {ins.source && (
                        <span className="text-xs text-zinc-600">{ins.source}</span>
                      )}
                      <span className="text-xs text-zinc-700">
                        {new Date(ins.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {!ins.applied ? (
                      <button
                        onClick={() => applyInsight(ins.id)}
                        className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded transition-colors"
                      >
                        Marquer appliqué
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">Appliqué</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-600 text-sm">
              Aucun insight pour ce topic — lancez une analyse.
            </div>
          )}
        </div>
      )}

      {/* ── Tab : Tech Trends ── */}
      {activeTab === 'tech' && (
        <div className="space-y-6">

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={stats.discoveries} label="Découvertes" />
              <StatCard value={stats.innovations.total} label="Innovations" />
              <StatCard value={stats.innovations.proposed} label="En attente" />
              <StatCard value={stats.innovations.implemented} label="Implémentées" />
            </div>
          )}

          {/* Actions + Config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Actions manuelles</p>
              {[
                { action: 'trigger_scout', label: 'Scout' },
                { action: 'trigger_elevate', label: 'Élévation' },
                { action: 'trigger_pipeline', label: 'Pipeline complet' },
              ].map(({ action, label }) => (
                <button
                  key={action}
                  onClick={() => triggerTechAction(action)}
                  disabled={techLoading || config?.isRunning}
                  className="w-full text-sm py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {techLoading ? 'En cours...' : label}
                </button>
              ))}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Planification</p>

              {config && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Mode</span>
                    <span className={`text-sm font-medium ${config.mode === 'manual' ? 'text-zinc-300' : 'text-white'}`}>
                      {config.mode === 'manual' ? 'Manuel' : 'Automatique'}
                    </span>
                  </div>

                  {config.lastRunAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Dernière exécution</span>
                      <span className="text-sm text-zinc-300">
                        {new Date(config.lastRunAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {config.mode === 'scheduled' && config.nextRunAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Prochaine</span>
                      <span className="text-sm text-zinc-300">
                        {new Date(config.nextRunAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => triggerTechAction(config.mode === 'manual' ? 'enable_auto' : 'disable_auto')}
                    disabled={techLoading}
                    className="w-full text-sm py-2 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-md transition-colors disabled:opacity-40"
                  >
                    {config.mode === 'manual' ? 'Activer l\'automatique' : 'Passer en manuel'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Feedback message */}
          {techMessage && (
            <p className="text-xs text-zinc-400 border border-zinc-800 rounded-lg px-4 py-3">{techMessage}</p>
          )}

          {/* API links */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Endpoints</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { href: '/api/rd?action=overview', label: 'Vue d\'ensemble' },
                { href: '/api/rd/metrics?period=7d', label: 'Métriques 7j' },
                { href: '/api/rd?action=innovations&status=proposed', label: 'Innovations en attente' },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-800 text-zinc-400 rounded-md transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
