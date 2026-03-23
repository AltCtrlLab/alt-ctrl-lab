'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Workflow, Zap, CheckCircle2, Activity, AlertTriangle, Plus } from 'lucide-react';
import type { Automation } from '@/lib/db/schema_automations';
import { StatsBar } from '@/components/ui/StatsBar';
import { PageToolbar } from '@/components/ui/PageToolbar';
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
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchAll();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const filtered = automations.filter(a => !filterStatus || a.status === filterStatus);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Workflow className="w-5 h-5 text-fuchsia-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Automations</h1>
          <span className="text-xs text-zinc-400">Abdul Hasib</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <StatsBar loading={!stats} items={stats ? [
          { label: 'Actives', value: stats.totalActif, icon: Zap, color: 'text-emerald-400' },
          { label: 'Taux succès', value: stats.tauxSucces, suffix: '%', icon: CheckCircle2, color: 'text-cyan-400' },
          { label: 'Exécutions', value: stats.execsMois, icon: Activity, color: 'text-fuchsia-400' },
          { label: 'En erreur', value: stats.enErreur, icon: AlertTriangle, color: stats.enErreur > 0 ? 'text-rose-400' : 'text-zinc-400', alert: true },
        ] : []} columns={4} className="mb-6" />
        <N8nLivePanel />
        <PageToolbar
          filters={[
            { type: 'pill', value: filterStatus, onChange: setFilterStatus, options: ['Actif', 'Inactif', 'Erreur'], allLabel: 'Tous' },
          ]}
          createButton={{ label: 'Nouvelle automation', icon: Plus, onClick: () => setCreateOpen(true) }}
          className="mb-4"
        />
        {loading ? (
          <div className="text-center py-12 text-zinc-400 text-sm">Chargement...</div>
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
