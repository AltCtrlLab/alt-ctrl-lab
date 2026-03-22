'use client';

import { FolderKanban } from 'lucide-react';
import type { Project } from '@/lib/db/schema_projects';
import { ProjectCard } from './ProjectCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface ProjetsGridProps {
  projects: Project[];
  onCardClick: (project: Project) => void;
}

export function ProjetsGrid({ projects, onCardClick }: ProjetsGridProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        color="fuchsia"
        message="Aucun projet en cours"
        submessage="Un projet est créé automatiquement quand un lead passe au statut « Signé ». Vous pouvez aussi en créer un manuellement."
      />
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
