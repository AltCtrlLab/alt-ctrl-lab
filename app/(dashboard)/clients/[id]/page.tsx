'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Building2, Mail, Phone, Globe, ExternalLink,
  CheckCircle2, Circle, Clock, AlertCircle, Sparkles, Copy, Check,
  TrendingUp, Receipt, Package, FileText, Link2, FolderKanban,
  MessageSquare, Phone as PhoneIcon, CalendarCheck, Send, PenLine,
  Rocket, Upload, BadgeEuro, Flag, ChevronRight, Loader2,
} from 'lucide-react';
import type { Lead } from '@/lib/db/schema_leads';
import type { Project } from '@/lib/db/schema_projects';
import type { Invoice } from '@/lib/db/schema_finances';
import type { Followup } from '@/lib/db/schema_postvente';
import { ProposalViewerModal } from '@/components/proposals/ProposalViewerModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalToken {
  id: string; projectId: string; tokenHash: string; label: string | null;
  expiresAt: number | null; lastAccessedAt: number | null; createdAt: number;
}
interface Deliverable {
  id: string; projectId: string; filename: string; filePath: string;
  fileSize: number | null; mimeType: string | null; uploadedAt: number;
}
interface ClientData {
  lead: Lead; projects: Project[]; invoices: Invoice[];
  followups: Followup[]; portalTokens: PortalToken[]; deliverables: Deliverable[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(ts?: number | null) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

// ─── Step definitions ─────────────────────────────────────────────────────────

interface WorkflowStep {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  status: 'done' | 'current' | 'pending';
  date?: number | null;
}

function buildSteps(data: ClientData): WorkflowStep[] {
  const { lead, projects, invoices, portalTokens, deliverables } = data;
  const project = projects[0] ?? null;
  const invoice = invoices[0] ?? null;
  const isSigned = lead.status === 'Signé' || !!lead.signedAt;
  const propositionSent = !!lead.propositionSentAt || ['Proposition envoyée','Relance 1','Relance 2','Signé'].includes(lead.status);
  const discoveryDone = !!lead.discoveryCallAt || lead.status === 'Discovery fait' || propositionSent;
  const hasPortal = portalTokens.length > 0;
  const hasDeliverables = deliverables.length > 0;
  const isPaid = invoice?.status === 'Payée';
  const projectDone = project?.status === 'Terminé';

  const s = (done: boolean, active: boolean): WorkflowStep['status'] =>
    done ? 'done' : active ? 'current' : 'pending';

  return [
    { id: 'lead',        label: 'Lead créé',             shortLabel: 'Lead',        icon: User,          status: 'done',                              date: lead.createdAt },
    { id: 'discovery',   label: 'Discovery call',        shortLabel: 'Discovery',   icon: PhoneIcon,     status: s(discoveryDone, true),              date: lead.discoveryCallAt },
    { id: 'proposition', label: 'Proposition envoyée',   shortLabel: 'Proposition', icon: Send,          status: s(propositionSent, discoveryDone),   date: lead.propositionSentAt },
    { id: 'signed',      label: 'Contrat signé',         shortLabel: 'Contrat',     icon: PenLine,       status: s(isSigned, propositionSent),        date: lead.signedAt },
    { id: 'project',     label: 'Projet créé',           shortLabel: 'Projet',      icon: FolderKanban,  status: s(!!project, isSigned),              date: project?.createdAt },
    { id: 'kickoff',     label: 'Kickoff client',        shortLabel: 'Kickoff',     icon: Rocket,        status: s(!!project?.kickoffDate, !!project), date: project?.kickoffDate },
    { id: 'portal',      label: 'Portail activé',        shortLabel: 'Portail',     icon: Link2,         status: s(hasPortal, !!project),             date: undefined },
    { id: 'delivery',    label: 'Livrables uploadés',    shortLabel: 'Livrables',   icon: Upload,        status: s(hasDeliverables, hasPortal),       date: undefined },
    { id: 'invoice',     label: 'Facture payée',         shortLabel: 'Paiement',    icon: BadgeEuro,     status: s(isPaid, hasDeliverables),          date: invoice?.paidAt },
    { id: 'closed',      label: 'Projet clôturé',        shortLabel: 'Clôture',     icon: Flag,          status: s(projectDone, isPaid),              date: project?.deliveredAt },
  ];
}

// ─── Horizontal Stepper ───────────────────────────────────────────────────────

function HorizontalStepper({ steps, activeId, onSelect }: {
  steps: WorkflowStep[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative">
      {/* connector line */}
      <div className="absolute top-5 left-0 right-0 h-px bg-zinc-800 z-0" />
      <div
        className="absolute top-5 left-0 h-px bg-gradient-to-r from-emerald-500 to-fuchsia-500 z-0 transition-all duration-700"
        style={{ width: `${(steps.filter(s => s.status === 'done').length / (steps.length - 1)) * 100}%` }}
      />

      <div className="relative z-10 flex items-start justify-between gap-1">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = step.id === activeId;
          return (
            <button
              key={step.id}
              onClick={() => onSelect(step.id)}
              className="flex flex-col items-center gap-2 flex-1 group"
            >
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                step.status === 'done'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                  : step.status === 'current'
                    ? 'bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-400'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-600'
              } ${isActive ? 'scale-110 shadow-lg shadow-fuchsia-500/20' : 'group-hover:scale-105'}`}>
                {step.status === 'done'
                  ? <CheckCircle2 className="w-4 h-4" />
                  : step.status === 'current'
                    ? <Clock className="w-4 h-4 animate-pulse" />
                    : <Icon className="w-4 h-4" />
                }
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight transition-colors ${
                isActive ? 'text-zinc-100' :
                step.status === 'done' ? 'text-zinc-400' :
                step.status === 'current' ? 'text-fuchsia-400' :
                'text-zinc-600'
              }`}>
                {step.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step Detail Panels ───────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  Onboarding: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Design:     'text-pink-400 bg-pink-500/10 border-pink-500/20',
  Dev:        'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  QA:         'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Livraison:  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  Terminé:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

// ─── Contract Generator ───────────────────────────────────────────────────────

function ContractGenerator({ lead }: { lead: Lead }) {
  const [loading, setLoading] = useState(false);
  const [contractType, setContractType] = useState<'prestation' | 'nda' | 'maintenance'>('prestation');

  async function generate() {
    setLoading(true);
    try {
      const variables: Record<string, string | number> = {
        prestataire: 'AltCtrl.Lab',
        client: lead.company || lead.name,
        clientId: lead.id,
        scope: lead.notes ? lead.notes.slice(0, 300) : 'Prestations de services digitaux selon devis',
        montant: lead.propositionAmount ?? lead.budget ?? 0,
        duree: '3 mois',
        paiement: '50% à la commande, 50% à la livraison',
        livrables: 'Selon proposition commerciale validée',
      };
      if (contractType === 'nda') {
        variables.objet = lead.notes?.slice(0, 200) ?? 'Projet digital en cours de discussion';
        variables.duree = '2 ans';
      }
      if (contractType === 'maintenance') {
        variables.services = 'Maintenance corrective, mises à jour, support technique (Mo-Fr 9h-18h)';
        variables.sla = 'Incidents critiques : 4h. Incidents majeurs : 24h. Demandes standard : 72h.';
        variables.montantMensuel = 490;
        variables.duree = '12 mois';
      }

      const res = await fetch('/api/documents/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: contractType, variables }),
      });
      const data = await res.json();
      if (data.success && data.html) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(data.html);
          win.document.close();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-fuchsia-300 uppercase tracking-widest">Générateur de contrat</p>
      <div className="flex items-center gap-2 flex-wrap">
        {(['prestation', 'nda', 'maintenance'] as const).map(t => (
          <button
            key={t}
            onClick={() => setContractType(t)}
            className={`text-xs px-3 py-1 rounded-lg border transition-all ${
              contractType === t
                ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {t === 'prestation' ? 'Prestation' : t === 'nda' ? 'NDA' : 'Maintenance'}
          </button>
        ))}
      </div>
      <button
        onClick={generate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/30 text-fuchsia-300 rounded-xl py-2.5 text-sm font-medium transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {loading ? 'Génération...' : 'Générer et ouvrir le contrat'}
      </button>
    </div>
  );
}

interface StepPanelProps {
  step: WorkflowStep;
  data: ClientData;
  onAction: (action: string) => Promise<void>;
  actionLoading: string | null;
}

function StepPanel({ step, data, onAction, actionLoading }: StepPanelProps) {
  const { lead, projects, invoices, portalTokens, deliverables, followups } = data;
  const project = projects[0] ?? null;
  const invoice = invoices[0] ?? null;

  const StatusBadge = () => (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${
      step.status === 'done' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
      step.status === 'current' ? 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' :
      'text-zinc-500 bg-zinc-800 border-zinc-700'
    }`}>
      {step.status === 'done' ? <CheckCircle2 className="w-3 h-3" /> :
       step.status === 'current' ? <Clock className="w-3 h-3" /> :
       <Circle className="w-3 h-3" />}
      {step.status === 'done' ? 'Complété' : step.status === 'current' ? 'En cours' : 'En attente'}
      {step.date && <span className="ml-1 text-[10px] opacity-70">· {fmt(step.date)}</span>}
    </span>
  );

  const ActionBtn = ({ label, onClick, href, loading }: { label: string; onClick?: () => void; href?: string; loading?: boolean }) => {
    const cls = "flex items-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50";
    if (href) return <a href={href} className={cls}>{label} <ChevronRight className="w-4 h-4" /></a>;
    return (
      <button onClick={onClick} disabled={!!loading} className={cls}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {label}
      </button>
    );
  };

  // ── Lead ──
  if (step.id === 'lead') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-100">Lead enregistré</h3>
          <p className="text-sm text-zinc-400 mt-0.5">Le contact a été ajouté dans le pipeline commercial.</p>
        </div>
        <StatusBadge />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Source', value: lead.source },
          { label: 'Score', value: `${lead.score}/10` },
          { label: 'Budget', value: lead.propositionAmount ? fmtAmount(lead.propositionAmount) : lead.budget ?? '—' },
          { label: 'Créé le', value: fmt(lead.createdAt as number) ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-800/60 rounded-xl p-4">
            <p className="text-[11px] text-zinc-500 mb-1">{label}</p>
            <p className="text-sm font-semibold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
      {lead.notes && (
        <div className="bg-zinc-800/40 rounded-xl p-4">
          <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider">Notes</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{lead.notes}</p>
        </div>
      )}
    </div>
  );

  // ── Discovery ──
  if (step.id === 'discovery') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-100">Discovery Call</h3>
          <p className="text-sm text-zinc-400 mt-0.5">Premier appel de qualification pour comprendre le besoin précis du client.</p>
        </div>
        <StatusBadge />
      </div>
      <div className="bg-zinc-800/40 rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Checklist discovery</p>
        {[
          'Présenter AltCtrl.Lab et notre méthode',
          'Comprendre le problème business principal',
          'Identifier le budget et la timeline',
          'Qualifier le décideur',
          'Poser les questions sur les contraintes techniques',
          'Définir les critères de succès',
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
              step.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
            }`}>
              {step.status === 'done' && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
            <span className={`text-sm ${step.status === 'done' ? 'text-zinc-400 line-through' : 'text-zinc-300'}`}>{item}</span>
          </div>
        ))}
      </div>
      {step.status !== 'done' && step.status === 'current' && (
        <ActionBtn label="Marquer discovery fait" onClick={() => onAction('discovery')} loading={actionLoading === 'discovery'} />
      )}
      {step.status === 'done' && lead.discoveryCallAt && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4" /> Complété le {fmt(lead.discoveryCallAt)}
        </div>
      )}
    </div>
  );

  // ── Proposition ──
  if (step.id === 'proposition') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-100">Proposition commerciale</h3>
          <p className="text-sm text-zinc-400 mt-0.5">Générer et envoyer une proposition personnalisée au client.</p>
        </div>
        <StatusBadge />
      </div>
      {step.status === 'pending' ? (
        <div className="bg-zinc-800/40 rounded-xl p-5 text-center">
          <p className="text-sm text-zinc-500">Complète le discovery call avant de générer une proposition.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-zinc-800/40 rounded-xl p-4 space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">À inclure dans la proposition</p>
            {['Contexte et compréhension du besoin', 'Approche et méthodologie', 'Livrables détaillés', 'Timeline par phases', 'Budget et conditions de paiement', 'Signature et prochaines étapes'].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${step.status === 'done' ? 'text-emerald-400' : 'text-zinc-600'}`} />
                {item}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionBtn
              label="Générer proposition IA"
              onClick={() => onAction('proposal')}
              loading={actionLoading === 'proposal'}
            />
            {step.status === 'current' && (
              <button
                onClick={() => onAction('proposition_sent')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-all"
              >
                <Send className="w-4 h-4" />
                Marquer comme envoyée
              </button>
            )}
          </div>
          {step.status === 'done' && lead.propositionSentAt && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Envoyée le {fmt(lead.propositionSentAt)}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Contrat signé ──
  if (step.id === 'signed') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-100">Contrat &amp; Signature</h3>
          <p className="text-sm text-zinc-400 mt-0.5">Devis accepté et contrat signé par le client.</p>
        </div>
        <StatusBadge />
      </div>
      {step.status === 'pending' ? (
        <div className="bg-zinc-800/40 rounded-xl p-5 text-center">
          <p className="text-sm text-zinc-500">En attente de l'envoi de la proposition.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/60 rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 mb-1">Montant signé</p>
              <p className="text-lg font-bold text-zinc-100">
                {lead.propositionAmount ? fmtAmount(lead.propositionAmount) : '—'}
              </p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 mb-1">Date de signature</p>
              <p className="text-sm font-semibold text-zinc-100">{fmt(lead.signedAt) ?? '—'}</p>
            </div>
          </div>
          <ContractGenerator lead={lead} />
          {step.status === 'current' && (
            <ActionBtn label="Marquer contrat signé" onClick={() => onAction('signed')} loading={actionLoading === 'signed'} />
          )}
        </div>
      )}
    </div>
  );

  // ── Projet créé ──
  if (step.id === 'project') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-100">Ouverture du projet</h3>
          <p className="text-sm text-zinc-400 mt-0.5">Créer le projet et assigner l'équipe.</p>
        </div>
        <StatusBadge />
      </div>
      {project ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/60 rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 mb-1">Type</p>
              <p className="text-sm font-semibold text-zinc-100">{project.projectType}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 mb-1">Phase</p>
              <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${PHASE_COLORS[project.phase] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                {project.phase}
              </span>
            </div>
            {project.budget && (
              <div className="bg-zinc-800/60 rounded-xl p-4">
                <p className="text-[11px] text-zinc-500 mb-1">Budget projet</p>
                <p className="text-sm font-semibold text-zinc-100">{fmtAmount(project.budget)}</p>
              </div>
            )}
            {project.deadline && (
              <div className="bg-zinc-800/60 rounded-xl p-4">
                <p className="text-[11px] text-zinc-500 mb-1">Deadline</p>
                <p className="text-sm font-semibold text-zinc-100">{fmt(project.deadline)}</p>
              </div>
            )}
            {project.hoursEstimated && (
              <div className="bg-zinc-800/60 rounded-xl p-4">
                <p className="text-[11px] text-zinc-500 mb-1">Heures estimées</p>
                <p className="text-sm font-semibold text-zinc-100">{project.hoursEstimated}h</p>
              </div>
            )}
          </div>
          {project.notes && (
            <div className="bg-zinc-800/40 rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 mb-1">Notes projet</p>
              <p className="text-sm text-zinc-300">{project.notes}</p>
            </div>
          )}
          {project.teamAgents && (
            <div className="bg-zinc-800/40 rounded-xl p-4">
              <p className="text-[11px] text-zinc-500 mb-2">Équipe agents</p>
              <div className="flex flex-wrap gap-2">
                {(JSON.parse(project.teamAgents) as string[]).map(a => (
                  <span key={a} className="text-xs px-2 py-1 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 rounded-lg">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : step.status === 'current' ? (
        <div className="space-y-3">
          <div className="bg-zinc-800/40 rounded-xl p-5 text-center text-sm text-zinc-400">
            Le contrat est signé — il est temps d'ouvrir le projet.
          </div>
          <ActionBtn label="Créer le projet" href="/projets" />
        </div>
      ) : (
        <div className="bg-zinc-800/40 rounded-xl p-5 text-center">
          <p className="text-sm text-zinc-500">En attente de la signature du contrat.</p>
        </div>
      )}
    </div>
  );

  // ── Kickoff ──
  if (step.id === 'kickoff') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-100">Kickoff client</h3>
          <p className="text-sm text-zinc-400 mt-0.5">Session de démarrage pour aligner client et équipe sur les objectifs.</p>
        </div>
        <StatusBadge />
      </div>
      <div className="bg-zinc-800/40 rounded-xl p-5 space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">Agenda kickoff recommandé</p>
        {[
          '(15 min) Présentation de l\'équipe et des outils',
          '(20 min) Revue du scope et des livrables',
          '(10 min) Validation de la timeline et des jalons',
          '(10 min) Processus de feedback et de validation',
          '(5 min) Prochaines étapes et accès portail',
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="text-fuchsia-400 font-bold mt-0.5 shrink-0">{i + 1}.</span>
            <span className={step.status === 'done' ? 'text-zinc-500' : 'text-zinc-300'}>{item}</span>
          </div>
        ))}
      </div>
      {step.status === 'current' && !project?.kickoffDate && (
        <ActionBtn label="Marquer kickoff fait" onClick={() => onAction('kickoff')} loading={actionLoading === 'kickoff'} />
      )}
      {step.status === 'done' && project?.kickoffDate && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4" /> Kickoff effectué le {fmt(project.kickoffDate)}
        </div>
      )}
    </div>
  );

  // ── Portail ──
  if (step.id === 'portal') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-100">Portail client</h3>
          <p className="text-sm text-zinc-400 mt-0.5">Lien de suivi privé envoyé au client pour suivre l'avancement en temps réel.</p>
        </div>
        <StatusBadge />
      </div>
      {portalTokens.length > 0 ? (
        <div className="space-y-3">
          {portalTokens.map(token => (
            <div key={token.id} className="bg-zinc-800/60 rounded-xl p-4 flex items-center gap-3">
              <Link2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">{token.label ?? 'Lien portail principal'}</p>
                {token.lastAccessedAt && <p className="text-xs text-zinc-500">Dernier accès : {fmt(token.lastAccessedAt)}</p>}
                {token.expiresAt && <p className="text-xs text-zinc-500">Expire : {fmt(token.expiresAt)}</p>}
              </div>
              <span className="text-xs text-emerald-400 font-medium">Actif</span>
            </div>
          ))}
        </div>
      ) : step.status !== 'pending' ? (
        <div className="space-y-3">
          <div className="bg-zinc-800/40 rounded-xl p-4 text-sm text-zinc-400">
            Génère un lien privé pour que le client suive l'avancement du projet, accède aux livrables et valide les étapes.
          </div>
          <ActionBtn label="Générer lien portail" onClick={() => onAction('portal')} loading={actionLoading === 'portal'} />
        </div>
      ) : (
        <div className="bg-zinc-800/40 rounded-xl p-5 text-center">
          <p className="text-sm text-zinc-500">Démarre le projet avant d'activer le portail.</p>
        </div>
      )}
    </div>
  );

  // ── Livrables ──
  if (step.id === 'delivery') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-100">Livrables</h3>
          <p className="text-sm text-zinc-400 mt-0.5">Fichiers finaux déposés dans le portail client.</p>
        </div>
        <StatusBadge />
      </div>
      {deliverables.length > 0 ? (
        <div className="space-y-2">
          {deliverables.map(d => (
            <div key={d.id} className="bg-zinc-800/60 rounded-xl p-4 flex items-center gap-3">
              <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{d.filename}</p>
                <p className="text-xs text-zinc-500">Uploadé le {fmt(d.uploadedAt)}</p>
              </div>
              {d.fileSize && <span className="text-xs text-zinc-600 shrink-0">{(d.fileSize / 1024).toFixed(0)} KB</span>}
            </div>
          ))}
        </div>
      ) : step.status !== 'pending' ? (
        <div className="bg-zinc-800/40 rounded-xl p-5 text-center text-sm text-zinc-400">
          Aucun livrable uploadé. Dépose les fichiers finaux dans la section Livrables du projet.
          <br />
          <ActionBtn label="Aller aux livrables" href="/projets" />
        </div>
      ) : (
        <div className="bg-zinc-800/40 rounded-xl p-5 text-center">
          <p className="text-sm text-zinc-500">Active le portail client avant d'uploader les livrables.</p>
        </div>
      )}
    </div>
  );

  // ── Facture ──
  if (step.id === 'invoice') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-100">Facturation &amp; Paiement</h3>
          <p className="text-sm text-zinc-400 mt-0.5">Suivi des factures et confirmation du paiement.</p>
        </div>
        <StatusBadge />
      </div>
      {invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.id} className="bg-zinc-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-zinc-100">{fmtAmount(inv.amount)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  inv.status === 'Payée' ? 'text-emerald-400 bg-emerald-500/10' :
                  inv.status === 'Envoyée' ? 'text-blue-400 bg-blue-500/10' :
                  inv.status === 'En retard' ? 'text-rose-400 bg-rose-500/10' :
                  'text-zinc-400 bg-zinc-800'
                }`}>{inv.status}</span>
              </div>
              {inv.notes && <p className="text-xs text-zinc-500">{inv.notes}</p>}
              {inv.dueDate && <p className="text-xs text-zinc-500 mt-1">Échéance : {fmt(inv.dueDate)}</p>}
              {inv.paidAt && <p className="text-xs text-emerald-400 mt-1">Payée le {fmt(inv.paidAt)}</p>}
            </div>
          ))}
          {invoices.every(i => i.status !== 'Payée') && (
            <ActionBtn label="Gérer les factures" href="/finances" />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-zinc-800/40 rounded-xl p-4 text-sm text-zinc-400">
            Aucune facture créée. Crée la facture finale après livraison.
          </div>
          <ActionBtn label="Créer une facture" href="/finances" />
        </div>
      )}
    </div>
  );

  // ── Clôture ──
  if (step.id === 'closed') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-100">Clôture du projet</h3>
          <p className="text-sm text-zinc-400 mt-0.5">Mission terminée, NPS recueilli et relation client entretenue.</p>
        </div>
        <StatusBadge />
      </div>
      <div className="space-y-3">
        {followups.length > 0 && (
          <div className="bg-zinc-800/40 rounded-xl p-4 space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Follow-ups</p>
            {followups.map(f => (
              <div key={f.id} className="flex items-center gap-2 text-sm">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.status === 'Fait' ? 'bg-emerald-400' : f.priority === 'Haute' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                <span className="text-zinc-300 flex-1">{f.type}</span>
                <span className={`text-xs ${f.status === 'Fait' ? 'text-emerald-400' : 'text-zinc-500'}`}>{f.status}</span>
                {f.scheduledAt && <span className="text-xs text-zinc-600">{fmt(f.scheduledAt)}</span>}
              </div>
            ))}
          </div>
        )}
        <div className="bg-zinc-800/40 rounded-xl p-4 space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">Checklist de clôture</p>
          {[
            'Livraison finale validée par le client',
            'NPS recueilli (J+3)',
            'Facture payée et archivée',
            'Témoignage / avis client demandé',
            'Opportunité d\'upsell identifiée',
            'Projet archivé dans le portfolio',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                step.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
              }`}>
                {step.status === 'done' && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className={step.status === 'done' ? 'text-zinc-500' : 'text-zinc-300'}>{item}</span>
            </div>
          ))}
        </div>
        {step.status === 'current' && (
          <ActionBtn label="Marquer projet clôturé" onClick={() => onAction('closed')} loading={actionLoading === 'closed'} />
        )}
      </div>
    </div>
  );

  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string>('lead');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [proposalModal, setProposalModal] = useState<{ markdown: string; fromTemplate: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-select the current active step on load
  useEffect(() => {
    if (!data) return;
    const steps = buildSteps(data);
    const current = steps.find(s => s.status === 'current');
    if (current) setActiveStepId(current.id);
  }, [data]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (action: string) => {
    if (!data) return;
    setActionLoading(action);
    const { lead } = data;

    try {
      if (action === 'proposal') {
        const res = await fetch('/api/ai/generate-proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id, name: lead.name, company: lead.company, budget: lead.propositionAmount?.toString() ?? lead.budget ?? '', timeline: lead.timeline ?? '', notes: lead.notes ?? '' }),
        });
        const json = await res.json();
        if (json.success) setProposalModal({ markdown: json.data.proposal, fromTemplate: json.data.fromTemplate === true });
        return;
      }
      if (action === 'discovery') {
        await fetch(`/api/leads?id=${lead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discoveryCallAt: Date.now(), status: 'Discovery fait' }) });
        showToast('Discovery marqué fait'); fetchData(); return;
      }
      if (action === 'proposition_sent') {
        await fetch(`/api/leads?id=${lead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propositionSentAt: Date.now(), status: 'Proposition envoyée' }) });
        showToast('Proposition marquée envoyée'); fetchData(); return;
      }
      if (action === 'signed') {
        await fetch(`/api/leads?id=${lead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signedAt: Date.now(), status: 'Signé' }) });
        showToast('Contrat marqué signé'); fetchData(); return;
      }
      if (action === 'kickoff') {
        if (!data.projects[0]) return;
        await fetch(`/api/projects?id=${data.projects[0].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kickoffDate: Date.now() }) });
        showToast('Kickoff enregistré'); fetchData(); return;
      }
      if (action === 'portal') {
        if (!data.projects[0]) return;
        const res = await fetch('/api/portal/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: data.projects[0].id }) });
        const json = await res.json();
        if (json.success) { await navigator.clipboard.writeText(`${window.location.origin}/client-portal/${json.data.token}`); showToast('Lien portail copié'); fetchData(); }
        return;
      }
      if (action === 'closed') {
        if (!data.projects[0]) return;
        await fetch(`/api/projects?id=${data.projects[0].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Terminé', deliveredAt: Date.now() }) });
        showToast('Projet clôturé'); fetchData(); return;
      }
    } catch { showToast('Erreur — réessaie'); }
    finally { setActionLoading(null); }
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
      <div className="text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p>{error ?? 'Client introuvable'}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-fuchsia-400 hover:text-fuchsia-300">← Retour</button>
      </div>
    </div>
  );

  const { lead, invoices } = data;
  const clientName = lead.company || lead.name;
  const steps = buildSteps(data);
  const doneCount = steps.filter(s => s.status === 'done').length;
  const progress = Math.round((doneCount / steps.length) * 100);
  const activeStep = steps.find(s => s.id === activeStepId) ?? steps[0];

  const copyEmail = async () => {
    if (!lead.email) return;
    await navigator.clipboard.writeText(lead.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/90 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />Retour
          </button>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-fuchsia-500/15 border border-fuchsia-500/25 rounded-lg flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-fuchsia-400" />
            </div>
            <span className="font-semibold text-zinc-100 truncate">{clientName}</span>
            {lead.company && <span className="text-xs text-zinc-500 hidden sm:block">— {lead.name}</span>}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-zinc-500 hidden sm:block">{doneCount}/{steps.length} étapes</span>
            <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden hidden sm:block">
              <motion.div className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 rounded-full"
                initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
            </div>
            <span className="text-xs font-bold text-fuchsia-400">{progress}%</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* ── Left — Identity ─────────────────── */}
          <div className="xl:col-span-1 space-y-4">
            {/* Identity card */}
            <div className="bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/20 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold text-fuchsia-300">
                  {clientName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-zinc-100 text-base leading-tight truncate">{clientName}</h2>
                  {lead.company && <p className="text-xs text-zinc-500 mt-0.5">{lead.name}</p>}
                  <span className={`inline-flex mt-1.5 items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    lead.status === 'Signé' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                    lead.status === 'Perdu' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                    'text-violet-400 bg-violet-500/10 border-violet-500/20'
                  }`}>{lead.status}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {lead.email && (
                  <div className="flex items-center gap-2 group">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="text-zinc-300 truncate flex-1 text-xs">{lead.email}</span>
                    <button onClick={copyEmail} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />}
                    </button>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="text-zinc-300 text-xs">{lead.phone}</span>
                  </div>
                )}
                {lead.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 hover:text-fuchsia-300 truncate flex items-center gap-1 text-xs">
                      {lead.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="text-zinc-400 text-xs">{lead.source}</span>
                </div>
              </div>
              {lead.notes && (
                <div className="pt-3 border-t border-white/[0.06]">
                  <p className="text-xs text-zinc-500 mb-1">Notes</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{lead.notes}</p>
                </div>
              )}
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Budget', value: lead.propositionAmount ? fmtAmount(lead.propositionAmount) : lead.budget ?? '—', color: 'text-zinc-100' },
                { label: 'Facturé', value: invoices.filter(i => i.status === 'Payée').reduce((s, i) => s + i.amount, 0) > 0 ? fmtAmount(invoices.filter(i => i.status === 'Payée').reduce((s, i) => s + i.amount, 0)) : '—', color: 'text-emerald-400' },
                { label: 'Projets', value: String(data.projects.length), color: 'text-zinc-100' },
                { label: 'Score', value: `${lead.score}/10`, color: 'text-fuchsia-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-900/60 border border-white/[0.07] rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 mb-1">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right — Workflow ─────────────────── */}
          <div className="xl:col-span-3 space-y-5">

            {/* Horizontal stepper */}
            <div className="bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Parcours client</h3>
                <span className="ml-auto text-xs text-zinc-500">{doneCount}/{steps.length} complétées</span>
              </div>
              <HorizontalStepper steps={steps} activeId={activeStepId} onSelect={setActiveStepId} />
            </div>

            {/* Step detail panel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStepId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="bg-zinc-900/60 border border-white/[0.07] rounded-2xl p-6"
              >
                <StepPanel step={activeStep} data={data} onAction={handleAction} actionLoading={actionLoading} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {proposalModal && (
        <ProposalViewerModal
          markdown={proposalModal.markdown}
          fromTemplate={proposalModal.fromTemplate}
          leadName={lead.name}
          leadCompany={lead.company ?? undefined}
          onClose={() => setProposalModal(null)}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
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
