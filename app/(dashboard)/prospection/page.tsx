'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target, Play, RefreshCw, Mail, Users, TrendingUp, MapPin,
  Loader2, ChevronDown, ChevronUp, X, Euro, Calendar,
  AlertTriangle, Clock, ExternalLink, Search, FileText, History,
} from 'lucide-react';
import { N8nLivePanel } from '@/components/automations/N8nLivePanel';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';

interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string;
  notes: string | null;
  website: string | null;
  website_score: number | null;
  email_sent_count: number | null;
  last_contacted_at: number | null;
  proposition_amount: number | null;
  created_at: number;
}

const GOOGLE_MAPS_WORKFLOW_ID = 'nrRSJkM4xCBrzRau';

const NICHES = [
  'Artisans', 'Restaurants', 'PME locales', 'Auto-entrepreneurs',
  'Coiffeurs', 'Plombiers', 'Electriciens', 'Menuisiers', 'Architectes',
  'Médecins', 'Avocats', 'Comptables', 'Garages auto', 'Hôtels',
];

const VILLES_DEFAULT = ['Genève', 'Lausanne', 'Annecy', 'Lyon', 'Chambéry'];

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-zinc-600">—</span>;
  const color = score < 50
    ? 'text-rose-400 bg-rose-500/10'
    : score < 70
    ? 'text-amber-400 bg-amber-500/10'
    : 'text-emerald-400 bg-emerald-500/10';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${color}`}>
      {score}/100
    </span>
  );
}

function FollowupBadge({ lastContactedAt, status }: { lastContactedAt: number | null; status: string }) {
  if (!lastContactedAt || status !== 'Nouveau') return null;
  const daysSince = Math.floor((Date.now() - lastContactedAt) / (1000 * 60 * 60 * 24));
  if (daysSince < 3) return null;
  const label = daysSince >= 14 ? 'J+14' : daysSince >= 7 ? 'J+7' : 'J+3';
  const color = daysSince >= 14
    ? 'bg-rose-500/10 text-rose-400'
    : daysSince >= 7
    ? 'bg-amber-500/10 text-amber-400'
    : 'bg-orange-500/10 text-orange-400';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  );
}

export default function ProspectionPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);
  const [liveLog, setLiveLog] = useState<{ type: string; message: string }[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedNiches, setSelectedNiches] = useState<string[]>(['Artisans', 'Restaurants', 'PME locales']);
  const [villes, setVilles] = useState<string[]>(VILLES_DEFAULT);
  const [villeInput, setVilleInput] = useState('');
  const [minScore, setMinScore] = useState(65);
  const [maxLeads, setMaxLeads] = useState(10);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [relancingId, setRelancingId] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  const [activeTab, setActiveTab] = useState<'campagne' | 'historique'>('campagne');
  const [searchQuery, setSearchQuery] = useState('');
  const [emailPreview, setEmailPreview] = useState<{ name: string; notes: string } | null>(null);
  // Template n'est plus utilisé côté API (remplacé par HTML + Claude IA)
  // Gardé ici pour info dans la config
  const [emailTemplate] = useState('');

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads?source=GMB');
      const data = await res.json();
      if (data.success) setLeads(data.data.leads);
    } catch (err) {
      console.error('Prospection fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  async function launchCampaign() {
    setTriggering(true);
    setTriggerStatus(null);
    setLiveLog([]);
    try {
      const res = await fetch('/api/cron/prospection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-key': 'altctrl-cron-secret',
        },
        body: JSON.stringify({ niches: selectedNiches, villes, minScore, maxLeads }),
      });

      if (!res.body) throw new Error('Pas de stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'complete') {
              const d = event.results;
              setTriggerStatus(`${event.message} — ${d.scanned} scannés · ${d.qualified} qualifiés · ${d.sent} lead${d.sent > 1 ? 's' : ''} créé${d.sent > 1 ? 's' : ''}`);
              setLiveLog(prev => [...prev, { type: 'complete', message: event.message }]);
              fetchLeads();
            } else {
              setLiveLog(prev => [...prev, { type: event.type, message: event.message }]);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: any) {
      setTriggerStatus(`Erreur: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  }

  async function sendManualRelance(lead: Lead) {
    setRelancingId(lead.id);
    try {
      await fetch(`/api/leads?id=${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: (lead.notes ?? '') + `\nRelance manuelle — ${new Date().toLocaleDateString('fr-FR')}`,
          emailSentCount: (lead.email_sent_count ?? 1) + 1,
          lastContactedAt: Date.now(),
        }),
      });
      await fetchLeads();
    } finally {
      setRelancingId(null);
    }
  }

  async function setupAutomations() {
    setSettingUp(true);
    setSetupStatus(null);
    try {
      const res = await fetch('/api/n8n/setup-prospection', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSetupStatus('Automatisations configurées : scraper activé + relances J+3/J+7/J+14 créées');
      } else {
        const failed = (data.results ?? []).filter((r: any) => !r.ok).map((r: any) => r.action).join(', ');
        setSetupStatus(`Partiel — échec: ${failed || data.error}`);
      }
    } catch (err: any) {
      setSetupStatus(`Erreur: ${err.message}`);
    } finally {
      setSettingUp(false);
    }
  }

  function toggleNiche(n: string) {
    setSelectedNiches(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
  }

  function addVille(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && villeInput.trim()) {
      setVilles(prev => [...new Set([...prev, villeInput.trim()])]);
      setVilleInput('');
    }
  }

  // Stats
  const totalLeads = leads.length;
  const nouveaux = leads.filter(l => l.status === 'Nouveau').length;
  const qualifies = leads.filter(l =>
    ['Qualifié', 'Discovery fait', 'Proposition envoyée', 'Signé'].includes(l.status)
  ).length;
  const rdvPris = leads.filter(l => ['Discovery fait', 'Signé'].includes(l.status)).length;
  const pipeline = leads.reduce((s, l) => s + (l.proposition_amount ?? 0), 0);
  const tauxReponse = totalLeads > 0 ? +((qualifies / totalLeads) * 100).toFixed(1) : 0;

  const pendingFollowup = leads.filter(l => {
    if (l.status !== 'Nouveau' || !l.last_contacted_at) return false;
    return Date.now() - l.last_contacted_at >= 3 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Target className="w-5 h-5 text-orange-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Prospection</h1>
          <span className="text-xs text-zinc-600">Cold Outreach Automatique</span>

          {pendingFollowup > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {pendingFollowup} relance{pendingFollowup > 1 ? 's' : ''} en attente
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={fetchLeads}
              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setConfigOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-2 border border-zinc-700 hover:border-zinc-600 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              Config
              {configOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button
              onClick={launchCampaign}
              disabled={triggering || selectedNiches.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Lancer campagne
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Trigger status */}
        {triggerStatus && (
          <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${
            triggerStatus.startsWith('Erreur')
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            <span>{triggerStatus}</span>
            <button onClick={() => setTriggerStatus(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Live log */}
        {(triggering || liveLog.length > 0) && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2">
              {triggering && <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />}
              <span className="text-xs font-semibold text-zinc-300">Suivi temps réel</span>
              {triggering && (
                <span className="text-xs text-zinc-500">En cours...</span>
              )}
              {!triggering && liveLog.length > 0 && (
                <button onClick={() => setLiveLog([])} className="ml-auto text-zinc-600 hover:text-zinc-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-0.5">
              {liveLog.map((entry, i) => (
                <div key={i} className={
                  entry.type === 'qualify' || entry.type === 'done_lead' || entry.type === 'complete' ? 'text-emerald-400' :
                  entry.type === 'error' || entry.type === 'fatal' ? 'text-rose-400' :
                  entry.type === 'warn' ? 'text-amber-400' :
                  entry.type === 'query' ? 'text-orange-300 mt-2' :
                  entry.type === 'skip' ? 'text-zinc-600' :
                  'text-zinc-400'
                }>
                  {entry.message}
                </div>
              ))}
              {triggering && liveLog.length === 0 && (
                <span className="text-zinc-600">Connexion au pipeline...</span>
              )}
            </div>
          </div>
        )}

        {/* Config panel */}
        {configOpen && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5">
            <h3 className="text-sm font-semibold text-zinc-100">Configuration campagne</h3>

            <div>
              <p className="text-xs text-zinc-500 mb-2">Niches cibles</p>
              <div className="flex flex-wrap gap-2">
                {NICHES.map(n => (
                  <button
                    key={n}
                    onClick={() => toggleNiche(n)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedNiches.includes(n)
                        ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                        : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-2">Villes cibles</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {villes.map(v => (
                  <span key={v} className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-300">
                    <MapPin className="w-3 h-3 text-zinc-500" />
                    {v}
                    <button onClick={() => setVilles(prev => prev.filter(x => x !== v))}>
                      <X className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={villeInput}
                onChange={e => setVilleInput(e.target.value)}
                onKeyDown={addVille}
                placeholder="Ajouter une ville (Entrée)"
                className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 w-56"
              />
            </div>

            <div className="flex gap-8 flex-wrap">
              <div>
                <p className="text-xs text-zinc-500 mb-2">
                  Score Lighthouse minimum :{' '}
                  <span className="text-orange-400 font-mono">{minScore}/100</span>
                  <span className="text-zinc-600 ml-1">(sites en dessous de ce score sont contactés)</span>
                </p>
                <input
                  type="range"
                  min={40}
                  max={90}
                  value={minScore}
                  onChange={e => setMinScore(Number(e.target.value))}
                  className="w-64 accent-orange-500"
                />
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-2">
                  Objectif leads à générer :{' '}
                  <span className="text-orange-400 font-mono">{maxLeads} lead{maxLeads > 1 ? 's' : ''}</span>
                  <span className="text-zinc-600 ml-1">(la campagne s'arrête dès cet objectif atteint)</span>
                </p>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={maxLeads}
                  onChange={e => setMaxLeads(Number(e.target.value))}
                  className="w-64 accent-orange-500"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  {maxLeads <= 3 ? 'Test rapide — valider la config' : maxLeads <= 15 ? 'Standard' : 'Volume élevé'}
                </p>
              </div>
            </div>

            {/* Email info */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold text-zinc-200">Email HTML personnalisé par IA</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-zinc-800/60 p-3">
                  <p className="text-zinc-500 mb-1">Template</p>
                  <p className="text-zinc-300">HTML moderne avec CSS inline, sections diagnostic, CTA et signature pro</p>
                </div>
                <div className="rounded-lg bg-zinc-800/60 p-3">
                  <p className="text-zinc-500 mb-1">Personnalisation</p>
                  <p className="text-zinc-300">Claude IA rédige 2 paragraphes uniques par prospect (secteur, zone, score)</p>
                </div>
                <div className="rounded-lg bg-zinc-800/60 p-3">
                  <p className="text-zinc-500 mb-1">Fallback</p>
                  <p className="text-zinc-300">Template par défaut si Claude est indisponible — aucun email vide</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Contactés', value: totalLeads, icon: Users, color: 'text-orange-400' },
            { label: 'En attente', value: nouveaux, icon: Clock, color: 'text-blue-400' },
            { label: 'Taux réponse', value: `${tauxReponse}%`, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'RDV pris', value: rdvPris, icon: Calendar, color: 'text-violet-400' },
            { label: 'Pipeline', value: pipeline > 0 ? `${Math.round(pipeline / 1000)}k€` : '—', icon: Euro, color: 'text-amber-400' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('campagne')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'campagne'
                ? 'border-orange-400 text-orange-300'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Leads ({totalLeads})
          </button>
          <button
            onClick={() => setActiveTab('historique')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'historique'
                ? 'border-orange-400 text-orange-300'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historique complet
          </button>
        </div>

        {/* Leads table */}
        {activeTab === 'campagne' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-zinc-100">Leads cold email</span>
            <span className="text-xs text-zinc-500 ml-1">Google Maps Scraper</span>
            <span className="ml-auto text-xs text-zinc-600">{totalLeads} leads</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <Target className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-1">Aucun lead cold email pour l'instant</p>
              <p className="text-xs text-zinc-600">Configurez vos niches + villes et lancez une campagne.</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[1.5fr_1fr_1fr_1.2fr_0.8fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-zinc-800/50 text-xs text-zinc-600 font-medium">
                <span>Entreprise</span>
                <span>Site web</span>
                <span>Score</span>
                <span>Email</span>
                <span>Statut</span>
                <span>Envois</span>
                <span>Msg</span>
                <span>Action</span>
              </div>

              <div className="divide-y divide-zinc-800/30">
                {leads.map(lead => {
                  const daysSince = lead.last_contacted_at
                    ? Math.floor((Date.now() - lead.last_contacted_at) / 86400000)
                    : null;
                  const hasEmail = lead.notes?.includes('--- EMAIL ENVOYÉ ---');
                  return (
                    <div
                      key={lead.id}
                      className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr_0.8fr_auto_auto_auto] gap-3 items-center px-4 py-3 hover:bg-zinc-800/20 transition-colors"
                    >
                      <button className="text-left" onClick={() => setSelectedLead(lead)}>
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {lead.company ?? lead.name}
                        </p>
                        <p className="text-xs text-zinc-600 truncate">
                          {daysSince !== null ? `J+${daysSince}` : new Date(lead.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </button>

                      {/* URL capsule */}
                      {lead.website ? (
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors truncate max-w-[140px]"
                          title={lead.website}
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}

                      <ScoreBadge score={lead.website_score} />

                      <p className="text-xs text-zinc-400 truncate">{lead.email ?? '—'}</p>

                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          lead.status === 'Signé' ? 'bg-emerald-500/10 text-emerald-400' :
                          ['Qualifié', 'Discovery fait'].includes(lead.status) ? 'bg-violet-500/10 text-violet-400' :
                          lead.status === 'Perdu' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-zinc-800 text-zinc-500'
                        }`}>
                          {lead.status}
                        </span>
                        <FollowupBadge lastContactedAt={lead.last_contacted_at} status={lead.status} />
                      </div>

                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Mail className="w-3 h-3" />
                        <span>{lead.email_sent_count ?? 0}</span>
                      </div>

                      {/* Email preview button */}
                      <button
                        onClick={() => hasEmail ? setEmailPreview({ name: lead.company ?? lead.name, notes: lead.notes! }) : null}
                        disabled={!hasEmail}
                        title={hasEmail ? 'Voir l\'email envoyé' : 'Aucun email enregistré'}
                        className="p-1.5 text-zinc-600 hover:text-blue-400 disabled:opacity-20 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => sendManualRelance(lead)}
                        disabled={relancingId === lead.id || !lead.email}
                        title={lead.email ? 'Envoyer relance manuelle' : "Pas d'email"}
                        className="p-1.5 text-zinc-600 hover:text-orange-400 disabled:opacity-30 transition-colors"
                      >
                        {relancingId === lead.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Mail className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        )}

        {/* Historique complet */}
        {activeTab === 'historique' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
              <History className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-zinc-100">Historique prospection</span>
              <span className="text-xs text-zinc-500">Toutes les entreprises contactées</span>
              <div className="ml-auto relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 w-56"
                />
              </div>
            </div>

            {(() => {
              const filtered = leads.filter(l => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (l.name?.toLowerCase().includes(q)) ||
                       (l.company?.toLowerCase().includes(q)) ||
                       (l.email?.toLowerCase().includes(q)) ||
                       (l.website?.toLowerCase().includes(q)) ||
                       (l.notes?.toLowerCase().includes(q));
              });
              return filtered.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  {searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Aucun lead dans l\'historique'}
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/30 max-h-[600px] overflow-y-auto">
                  {filtered.map(lead => {
                    const hasEmail = lead.notes?.includes('--- EMAIL ENVOYÉ ---');
                    return (
                      <div key={lead.id} className="px-4 py-3 hover:bg-zinc-800/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-zinc-200 truncate">
                                {lead.company ?? lead.name}
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                                lead.status === 'Signé' ? 'bg-emerald-500/10 text-emerald-400' :
                                ['Qualifié', 'Discovery fait'].includes(lead.status) ? 'bg-violet-500/10 text-violet-400' :
                                lead.status === 'Perdu' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-zinc-800 text-zinc-500'
                              }`}>
                                {lead.status}
                              </span>
                              <ScoreBadge score={lead.website_score} />
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {lead.website && (
                                <a
                                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="truncate max-w-[200px]">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                </a>
                              )}
                              {lead.email && (
                                <span className="text-xs text-zinc-500">{lead.email}</span>
                              )}
                              <span className="text-xs text-zinc-600">
                                {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                              </span>
                              {(lead.email_sent_count ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-xs text-zinc-500">
                                  <Mail className="w-3 h-3" /> {lead.email_sent_count} envoi{(lead.email_sent_count ?? 0) > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {hasEmail && (
                              <button
                                onClick={() => setEmailPreview({ name: lead.company ?? lead.name, notes: lead.notes! })}
                                className="p-1.5 text-zinc-600 hover:text-blue-400 transition-colors"
                                title="Voir l'email envoyé"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedLead(lead)}
                              className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                              title="Détails"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-600">
              {leads.length} entreprise{leads.length > 1 ? 's' : ''} dans la base
              {searchQuery && ` · ${leads.filter(l => {
                const q = searchQuery.toLowerCase();
                return (l.name?.toLowerCase().includes(q)) || (l.company?.toLowerCase().includes(q)) || (l.email?.toLowerCase().includes(q)) || (l.website?.toLowerCase().includes(q));
              }).length} résultat(s)`}
            </div>
          </div>
        )}

        {/* N8n Live Panel */}
        <N8nLivePanel />
      </div>

      {/* Email preview modal */}
      {emailPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEmailPreview(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-zinc-100">Email envoyé — {emailPreview.name}</span>
              </div>
              <button onClick={() => setEmailPreview(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {(() => {
                const emailSection = emailPreview.notes.split('--- EMAIL ENVOYÉ ---');
                if (emailSection.length < 2) return <p className="text-xs text-zinc-500">Aucun email enregistré</p>;
                const emailMeta = emailSection[1].trim();
                const lines = emailMeta.split('\n');
                const subject = lines.find(l => l.startsWith('Objet:'))?.replace('Objet: ', '') ?? '';
                const to = lines.find(l => l.startsWith('À:'))?.replace('À: ', '') ?? '';
                const date = lines.find(l => l.startsWith('Date:'))?.replace('Date: ', '') ?? '';

                // Extract HTML if present
                const htmlParts = emailPreview.notes.split('--- EMAIL HTML ---');
                const htmlContent = htmlParts.length >= 2 ? htmlParts[1].trim() : null;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                      <span className="text-zinc-500 font-medium">Objet</span>
                      <span className="text-zinc-200 font-medium">{subject}</span>
                      <span className="text-zinc-500 font-medium">À</span>
                      <span className="text-zinc-300">{to}</span>
                      <span className="text-zinc-500 font-medium">Date</span>
                      <span className="text-zinc-400">{date}</span>
                    </div>
                    <div className="border-t border-zinc-800 pt-3">
                      {htmlContent ? (
                        <iframe
                          srcDoc={htmlContent}
                          className="w-full rounded-lg border border-zinc-800"
                          style={{ minHeight: '500px', background: '#0a0a0a' }}
                          sandbox="allow-same-origin"
                          title="Email preview"
                        />
                      ) : (
                        <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                          {emailMeta.split('\n').filter(l => !l.startsWith('Objet:') && !l.startsWith('À:') && !l.startsWith('Date:')).join('\n').trim()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead as any}
          onClose={() => setSelectedLead(null)}
          onStatusChange={() => fetchLeads()}
          onUpdated={() => { fetchLeads(); setSelectedLead(null); }}
          onDeleted={() => { fetchLeads(); setSelectedLead(null); }}
        />
      )}
    </div>
  );
}
