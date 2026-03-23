'use client';

import { useState, useCallback } from 'react';
import {
  Mail, Phone, Building2, Euro, Trash2,
  Check, Loader2, Sparkles, Copy, X, ArrowRight,
} from 'lucide-react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';
import { AutoChainToast } from '@/components/shared/AutoChainToast';
import type { Lead, LeadStatus } from '@/lib/db/schema_leads';
import { STATUS_META } from '@/lib/db/schema_leads';
import type { ScoreCriteria } from '@/lib/scoring';
import { ScoreBadge } from './ScoreBadge';
import { ScoreBreakdown } from './ScoreBreakdown';
import { AuditTimeline } from '@/components/shared/AuditTimeline';
import { ActivityTimeline } from './ActivityTimeline';
import { StatusStepper } from './StatusStepper';
import { RelanceAlert } from './RelanceAlert';

const SOURCE_ICONS: Record<string, string> = {
  LinkedIn: '💼', Email: '✉️', Instagram: '📸', GMB: '🗺️', Referral: '🤝', Site: '🌐',
};

function formatDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts as number).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Glass Panel ─────────────────────────────────────────────────────── */
function GlassPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1f1f22]/60 backdrop-blur-[20px] border-t border-white/10 p-8 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function LeadDetailModal({ lead, onClose, onStatusChange, onUpdated, onDeleted }: LeadDetailModalProps) {
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);
  const [propositionAmount, setPropositionAmount] = useState(lead.propositionAmount?.toString() ?? '');
  const [savingAmount, setSavingAmount] = useState(false);
  const [deletingConfirm, setDeletingConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [autoChainActions, setAutoChainActions] = useState<string[]>([]);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [proposalFromTemplate, setProposalFromTemplate] = useState(false);

  const scoreCriteria: ScoreCriteria | null = lead.scoreCriteria
    ? JSON.parse(lead.scoreCriteria as string)
    : null;

  const meta = STATUS_META[lead.status as LeadStatus];

  const handleStatusChange = async (status: LeadStatus) => {
    setUpdatingStatus(true);
    onStatusChange(lead.id, status);
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
    if (data.autoChain && data.autoChain.length > 0) {
      setAutoChainActions(data.autoChain);
    }
    setUpdatingStatus(false);
    onUpdated();
  };

  const generateProposal = async () => {
    setGeneratingProposal(true);
    setProposal(null);
    try {
      const res = await fetch('/api/ai/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          name: lead.name,
          company: lead.company,
          budget: lead.budget,
          timeline: lead.timeline,
          notes: lead.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProposal(data.data.proposal);
        setProposalFromTemplate(data.data.fromTemplate === true);
      } else {
        console.error('Proposal generation failed:', data.error);
      }
    } catch (err: unknown) {
      console.error('Proposal generation error:', err);
    } finally {
      setGeneratingProposal(false);
    }
  };

  const saveNotes = useCallback(async () => {
    if (!notesDirty) return;
    setSavingNotes(true);
    await fetch(`/api/leads?id=${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
    setNotesDirty(false);
    onUpdated();
  }, [notes, notesDirty, lead.id, onUpdated]);

  const saveAmount = async () => {
    const num = parseFloat(propositionAmount);
    if (isNaN(num)) return;
    setSavingAmount(true);
    await fetch(`/api/leads?id=${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propositionAmount: num }),
    });
    setSavingAmount(false);
    onUpdated();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/leads?id=${lead.id}`, { method: 'DELETE' });
    onDeleted();
  };

  return (
    <>
    <AdaptiveModal isOpen={true} onClose={onClose} title={`Détails du lead ${lead.name}`} showHeader={false}>
      <div className="flex-1 overflow-y-auto">

        {/* ── Hero Header ──────────────────────────────────────────── */}
        <div className="px-6 md:px-10 pt-8 pb-6 border-b border-white/[0.06]">
          {/* Top bar: close + delete */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta?.dot}`} />
                {lead.status}
              </span>
              {lead.source && (
                <span className="bg-cyan-400/10 text-cyan-400 text-[10px] font-bold tracking-[0.2em] px-3 py-1 rounded-full uppercase">
                  {lead.source}
                </span>
              )}
              <ScoreBadge score={lead.score} size="sm" showLabel />
            </div>
            <div className="flex items-center gap-1">
              {!deletingConfirm ? (
                <button onClick={() => setDeletingConfirm(true)} aria-label="Supprimer" className="p-2 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-xl transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-rose-400">Supprimer ?</span>
                  <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all">
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Oui'}
                  </button>
                  <button onClick={() => setDeletingConfirm(false)} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 rounded-lg transition-all">Non</button>
                </div>
              )}
              <button onClick={onClose} aria-label="Fermer" className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-extrabold font-headline tracking-tight text-zinc-100 mb-2">
            {lead.name}
          </h1>

          {/* Contact line */}
          {(lead.company || lead.email) && (
            <p className="text-xl text-[#adaaad] mb-1">
              <span className="text-zinc-500">Contact Principal:</span>{' '}
              {lead.company && <><Building2 className="w-4 h-4 inline -mt-0.5 mr-1" />{lead.company}</>}
              {lead.company && lead.email && <span className="mx-2 text-zinc-600">|</span>}
              {lead.email && <span>{lead.email}</span>}
            </p>
          )}

          {/* Action buttons row */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={generateProposal}
              disabled={generatingProposal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-fuchsia-600/20"
            >
              {generatingProposal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Proposition IA
            </button>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-600/20"
              >
                <Mail className="w-4 h-4" />
                Contacter
              </a>
            )}
            <button
              onClick={() => {
                const nextStatuses: LeadStatus[] = ['Nouveau', 'Discovery fait', 'Proposition envoyée', 'Relance 1', 'Relance 2', 'Signé'];
                const currentIdx = nextStatuses.indexOf(lead.status as LeadStatus);
                if (currentIdx >= 0 && currentIdx < nextStatuses.length - 1) {
                  handleStatusChange(nextStatuses[currentIdx + 1]);
                }
              }}
              disabled={updatingStatus || lead.status === 'Signé'}
              className="flex items-center gap-2 px-5 py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            >
              <ArrowRight className="w-4 h-4" />
              Avancer
            </button>
          </div>
        </div>

        {/* ── Status Stepper ───────────────────────────────────────── */}
        <div className="px-6 md:px-10 py-4 border-b border-white/[0.06]">
          <StatusStepper currentStatus={lead.status as LeadStatus} onStatusChange={handleStatusChange} disabled={updatingStatus} />
        </div>

        {/* ── Relance Alert ────────────────────────────────────────── */}
        <RelanceAlert lead={lead} />

        {/* ── Bento Grid ───────────────────────────────────────────── */}
        <div className="px-6 md:px-10 py-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* ━━━ Left Column (8 cols) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Contact Card */}
              <GlassPanel>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-4">Contact</p>
                <div className="space-y-4">
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/20 transition-colors">
                        <Mail className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Email</p>
                        <p className="text-sm text-zinc-200 truncate group-hover:text-cyan-300 transition-colors">{lead.email}</p>
                      </div>
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                        <Phone className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Téléphone</p>
                        <p className="text-sm text-zinc-200 group-hover:text-emerald-300 transition-colors">{lead.phone}</p>
                      </div>
                    </a>
                  )}
                  {!lead.email && !lead.phone && (
                    <p className="text-xs text-zinc-500 italic">Aucun contact renseigné</p>
                  )}
                </div>
              </GlassPanel>

              {/* Deal Value Card */}
              <GlassPanel className="border-l-4 border-cyan-400/40">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-4">Valeur du deal</p>
                <div className="mb-4">
                  <p className="text-4xl font-headline font-extrabold text-zinc-100 tracking-tight">
                    {lead.propositionAmount
                      ? `${lead.propositionAmount.toLocaleString('fr-FR')} €`
                      : lead.budget || '—'}
                  </p>
                  {lead.budget && lead.propositionAmount ? (
                    <p className="text-xs text-zinc-500 mt-1">Budget estimé : {lead.budget}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="number"
                      value={propositionAmount}
                      onChange={e => setPropositionAmount(e.target.value)}
                      onBlur={saveAmount}
                      placeholder="Montant..."
                      className="w-full pl-8 pr-3 py-2 text-sm bg-black/30 border border-zinc-700/60 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    />
                  </div>
                  {savingAmount && <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />}
                  {!savingAmount && propositionAmount && <Check className="w-4 h-4 text-emerald-500" />}
                </div>
              </GlassPanel>

              {/* Assigned / Meta Card — spans 2 cols */}
              <GlassPanel className="md:col-span-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-4">Informations</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Source</p>
                    <p className="text-sm font-medium text-zinc-200">{SOURCE_ICONS[lead.source]} {lead.source}</p>
                  </div>
                  {lead.budget && (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Budget estimé</p>
                      <p className="text-sm font-medium text-zinc-200">{lead.budget}</p>
                    </div>
                  )}
                  {lead.timeline && (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Timeline</p>
                      <p className="text-sm font-medium text-zinc-200">{lead.timeline}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Créé le</p>
                    <p className="text-sm font-medium text-zinc-200">{formatDate(lead.createdAt as number)}</p>
                  </div>
                </div>
              </GlassPanel>

              {/* Activity Timeline Card — spans 2 cols */}
              <GlassPanel className="md:col-span-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-6">Activité</p>
                <ActivityTimeline lead={lead} />
                <div className="mt-6 pt-6 border-t border-white/[0.06]">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-4">Historique des modifications</p>
                  <AuditTimeline entityType="lead" entityId={lead.id} />
                </div>
              </GlassPanel>
            </div>

            {/* ━━━ Right Column (4 cols) ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="md:col-span-4 space-y-6">

              {/* Score Card */}
              <GlassPanel>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-4">Score</p>
                <div className="flex items-center gap-3 mb-4">
                  <ScoreBadge score={lead.score} size="lg" showLabel />
                  <p className="text-xs text-zinc-400">
                    {lead.score >= 7 ? 'Lead chaud — priorité maximale.' : lead.score >= 4 ? 'Lead tiède — à qualifier davantage.' : 'Lead froid — score insuffisant.'}
                  </p>
                </div>
                <ScoreBreakdown criteria={scoreCriteria} />
              </GlassPanel>

              {/* Notes Card */}
              <GlassPanel>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Notes internes</p>
                  <div className="flex items-center gap-1">
                    {savingNotes && <><Loader2 className="w-3 h-3 text-zinc-400 animate-spin" /><span className="text-[10px] text-zinc-500">Sauvegarde...</span></>}
                    {!savingNotes && !notesDirty && notes && <span className="text-[10px] text-zinc-600">Auto-sauvegardé</span>}
                  </div>
                </div>
                <textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
                  onBlur={saveNotes}
                  rows={5}
                  placeholder="Notes, contexte, red flags..."
                  className="w-full px-4 py-3 text-sm bg-black/30 border border-zinc-700/60 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-500/40 focus:ring-1 focus:ring-fuchsia-500/20 transition-all resize-none"
                />
              </GlassPanel>

              {/* IA Actions Card */}
              <GlassPanel>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-4">Actions IA</p>
                <button
                  onClick={generateProposal}
                  disabled={generatingProposal}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {generatingProposal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Générer proposition IA
                </button>
                {proposal && (
                  <div className="mt-4 rounded-xl border border-zinc-700/60 bg-black/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Proposition générée
                        {proposalFromTemplate && (
                          <span className="ml-2 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full normal-case tracking-normal">depuis template</span>
                        )}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(proposal)}
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copier
                      </button>
                    </div>
                    <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">{proposal}</pre>
                  </div>
                )}
              </GlassPanel>

            </div>
          </div>
        </div>

      </div>
    </AdaptiveModal>

    {autoChainActions.length > 0 && (
      <AutoChainToast
        actions={autoChainActions}
        onClose={() => setAutoChainActions([])}
      />
    )}
    </>
  );
}
