'use client';

import { useMemo } from 'react';
import type { Project, ProjectType } from '@/lib/db/schema_projects';
import { TYPE_META } from '@/lib/db/schema_projects';
import { EmptyState } from '@/components/ui/EmptyState';
import { FolderKanban } from 'lucide-react';

interface ProjectsTimelineProps {
  projects: Project[];
}

const TYPE_BAR_COLOR: Record<ProjectType, string> = {
  Web: 'bg-cyan-500/70 border-cyan-500',
  Branding: 'bg-fuchsia-500/70 border-fuchsia-500',
  IA: 'bg-fuchsia-500/70 border-fuchsia-500',
  Marketing: 'bg-amber-500/70 border-amber-500',
};

function formatMonthYear(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

export function ProjectsTimeline({ projects }: ProjectsTimelineProps) {
  const { minDate, maxDate, bars, todayPct, months } = useMemo(() => {
    const dated = projects.filter(p => p.startDate || p.deadline);
    if (dated.length === 0) return { minDate: 0, maxDate: 0, bars: [], todayPct: 0, months: [] };

    const now = Date.now();
    const starts = dated.map(p => (p.startDate ?? p.deadline ?? now) as number);
    const ends = dated.map(p => (p.deadline ?? p.startDate ?? now) as number);

    const minDate = Math.min(...starts, now - 30 * 86400000);
    const maxDate = Math.max(...ends, now + 60 * 86400000);
    const totalMs = maxDate - minDate;

    const bars = projects.map(p => {
      const start = (p.startDate ?? p.deadline ?? now) as number;
      const end = (p.deadline ?? (p.startDate as number) + 30 * 86400000) as number;
      const left = ((start - minDate) / totalMs) * 100;
      const width = Math.max(((end - start) / totalMs) * 100, 2);
      return { project: p, left, width };
    });

    const todayPct = ((now - minDate) / totalMs) * 100;

    // Generate month markers
    const months: { label: string; pct: number }[] = [];
    const d = new Date(minDate);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    while (d.getTime() < maxDate) {
      const pct = ((d.getTime() - minDate) / totalMs) * 100;
      if (pct >= 0 && pct <= 100) months.push({ label: formatMonthYear(d.getTime()), pct });
      d.setMonth(d.getMonth() + 1);
    }

    return { minDate, maxDate, bars, todayPct, months };
  }, [projects]);

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        color="fuchsia"
        message="Aucun projet avec des dates"
        submessage="Les projets apparaissent ici quand un lead passe au statut Signé."
      />
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Month axis */}
      <div className="relative h-8 border-b border-zinc-800 bg-zinc-900">
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 h-full flex items-center"
            style={{ left: `${m.pct}%` }}
          >
            <div className="w-px h-full bg-zinc-800" />
            <span className="ml-1 text-[10px] text-zinc-400 whitespace-nowrap">{m.label}</span>
          </div>
        ))}
        {/* Today marker */}
        {todayPct > 0 && todayPct < 100 && (
          <div
            className="absolute top-0 h-full border-l-2 border-fuchsia-500/60 flex items-center"
            style={{ left: `${todayPct}%` }}
          >
            <span className="ml-1 text-[9px] font-semibold text-fuchsia-400 whitespace-nowrap">Aujourd'hui</span>
          </div>
        )}
      </div>

      {/* Bars */}
      <div className="relative p-4 space-y-3">
        {/* Today vertical line through bars */}
        {todayPct > 0 && todayPct < 100 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-fuchsia-500/30 pointer-events-none"
            style={{ left: `calc(${todayPct}% + 1rem)` }}
          />
        )}

        {bars.map(({ project, left, width }) => {
          const type = project.projectType as ProjectType;
          const barColor = TYPE_BAR_COLOR[type] ?? 'bg-zinc-500/70 border-zinc-500';

          return (
            <div key={project.id} className="flex items-center gap-3">
              {/* Label */}
              <div className="w-32 flex-shrink-0 text-right">
                <p className="text-[11px] font-medium text-zinc-300 truncate" title={project.clientName}>{project.clientName}</p>
                <p className="text-[9px] text-zinc-400">{type}</p>
              </div>

              {/* Bar track */}
              <div className="flex-1 relative h-7">
                <div
                  className={`absolute h-full rounded-lg border ${barColor} flex items-center px-2 overflow-hidden transition-all`}
                  style={{ left: `${left}%`, width: `${width}%`, minWidth: '20px' }}
                  title={`${project.clientName} — ${project.phase}`}
                >
                  <span className="text-[9px] font-semibold text-white/90 truncate whitespace-nowrap">
                    {width > 8 ? project.phase : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 pb-3 border-t border-zinc-800/60 pt-3 flex flex-wrap gap-3">
        {(['Web', 'Branding', 'IA', 'Marketing'] as ProjectType[]).map(type => {
          const meta = TYPE_META[type];
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${TYPE_BAR_COLOR[type].split(' ')[0]}`} />
              <span className={`text-[10px] ${meta.color}`}>{type}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-2.5 h-2.5 border-l-2 border-fuchsia-500" />
          <span className="text-[10px] text-fuchsia-400">Aujourd'hui</span>
        </div>
      </div>
    </div>
  );
}
