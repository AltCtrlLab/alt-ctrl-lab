'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Target, Play, RefreshCw, Mail, Users, TrendingUp, MapPin,
  Loader2, ChevronDown, ChevronUp, X, Euro, Calendar,
  AlertTriangle, Clock, ExternalLink, Search, FileText, History,
  BarChart3, Pen, CheckCircle2, Eye, Sparkles,
  Hammer, UtensilsCrossed, Briefcase, Car, Building2, Scissors,
  Wrench, Zap, Ruler, Stethoscope, Scale, Calculator, Hotel,
  Plane, Heart, Instagram, Linkedin, MessageCircle, Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

type ProspectionChannel = 'google-maps' | 'instagram' | 'linkedin';

const CHANNEL_OPTIONS: { id: ProspectionChannel; label: string; pitch: string; badge: string; icon: any; color: string; bg: string; border: string }[] = [
  { id: 'google-maps', label: 'Google Maps', pitch: 'Refonte site web', badge: 'Email', icon: MapPin, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { id: 'instagram', label: 'Instagram', pitch: 'Création site web', badge: 'DM', icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  { id: 'linkedin', label: 'LinkedIn', pitch: 'Site web pro', badge: 'Email', icon: Linkedin, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
];

const NICHE_OPTIONS: { label: string; icon: any }[] = [
  { label: 'Artisans', icon: Hammer },
  { label: 'Restaurants', icon: UtensilsCrossed },
  { label: 'PME locales', icon: Briefcase },
  { label: 'Auto-entrepreneurs', icon: Briefcase },
  { label: 'Coiffeurs', icon: Scissors },
  { label: 'Plombiers', icon: Wrench },
  { label: 'Electriciens', icon: Zap },
  { label: 'Menuisiers', icon: Ruler },
  { label: 'Architectes', icon: Building2 },
  { label: 'Médecins', icon: Stethoscope },
  { label: 'Avocats', icon: Scale },
  { label: 'Comptables', icon: Calculator },
  { label: 'Garages auto', icon: Car },
  { label: 'Hôtels', icon: Hotel },
  { label: 'SPA / Bien-être', icon: Sparkles },
  { label: 'Agences de voyages', icon: Plane },
  { label: 'Centres de beauté', icon: Heart },
];

const VILLES_DEFAULT = ['Genève', 'Lausanne', 'Annecy', 'Lyon', 'Chambéry'];

const VILLES_SUGGESTIONS = ['Paris', 'Marseille', 'Bordeaux', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Lille', 'Zurich', 'Berne'];

// ─── Campaign Stepper Steps (par canal) ────────────────────
const CAMPAIGN_STEPS_MAP: Record<ProspectionChannel, { label: string; desc: string; icon: any }[]> = {
  'google-maps': [
    { label: 'Recherche', desc: 'Scan des entreprises', icon: Search },
    { label: 'Analyse', desc: 'Audit des sites web', icon: BarChart3 },
    { label: 'Rédaction', desc: 'Personnalisation IA', icon: Pen },
    { label: 'Terminé', desc: 'Campagne terminée', icon: CheckCircle2 },
  ],
  'instagram': [
    { label: 'Recherche', desc: 'Scan Google Maps', icon: Search },
    { label: 'Instagram', desc: 'Recherche de profils', icon: Instagram },
    { label: 'Message DM', desc: 'Rédaction IA', icon: MessageCircle },
    { label: 'Terminé', desc: 'Campagne terminée', icon: CheckCircle2 },
  ],
  'linkedin': [
    { label: 'Recherche', desc: 'Recherche LinkedIn', icon: Search },
    { label: 'Profils', desc: 'Analyse des profils', icon: Linkedin },
    { label: 'Email IA', desc: 'Personnalisation IA', icon: Pen },
    { label: 'Terminé', desc: 'Campagne terminée', icon: CheckCircle2 },
  ],
};

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

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Campaign Stepper Component ────────────────────────────
function CampaignStepper({
  step, timer, progress, currentAction, onToggleDetails, detailsOpen, liveLog, channel,
}: {
  step: number;
  timer: number;
  progress: { scanned: number; qualified: number; target: number };
  currentAction: string;
  onToggleDetails: () => void;
  detailsOpen: boolean;
  liveLog: { type: string; message: string }[];
  channel: ProspectionChannel;
}) {
  const CAMPAIGN_STEPS = CAMPAIGN_STEPS_MAP[channel];
  return (
    <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-orange-950/10 backdrop-blur-xl overflow-hidden">
      <div className="px-5 py-4">
        {/* Header with timer */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-xs font-semibold text-zinc-200">Campagne en cours</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">
              {progress.qualified}/{progress.target} leads
            </span>
            <span className="font-mono text-sm font-bold text-orange-400 bg-orange-500/10 px-3 py-1 rounded-lg">
              {formatTimer(timer)}
            </span>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 mb-4">
          {CAMPAIGN_STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === i + 1;
            const isDone = step > i + 1;
            return (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isDone
                      ? 'bg-emerald-500/20 border-2 border-emerald-500/40'
                      : isActive
                        ? 'bg-orange-500/20 border-2 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                        : 'bg-zinc-800/60 border-2 border-zinc-700/50'
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                    ) : (
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-orange-400' : 'text-zinc-600'} ${isActive ? 'animate-pulse' : ''}`} />
                    )}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${isDone ? 'text-emerald-400' : isActive ? 'text-orange-300' : 'text-zinc-600'}`}>
                    {s.label}
                  </span>
                </div>
                {i < CAMPAIGN_STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 -mt-5 rounded-full overflow-hidden bg-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-700"
                      style={{ width: isDone ? '100%' : isActive ? '50%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current action text */}
        <div className="text-center">
          <p className="text-xs text-zinc-400 truncate max-w-md mx-auto">
            {currentAction || CAMPAIGN_STEPS[Math.max(0, step - 1)]?.desc || 'Initialisation...'}
          </p>
        </div>
      </div>

      {/* Details toggle */}
      <div className="border-t border-zinc-800/50">
        <button
          onClick={onToggleDetails}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          {detailsOpen ? 'Masquer' : 'Voir'} les détails
          {detailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <AnimatePresence>
          {detailsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-0.5 border-t border-zinc-800/30">
                {liveLog.map((entry, i) => (
                  <div key={i} className={
                    entry.type === 'qualify' || entry.type === 'done_lead' || entry.type === 'complete' ? 'text-emerald-400' :
                    entry.type === 'error' || entry.type === 'fatal' ? 'text-rose-400' :
                    entry.type === 'warn' ? 'text-amber-400' :
                    entry.type === 'query' ? 'text-orange-300 mt-1.5' :
                    entry.type === 'skip' ? 'text-zinc-600' :
                    'text-zinc-500'
                  }>
                    {entry.message}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
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
  const [activeTab, setActiveTab] = useState<'campagne' | 'historique'>('campagne');
  const [searchQuery, setSearchQuery] = useState('');
  const [emailPreview, setEmailPreview] = useState<{ name: string; notes: string } | null>(null);
  const [channel, setChannel] = useState<ProspectionChannel>('google-maps');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  // Campaign stepper state
  const [campaignStep, setCampaignStep] = useState(0);
  const [campaignTimer, setCampaignTimer] = useState(0);
  const [campaignProgress, setCampaignProgress] = useState({ scanned: 0, qualified: 0, target: 10 });
  const [currentAction, setCurrentAction] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Instagram Agent Chat drawer
  const [igChatOpen, setIgChatOpen] = useState(false);
  const [igMessages, setIgMessages] = useState<{ role: 'user' | 'agent'; text: string; type?: string }[]>([]);
  const [igInput, setIgInput] = useState('');
  const [igLoading, setIgLoading] = useState(false);
  const igChatEndRef = useRef<HTMLDivElement | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      // Fetch all prospection sources (GMB, Instagram, LinkedIn)
      const [gmbRes, igRes, liRes] = await Promise.all([
        fetch('/api/leads?source=GMB'),
        fetch('/api/leads?source=Instagram'),
        fetch('/api/leads?source=LinkedIn'),
      ]);
      const [gmbData, igData, liData] = await Promise.all([gmbRes.json(), igRes.json(), liRes.json()]);
      const all = [
        ...(gmbData.success ? gmbData.data.leads : []),
        ...(igData.success ? igData.data.leads : []),
        ...(liData.success ? liData.data.leads : []),
      ];
      // Sort by created_at desc
      all.sort((a: Lead, b: Lead) => b.created_at - a.created_at);
      setLeads(all);
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

  // Timer effect
  useEffect(() => {
    if (triggering) {
      timerRef.current = setInterval(() => setCampaignTimer(t => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [triggering]);

  useEffect(() => {
    igChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [igMessages]);

  async function sendIgMessage() {
    const msg = igInput.trim();
    if (!msg || igLoading) return;
    setIgMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIgInput('');
    setIgLoading(true);
    try {
      const res = await fetch('/api/instagram/agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-key': 'altctrl-cron-secret',
        },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.body) throw new Error('No stream');
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
            if (event.type === 'thinking' || event.type === 'start_campaign') {
              setIgMessages(prev => [...prev, { role: 'agent', text: event.message, type: 'info' }]);
            } else if (event.type === 'plan') {
              const planText = `📋 **Plan établi**\n• Niche : ${event.niche}\n• Ville : ${event.ville}\n• Objectif : ${event.targetLeads} leads\n• Stratégie : ${event.strategy}`;
              setIgMessages(prev => [...prev, { role: 'agent', text: planText, type: 'plan' }]);
            } else if (event.type === 'report') {
              setIgMessages(prev => [...prev, { role: 'agent', text: event.message, type: 'report' }]);
              fetchLeads();
            } else if (['done_lead', 'complete', 'qualify'].includes(event.type)) {
              setIgMessages(prev => [...prev, { role: 'agent', text: event.message, type: 'done_lead' }]);
            } else if (['error', 'fatal'].includes(event.type)) {
              setIgMessages(prev => [...prev, { role: 'agent', text: event.message, type: 'error' }]);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      setIgMessages(prev => [...prev, { role: 'agent', text: `❌ Erreur: ${err.message}`, type: 'error' }]);
    } finally {
      setIgLoading(false);
    }
  }

  function mapEventToStep(type: string): number {
    if (['start', 'query', 'info'].includes(type)) return 1;
    if (['scan', 'qualify', 'skip'].includes(type)) return 2;
    if (['send', 'done_lead'].includes(type)) return 3;
    if (type === 'complete') return 4;
    return 0;
  }

  async function launchCampaign() {
    setTriggering(true);
    setTriggerStatus(null);
    setLiveLog([]);
    setCampaignStep(1);
    setCampaignTimer(0);
    setCampaignProgress({ scanned: 0, qualified: 0, target: maxLeads });
    setCurrentAction('Connexion au pipeline...');

    try {
      const res = await fetch('/api/cron/prospection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-key': 'altctrl-cron-secret',
        },
        body: JSON.stringify({ niches: selectedNiches, villes, minScore, maxLeads, channel }),
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

            // Update stepper
            const newStep = mapEventToStep(event.type);
            if (newStep > 0) setCampaignStep(newStep);

            // Update current action text (short version)
            if (event.type === 'query') {
              setCurrentAction(event.message?.replace('🔍 Recherche : ', 'Recherche de ') || '');
            } else if (event.type === 'scan') {
              setCurrentAction(event.message?.replace(/.*↳\s*/, 'Analyse de ').replace(/ — .*/, '') || '');
            } else if (event.type === 'send') {
              setCurrentAction(event.message?.replace('📧 ', '') || '');
            } else if (event.type === 'done_lead') {
              const match = event.message?.match(/\((\d+)\/(\d+)\)/);
              if (match) {
                setCampaignProgress(prev => ({ ...prev, qualified: parseInt(match[1]) }));
              }
              setCurrentAction(event.message?.replace('🎯 ', '') || '');
            } else if (event.type !== 'skip') {
              setCurrentAction(event.message?.replace(/^[^\s]+\s/, '') || '');
            }

            // Update scanned counter for scan events
            if (event.type === 'scan' || event.type === 'skip' || event.type === 'qualify') {
              setCampaignProgress(prev => ({ ...prev, scanned: prev.scanned + 1 }));
            }

            if (event.type === 'complete') {
              const d = event.results;
              setCampaignStep(4);
              setCurrentAction(`${d.sent} lead${d.sent > 1 ? 's' : ''} envoyé${d.sent > 1 ? 's' : ''} sur ${d.scanned} scannés`);
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

  function toggleNiche(n: string) {
    setSelectedNiches(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
  }

  function addVille(v: string) {
    const trimmed = v.trim();
    if (trimmed) {
      setVilles(prev => [...new Set([...prev, trimmed])]);
      setVilleInput('');
      setShowSuggestions(false);
    }
  }

  // Source filter
  const displayLeads = sourceFilter ? leads.filter(l => l.source === sourceFilter) : leads;

  // Stats
  const totalLeads = displayLeads.length;
  const nouveaux = displayLeads.filter(l => l.status === 'Nouveau').length;
  const qualifies = displayLeads.filter(l =>
    ['Qualifié', 'Discovery fait', 'Proposition envoyée', 'Signé'].includes(l.status)
  ).length;
  const rdvPris = displayLeads.filter(l => ['Discovery fait', 'Signé'].includes(l.status)).length;
  const pipeline = displayLeads.reduce((s, l) => s + (l.proposition_amount ?? 0), 0);
  const tauxReponse = totalLeads > 0 ? +((qualifies / totalLeads) * 100).toFixed(1) : 0;

  // Source counts for filter badges
  const sourceCountGMB = leads.filter(l => l.source === 'GMB').length;
  const sourceCountIG = leads.filter(l => l.source === 'Instagram').length;
  const sourceCountLI = leads.filter(l => l.source === 'LinkedIn').length;

  const pendingFollowup = displayLeads.filter(l => {
    if (l.status !== 'Nouveau' || !l.last_contacted_at) return false;
    return Date.now() - l.last_contacted_at >= 3 * 24 * 60 * 60 * 1000;
  }).length;

  const filteredSuggestions = VILLES_SUGGESTIONS.filter(
    v => !villes.includes(v) && v.toLowerCase().includes(villeInput.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Target className="w-5 h-5 text-orange-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Prospection</h1>
          <span className="text-xs text-zinc-600">Multi-canal</span>
          <span className="text-xs text-zinc-700 hidden sm:inline">·</span>
          <span className="text-xs text-zinc-600 hidden sm:inline">{totalLeads} lead{totalLeads > 1 ? 's' : ''}</span>

          {triggering && (
            <span className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Live
            </span>
          )}

          {pendingFollowup > 0 && !triggering && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {pendingFollowup} relance{pendingFollowup > 1 ? 's' : ''}
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
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-all ${
                configOpen
                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                  : 'border-zinc-700 hover:border-zinc-600 text-zinc-300'
              }`}
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
        {triggerStatus && !triggering && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${
              triggerStatus.startsWith('Erreur')
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            <span>{triggerStatus}</span>
            <button onClick={() => setTriggerStatus(null)}><X className="w-4 h-4" /></button>
          </motion.div>
        )}

        {/* Channel selector — always visible */}
        <div className="grid grid-cols-3 gap-3">
          {CHANNEL_OPTIONS.map(ch => {
            const Icon = ch.icon;
            const active = channel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setChannel(ch.id)}
                className={`relative flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${
                  active
                    ? `${ch.bg} ${ch.border} shadow-[0_0_24px_rgba(0,0,0,0.3)]`
                    : 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  active ? ch.bg + ' border ' + ch.border : 'bg-zinc-800/50 border border-zinc-700/30'
                }`}>
                  <Icon className={`w-5 h-5 ${active ? ch.color : 'text-zinc-600'}`} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${active ? 'text-zinc-100' : 'text-zinc-400'}`}>{ch.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${active ? ch.bg + ' ' + ch.color : 'bg-zinc-800 text-zinc-600'}`}>{ch.badge}</span>
                  </div>
                  <span className={`text-xs ${active ? 'text-zinc-400' : 'text-zinc-600'}`}>{ch.pitch}</span>
                </div>
                {active && (
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${ch.color.replace('text-', 'bg-')} animate-pulse`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Campaign Stepper (replaces old live log) */}
        {(triggering || campaignStep > 0) && (
          <CampaignStepper
            step={campaignStep}
            timer={campaignTimer}
            progress={campaignProgress}
            currentAction={currentAction}
            onToggleDetails={() => setDetailsOpen(o => !o)}
            detailsOpen={detailsOpen}
            liveLog={liveLog}
            channel={channel}
          />
        )}

        {/* Config panel */}
        <AnimatePresence>
          {configOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 backdrop-blur-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-100">Configuration campagne</h3>
                  <span className="text-xs text-zinc-600">{selectedNiches.length} niche{selectedNiches.length > 1 ? 's' : ''} · {villes.length} ville{villes.length > 1 ? 's' : ''}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left column: Niches + Villes */}
                  <div className="space-y-5">
                    {/* Niches */}
                    <div>
                      <p className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Niches cibles</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {NICHE_OPTIONS.map(({ label, icon: Icon }) => {
                          const active = selectedNiches.includes(label);
                          return (
                            <button
                              key={label}
                              onClick={() => toggleNiche(label)}
                              className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                                active
                                  ? 'bg-orange-500/15 border-orange-500/30 text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.08)]'
                                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 hover:scale-[1.02]'
                              }`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${active ? 'text-orange-400' : 'text-zinc-600'}`} />
                              <span className="truncate">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Villes */}
                    <div>
                      <p className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Villes cibles</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <AnimatePresence>
                          {villes.map(v => (
                            <motion.span
                              key={v}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-zinc-300"
                            >
                              <MapPin className="w-3 h-3 text-orange-400/60" />
                              {v}
                              <button onClick={() => setVilles(prev => prev.filter(x => x !== v))}>
                                <X className="w-3 h-3 text-zinc-600 hover:text-zinc-300 transition-colors" />
                              </button>
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input
                          value={villeInput}
                          onChange={e => { setVilleInput(e.target.value); setShowSuggestions(true); }}
                          onKeyDown={e => { if (e.key === 'Enter') addVille(villeInput); }}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          placeholder="Ajouter une ville..."
                          className="text-xs bg-zinc-800/60 border border-zinc-700/50 rounded-xl pl-9 pr-3 py-2.5 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-orange-500/30 focus:bg-zinc-800 w-full transition-all"
                        />
                        {/* Suggestions dropdown */}
                        {showSuggestions && filteredSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-10 shadow-xl">
                            {filteredSuggestions.slice(0, 5).map(v => (
                              <button
                                key={v}
                                onMouseDown={() => addVille(v)}
                                className="w-full text-left text-xs px-4 py-2 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 transition-colors flex items-center gap-2"
                              >
                                <MapPin className="w-3 h-3 text-zinc-600" />
                                {v}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right column: Sliders + Email */}
                  <div className="space-y-5">
                    {/* Score slider (Google Maps only) / Channel info */}
                    {channel === 'google-maps' ? (
                      <div className="rounded-xl bg-zinc-800/30 border border-zinc-800/50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-zinc-400 font-medium">Score Lighthouse minimum</p>
                          <span className="text-sm font-bold text-orange-400 font-mono">{minScore}/100</span>
                        </div>
                        <div className="relative">
                          <div className="h-2 rounded-full bg-zinc-700/50 overflow-hidden mb-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500"
                              style={{ width: `${((minScore - 40) / 50) * 100}%` }}
                            />
                          </div>
                          <input
                            type="range"
                            min={40}
                            max={90}
                            value={minScore}
                            onChange={e => setMinScore(Number(e.target.value))}
                            className="w-full absolute top-0 opacity-0 cursor-pointer h-4"
                          />
                        </div>
                        <p className="text-xs text-zinc-600 mt-2">Sites en dessous de ce score sont contactés</p>
                      </div>
                    ) : (
                      <div className={`rounded-xl border p-4 ${
                        channel === 'instagram' ? 'bg-pink-500/5 border-pink-500/15' : 'bg-blue-500/5 border-blue-500/15'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {channel === 'instagram'
                            ? <Instagram className="w-4 h-4 text-pink-400" />
                            : <Linkedin className="w-4 h-4 text-blue-400" />}
                          <p className={`text-xs font-semibold ${channel === 'instagram' ? 'text-pink-300' : 'text-blue-300'}`}>
                            {channel === 'instagram' ? 'Ciblage Instagram' : 'Ciblage LinkedIn'}
                          </p>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {channel === 'instagram'
                            ? 'Cible les entreprises SANS site web ou avec un score Lighthouse < 30. Recherche automatique du profil Instagram via Google.'
                            : 'Recherche de profils LinkedIn par niche et ville via Google. Extraction du nom et de la headline professionnelle.'}
                        </p>
                      </div>
                    )}

                    {/* Leads target slider */}
                    <div className="rounded-xl bg-zinc-800/30 border border-zinc-800/50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-zinc-400 font-medium">Objectif leads</p>
                        <span className="text-sm font-bold text-orange-400 font-mono">{maxLeads}</span>
                      </div>
                      <div className="relative">
                        <div className="h-2 rounded-full bg-zinc-700/50 overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
                            style={{ width: `${(maxLeads / 50) * 100}%` }}
                          />
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={50}
                          value={maxLeads}
                          onChange={e => setMaxLeads(Number(e.target.value))}
                          className="w-full absolute top-0 opacity-0 cursor-pointer h-4"
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        {[
                          { label: 'Test', max: 3, icon: '🧪' },
                          { label: 'Standard', max: 15, icon: '📊' },
                          { label: 'Volume', max: 50, icon: '🚀' },
                        ].map(tier => (
                          <span
                            key={tier.label}
                            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                              maxLeads <= tier.max && (tier.max === 3 || maxLeads > (tier.max === 15 ? 3 : 15))
                                ? 'bg-orange-500/15 text-orange-300'
                                : 'text-zinc-600'
                            }`}
                          >
                            {tier.icon} {tier.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Channel info card */}
                    <div className={`rounded-xl bg-gradient-to-br ${
                      channel === 'instagram' ? 'from-pink-500/5 border-pink-500/10' :
                      channel === 'linkedin' ? 'from-blue-500/5 border-blue-500/10' :
                      'from-orange-500/5 border-orange-500/10'
                    } to-transparent border p-4`}>
                      <div className="flex items-center gap-2 mb-3">
                        {channel === 'instagram' ? <MessageCircle className="w-4 h-4 text-pink-400" /> :
                         channel === 'linkedin' ? <Mail className="w-4 h-4 text-blue-400" /> :
                         <Mail className="w-4 h-4 text-orange-400" />}
                        <span className="text-xs font-semibold text-zinc-200">
                          {channel === 'instagram' ? 'DM Instagram + IA' :
                           channel === 'linkedin' ? 'Email LinkedIn + IA' :
                           'Email HTML + IA'}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-zinc-500">
                        {channel === 'google-maps' && <>
                          <div className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">1.</span><span>Smart extraction email depuis le site web</span></div>
                          <div className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">2.</span><span>Template HTML pro avec diagnostic et CTA</span></div>
                          <div className="flex items-start gap-2"><span className="text-orange-400 mt-0.5">3.</span><span>Claude IA personnalise chaque email</span></div>
                        </>}
                        {channel === 'instagram' && <>
                          <div className="flex items-start gap-2"><span className="text-pink-400 mt-0.5">1.</span><span>Recherche entreprises SANS site web</span></div>
                          <div className="flex items-start gap-2"><span className="text-pink-400 mt-0.5">2.</span><span>Recherche profil Instagram automatique</span></div>
                          <div className="flex items-start gap-2"><span className="text-pink-400 mt-0.5">3.</span><span>Message DM personnalisé par Claude IA</span></div>
                          <div className="flex items-start gap-2"><span className="text-pink-400 mt-0.5">4.</span><span>Envoi manuel des DMs (pas d'API)</span></div>
                        </>}
                        {channel === 'linkedin' && <>
                          <div className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">1.</span><span>Recherche profils LinkedIn par niche/ville</span></div>
                          <div className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">2.</span><span>Email personnalisé par Claude IA</span></div>
                          <div className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">3.</span><span>Template orienté crédibilité professionnelle</span></div>
                        </>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Contactés', value: totalLeads, icon: Users, color: 'text-orange-400', bg: 'from-orange-500/5' },
            { label: 'En attente', value: nouveaux, icon: Clock, color: 'text-blue-400', bg: 'from-blue-500/5' },
            { label: 'Taux réponse', value: `${tauxReponse}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/5' },
            { label: 'RDV pris', value: rdvPris, icon: Calendar, color: 'text-violet-400', bg: 'from-violet-500/5' },
            { label: 'Pipeline', value: pipeline > 0 ? `${Math.round(pipeline / 1000)}k€` : '—', icon: Euro, color: 'text-amber-400', bg: 'from-amber-500/5' },
          ].map((stat, i) => (
            <div key={i} className={`rounded-xl border border-zinc-800/60 bg-gradient-to-br ${stat.bg} to-zinc-900/50 p-4 hover:border-zinc-700/60 transition-colors`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color} opacity-60`} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs + Source filters */}
        <div className="flex items-center gap-1 border-b border-zinc-800">
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

          {/* Source filter badges */}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSourceFilter(null)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${!sourceFilter ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Tous ({leads.length})
            </button>
            {sourceCountGMB > 0 && (
              <button
                onClick={() => setSourceFilter(sourceFilter === 'GMB' ? null : 'GMB')}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${sourceFilter === 'GMB' ? 'bg-orange-500/20 text-orange-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <MapPin className="w-3 h-3" /> GMB ({sourceCountGMB})
              </button>
            )}
            {sourceCountIG > 0 && (
              <button
                onClick={() => setSourceFilter(sourceFilter === 'Instagram' ? null : 'Instagram')}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${sourceFilter === 'Instagram' ? 'bg-pink-500/20 text-pink-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Instagram className="w-3 h-3" /> IG ({sourceCountIG})
              </button>
            )}
            {sourceCountLI > 0 && (
              <button
                onClick={() => setSourceFilter(sourceFilter === 'LinkedIn' ? null : 'LinkedIn')}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${sourceFilter === 'LinkedIn' ? 'bg-blue-500/20 text-blue-300' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Linkedin className="w-3 h-3" /> LI ({sourceCountLI})
              </button>
            )}
          </div>
        </div>

        {/* Leads table */}
        {activeTab === 'campagne' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-zinc-100">Leads prospection</span>
            {sourceFilter && <span className={`text-xs px-2 py-0.5 rounded-full ${
              sourceFilter === 'GMB' ? 'bg-orange-500/10 text-orange-400' :
              sourceFilter === 'Instagram' ? 'bg-pink-500/10 text-pink-400' :
              'bg-blue-500/10 text-blue-400'
            }`}>{sourceFilter}</span>}
            <span className="ml-auto text-xs text-zinc-600">{totalLeads} leads</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
            </div>
          ) : displayLeads.length === 0 ? (
            <div className="p-12 text-center">
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4 ${
                sourceFilter === 'Instagram' ? 'bg-pink-500/5 border-pink-500/15' :
                sourceFilter === 'LinkedIn' ? 'bg-blue-500/5 border-blue-500/15' :
                'bg-zinc-800/50 border-zinc-700/30'
              }`}>
                {sourceFilter === 'Instagram' ? <Instagram className="w-8 h-8 text-pink-500/40" /> :
                 sourceFilter === 'LinkedIn' ? <Linkedin className="w-8 h-8 text-blue-500/40" /> :
                 <Target className="w-8 h-8 text-zinc-700" />}
              </div>
              <p className="text-sm text-zinc-400 mb-1">
                {sourceFilter === 'GMB' ? 'Aucun lead Google Maps' :
                 sourceFilter === 'Instagram' ? 'Aucun lead Instagram' :
                 sourceFilter === 'LinkedIn' ? 'Aucun lead LinkedIn' :
                 'Aucun lead pour l\'instant'}
              </p>
              <p className="text-xs text-zinc-600 mb-4">
                {sourceFilter
                  ? `Lancez une campagne ${sourceFilter === 'GMB' ? 'Google Maps' : sourceFilter} pour générer vos premiers leads.`
                  : 'Configurez vos niches et villes, puis lancez une campagne.'}
              </p>
              <button
                onClick={() => setConfigOpen(true)}
                className="text-xs px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 hover:bg-orange-500/20 transition-colors"
              >
                Ouvrir la configuration
              </button>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[1.5fr_0.6fr_1fr_0.8fr_1.2fr_0.8fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-zinc-800/50 text-xs text-zinc-600 font-medium">
                <span>Entreprise</span>
                <span>Source</span>
                <span>Site web</span>
                <span>Score</span>
                <span>Email</span>
                <span>Statut</span>
                <span>Envois</span>
                <span>Msg</span>
                <span>Action</span>
              </div>

              <div className="divide-y divide-zinc-800/30">
                {displayLeads.map(lead => {
                  const daysSince = lead.last_contacted_at
                    ? Math.floor((Date.now() - lead.last_contacted_at) / 86400000)
                    : null;
                  const hasEmail = lead.notes?.includes('--- EMAIL ENVOYÉ ---');
                  const hasDM = lead.notes?.includes('--- MESSAGE DM ---');
                  return (
                    <div
                      key={lead.id}
                      className="grid grid-cols-[1.5fr_0.6fr_1fr_0.8fr_1.2fr_0.8fr_auto_auto_auto] gap-3 items-center px-4 py-3 hover:bg-zinc-800/30 transition-colors"
                    >
                      <button className="text-left" onClick={() => setSelectedLead(lead)}>
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {lead.company ?? lead.name}
                        </p>
                        <p className="text-xs text-zinc-600 truncate">
                          {daysSince !== null ? `J+${daysSince}` : new Date(lead.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </button>

                      {/* Source badge */}
                      <span className={`text-xs px-2 py-0.5 rounded-full text-center ${
                        lead.source === 'Instagram' ? 'bg-pink-500/10 text-pink-400' :
                        lead.source === 'LinkedIn' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-orange-500/10 text-orange-400'
                      }`}>
                        {lead.source === 'GMB' ? 'Maps' : lead.source}
                      </span>

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

                      <button
                        onClick={() => (hasEmail || hasDM) ? setEmailPreview({ name: lead.company ?? lead.name, notes: lead.notes! }) : null}
                        disabled={!hasEmail && !hasDM}
                        title={hasEmail ? 'Voir l\'email envoyé' : hasDM ? 'Voir le message DM' : 'Aucun message'}
                        className="p-1.5 text-zinc-600 hover:text-blue-400 disabled:opacity-20 transition-colors"
                      >
                        {hasDM && !hasEmail ? <MessageCircle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
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
              const filtered = displayLeads.filter(l => {
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
                      <div key={lead.id} className="px-4 py-3 hover:bg-zinc-800/30 transition-colors">
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
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                                lead.source === 'Instagram' ? 'bg-pink-500/10 text-pink-400' :
                                lead.source === 'LinkedIn' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-orange-500/10 text-orange-400'
                              }`}>
                                {lead.source === 'GMB' ? 'Maps' : lead.source}
                              </span>
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
              {displayLeads.length} entreprise{displayLeads.length > 1 ? 's' : ''} dans la base
              {searchQuery && ` · ${displayLeads.filter(l => {
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
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
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
                // Handle DM messages
                const dmSection = emailPreview.notes.split('--- MESSAGE DM ---');
                if (dmSection.length >= 2 && !emailPreview.notes.includes('--- EMAIL ENVOYÉ ---')) {
                  const dmText = dmSection[1].trim();
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-pink-400 mb-2">
                        <MessageCircle className="w-4 h-4" />
                        <span className="font-semibold">Message DM Instagram</span>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-pink-500/5 to-purple-500/5 border border-pink-500/20 p-4 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                        {dmText.split('---')[0].trim()}
                      </div>
                      <p className="text-xs text-zinc-500">Copiez ce message et envoyez-le manuellement via Instagram DM.</p>
                    </div>
                  );
                }

                const emailSection = emailPreview.notes.split('--- EMAIL ENVOYÉ ---');
                if (emailSection.length < 2) return <p className="text-xs text-zinc-500">Aucun message enregistré</p>;
                const emailMeta = emailSection[1].trim();
                const lines = emailMeta.split('\n');
                const subject = lines.find(l => l.startsWith('Objet:'))?.replace('Objet: ', '') ?? '';
                const to = lines.find(l => l.startsWith('À:'))?.replace('À: ', '') ?? '';
                const date = lines.find(l => l.startsWith('Date:'))?.replace('Date: ', '') ?? '';

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
          </motion.div>
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

      {/* Instagram Agent Chat — FAB */}
      <button
        onClick={() => setIgChatOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        title="Agent Instagram IA"
      >
        {igChatOpen ? <X className="w-6 h-6 text-white" /> : <Instagram className="w-6 h-6 text-white" />}
      </button>

      {/* Instagram Agent Chat — Drawer */}
      <AnimatePresence>
        {igChatOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 z-40 h-screen w-[420px] bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 bg-gradient-to-r from-pink-500/10 to-purple-500/10 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">Directeur Marketing Digital</p>
                <p className="text-xs text-pink-400">Agent fatah · Instagram IA</p>
              </div>
              <button onClick={() => setIgChatOpen(false)} className="ml-auto text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {igMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 flex items-center justify-center">
                    <Instagram className="w-8 h-8 text-pink-400/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300 mb-1">Directeur Marketing Digital</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">Décrivez votre mission de prospection Instagram et je m'occupe du reste.</p>
                  </div>
                  <div className="space-y-2 w-full">
                    {[
                      'Démarche 15 restaurants à Genève',
                      'Trouve 10 artisans à Lyon sans site web',
                      'Prospecte 20 coiffeurs à Paris',
                    ].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setIgInput(suggestion)}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-pink-500/30 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {igMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-pink-500/20 border border-pink-500/30 text-pink-100 rounded-br-sm'
                      : msg.type === 'error' || msg.type === 'fatal'
                      ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-bl-sm'
                      : msg.type === 'plan'
                      ? 'bg-purple-500/10 border border-purple-500/20 text-purple-200 rounded-bl-sm'
                      : msg.type === 'report'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-bl-sm'
                      : 'bg-zinc-800/70 border border-zinc-700/50 text-zinc-200 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {igLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800/70 border border-zinc-700/50 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                    <span className="text-xs text-zinc-400">Fatah en mission...</span>
                  </div>
                </div>
              )}
              <div ref={igChatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
              <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-700/50 rounded-xl px-3 py-2 focus-within:border-pink-500/50 transition-colors">
                <textarea
                  value={igInput}
                  onChange={e => setIgInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendIgMessage(); } }}
                  placeholder="Décrivez votre mission Instagram..."
                  rows={2}
                  className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none"
                />
                <button
                  onClick={sendIgMessage}
                  disabled={!igInput.trim() || igLoading}
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Play className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="text-xs text-zinc-600 mt-1.5 text-center">Shift+Enter pour nouvelle ligne</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
