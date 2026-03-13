'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import type { PortfolioItem } from '@/lib/db/schema_portfolio';
import { PortfolioStatsBar } from '@/components/portfolio/PortfolioStatsBar';
import { PortfolioToolbar } from '@/components/portfolio/PortfolioToolbar';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { PortfolioFormModal } from '@/components/portfolio/PortfolioFormModal';
import { PortfolioDetailModal } from '@/components/portfolio/PortfolioDetailModal';

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
      console.error('Erreur chargement portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
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
        <PortfolioStatsBar stats={stats} />
        <PortfolioToolbar filterType={filterType} onFilterType={setFilterType} onCreate={() => setCreateOpen(true)} />
        {loading ? (
          <div className="text-center py-12 text-zinc-500 text-sm">Chargement...</div>
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
