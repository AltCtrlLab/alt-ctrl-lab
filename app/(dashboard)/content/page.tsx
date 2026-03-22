'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarDays, Sparkles, CheckCircle2 } from 'lucide-react';
import type { ContentItem, ContentStatus } from '@/lib/db/schema_content';
import { useNotifications } from '@/providers/NotificationProvider';
import { ContentStatsBar } from '@/components/content/ContentStatsBar';
import { ContentToolbar } from '@/components/content/ContentToolbar';
import { ContentKanban } from '@/components/content/ContentKanban';
import { ContentCalendar } from '@/components/content/ContentCalendar';
import { ContentFormModal } from '@/components/content/ContentFormModal';
import { ContentDetailModal } from '@/components/content/ContentDetailModal';
import { BatchGeneratorModal } from '@/components/content/BatchGeneratorModal';

interface ContentStats {
  totalPublie: number;
  totalPlanifie: number;
  totalIdees: number;
  tauxPublication: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  'Idée': { label: 'Idee', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  'Brouillon': { label: 'Brouillon', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  'Planifié': { label: 'Planifie', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  'Publié': { label: 'Publie', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'calendar' | 'list'>('kanban');
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ContentStatus | ''>('');
  const { push } = useNotifications();

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
      push('error', 'Erreur chargement content', err instanceof Error ? err.message : 'Erreur reseau');
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

  const handleToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === items.length ? new Set() : new Set(items.map(i => i.id))
    );
  }, [items]);

  const handleBulkStatus = useCallback(async (newStatus: ContentStatus) => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id =>
      fetch(`/api/content?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    ));
    setSelectedIds(new Set());
    setBulkStatus('');
    fetchAll();
  }, [selectedIds, fetchAll]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-fuchsia-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Content Calendar</h1>
          <div className="ml-auto">
            <button
              onClick={() => setBatchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg text-xs font-medium transition-colors"
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
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
          </div>
        ) : view === 'kanban' ? (
          <ContentKanban items={items} onSelect={setSelected} onStatusChange={handleStatusChange} />
        ) : view === 'calendar' ? (
          <ContentCalendar items={items} onSelect={setSelected} />
        ) : (
          /* List view with bulk selection */
          <div>
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={items.length > 0 && selectedIds.size === items.length}
                        onChange={handleToggleAll}
                        className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-fuchsia-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold">Titre</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold">Plateforme</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold">Statut</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {items.map((item) => {
                    const isChecked = selectedIds.has(item.id);
                    const meta = STATUS_LABELS[item.status] || STATUS_LABELS['Idée'];
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-zinc-800/30 transition-colors ${isChecked ? 'bg-fuchsia-500/5' : ''}`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggle(item.id)}
                            className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 accent-fuchsia-500 cursor-pointer"
                          />
                        </td>
                        <td
                          className="px-4 py-3 cursor-pointer"
                          onClick={() => setSelected(item)}
                        >
                          <p className="text-zinc-200 font-medium truncate max-w-xs">{item.title}</p>
                          {item.description && <p className="text-[11px] text-zinc-600 truncate max-w-xs">{item.description.slice(0, 60)}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{item.platform || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {items.length === 0 && (
                <div className="text-center py-12 text-zinc-600 text-sm">Aucun contenu</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bulk toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-900/95 border border-fuchsia-500/30 shadow-2xl backdrop-blur-xl">
          <span className="text-sm text-zinc-300 font-medium">{selectedIds.size} selectionne{selectedIds.size > 1 ? 's' : ''}</span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value as ContentStatus | '')}
            className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-300"
          >
            <option value="">Changer statut...</option>
            {['Idée', 'Brouillon', 'Planifié', 'Publié'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => bulkStatus && handleBulkStatus(bulkStatus as ContentStatus)}
            disabled={!bulkStatus}
            className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Appliquer
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      <AnimatePresence>
        {createOpen && <ContentFormModal onClose={() => setCreateOpen(false)} onCreated={fetchAll} />}
        {selected && <ContentDetailModal item={selected} onClose={() => setSelected(null)} onUpdated={fetchAll} />}
        {batchOpen && (
          <BatchGeneratorModal
            onClose={() => setBatchOpen(false)}
            onSuccess={() => { fetchAll(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
