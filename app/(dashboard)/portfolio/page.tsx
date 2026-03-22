'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Briefcase, Globe, LayoutGrid, Star, Plus } from 'lucide-react';
import type { PortfolioItem } from '@/lib/db/schema_portfolio';
import { useNotifications } from '@/providers/NotificationProvider';
import { StatsBar } from '@/components/ui/StatsBar';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { PortfolioFormModal } from '@/components/portfolio/PortfolioFormModal';
import { PortfolioDetailModal } from '@/components/portfolio/PortfolioDetailModal';
import { EmptyState } from '@/components/ui/EmptyState';

interface PortfolioStats {
  totalPublie: number;
  parType: Record<string, number>;
  featured: number;
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<PortfolioItem | null>(null);
  const { push } = useNotifications();

  const fetchAll = useCallback(async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        fetch('/api/portfolio'),
        fetch('/api/portfolio?stats=true'),
      ]);
      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();
      if (itemsData.success) setItems(itemsData.data.items);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      push('error', 'Erreur chargement portfolio', err instanceof Error ? err.message : 'Erreur reseau');
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

  const filtered = items.filter(i => !filterType || i.projectType === filterType);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/50 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-amber-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Portfolio & Case Studies</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <StatsBar loading={!stats} items={stats ? [
          { label: 'Publiés', value: stats.totalPublie, icon: Globe, color: 'text-amber-400' },
          { label: 'Par type', value: Object.entries(stats.parType).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—', icon: LayoutGrid, color: 'text-cyan-400' },
          { label: 'Featured', value: stats.featured, icon: Star, color: 'text-yellow-400' },
        ] : []} columns={3} className="mb-6" />
        <PageToolbar
          filters={[
            { type: 'pill', value: filterType, onChange: setFilterType, options: ['Web', 'Branding', 'IA', 'Marketing'], allLabel: 'Tous' },
          ]}
          createButton={{ label: 'Ajouter', icon: Plus, onClick: () => setCreateOpen(true), color: 'bg-amber-600 hover:bg-amber-500' }}
          className="mb-4"
        />
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Briefcase} color="amber" message="Aucun projet dans le portfolio" submessage="Ajoutez vos realisations pour les mettre en avant" ctaLabel="Ajouter un projet" onAction={() => setCreateOpen(true)} />
        ) : (
          <PortfolioGrid items={filtered} onSelect={setSelected} />
        )}
      </main>

      <AnimatePresence>
        {createOpen && <PortfolioFormModal onClose={() => setCreateOpen(false)} onCreated={fetchAll} />}
        {selected && <PortfolioDetailModal item={selected} onClose={() => setSelected(null)} onUpdated={fetchAll} />}
      </AnimatePresence>
    </div>
  );
}
