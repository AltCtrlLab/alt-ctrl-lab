'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Euro, Clock, FolderKanban, TrendingUp, LayoutGrid, GitBranch, Plus } from 'lucide-react';
import type { Project, ProjectType, ProjectPhase, ProjectStatus } from '@/lib/db/schema_projects';
import { useNotifications } from '@/providers/NotificationProvider';
import { StatsBar } from '@/components/ui/StatsBar';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { ProjetsGrid } from '@/components/projets/ProjetsGrid';
import { ProjectsTimeline } from '@/components/projets/ProjectsTimeline';
import { ProjectFormModal } from '@/components/projets/ProjectFormModal';
import { ProjectDetailModal } from '@/components/projets/ProjectDetailModal';

interface ProjetsStats {
  revenueEnCours: number;
  heuresTotales: number;
  projetsActifs: number;
  margeEstimee: number | null;
}

export default function ProjetsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjetsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ProjectType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | ''>('Actif');
  const [filterPhase, setFilterPhase] = useState<ProjectPhase | ''>('');
  const [filterDate, setFilterDate] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { push } = useNotifications();

  const fetchAll = useCallback(async () => {
    try {
      const [projRes, statsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/projects?stats=true'),
      ]);
      const projData = await projRes.json();
      const statsData = await statsRes.json();
      if (projData.success) setProjects(projData.data.projects);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      push('error', 'Erreur chargement projets', err instanceof Error ? err.message : 'Erreur reseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchAll();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handlePhaseChange = useCallback(async (projectId: string, phase: ProjectPhase) => {
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, phase } : p));
    try {
      await fetch(`/api/projects?id=${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase }),
      });
    } catch {
      fetchAll();
    }
  }, [fetchAll]);

  const handleCreated = useCallback(() => {
    setCreateOpen(false);
    fetchAll();
  }, [fetchAll]);

  const handleDeleted = useCallback(() => {
    setSelectedProject(null);
    fetchAll();
  }, [fetchAll]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (filterType && p.projectType !== filterType) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterPhase && p.phase !== filterPhase) return false;
      if (filterDate) {
        const now = Date.now();
        const created = new Date(p.createdAt).getTime();
        if (filterDate === '7d' && now - created > 7 * 86400000) return false;
        if (filterDate === '30d' && now - created > 30 * 86400000) return false;
        if (filterDate === 'month') {
          const d = new Date();
          const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
          if (created < start) return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        return p.clientName.toLowerCase().includes(q) || (p.notes ?? '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [projects, filterType, filterStatus, filterPhase, filterDate, search]);

  // Sync selectedProject with updated data
  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
    }
  }, [projects]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Top bar */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-zinc-200">Projets Actifs</h1>
            <p className="text-[11px] text-zinc-400">Suivi de production, phases & time log</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-400">Sync auto 30s</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5">
        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <StatsBar loading={!stats} items={stats ? [
            { label: 'Revenus en cours', value: stats.revenueEnCours, suffix: ' €', icon: Euro, color: 'text-fuchsia-400', sub: 'Projets actifs' },
            { label: 'Heures loguées', value: stats.heuresTotales, suffix: 'h', icon: Clock, color: 'text-cyan-400', decimals: 1, sub: 'Projets actifs' },
            { label: 'Projets actifs', value: stats.projetsActifs, icon: FolderKanban, color: 'text-cyan-400' },
            { label: 'Marge estimée', value: stats.margeEstimee !== null ? stats.margeEstimee : '—' as string, suffix: stats.margeEstimee !== null ? '%' : undefined, icon: TrendingUp, color: 'text-emerald-400', sub: 'Heures restantes' },
          ] : []} columns={4} />
        </motion.div>

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <PageToolbar
            search={{ value: search, onChange: setSearch, placeholder: 'Chercher un projet...' }}
            filters={[
              { type: 'select', value: filterType, onChange: v => setFilterType(v as ProjectType | ''), placeholder: 'Tous les types', options: ['Web', 'Branding', 'IA', 'Marketing'] },
              { type: 'select', value: filterStatus, onChange: v => setFilterStatus(v as ProjectStatus | ''), placeholder: 'Tous les statuts', options: ['Actif', 'En pause', 'Terminé', 'Annulé'] },
              { type: 'select', value: filterPhase, onChange: v => setFilterPhase(v as ProjectPhase | ''), placeholder: 'Toutes les phases', options: ['Discovery', 'Design', 'Développement', 'Testing', 'Livraison'] },
              { type: 'select', value: filterDate, onChange: setFilterDate, placeholder: 'Toutes dates', options: [{ value: '7d', label: '7 derniers jours' }, { value: '30d', label: '30 derniers jours' }, { value: 'month', label: 'Ce mois' }] },
            ]}
            count={{ value: filteredProjects.length, label: filteredProjects.length !== 1 ? 'projets' : 'projet' }}
            viewToggle={{
              current: viewMode,
              onChange: v => setViewMode(v as 'cards' | 'timeline'),
              options: [
                { key: 'cards', label: 'Cartes', icon: LayoutGrid },
                { key: 'timeline', label: 'Timeline', icon: GitBranch },
              ],
            }}
            createButton={{ label: 'Nouveau projet', icon: Plus, onClick: () => setCreateOpen(true) }}
          />
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <AnimatePresence mode="wait">
              {viewMode === 'cards' ? (
                <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ProjetsGrid projects={filteredProjects} onCardClick={setSelectedProject} />
                </motion.div>
              ) : (
                <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ProjectsTimeline projects={filteredProjects} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {createOpen && (
          <ProjectFormModal
            key="create-modal"
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
        )}
        {selectedProject && (
          <ProjectDetailModal
            key="detail-modal"
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onPhaseChange={handlePhaseChange}
            onUpdated={fetchAll}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
