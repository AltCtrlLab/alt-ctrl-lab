'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Mail, Phone, ArrowLeft, Pencil, ArrowLeftRight,
  Loader2, Sparkles, Copy, Trash2, TrendingUp,
  UserPlus, Send, Bell, BellRing, CheckCircle2,
  FileText, Image, Grid3X3, Plus,
} from 'lucide-react';
import type { Lead, LeadStatus } from '@/lib/db/schema_leads';
import { STATUS_META } from '@/lib/db/schema_leads';
import type { ScoreCriteria } from '@/lib/scoring';
import { ScoreBadge } from '@/components/leads/ScoreBadge';
import { ScoreBreakdown } from '@/components/leads/ScoreBreakdown';
import { StatusStepper } from '@/components/leads/StatusStepper';
import { RelanceAlert } from '@/components/leads/RelanceAlert';
import { AutoChainToast } from '@/components/shared/AutoChainToast';

/* ── Helpers ───────────────────────────────────────────────────────── */

function formatDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `il y a ${d}j`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}min`;
  return "à l'instant";
}

/* ── Glass Panel ───────────────────────────────────────────────────── */

function GlassPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden group rounded-2xl p-8 ${className}`}
      style={{
        background: 'rgba(31, 31, 34, 0.6)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {children}
    </div>
  );
}

/* ── Activity Timeline (Stitch style) ──────────────────────────────── */

function StitchTimeline({ lead }: { lead: Lead }) {
  interface TimelineEvent {
    label: string;
    description: string;
    date: number;
    icon: React.ElementType;
    iconColor: string;
  }

  const events: TimelineEvent[] = [];

  if (lead.createdAt) {
    events.push({
      label: 'Lead créé',
      description: `Nouveau lead ajouté depuis ${lead.source ?? 'source inconnue'}.`,
      date: lead.createdAt as number,
      icon: UserPlus,
      iconColor: 'text-[#00f4fe]',
    });
  }
  if (lead.discoveryCallAt) {
    events.push({
      label: 'Discovery Call',
      description: 'Appel de qualification effectué.',
      date: lead.discoveryCallAt as number,
      icon: Phone,
      iconColor: 'text-[#00f4fe]',
    });
  }
  if (lead.propositionSentAt) {
    events.push({
      label: 'Proposition envoyée',
      description: 'Devis envoyé au prospect.',
      date: lead.propositionSentAt as number,
      icon: Send,
      iconColor: 'text-[#df8eff]',
    });
  }
  if (lead.relance1SentAt) {
    events.push({
      label: 'Relance 1 envoyée',
      description: 'Première relance envoyée.',
      date: lead.relance1SentAt as number,
      icon: Bell,
      iconColor: 'text-[#ff7162]',
    });
  }
  if (lead.relance2SentAt) {
    events.push({
      label: 'Relance 2 envoyée',
      description: 'Seconde relance envoyée.',
      date: lead.relance2SentAt as number,
      icon: BellRing,
      iconColor: 'text-[#ff7162]',
    });
  }
  if (lead.signedAt) {
    events.push({
      label: 'Signé',
      description: 'Contrat signé — lead converti en client.',
      date: lead.signedAt as number,
      icon: CheckCircle2,
      iconColor: 'text-[#00f4fe]',
    });
  }

  events.sort((a, b) => b.date - a.date);

  if (events.length === 0) {
    return <p className="text-xs text-on-surface-variant italic">Aucun événement enregistré</p>;
  }

  return (
    <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
      {events.map((evt, i) => {
        const Icon = evt.icon;
        return (
          <div key={i} className="relative flex gap-6 group/item">
            <div className={`z-10 w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center ${evt.iconColor} border border-white/10 group-hover/item:scale-110 transition-transform`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <p className="text-sm font-bold text-on-surface">{evt.label}</p>
                <p className="text-[10px] text-on-surface-variant">{timeAgo(evt.date)}</p>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">{evt.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────── */

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);
  const [propositionAmount, setPropositionAmount] = useState('');
  const [savingAmount, setSavingAmount] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [autoChainActions, setAutoChainActions] = useState<string[]>([]);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [proposalFromTemplate, setProposalFromTemplate] = useState(false);
  const [deletingConfirm, setDeletingConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.success) {
        const found = (data.data.leads as Lead[]).find(l => l.id === leadId);
        if (found) {
          setLead(found);
          if (!notesDirty) setNotes(found.notes ?? '');
          setPropositionAmount(found.propositionAmount?.toString() ?? '');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [leadId, notesDirty]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  const handleStatusChange = async (status: LeadStatus) => {
    if (!lead) return;
    setUpdatingStatus(true);
    const body: Record<string, unknown> = { status };
    if (status === 'Discovery fait' && !lead.discoveryCallAt) body.discoveryCallAt = Date.now();
    if (status === 'Proposition envoyée' && !lead.propositionSentAt) body.propositionSentAt = Date.now();
    if (status === 'Relance 1' && !lead.relance1SentAt) body.relance1SentAt = Date.now();
    if (status === 'Relance 2' && !lead.relance2SentAt) body.relance2SentAt = Date.now();
    if (status === 'Signé' && !lead.signedAt) body.signedAt = Date.now();

    const res = await fetch(`/api/leads?id=${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.autoChain?.length > 0) setAutoChainActions(data.autoChain);
    setUpdatingStatus(false);
    fetchLead();
  };

  const saveNotes = useCallback(async () => {
    if (!notesDirty || !lead) return;
    setSavingNotes(true);
    await fetch(`/api/leads?id=${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
    setNotesDirty(false);
  }, [notes, notesDirty, lead]);

  const saveAmount = async () => {
    if (!lead) return;
    const num = parseFloat(propositionAmount);
    if (isNaN(num)) return;
    setSavingAmount(true);
    await fetch(`/api/leads?id=${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propositionAmount: num }),
    });
    setSavingAmount(false);
    fetchLead();
  };

  const generateProposal = async () => {
    if (!lead) return;
    setGeneratingProposal(true);
    setProposal(null);
    try {
      const res = await fetch('/api/ai/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id, name: lead.name, company: lead.company,
          budget: lead.budget, timeline: lead.timeline, notes: lead.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProposal(data.data.proposal);
        setProposalFromTemplate(data.data.fromTemplate === true);
      }
    } catch (err: unknown) {
      console.error('Proposal generation error:', err);
    } finally {
      setGeneratingProposal(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    setDeleting(true);
    await fetch(`/api/leads?id=${lead.id}`, { method: 'DELETE' });
    router.push('/leads');
  };

  const scoreCriteria: ScoreCriteria | null = lead?.scoreCriteria
    ? JSON.parse(lead.scoreCriteria as string)
    : null;

  const meta = lead ? STATUS_META[lead.status as LeadStatus] : null;

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#df8eff] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <p className="text-on-surface-variant">Lead introuvable.</p>
        <button onClick={() => router.push('/leads')} className="text-[#df8eff] hover:underline text-sm font-bold">
          Retour au pipeline
        </button>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <div className="pb-32 px-8 pt-8">

        {/* ── Back button ───────────────────────────────────────────── */}
        <button
          onClick={() => router.push('/leads')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-sm font-headline font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Pipeline
        </button>

        {/* ── Lead Header Section ───────────────────────────────────── */}
        <section className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4">
            {/* Tags row */}
            <div className="flex items-center gap-4">
              {lead.source && (
                <span className="bg-[#00f4fe]/10 text-[#00f4fe] text-[10px] font-bold tracking-[0.2em] px-3 py-1 rounded-full uppercase">
                  {lead.source}
                </span>
              )}
              {meta && (
                <span className="bg-[#d878ff] text-[#000000] text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                  {lead.status}
                </span>
              )}
              <ScoreBadge score={lead.score} size="sm" showLabel />
            </div>

            {/* Big name */}
            <h1 className="text-5xl md:text-6xl font-extrabold font-headline tracking-tight text-on-surface">
              {lead.name}
            </h1>

            {/* Contact line */}
            <p className="text-xl text-on-surface-variant font-body">
              {lead.company && (
                <>Contact Principal : <span className="text-on-surface font-semibold">{lead.company}</span></>
              )}
              {!lead.company && lead.email && (
                <>Contact : <span className="text-on-surface font-semibold">{lead.email}</span></>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {/* Delete */}
            {!deletingConfirm ? (
              <button
                onClick={() => setDeletingConfirm(true)}
                className="bg-surface-container-highest text-on-surface px-6 py-3 rounded-full font-headline text-sm font-bold border border-white/10 hover:border-rose-500/50 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-rose-400">Confirmer ?</span>
                <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-sm font-bold transition-all">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Oui'}
                </button>
                <button onClick={() => setDeletingConfirm(false)} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface rounded-full transition-all">
                  Non
                </button>
              </div>
            )}

            {/* Move Stage */}
            <button
              onClick={() => {
                const statuses: LeadStatus[] = ['Nouveau', 'Discovery fait', 'Proposition envoyée', 'Relance 1', 'Relance 2', 'Signé'];
                const idx = statuses.indexOf(lead.status as LeadStatus);
                if (idx >= 0 && idx < statuses.length - 1) handleStatusChange(statuses[idx + 1]);
              }}
              disabled={updatingStatus || lead.status === 'Signé'}
              className="bg-surface-container-highest text-on-surface px-6 py-3 rounded-full font-headline text-sm font-bold border border-white/10 hover:border-[#df8eff]/50 transition-all flex items-center gap-2 disabled:opacity-40"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Avancer
            </button>

            {/* Contact */}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="bg-gradient-to-br from-[#df8eff] to-[#bb00fc] text-white px-8 py-3 rounded-full font-headline text-sm font-bold shadow-lg shadow-[#df8eff]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Contacter
              </a>
            )}
          </div>
        </section>

        {/* ── Status Stepper ─────────────────────────────────────────── */}
        <div className="mb-8">
          <StatusStepper currentStatus={lead.status as LeadStatus} onStatusChange={handleStatusChange} disabled={updatingStatus} />
        </div>

        {/* ── Relance Alert ──────────────────────────────────────────── */}
        <div className="mb-8">
          <RelanceAlert lead={lead} />
        </div>

        {/* ── Kinetic Bento Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* ━━━ Left Column (8 cols) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Contact Card */}
            <GlassPanel>
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#df8eff]/5 rounded-full blur-3xl group-hover:bg-[#df8eff]/10 transition-colors" />
              <h3 className="text-[10px] font-bold text-on-surface-variant mb-6 uppercase tracking-widest">
                Coordonnées
              </h3>
              <div className="space-y-4">
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-4 group/contact">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-[#df8eff]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant">Email</p>
                      <p className="text-sm font-medium text-on-surface group-hover/contact:text-[#df8eff] transition-colors">{lead.email}</p>
                    </div>
                  </a>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-4 group/contact">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-[#df8eff]">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant">Téléphone</p>
                      <p className="text-sm font-medium text-on-surface group-hover/contact:text-[#df8eff] transition-colors">{lead.phone}</p>
                    </div>
                  </a>
                )}
                {!lead.email && !lead.phone && (
                  <p className="text-xs text-on-surface-variant italic">Aucun contact renseigné</p>
                )}
              </div>
            </GlassPanel>

            {/* Deal Value Card */}
            <GlassPanel className="border-l-4 border-[#00f4fe]/40">
              <h3 className="text-[10px] font-bold text-on-surface-variant mb-4 uppercase tracking-widest">
                Valeur du deal
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-headline font-extrabold text-on-surface">
                  {lead.propositionAmount
                    ? `€${lead.propositionAmount.toLocaleString('fr-FR')}`
                    : lead.budget || '—'}
                </span>
                {lead.propositionAmount && (
                  <span className="text-[#00f4fe] text-sm font-bold flex items-center">
                    <TrendingUp className="w-4 h-4 mr-0.5" />
                    actif
                  </span>
                )}
              </div>
              {lead.budget && (
                <p className="text-xs text-on-surface-variant mt-2 font-medium">Budget estimé : {lead.budget}</p>
              )}
              {/* Editable amount */}
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="number"
                  value={propositionAmount}
                  onChange={e => setPropositionAmount(e.target.value)}
                  onBlur={saveAmount}
                  placeholder="Montant..."
                  className="flex-1 px-4 py-2 text-sm bg-surface-container-lowest border border-white/10 rounded-full text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-[#df8eff]/50 transition-all"
                />
                {savingAmount && <Loader2 className="w-4 h-4 text-on-surface-variant animate-spin" />}
              </div>
            </GlassPanel>

            {/* Info Card — spans 2 cols */}
            <GlassPanel className="md:col-span-2 flex items-center justify-between">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Source</p>
                  <p className="text-sm font-bold font-headline text-on-surface">{lead.source ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Budget</p>
                  <p className="text-sm font-bold font-headline text-on-surface">{lead.budget ?? '—'}</p>
                </div>
                {lead.timeline && (
                  <div>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Timeline</p>
                    <p className="text-sm font-bold font-headline text-on-surface">{lead.timeline}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Créé le</p>
                  <p className="text-sm font-bold font-headline text-on-surface">{formatDate(lead.createdAt as number)}</p>
                </div>
              </div>
            </GlassPanel>

            {/* Activity Timeline — spans 2 cols */}
            <GlassPanel className="md:col-span-2">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Historique d&apos;activité
                </h3>
                <span className="text-[#df8eff] text-xs font-bold">
                  {formatDate(lead.updatedAt as number)}
                </span>
              </div>
              <StitchTimeline lead={lead} />
            </GlassPanel>
          </div>

          {/* ━━━ Right Column (4 cols) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div className="md:col-span-4 space-y-6">

            {/* Score Card */}
            <div className="bg-surface-container-low p-6 rounded-2xl">
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Score</h3>
              <div className="flex items-center gap-3 mb-4">
                <ScoreBadge score={lead.score} size="lg" showLabel />
                <p className="text-xs text-on-surface-variant">
                  {lead.score >= 7 ? 'Lead chaud — priorité maximale.' : lead.score >= 4 ? 'Lead tiède — à qualifier.' : 'Lead froid — score insuffisant.'}
                </p>
              </div>
              <ScoreBreakdown criteria={scoreCriteria} />
            </div>

            {/* Internal Notes */}
            <div className="bg-surface-container-low p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Notes internes</h3>
                <div className="flex items-center gap-1">
                  {savingNotes && <Loader2 className="w-3 h-3 text-on-surface-variant animate-spin" />}
                  {!savingNotes && !notesDirty && notes && <span className="text-[10px] text-on-surface-variant">Sauvegardé</span>}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-surface p-4 rounded-xl border border-white/5">
                  <textarea
                    value={notes}
                    onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
                    onBlur={saveNotes}
                    rows={4}
                    placeholder="Notes, contexte, red flags..."
                    className="w-full bg-transparent text-xs text-on-surface leading-relaxed placeholder:text-on-surface-variant/40 focus:outline-none resize-none"
                  />
                  {notes && (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#df8eff]">
                        Priorité : {lead.score >= 7 ? 'Haute' : lead.score >= 4 ? 'Moyenne' : 'Basse'}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">{timeAgo(lead.updatedAt as number)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions IA */}
            <div className="bg-surface-container-low p-6 rounded-2xl">
              <h3 className="text-[10px] font-bold text-on-surface-variant mb-4 uppercase tracking-widest">Actions IA</h3>
              <button
                onClick={generateProposal}
                disabled={generatingProposal}
                className="w-full py-3 bg-[#df8eff]/10 text-[#df8eff] rounded-full font-headline text-sm font-bold border border-[#df8eff]/20 hover:bg-[#df8eff]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generatingProposal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Générer proposition IA
              </button>

              {proposal && (
                <div className="mt-4 bg-surface p-4 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Proposition générée
                      {proposalFromTemplate && (
                        <span className="ml-2 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full normal-case tracking-normal">template</span>
                      )}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(proposal)}
                      className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copier
                    </button>
                  </div>
                  <pre className="text-xs text-on-surface whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">{proposal}</pre>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {autoChainActions.length > 0 && (
        <AutoChainToast actions={autoChainActions} onClose={() => setAutoChainActions([])} />
      )}
    </div>
  );
}
