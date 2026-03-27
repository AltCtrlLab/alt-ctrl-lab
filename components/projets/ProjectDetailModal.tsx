'use client';

import { useState, useCallback } from 'react';
import { X, Trash2, Loader2, Euro, Clock, Calendar, Check, Users } from 'lucide-react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';
import { AutoChainToast } from '@/components/shared/AutoChainToast';
import type { Project, ProjectPhase, ProjectType, ProjectStatus } from '@/lib/db/schema_projects';
import { ProjectTypeBadge } from './ProjectTypeBadge';
import { PhaseProgress } from './PhaseProgress';
import { BudgetHealthBar } from './BudgetHealthBar';
import { DeadlineCountdown } from './DeadlineCountdown';
import { TimeLogPanel } from './TimeLogPanel';
import { PortalLinkButton } from './PortalLinkButton';
import { CaseStudyButton } from './CaseStudyButton';
import { ContractButton } from './ContractButton';
import { ExportPdfButton } from './ExportPdfButton';
import { SlaIndicator } from './SlaIndicator';

const STATUS_OPTIONS: ProjectStatus[] = ['Actif', 'En pause', 'Terminé', 'Annulé'];

const STATUS_STYLE: Record<ProjectStatus, string> = {
  'Actif': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  'En pause': 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  'Terminé': 'bg-zinc-700/20 border-zinc-600/30 text-zinc-400',
  'Annulé': 'bg-rose-500/10 border-rose-500/30 text-rose-400',
};

function formatDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts as number).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ProjectDetailModalProps {
  project: Project;
  onClose: () => void;
  onPhaseChange: (projectId: string, phase: ProjectPhase) => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

type Tab = 'info' | 'temps' | 'notes';

const AGENTS_DISPLAY: Record<string, string> = {
  musawwir: '🎨 Musawwir', matin: '⚙️ Matin', fatah: '📈 Fatah',
  hasib: '📊 Hasib', sani: '🤖 Sani', khatib: '✍️ Khatib',
};

export function ProjectDetailModal({ project, onClose, onPhaseChange, onUpdated, onDeleted }: ProjectDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [notes, setNotes] = useState(project.notes ?? '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [status, setStatus] = useState<ProjectStatus>(project.status as ProjectStatus);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deletingConfirm, setDeletingConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingPhase, setUpdatingPhase] = useState(false);
  const [localProject, setLocalProject] = useState(project);
  const [autoChainActions, setAutoChainActions] = useState<string[]>([]);

  const agents: string[] = project.teamAgents ? JSON.parse(project.teamAgents as string) : [];

  const handlePhaseChange = async (phase: ProjectPhase) => {
    setUpdatingPhase(true);
    setLocalProject(p => ({ ...p, phase }));
    onPhaseChange(project.id, phase);
    const res = await fetch(`/api/projects?id=${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase }),
    });
    const data = await res.json();
    if (data.autoChain && data.autoChain.length > 0) setAutoChainActions(data.autoChain);
    setUpdatingPhase(false);
    onUpdated();
  };

  const handleStatusChange = async (s: ProjectStatus) => {
    setSavingStatus(true);
    setStatus(s);
    await fetch(`/api/projects?id=${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: s }),
    });
    setSavingStatus(false);
    onUpdated();
  };

  const saveNotes = useCallback(async () => {
    if (!notesDirty) return;
    setSavingNotes(true);
    await fetch(`/api/projects?id=${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
    setNotesDirty(false);
    onUpdated();
  }, [notes, notesDirty, project.id, onUpdated]);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/projects?id=${project.id}`, { method: 'DELETE' });
    onDeleted();
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Informations' },
    { id: 'temps', label: 'Time Log' },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <>
    <AdaptiveModal isOpen={true} onClose={onClose} title={`Détails du projet ${project.clientName}`} showHeader={false}>
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-zinc-100 truncate">{project.clientName}</h2>
                <ProjectTypeBadge type={project.projectType as ProjectType} size="md" />
                <select
                  value={status}
                  onChange={e => handleStatusChange(e.target.value as ProjectStatus)}
                  disabled={savingStatus}
                  className={`text-[11px] font-medium px-2 py-1 rounded-full border cursor-pointer focus:outline-none transition-all ${STATUS_STYLE[status]}`}
                  style={{ background: 'transparent' }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <SlaIndicator projectId={project.id} />
              </div>
              {project.budget && (
                <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                  <Euro className="w-3 h-3" />{project.budget.toLocaleString('fr-FR')} €
                </p>
              )}
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
                  <button onClick={() => setDeletingConfirm(false)} className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-300">Non</button>
                </div>
              )}
              <button onClick={onClose} aria-label="Fermer" className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Phase progress (interactive) */}
          <div className="px-6 py-4 border-b border-zinc-800/60 flex-shrink-0">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3">Phase du projet</p>
            <PhaseProgress
              currentPhase={localProject.phase as ProjectPhase}
              onPhaseChange={handlePhaseChange}
              interactive
              size="md"
            />
          </div>

          {/* Tabs */}
          <div role="tablist" className="flex gap-0 border-b border-zinc-800 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`tab-project-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-project-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px ${
                  activeTab === tab.id ? 'text-fuchsia-400 border-fuchsia-500' : 'text-zinc-400 border-transparent hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div role="tabpanel" id={`panel-project-${activeTab}`} aria-labelledby={`tab-project-${activeTab}`} className="flex-1 overflow-y-auto p-6">
            {activeTab === 'info' && (
              <div className="space-y-5">
                {/* Budget health */}
                <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-3">
                  <BudgetHealthBar
                    hoursActual={project.hoursActual ?? 0}
                    hoursEstimated={project.hoursEstimated ?? 0}
                    showLabel
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  {project.startDate && (
                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Début</p>
                      <p className="text-xs font-medium text-zinc-300">{formatDate(project.startDate as number)}</p>
                    </div>
                  )}
                  {project.kickoffDate && (
                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                      <p className="text-[10px] text-zinc-400 mb-1">Kickoff</p>
                      <p className="text-xs font-medium text-zinc-300">{formatDate(project.kickoffDate as number)}</p>
                    </div>
                  )}
                  <div className="col-span-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                    <p className="text-[10px] text-zinc-400 mb-1.5">Deadline livraison</p>
                    <DeadlineCountdown deadline={project.deadline as number | null} />
                  </div>
                </div>

                {/* Team */}
                {agents.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />Équipe
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {agents.map(a => (
                        <span key={a} className="text-xs px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400">
                          {AGENTS_DISPLAY[a] ?? a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions rapides */}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <PortalLinkButton projectId={project.id} />
                    <ExportPdfButton projectId={project.id} projectType={project.projectType} clientName={project.clientName} />
                    <ContractButton projectId={project.id} clientName={project.clientName} budget={project.budget} />
                    <CaseStudyButton projectId={project.id} projectPhase={localProject.phase} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'temps' && (
              <TimeLogPanel projectId={project.id} onHoursUpdated={onUpdated} />
            )}

            {activeTab === 'notes' && (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
                  onBlur={saveNotes}
                  rows={10}
                  placeholder="Notes, contexte, décisions, livrables..."
                  className="w-full px-3 py-3 text-sm bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-fuchsia-500/60 focus:ring-1 focus:ring-fuchsia-500/20 transition-all resize-none"
                />
                <div className="flex justify-end">
                  {savingNotes && <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Sauvegarde...</span>}
                  {!savingNotes && !notesDirty && notes && <span className="text-[10px] text-zinc-700 flex items-center gap-1"><Check className="w-2.5 h-2.5" /> Sauvegardé</span>}
                </div>
              </div>
            )}
          </div>
    </AdaptiveModal>

    {autoChainActions.length > 0 && (
      <AutoChainToast actions={autoChainActions} onClose={() => setAutoChainActions([])} />
    )}
    </>
  );
}
