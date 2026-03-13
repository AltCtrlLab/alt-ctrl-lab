'use client';

import type { Project } from '@/lib/db/schema_projects';
import { ProjectCard } from './ProjectCard';

interface ProjetsGridProps {
  projects: Project[];
  onCardClick: (project: Project) => void;
}

export function ProjetsGrid({ projects, onCardClick }: ProjetsGridProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 rounded-2xl">
        <p className="text-zinc-600 text-sm">Aucun projet</p>
        <p className="text-zinc-700 text-xs mt-1">Créez votre premier projet avec le bouton ci-dessus</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project, i) => (
        <ProjectCard key={project.id} project={project} index={i} onClick={onCardClick} />
      ))}
    </div>
  );
}
