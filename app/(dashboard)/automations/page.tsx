'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Workflow } from 'lucide-react';
import type { Automation } from '@/lib/db/schema_automations';
import { AutomationsStatsBar } from '@/components/automations/AutomationsStatsBar';
import { AutomationsToolbar } from '@/components/automations/AutomationsToolbar';
import { AutomationsGrid } from '@/components/automations/AutomationsGrid';
import { AutomationFormModal } from '@/components/automations/AutomationFormModal';
import { AutomationDetailModal } from '@/components/automations/AutomationDetailModal';
import { N8nLivePanel } from '@/components/automations/N8nLivePanel';

interface AutomationsStats {
  totalActif: number;
  tauxSucces: number;
  execsMois: number;
  enErreur: number;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [stats, setStats] = useState<AutomationsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Automation | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [autRes, statsRes] = await Promise.all([
        fetch('/api/automations'),
        fetch('/api/automations?stats=true'),
      ]);
      const autData = await autRes.json();
      const statsData = await statsRes.json();
      if (autData.success) setAutomations(autData.data.automations);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      console.error('Erreur chargement automations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const filtered = automations.filter(a => !filterStatus || a.status === filterStatus);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Workflow className="w-5 h-5 text-fuchsia-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Automations</h1>
          <span className="text-xs text-zinc-600">Abdul Hasib</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <AutomationsStatsBar stats={stats} />
        <N8nLivePanel />
        <AutomationsToolbar filterStatus={filterStatus} onFilterStatus={setFilterStatus} onCreate={() => setCreateOpen(true)} />
        {loading ? (
          <div className="text-center py-12 text-zinc-500 text-sm">Chargement...</div>
        ) : (
          <AutomationsGrid automations={filtered} onSelect={setSelected} />
        )}
      </main>

      <AnimatePresence>
        {createOpen && <AutomationFormModal onClose={() => setCreateOpen(false)} onCreated={fetchAll} />}
        {selected && <AutomationDetailModal automation={selected} onClose={() => setSelected(null)} onUpdated={fetchAll} />}
      </AnimatePresence>
    </div>
  );
}
