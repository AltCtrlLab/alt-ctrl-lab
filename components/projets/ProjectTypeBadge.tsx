'use client';

import type { ProjectType } from '@/lib/db/schema_projects';
import { TYPE_META } from '@/lib/db/schema_projects';

const TYPE_ICONS: Record<ProjectType, string> = {
  Web: '🌐',
  Branding: '🎨',
  IA: '🤖',
  Marketing: '📣',
};

interface ProjectTypeBadgeProps {
  type: ProjectType;
  size?: 'sm' | 'md';
}

export function ProjectTypeBadge({ type, size = 'sm' }: ProjectTypeBadgeProps) {
  const meta = TYPE_META[type];
  const sizeClasses = size === 'md' ? 'text-xs px-2.5 py-1 gap-1.5' : 'text-[10px] px-2 py-0.5 gap-1';
  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${meta.bg} ${meta.border} ${meta.color} ${sizeClasses}`}>
      <span>{TYPE_ICONS[type]}</span>
      {type}
    </span>
  );
}
