'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { RefreshCw, Clock, CheckCircle, XCircle, ChevronRight, X, Loader2, Zap, AlertTriangle, Download, FileText, FileJson, Globe, Ban } from 'lucide-react';

export interface Task {
  id: string;
  agentName: string;
  status: string;
  prompt: string;
  result?: string;
  error?: string;
  stage?: string;
  iteration?: number;
  createdAt: number;
  updatedAt: number;
}

interface KanbanBoardProps {
  isDark: boolean;
  tasks: Task[];
  onRefresh: () => void;
}

type ColumnId = 'pending' | 'planning' | 'executing' | 'qa' | 'done';

interface Column {
  id: ColumnId;
  title: string;
  emoji: string;
  statuses: string[];
  color: string;
  bgColor: string;
  borderColor: string;
  pulse?: boolean;
}

const columns: Column[] = [
  {
    id: 'pending',
    title: 'En Attente',
    emoji: '⏳',
    statuses: ['PENDING'],
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
  },
  {
    id: 'planning',
    title: 'Planification',
    emoji: '🧠',
    statuses: ['DIRECTOR_PLANNING'],
    color: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/10',
    borderColor: 'border-fuchsia-500/20',
    pulse: true,
  },
  {
    id: 'executing',
    title: 'Exécution',
    emoji: '⚡',
    statuses: ['RUNNING', 'EXECUTING_SUBTASK', 'EXECUTOR_DRAFTING', 'EXECUTOR_SWARMING', 'EXECUTOR_SYNTHESIZING', 'EXECUTOR_REVISING'],
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    pulse: true,
  },
  {
    id: 'qa',
    title: 'Contrôle Qualité',
    emoji: '🔍',
    statuses: ['DIRECTOR_QA'],
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    pulse: true,
  },
  {
    id: 'done',
    title: 'Terminé',
    emoji: '✅',
    statuses: ['COMPLETED', 'FAILED', 'FAILED_QA'],
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
];

// Ordered stages for the progress bar
const STAGE_ORDER = [
  'PENDING',
  'DIRECTOR_PLANNING',
  'EXECUTOR_DRAFTING',
  'DIRECTOR_QA',
  'COMPLETED',
];

const STAGE_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  DIRECTOR_PLANNING: 'Cahier des charges',
  EXECUTOR_DRAFTING: 'Implémentation',
  EXECUTOR_REVISING: 'Révision',
  DIRECTOR_QA: 'Audit qualité',
  COMPLETED: 'Livrable validé',
  FAILED: 'Échec',
  FAILED_QA: 'Échec QA',
};

const AGENT_EMOJIS: Record<string, string> = {
  musawwir: '🎨',
  raqim: '✏️',
  matin: '💻',
  banna: '🔧',
  fatah: '📣',
  khatib: '📝',
  hasib: '🤖',
  sani: '⚙️',
  main: '🧠',
};

function parseBrief(prompt: string): { director: string; executor: string; brief: string } {
  // Format: "[HIERARCHICAL] Director: musawwir, Executor: raqim\n\nBrief:\n..."
  const dirMatch = prompt.match(/Director:\s*(\w+)/i);
  const execMatch = prompt.match(/Executor:\s*(\w+)/i);
  const briefMatch = prompt.match(/Brief:\s*\n([\s\S]*)/i);
  return {
    director: dirMatch?.[1] || '',
    executor: execMatch?.[1] || '',
    brief: briefMatch?.[1]?.trim() || prompt,
  };
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `il y a ${h}h`;
  if (m > 0) return `il y a ${m}m`;
  return `il y a ${s}s`;
}

function StageProgress({ status }: { status: string }) {
  const currentIdx = STAGE_ORDER.indexOf(status);
  const isFailed = status === 'FAILED' || status === 'FAILED_QA';
  const isCompleted = status === 'COMPLETED';

  return (
    <div className="flex items-center gap-1 w-full">
      {STAGE_ORDER.map((stage, idx) => {
        const isDone = !isFailed && (isCompleted || currentIdx > idx);
        const isActive = !isFailed && !isCompleted && currentIdx === idx;
        const isFuture = currentIdx < idx;

        return (
          <React.Fragment key={stage}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`
                w-full h-1.5 rounded-full transition-all duration-500
                ${isFailed ? 'bg-red-500/40' : isDone ? 'bg-emerald-500' : isActive ? 'bg-cyan-400 animate-pulse' : 'bg-white/10'}
              `} />
              {isActive && (
                <span className="text-[9px] text-cyan-300 font-medium whitespace-nowrap">
                  {STAGE_LABELS[status] || status}
                </span>
              )}
            </div>
            {idx < STAGE_ORDER.length - 1 && (
              <div className={`w-1 h-1 rounded-full shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-white/10'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Task Detail Modal ──────────────────────────────────────────────────────

function TaskDetailModal({ task, onClose, onRefresh }: { task: Task; onClose: () => void; onRefresh: () => void }) {
  const { director, executor, brief } = parseBrief(task.prompt);
  const elapsed = task.updatedAt - task.createdAt;
  const isActive = !['COMPLETED', 'FAILED', 'FAILED_QA'].includes(task.status);
  const [now, setNow] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);
  const stuckMs = now - task.updatedAt;
  const isStuck = isActive && stuckMs > 30 * 60 * 1000; // stuck > 30min

  const handleCancel = async () => {
    if (!confirm('Annuler cette tâche ?')) return;
    setCancelling(true);
    await fetch(`/api/agents?action=cancel_task&taskId=${task.id}`);
    setCancelling(false);
    onRefresh();
    onClose();
  };

  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const liveElapsed = isActive ? now - task.createdAt : elapsed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-neutral-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{AGENT_EMOJIS[director] || '🤖'}</span>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Directeur</p>
                <p className="text-sm font-semibold text-white capitalize">{director || task.agentName}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-600" />
            <div className="flex items-center gap-2">
              <span className="text-xl">{AGENT_EMOJIS[executor] || '⚙️'}</span>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Exécuteur</p>
                <p className="text-sm font-semibold text-white capitalize">{executor || '—'}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status + Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isActive ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : task.status === 'COMPLETED' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm font-medium ${isActive ? 'text-cyan-300' : task.status === 'COMPLETED' ? 'text-emerald-300' : 'text-red-300'}`}>
                {STAGE_LABELS[task.status] || task.status.replace(/_/g, ' ')}
              </span>
              {task.iteration !== undefined && task.iteration !== null && task.iteration > 0 && (
                <span className="text-xs text-neutral-500 bg-white/5 px-2 py-0.5 rounded-full">
                  Itération {task.iteration}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(liveElapsed)}</span>
              {isActive && <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse ml-1" />}
            </div>
          </div>

          {/* Stuck warning */}
          {isStuck && (
            <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Tâche bloquée depuis {Math.round(stuckMs / 60000)}min — le processus WSL a peut-être été interrompu.</span>
              </div>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-xs text-amber-300 font-medium transition-colors shrink-0 ml-3"
              >
                {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                Annuler
              </button>
            </div>
          )}

          {/* Progress Bar */}
          <StageProgress status={task.status} />

          {/* Workflow Steps */}
          <div className="space-y-2">
            <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Pipeline d'exécution</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { stage: 'DIRECTOR_PLANNING', label: 'Cahier des charges', agent: director, emoji: AGENT_EMOJIS[director] || '🧠' },
                { stage: 'EXECUTOR_DRAFTING', label: 'Implémentation', agent: executor, emoji: AGENT_EMOJIS[executor] || '⚙️' },
                { stage: 'DIRECTOR_QA', label: 'Audit qualité', agent: director, emoji: AGENT_EMOJIS[director] || '🔍' },
                { stage: 'COMPLETED', label: 'Livrable validé', agent: executor, emoji: '✅' },
              ].map(({ stage, label, agent, emoji }) => {
                const stageIdx = STAGE_ORDER.indexOf(stage);
                const currentIdx = STAGE_ORDER.indexOf(task.status);
                const isCompletedTask = task.status === 'COMPLETED';
                const isDone = isCompletedTask ? true : currentIdx > stageIdx;
                const isActive = !isCompletedTask && task.status === stage;
                return (
                  <div key={stage} className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all ${
                    isDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                    isActive ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 ring-1 ring-cyan-500/20' :
                    'bg-white/[0.02] border-white/[0.05] text-neutral-500'
                  }`}>
                    <span>{isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? '✓' : emoji}</span>
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-[10px] opacity-70 capitalize">{agent}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Brief */}
          <div className="space-y-2">
            <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Brief</p>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">{brief}</p>
            </div>
          </div>

          {/* Result */}
          {task.result && (
            <div className="space-y-2">
              <p className="text-xs text-emerald-500 uppercase tracking-wider font-medium">Livrable</p>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 max-h-60 overflow-y-auto">
                <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed font-mono text-xs">{task.result}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {task.error && (
            <div className="space-y-2">
              <p className="text-xs text-red-500 uppercase tracking-wider font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Erreur
              </p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-sm text-red-300 whitespace-pre-wrap font-mono text-xs">{task.error}</p>
              </div>
            </div>
          )}

          {/* Downloads */}
          {task.status === 'COMPLETED' && (
            <div className="space-y-2 pt-2 border-t border-white/[0.04]">
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium flex items-center gap-1">
                <Download className="w-3 h-3" /> Télécharger le Livrable
              </p>
              <div className="flex gap-2">
                <a
                  href={`/api/deliverable/${task.id}?format=html`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-fuchsia-500/15 border border-fuchsia-500/30 rounded-lg text-xs text-fuchsia-300 hover:bg-fuchsia-500/25 transition-colors font-medium"
                >
                  <Globe className="w-3.5 h-3.5" />
                  HTML / PDF
                </a>
                <a
                  href={`/api/deliverable/${task.id}?format=md`}
                  download
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 hover:bg-emerald-500/25 transition-colors font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Markdown
                </a>
                <a
                  href={`/api/deliverable/${task.id}?format=json`}
                  download
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs text-amber-300 hover:bg-amber-500/25 transition-colors font-medium"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  JSON
                </a>
              </div>
              <p className="text-[10px] text-neutral-600">
                HTML → ouvre dans le navigateur → Ctrl+P pour exporter en PDF
              </p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-neutral-600 pt-2 border-t border-white/[0.04]">
            <span>ID: {task.id}</span>
            <span>Créé {formatTimeAgo(task.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ──────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { director, executor, brief } = parseBrief(task.prompt);
  const isActive = !['COMPLETED', 'FAILED', 'FAILED_QA'].includes(task.status);
  const isFailed = task.status === 'FAILED' || task.status === 'FAILED_QA';
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const elapsed = isActive ? now - task.createdAt : task.updatedAt - task.createdAt;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white/[0.03] border rounded-2xl p-4 hover:bg-white/[0.06] transition-all duration-200 group ${
        isActive
          ? 'border-cyan-500/30 hover:border-cyan-500/50'
          : isFailed
          ? 'border-red-500/20 hover:border-red-500/30'
          : 'border-white/[0.08] hover:border-white/[0.14]'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{AGENT_EMOJIS[director] || '🤖'}</span>
          <span className="text-xs font-semibold text-white capitalize">{director || task.agentName}</span>
          {executor && (
            <>
              <ChevronRight className="w-3 h-3 text-neutral-600" />
              <span className="text-base">{AGENT_EMOJIS[executor] || '⚙️'}</span>
              <span className="text-xs text-neutral-400 capitalize">{executor}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isActive && <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />}
          <span className="text-xs text-neutral-600">{formatDuration(elapsed)}</span>
        </div>
      </div>

      {/* Brief preview */}
      <p className="text-xs text-neutral-400 mb-3 line-clamp-2 text-left leading-relaxed">
        {brief.length > 120 ? `${brief.substring(0, 120)}…` : brief}
      </p>

      {/* Progress */}
      <StageProgress status={task.status} />

      {/* Bottom: current stage + chevron */}
      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs font-medium ${
          isFailed ? 'text-red-400' :
          task.status === 'COMPLETED' ? 'text-emerald-400' :
          'text-cyan-300'
        }`}>
          {isFailed ? '✗ Échec' : task.status === 'COMPLETED' ? '✓ Terminé' : STAGE_LABELS[task.status] || task.status}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
      </div>

      {/* Error snippet */}
      {task.error && (
        <div className="mt-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 line-clamp-1">
          {task.error}
        </div>
      )}
    </button>
  );
}

// ─── Main Board ─────────────────────────────────────────────────────────────

const KanbanBoard: React.FC<KanbanBoardProps> = ({ isDark, tasks, onRefresh }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 5s while there are active tasks
  const hasActiveTasks = tasks.some(t => !['COMPLETED', 'FAILED', 'FAILED_QA'].includes(t.status));

  useEffect(() => {
    if (!autoRefresh || !hasActiveTasks) return;
    const interval = setInterval(onRefresh, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, hasActiveTasks, onRefresh]);

  // Update selectedTask when tasks array changes (live updates)
  useEffect(() => {
    if (!selectedTask) return;
    const updated = tasks.find(t => t.id === selectedTask.id);
    if (updated) setSelectedTask(updated);
  }, [tasks]);

  const tasksByColumn = useMemo(() => {
    const grouped: Record<ColumnId, Task[]> = {
      pending: [],
      planning: [],
      executing: [],
      qa: [],
      done: [],
    };

    tasks.forEach((task) => {
      const column = columns.find((col) => col.statuses.includes(task.status));
      if (column) {
        grouped[column.id].push(task);
      }
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key as ColumnId].sort((a, b) => b.createdAt - a.createdAt);
    });

    return grouped;
  }, [tasks]);

  const totalActive = tasks.filter(t => !['COMPLETED', 'FAILED', 'FAILED_QA'].includes(t.status)).length;

  return (
    <>
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onRefresh={onRefresh} />
      )}

      <div className="w-full h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white">Tableau de Bord Briefs</h2>
            {totalActive > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/15 border border-cyan-500/30 rounded-full text-xs text-cyan-300 font-medium">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                {totalActive} brief{totalActive > 1 ? 's' : ''} en cours
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                autoRefresh
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                  : 'bg-white/[0.03] border-white/[0.08] text-neutral-400'
              }`}
            >
              <Zap className="w-3 h-3" />
              {autoRefresh ? 'Live' : 'Pausé'}
            </button>
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-xs text-neutral-300 hover:bg-white/[0.06] transition-colors font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 flex gap-3 overflow-x-auto pb-4 min-h-0">
          {columns.map((column) => {
            const columnTasks = tasksByColumn[column.id];
            const hasActive = column.pulse && columnTasks.length > 0;
            return (
              <div key={column.id} className="flex-1 min-w-[240px] max-w-xs flex flex-col">
                {/* Column Header */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${column.bgColor} ${column.borderColor} mb-3`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{column.emoji}</span>
                    <h3 className={`text-xs font-semibold ${column.color}`}>{column.title}</h3>
                    {hasActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse opacity-70" style={{ color: 'inherit' }} />}
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${column.bgColor} ${column.color} border ${column.borderColor}`}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto">
                  {columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center p-6 bg-white/[0.015] border border-white/[0.04] rounded-2xl border-dashed min-h-[80px]">
                      <span className="text-xs text-neutral-700">Aucune tâche</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default KanbanBoard;
