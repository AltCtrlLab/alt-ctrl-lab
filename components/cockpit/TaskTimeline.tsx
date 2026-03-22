'use client';

import React from 'react';

// Types pour le timeline polymorphe
type TaskMode = 'full_agency' | 'director_direct';
type TaskStatus = 'PENDING' | 'PLANNING' | 'EXECUTING' | 'REJECTED' | 'VALIDATED' | 'COMPLETED' | 'FORCED_VALIDATION';

interface TimelineTask {
  id: string;
  title: string;
  agent: string;
  status: TaskStatus;
  mode: TaskMode;
  parentId?: string;
  depth: number;
  timestamp: Date;
  feedback?: string;
  log?: string;
}

interface TaskTimelineProps {
  tasks?: TimelineTask[];
  className?: string;
}

// Configuration des couleurs sémantiques (Linear/Vercel style)
const statusColors: Record<TaskStatus, string> = {
  PENDING: 'bg-neutral-600',
  PLANNING: 'bg-neutral-600',
  EXECUTING: 'bg-cyan-500 animate-pulse',
  REJECTED: 'bg-red-500',
  VALIDATED: 'bg-emerald-500',
  COMPLETED: 'bg-emerald-500',
  FORCED_VALIDATION: 'bg-fuchsia-500',
};

const statusLabels: Record<TaskStatus, string> = {
  PENDING: 'En attente',
  PLANNING: 'Planification',
  EXECUTING: 'Exécution',
  REJECTED: 'Rejeté',
  VALIDATED: 'Validé',
  COMPLETED: 'Terminé',
  FORCED_VALIDATION: 'Override',
};

// Mock data polymorphe
const mockTasks: TimelineTask[] = [
  // Mode Full Agency - CEO au niveau 1
  {
    id: 'ceo-001',
    title: 'Orchestration Global',
    agent: 'AbdulHakim',
    status: 'COMPLETED',
    mode: 'full_agency',
    depth: 0,
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: 'dir-001',
    title: 'Planning Design System',
    agent: 'Musawwir',
    status: 'COMPLETED',
    mode: 'full_agency',
    parentId: 'ceo-001',
    depth: 1,
    timestamp: new Date(Date.now() - 3000000),
  },
  {
    id: 'qa-001',
    title: 'QA Loop - Sub-task 1',
    agent: 'Raqim',
    status: 'FORCED_VALIDATION',
    mode: 'full_agency',
    parentId: 'dir-001',
    depth: 2,
    timestamp: new Date(Date.now() - 2400000),
    feedback: 'Token colors generated',
  },
  {
    id: 'qa-002',
    title: 'QA Loop - Sub-task 2',
    agent: 'Raqim',
    status: 'REJECTED',
    mode: 'full_agency',
    parentId: 'dir-001',
    depth: 2,
    timestamp: new Date(Date.now() - 1800000),
    feedback: 'Spacing inconsistency detected',
    log: 'error: line 45 - expected "space-4", got "space-6"',
  },
  // Mode Pôle Direct - Directeur au niveau 1
  {
    id: 'dir-direct-001',
    title: 'Web Dev Brief',
    agent: 'Matin',
    status: 'EXECUTING',
    mode: 'director_direct',
    depth: 0,
    timestamp: new Date(Date.now() - 600000),
  },
  {
    id: 'qa-direct-001',
    title: 'QA avec Banna',
    agent: 'Banna',
    status: 'EXECUTING',
    mode: 'director_direct',
    parentId: 'dir-direct-001',
    depth: 1,
    timestamp: new Date(Date.now() - 300000),
    log: 'Building components...',
  },
];

export const TaskTimeline: React.FC<TaskTimelineProps> = ({ 
  tasks = mockTasks,
  className = '' 
}) => {
  // Grouper les tâches par profondeur pour le rendu horizontal
  const tasksByDepth = tasks.reduce((acc, task) => {
    if (!acc[task.depth]) acc[task.depth] = [];
    acc[task.depth].push(task);
    return acc;
  }, {} as Record<number, TimelineTask[]>);

  const maxDepth = Math.max(...tasks.map(t => t.depth), 0);

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className={`bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">Timeline d&apos;exécution</h2>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Full Agency
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            Direct
          </span>
        </div>
      </div>

      {/* Timeline horizontale */}
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          {/* Niveaux de profondeur */}
          {Array.from({ length: maxDepth + 1 }, (_, depth) => (
            <div key={depth} className="flex flex-col gap-3 min-w-[200px]">
              {/* Label du niveau */}
              <div className="text-xs text-neutral-500 font-mono uppercase tracking-wider mb-2">
                {depth === 0 ? 'Master Task' : depth === 1 ? 'Directeurs' : 'QA Loops'}
              </div>

              {/* Tâches de ce niveau */}
              {tasksByDepth[depth]?.map((task) => (
                <div 
                  key={task.id}
                  className="relative"
                  style={{ marginLeft: task.depth > 0 ? `${task.depth * 16}px` : 0 }}
                >
                  {/* Ligne de connexion verticale */}
                  {task.depth > 0 && (
                    <div 
                      className="absolute -left-4 top-3 w-4 h-px bg-neutral-800"
                      style={{ marginLeft: -8 }}
                    />
                  )}

                  {/* Card de tâche */}
                  <div className={`
                    relative p-3 rounded-lg border 
                    ${task.depth === 0 ? 'bg-neutral-900 border-neutral-700' : 'bg-black border-neutral-800'}
                  `}>
                    {/* Node status */}
                    <div className="flex items-start gap-3">
                      <div 
                        className={`
                          w-3 h-3 rounded-full ring-4 ring-neutral-950 flex-shrink-0 mt-1
                          ${statusColors[task.status]}
                        `}
                      />
                      
                      <div className="flex-1 min-w-0">
                        {/* Titre */}
                        <h3 className="text-sm font-semibold text-neutral-100 truncate">
                          {task.title}
                        </h3>
                        
                        {/* Agent */}
                        <p className="text-xs text-neutral-400 font-mono uppercase tracking-wider mt-0.5">
                          {task.agent}
                        </p>
                        
                        {/* Timestamp */}
                        <p className="text-xs text-neutral-600 mt-1">
                          {formatTime(task.timestamp)}
                        </p>

                        {/* Badge status */}
                        <span className={`
                          inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-xs font-medium
                          ${task.status === 'REJECTED' ? 'bg-red-950 text-red-400' : ''}
                          ${task.status === 'FORCED_VALIDATION' ? 'bg-fuchsia-950 text-fuchsia-400' : ''}
                          ${task.status === 'COMPLETED' || task.status === 'VALIDATED' ? 'bg-emerald-950 text-emerald-400' : ''}
                          ${task.status === 'EXECUTING' ? 'bg-cyan-950 text-cyan-400' : ''}
                          ${task.status === 'PENDING' || task.status === 'PLANNING' ? 'bg-neutral-800 text-neutral-400' : ''}
                        `}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColors[task.status].replace('animate-pulse', '')}`} />
                          {statusLabels[task.status]}
                        </span>

                        {/* Feedback / Log imbriqué */}
                        {(task.feedback || task.log) && (
                          <div className="mt-2 bg-black border border-neutral-800 rounded-md p-2 text-xs font-mono text-neutral-400 whitespace-pre-wrap overflow-x-auto max-h-24 overflow-y-auto">
                            {task.feedback && (
                              <div className="text-neutral-500 mb-1">// {task.feedback}</div>
                            )}
                            {task.log && (
                              <div className="text-red-400">{task.log}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-900/50">
        <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-neutral-600" />
            Planning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            Exécution
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Rejet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Validé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500" />
            Override
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskTimeline;
