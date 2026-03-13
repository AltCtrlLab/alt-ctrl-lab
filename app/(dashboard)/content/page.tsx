'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import type { ContentItem, ContentStatus } from '@/lib/db/schema_content';
import { ContentStatsBar } from '@/components/content/ContentStatsBar';
import { ContentToolbar } from '@/components/content/ContentToolbar';
import { ContentKanban } from '@/components/content/ContentKanban';
import { ContentCalendar } from '@/components/content/ContentCalendar';
import { ContentFormModal } from '@/components/content/ContentFormModal';
import { ContentDetailModal } from '@/components/content/ContentDetailModal';
import { BatchGeneratorModal } from '@/components/content/BatchGeneratorModal';
import { Sparkles } from 'lucide-react';

interface ContentStats {
  totalPublie: number;
  totalPlanifie: number;
  totalIdees: number;
  tauxPublication: number;
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'calendar'>('kanban');
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [selected, setSelected] = useState<ContentItem | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        fetch('/api/content'),
        fetch('/api/content?stats=true'),
      ]);
      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();
      if (itemsData.success) setItems(itemsData.data.items);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      console.error('Erreur chargement content:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleStatusChange = useCallback(async (id: string, status: ContentStatus) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    await fetch(`/api/content?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/50 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-pink-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Content Calendar</h1>
          <div className="ml-auto">
            <button
              onClick={() => setBatchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 rounded-lg text-xs font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Batch AI
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <ContentStatsBar stats={stats} />
        <ContentToolbar view={view} onViewChange={setView} onCreate={() => setCreateOpen(true)} />

        {loading ? (
          <div className="text-center py-12 text-zinc-500 text-sm">Chargement...</div>
        ) : view === 'kanban' ? (
          <ContentKanban items={items} onSelect={setSelected} onStatusChange={handleStatusChange} />
        ) : (
          <ContentCalendar items={items} onSelect={setSelected} />
        )}
      </main>

      <AnimatePresence>
        {createOpen && <ContentFormModal onClose={() => setCreateOpen(false)} onCreated={fetchAll} />}
        {selected && <ContentDetailModal item={selected} onClose={() => setSelected(null)} onUpdated={fetchAll} />}
        {batchOpen && (
          <BatchGeneratorModal
            onClose={() => setBatchOpen(false)}
            onSuccess={(count) => { fetchAll(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
