'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Phone, Building2, Euro, Calendar, Trash2,
  Edit3, Check, Loader2, ExternalLink, Clock, Sparkles, Copy,
} from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
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

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

type Tab = 'info' | 'score' | 'timeline';

export function LeadDetailModal({ lead, onClose, onStatusChange, onUpdated, onDeleted }: LeadDetailModalProps) {
  const trapRef = useFocusTrap(true, onClose);
  const [activeTab, setActiveTab] = useState<Tab>('info');
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
    // Auto-fill dates selon transition
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

  const TABS: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Informations' },
    { id: 'score', label: 'Score /10' },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Détails du lead ${lead.name}`}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/95 flex-shrink-0">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-zinc-100 truncate">{lead.name}</h2>
                  <ScoreBadge score={lead.score} size="sm" showLabel />
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${meta?.bg} ${meta?.border} ${meta?.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta?.dot}`} />
                    {lead.status}
                  </span>
                </div>
                {lead.company && (
                  <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />{lead.company}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!deletingConfirm ? (
                <button onClick={() => setDeletingConfirm(true)} aria-label="Supprimer" className="p-1.5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-lg transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-rose-400">Supprimer ?</span>
                  <button onClick={handleDelete} disabled={deleting} className="px-2 py-1 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded transition-all">
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Oui'}
                  </button>
                  <button onClick={() => setDeletingConfirm(false)} className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-300 rounded transition-all">Non</button>
                </div>
              )}
              <button onClick={onClose} aria-label="Fermer" className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status stepper */}
          <div className="px-6 py-3 border-b border-zinc-800/60 flex-shrink-0">
            <StatusStepper currentStatus={lead.status as LeadStatus} onStatusChange={handleStatusChange} disabled={updatingStatus} />
          </div>

          {/* Relance alert */}
          <RelanceAlert lead={lead} />

          {/* Tabs */}
          <div role="tablist" className="flex gap-0 border-b border-zinc-800 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`tab-lead-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-lead-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-fuchsia-400 border-fuchsia-500'
                    : 'text-zinc-400 border-transparent hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div role="tabpanel" id={`panel-lead-${activeTab}`} aria-labelledby={`tab-lead-${activeTab}`} className="flex-1 overflow-y-auto p-6">
            {activeTab === 'info' && (
              <div className="space-y-5">
                {/* Contact info */}
                <div className="grid grid-cols-2 gap-3">
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all group">
                      <Mail className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-200 truncate">{lead.email}</span>
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all group">
                      <Phone className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-200">{lead.phone}</span>
                    </a>
                  )}
                </div>

                {/* Meta */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                    <p className="text-[10px] text-zinc-400 mb-1">Source</p>
                    <p className="text-xs font-medium text-zinc-300">{SOURCE_ICONS[lead.source]} {lead.source}</p>
                  </div>
                  {lead.budget && (
                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-400 mb-1">Budget estimé</p>
                      <p className="text-xs font-medium text-zinc-300">{lead.budget}</p>
                    </div>
                  )}
                  {lead.timeline && (
                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-400 mb-1">Timeline</p>
                      <p className="text-xs font-medium text-zinc-300">{lead.timeline}</p>
                    </div>
                  )}
                  <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                    <p className="text-[10px] text-zinc-400 mb-1">Créé le</p>
                    <p className="text-xs font-medium text-zinc-300">{formatDate(lead.createdAt as number)}</p>
                  </div>
                </div>

                {/* Proposition amount */}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Montant proposition</p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-[200px]">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <input
                        type="number"
                        value={propositionAmount}
                        onChange={e => setPropositionAmount(e.target.value)}
                        onBlur={saveAmount}
                        placeholder="0"
                        className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-fuchsia-500/60 focus:ring-1 focus:ring-fuchsia-500/20 transition-all"
                      />
                    </div>
                    {savingAmount && <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />}
                    {!savingAmount && propositionAmount && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Notes</p>
                  <textarea
                    value={notes}
                    onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
                    onBlur={saveNotes}
                    rows={4}
                    placeholder="Notes, contexte, red flags..."
                    className="w-full px-3 py-2.5 text-sm bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-fuchsia-500/60 focus:ring-1 focus:ring-fuchsia-500/20 transition-all resize-none"
                  />
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {savingNotes && <><Loader2 className="w-3 h-3 text-zinc-400 animate-spin" /><span className="text-[10px] text-zinc-400">Sauvegarde...</span></>}
                    {!savingNotes && !notesDirty && notes && <span className="text-[10px] text-zinc-700">Auto-sauvegardé</span>}
                  </div>
                </div>

                {/* IA Actions */}
                <div className="pt-2 border-t border-zinc-800 space-y-3">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions IA</p>
                  <button
                    onClick={generateProposal}
                    disabled={generatingProposal}
                    className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {generatingProposal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Générer proposition IA
                  </button>
                  {proposal && (
                    <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-zinc-400">
                          Proposition générée
                          {proposalFromTemplate && (
                            <span className="ml-2 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">depuis template</span>
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
                </div>
              </div>
            )}

            {activeTab === 'score' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ScoreBadge score={lead.score} size="lg" showLabel />
                  <p className="text-xs text-zinc-400">
                    {lead.score >= 7 ? 'Lead chaud — priorité maximale.' : lead.score >= 4 ? 'Lead tiède — à qualifier davantage.' : 'Lead froid — score insuffisant.'}
                  </p>
                </div>
                <ScoreBreakdown criteria={scoreCriteria} />
              </div>
            )}

            {activeTab === 'timeline' && (
              <>
                <ActivityTimeline lead={lead} />
                <div className="mt-4 pt-4 border-t border-white/[0.08]">
                  <AuditTimeline entityType="lead" entityId={lead.id} />
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>

    {autoChainActions.length > 0 && (
      <AutoChainToast
        actions={autoChainActions}
        onClose={() => setAutoChainActions([])}
      />
    )}
    </>
  );
}
