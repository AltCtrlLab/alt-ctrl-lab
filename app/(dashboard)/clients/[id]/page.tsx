'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Building2, Mail, Phone, Globe, ExternalLink,
  CheckCircle2, Circle, Clock, AlertCircle, ChevronRight,
  FileText, FolderKanban, Receipt, MessageSquare, Link2,
  Package, Sparkles, Copy, Check, Plus, TrendingUp,
} from 'lucide-react';
import type { Lead } from '@/lib/db/schema_leads';
import type { Project } from '@/lib/db/schema_projects';
import type { Invoice } from '@/lib/db/schema_finances';
import type { Followup } from '@/lib/db/schema_postvente';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalToken {
  id: string;
  projectId: string;
  tokenHash: string;
  label: string | null;
  expiresAt: number | null;
  lastAccessedAt: number | null;
  createdAt: number;
}

interface Deliverable {
  id: string;
  projectId: string;
  filename: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: number;
}

interface ClientData {
  lead: Lead;
  projects: Project[];
  invoices: Invoice[];
  followups: Followup[];
  portalTokens: PortalToken[];
  deliverables: Deliverable[];
}

// ─── Workflow Steps ────────────────────────────────────────────────────────────

interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  status: 'done' | 'current' | 'pending' | 'blocked';
  date?: number | null;
  action?: { label: string; href?: string; onClick?: () => void };
}

function buildWorkflowSteps(data: ClientData, onAction: (action: string) => void): WorkflowStep[] {
  const { lead, projects, invoices, portalTokens, deliverables } = data;
  const project = projects[0] ?? null;
  const invoice = invoices[0] ?? null;
  const hasPortal = portalTokens.length > 0;
  const hasDeliverables = deliverables.length > 0;
  const isPaid = invoice?.status === 'Payée';
  const isSigned = lead.status === 'Signé' || !!lead.signedAt;
  const hasInvoice = !!invoice && invoice.status !== 'Brouillon';
  const propositionSent = !!lead.propositionSentAt || lead.status === 'Proposition envoyée'
    || lead.status === 'Relance 1' || lead.status === 'Relance 2'
    || lead.status === 'Signé';
  const discoveryDone = !!lead.discoveryCallAt || lead.status === 'Discovery fait'
    || propositionSent;
  const projectDone = project?.status === 'Terminé';

  const steps: WorkflowStep[] = [
    {
      id: 'lead',
      label: 'Lead créé',
      description: 'Contact enregistré dans le pipeline',
      status: 'done',
      date: lead.createdAt,
    },
    {
      id: 'discovery',
      label: 'Discovery call',
      description: 'Premier appel pour qualifier le besoin',
      status: discoveryDone ? 'done' : propositionSent ? 'done' : 'current',
      date: lead.discoveryCallAt,
      action: discoveryDone ? undefined : {
        label: 'Marquer fait',
        onClick: () => onAction('discovery'),
      },
    },
    {
      id: 'proposition',
      label: 'Proposition envoyée',
      description: 'Proposition commerciale transmise au client',
      status: propositionSent ? 'done' : discoveryDone ? 'current' : 'pending',
      date: lead.propositionSentAt,
      action: !propositionSent && discoveryDone ? {
        label: 'Générer proposition IA',
        onClick: () => onAction('proposal'),
      } : undefined,
    },
    {
      id: 'signed',
      label: 'Contrat signé',
      description: 'Devis accepté et contrat signé',
      status: isSigned ? 'done' : propositionSent ? 'current' : 'pending',
      date: lead.signedAt,
      action: !isSigned && propositionSent ? {
        label: 'Créer devis',
        onClick: () => onAction('invoice'),
      } : undefined,
    },
    {
      id: 'project',
      label: 'Projet créé',
      description: 'Projet ouvert et équipe assignée',
      status: project ? 'done' : isSigned ? 'current' : 'pending',
      date: project?.createdAt,
      action: !project && isSigned ? {
        label: 'Créer le projet',
        href: '/projets',
      } : undefined,
    },
    {
      id: 'kickoff',
      label: 'Kickoff',
      description: 'Session de démarrage avec le client',
      status: project?.kickoffDate ? 'done'
        : project ? 'current'
        : 'pending',
      date: project?.kickoffDate,
      action: project && !project.kickoffDate ? {
        label: 'Planifier kickoff',
        onClick: () => onAction('kickoff'),
      } : undefined,
    },
    {
      id: 'portal',
      label: 'Portail client activé',
      description: 'Lien de suivi envoyé au client',
      status: hasPortal ? 'done' : project ? 'current' : 'pending',
      action: project && !hasPortal ? {
        label: 'Générer lien portail',
        onClick: () => onAction('portal'),
      } : undefined,
    },
    {
      id: 'delivery',
      label: 'Livrables uploadés',
      description: 'Fichiers finaux déposés dans le portail',
      status: hasDeliverables ? 'done' : project ? 'current' : 'pending',
      action: project && !hasDeliverables ? {
        label: 'Uploader livrables',
        onClick: () => onAction('deliverables'),
      } : undefined,
    },
    {
      id: 'invoice',
      label: 'Facture payée',
      description: 'Paiement reçu et confirmé',
      status: isPaid ? 'done' : hasInvoice ? 'current' : isSigned ? 'current' : 'pending',
      date: invoice?.paidAt,
      action: !isPaid && hasDeliverables ? {
        label: 'Voir facture',
        href: '/finances',
      } : undefined,
    },
    {
      id: 'closed',
      label: 'Projet clôturé',
      description: 'Mission terminée, NPS recueilli',
      status: projectDone ? 'done' : isPaid ? 'current' : 'pending',
      date: project?.deliveredAt,
    },
  ];

  return steps;
}

// ─── Step Icon ─────────────────────────────────────────────────────────────────

function StepIcon({ status }: { status: WorkflowStep['status'] }) {
  if (status === 'done') return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  if (status === 'current') return <Clock className="w-5 h-5 text-fuchsia-400 animate-pulse" />;
  if (status === 'blocked') return <AlertCircle className="w-5 h-5 text-rose-400" />;
  return <Circle className="w-5 h-5 text-zinc-600" />;
}

// ─── Format helpers ────────────────────────────────────────────────────────────

function fmt(ts?: number | null) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

// ─── Phase badge ───────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  Onboarding: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Design: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  Dev: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  QA: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Livraison: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  Terminé: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (action: string) => {
    if (action === 'proposal') {
      if (!data) return;
      const { lead } = data;
      try {
        const res = await fetch('/api/ai/generate-proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            name: lead.name,
            company: lead.company,
            budget: lead.propositionAmount?.toString() ?? lead.budget ?? '',
            timeline: lead.timeline ?? '',
            notes: lead.notes ?? '',
            projectType: '',
          }),
        });
        const json = await res.json();
        if (json.success) {
          await navigator.clipboard.writeText(json.data.proposal);
          showToast('Proposition copiée dans le presse-papier');
        }
      } catch {
        showToast('Erreur lors de la génération');
      }
    }
    if (action === 'portal') {
      if (!data?.projects[0]) return;
      try {
        const res = await fetch('/api/portal/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: data.projects[0].id }),
        });
        const json = await res.json();
        if (json.success) {
          const url = `${window.location.origin}/client-portal/${json.data.token}`;
          await navigator.clipboard.writeText(url);
          showToast('Lien portail copié dans le presse-papier');
          fetchData();
        }
      } catch {
        showToast('Erreur génération portail');
      }
    }
    if (action === 'discovery') {
      if (!data) return;
      await fetch(`/api/leads?id=${data.lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discoveryCallAt: Date.now(), status: 'Discovery fait' }),
      });
      showToast('Discovery marqué comme fait');
      fetchData();
    }
  };

  const copyEmail = async () => {
    if (!data?.lead.email) return;
    await navigator.clipboard.writeText(data.lead.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <p>{error ?? 'Client introuvable'}</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-fuchsia-400 hover:text-fuchsia-300">
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  const { lead, projects, invoices, followups, portalTokens, deliverables } = data;
  const project = projects[0] ?? null;
  const invoice = invoices[0] ?? null;
  const clientName = lead.company || lead.name;
  const steps = buildWorkflowSteps(data, handleAction);
  const doneCount = steps.filter(s => s.status === 'done').length;
  const progress = Math.round((doneCount / steps.length) * 100);
  const currentStep = steps.find(s => s.status === 'current');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/90 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-fuchsia-500/15 border border-fuchsia-500/25 rounded-lg flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-fuchsia-400" />
            </div>
            <span className="font-semibold text-zinc-100 truncate">{clientName}</span>
            {lead.company && (
              <span className="text-xs text-zinc-500 hidden sm:block">— {lead.name}</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-zinc-500">{doneCount}/{steps.length} étapes</span>
            <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <span className="text-xs font-medium text-fuchsia-400">{progress}%</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left column — Identity + KPIs ─────────────────────── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Identity card */}
          <div className="bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/20 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-fuchsia-300">
                  {clientName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-zinc-100 text-base leading-tight">{clientName}</h2>
                {lead.company && (
                  <p className="text-xs text-zinc-500 mt-0.5">{lead.name}</p>
                )}
                <span className={`inline-flex mt-1.5 items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  lead.status === 'Signé' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  lead.status === 'Perdu' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                  'text-violet-400 bg-violet-500/10 border-violet-500/20'
                }`}>
                  {lead.status}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              {lead.email && (
                <div className="flex items-center gap-2.5 group">
                  <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="text-zinc-300 truncate flex-1">{lead.email}</span>
                  <button onClick={copyEmail} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />}
                  </button>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="text-zinc-300">{lead.phone}</span>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-2.5">
                  <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <a href={lead.website} target="_blank" rel="noopener noreferrer"
                    className="text-fuchsia-400 hover:text-fuchsia-300 truncate flex items-center gap-1">
                    {lead.website.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-zinc-400">{lead.source}</span>
              </div>
            </div>

            {lead.notes && (
              <div className="pt-3 border-t border-white/[0.06]">
                <p className="text-xs text-zinc-500 mb-1">Notes</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/60 border border-white/[0.07] rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 mb-1">Budget lead</p>
              <p className="text-lg font-bold text-zinc-100">
                {lead.propositionAmount ? fmtAmount(lead.propositionAmount) : lead.budget ?? '—'}
              </p>
            </div>
            <div className="bg-zinc-900/60 border border-white/[0.07] rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 mb-1">Facturé</p>
              <p className="text-lg font-bold text-emerald-400">
                {invoices.filter(i => i.status === 'Payée').reduce((s, i) => s + i.amount, 0) > 0
                  ? fmtAmount(invoices.filter(i => i.status === 'Payée').reduce((s, i) => s + i.amount, 0))
                  : '—'}
              </p>
            </div>
            <div className="bg-zinc-900/60 border border-white/[0.07] rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 mb-1">Projets</p>
              <p className="text-lg font-bold text-zinc-100">{projects.length}</p>
            </div>
            <div className="bg-zinc-900/60 border border-white/[0.07] rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 mb-1">Score</p>
              <p className="text-lg font-bold text-fuchsia-400">{lead.score}/10</p>
            </div>
          </div>

          {/* Project card */}
          {project && (
            <div className="bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <FolderKanban className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Projet actif</span>
              </div>
              <p className="font-semibold text-zinc-100 mb-2">{project.clientName} — {project.projectType}</p>
              <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${PHASE_COLORS[project.phase] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                {project.phase}
              </span>
              {project.deadline && (
                <p className="text-xs text-zinc-500 mt-2">
                  Deadline : <span className="text-zinc-300">{fmt(project.deadline)}</span>
                </p>
              )}
              {project.budget && (
                <p className="text-xs text-zinc-500 mt-1">
                  Budget : <span className="text-zinc-300">{fmtAmount(project.budget)}</span>
                </p>
              )}
              {portalTokens.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-400">
                  <Link2 className="w-3.5 h-3.5" />
                  Portail client actif
                </div>
              )}
            </div>
          )}

          {/* Followups */}
          {followups.length > 0 && (
            <div className="bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Follow-ups</span>
              </div>
              <div className="space-y-2">
                {followups.slice(0, 4).map(f => (
                  <div key={f.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      f.status === 'Fait' ? 'bg-emerald-400' :
                      f.status === 'Annulé' ? 'bg-zinc-600' :
                      f.priority === 'Haute' ? 'bg-rose-400' : 'bg-amber-400'
                    }`} />
                    <span className="text-zinc-400 flex-1">{f.type}</span>
                    <span className={`${f.status === 'Fait' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column — Workflow ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Current step banner */}
          {currentStep && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-fuchsia-500/8 border border-fuchsia-500/20 rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-fuchsia-500/15 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-fuchsia-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-fuchsia-300 font-medium">Prochaine action</p>
                <p className="text-sm font-semibold text-zinc-100">{currentStep.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{currentStep.description}</p>
              </div>
              {currentStep.action && (
                currentStep.action.href ? (
                  <a
                    href={currentStep.action.href}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-fuchsia-300 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/25 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {currentStep.action.label}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    onClick={currentStep.action.onClick}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-fuchsia-300 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/25 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {currentStep.action.label}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )
              )}
            </motion.div>
          )}

          {/* Workflow timeline */}
          <div className="bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-4 h-4 text-fuchsia-400" />
              <h3 className="text-sm font-semibold text-zinc-100">Parcours client</h3>
              <span className="ml-auto text-xs text-zinc-500">{doneCount} / {steps.length} complétées</span>
            </div>

            <div className="space-y-0">
              {steps.map((step, i) => (
                <div key={step.id} className="flex gap-4">
                  {/* Connector line */}
                  <div className="flex flex-col items-center">
                    <div className="mt-0.5">
                      <StepIcon status={step.status} />
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`w-px flex-1 my-1 ${
                        step.status === 'done' ? 'bg-emerald-500/30' : 'bg-zinc-800'
                      }`} style={{ minHeight: 24 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-5 flex-1 min-w-0 ${i === steps.length - 1 ? 'pb-0' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium leading-tight ${
                          step.status === 'done' ? 'text-zinc-300' :
                          step.status === 'current' ? 'text-zinc-100' :
                          'text-zinc-500'
                        }`}>
                          {step.label}
                        </p>
                        <p className={`text-xs mt-0.5 ${
                          step.status === 'pending' ? 'text-zinc-600' : 'text-zinc-500'
                        }`}>
                          {step.description}
                        </p>
                        {step.date && (
                          <p className="text-[11px] text-zinc-600 mt-1">{fmt(step.date)}</p>
                        )}
                      </div>

                      {step.action && step.status !== 'pending' && (
                        step.action.href ? (
                          <a
                            href={step.action.href}
                            className="shrink-0 text-xs text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1 whitespace-nowrap"
                          >
                            {step.action.label}
                            <ChevronRight className="w-3 h-3" />
                          </a>
                        ) : (
                          <button
                            onClick={step.action.onClick}
                            className="shrink-0 text-xs text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1 whitespace-nowrap"
                          >
                            {step.action.label}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoices */}
          {invoices.length > 0 && (
            <div className="bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Factures</span>
              </div>
              <div className="space-y-2">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 text-sm py-2 border-b border-white/[0.04] last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 font-medium truncate">{inv.clientName}</p>
                      {inv.notes && <p className="text-xs text-zinc-500 truncate">{inv.notes}</p>}
                    </div>
                    <span className="font-semibold text-zinc-100 shrink-0">{fmtAmount(inv.amount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      inv.status === 'Payée' ? 'text-emerald-400 bg-emerald-500/10' :
                      inv.status === 'Envoyée' ? 'text-blue-400 bg-blue-500/10' :
                      inv.status === 'En retard' ? 'text-rose-400 bg-rose-500/10' :
                      'text-zinc-400 bg-zinc-800'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deliverables */}
          {deliverables.length > 0 && (
            <div className="bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Livrables</span>
              </div>
              <div className="space-y-2">
                {deliverables.map(d => (
                  <div key={d.id} className="flex items-center gap-3 text-xs py-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="text-zinc-300 flex-1 truncate">{d.filename}</span>
                    <span className="text-zinc-600 shrink-0">{fmt(d.uploadedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-800 border border-white/10 text-zinc-100 text-sm px-4 py-2.5 rounded-xl shadow-xl z-50 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
