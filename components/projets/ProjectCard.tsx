'use client';

import { motion } from 'framer-motion';
import type { Project, ProjectPhase, ProjectType } from '@/lib/db/schema_projects';
import { ProjectTypeBadge } from './ProjectTypeBadge';
import { PhaseProgress } from './PhaseProgress';
import { BudgetHealthBar } from './BudgetHealthBar';
import { DeadlineCountdown } from './DeadlineCountdown';

const AGENTS_DISPLAY: Record<string, string> = {
  musawwir: '🎨', matin: '⚙️', fatah: '📈', hasib: '📊', sani: '🤖', khatib: '✍️',
};

interface ProjectCardProps {
  project: Project;
  index?: number;
  onClick: (project: Project) => void;
}

const STATUS_DOT: Record<string, string> = {
  'Actif': 'bg-emerald-400',
  'En pause': 'bg-amber-400',
  'Terminé': 'bg-zinc-500',
  'Annulé': 'bg-rose-400',
};

export function ProjectCard({ project, index = 0, onClick }: ProjectCardProps) {
  const agents: string[] = project.teamAgents ? JSON.parse(project.teamAgents as string) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      onClick={() => onClick(project)}
      className="group bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-black/20 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[project.status] ?? 'bg-zinc-500'}`} />
            <p className="font-bold text-zinc-100 text-sm leading-tight truncate group-hover:text-white transition-colors">
              {project.clientName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ProjectTypeBadge type={project.projectType as ProjectType} />
            <span className="text-[10px] text-zinc-600">{project.phase}</span>
          </div>
        </div>
        {project.budget && (
          <div className="flex-shrink-0 text-right">
            <p className="text-sm font-bold text-fuchsia-400">{project.budget.toLocaleString('fr-FR')} €</p>
            <p className="text-[9px] text-zinc-600">budget</p>
          </div>
        )}
      </div>

      {/* Phase progress */}
      <PhaseProgress currentPhase={project.phase as ProjectPhase} size="sm" />

      {/* Budget health */}
      <BudgetHealthBar hoursActual={project.hoursActual ?? 0} hoursEstimated={project.hoursEstimated ?? 0} />

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Agents */}
        {agents.length > 0 && (
          <div className="flex items-center gap-0.5">
            {agents.slice(0, 4).map(a => (
              <span key={a} className="text-sm" title={a}>{AGENTS_DISPLAY[a] ?? '👤'}</span>
            ))}
          </div>
        )}
        <div className="ml-auto">
          <DeadlineCountdown deadline={project.deadline as number | null} compact />
        </div>
      </div>
    </motion.div>
  );
}
