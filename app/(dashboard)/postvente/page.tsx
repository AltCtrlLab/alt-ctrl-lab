'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HeartHandshake, ClipboardList, Star, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import type { Followup } from '@/lib/db/schema_postvente';
import { useNotifications } from '@/providers/NotificationProvider';
import { StatsBar } from '@/components/ui/StatsBar';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { FollowupList } from '@/components/postvente/FollowupList';
import { FollowupFormModal } from '@/components/postvente/FollowupFormModal';
import { FollowupDetailModal } from '@/components/postvente/FollowupDetailModal';
import { EmptyState } from '@/components/ui/EmptyState';

interface PostVenteStats {
  aFaire: number;
  scoreNpsMoyen: number | null;
  overdueCount: number;
  upsellsIdentifies: number;
}

export default function PostVentePage() {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [stats, setStats] = useState<PostVenteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('À faire');
  const [filterType, setFilterType] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Followup | null>(null);
  const { push } = useNotifications();

  const fetchAll = useCallback(async () => {
    try {
      const [fRes, sRes] = await Promise.all([
        fetch('/api/followups'),
        fetch('/api/followups?stats=true'),
      ]);
      const fData = await fRes.json();
      const sData = await sRes.json();
      if (fData.success) setFollowups(fData.data.followups);
      if (sData.success) setStats(sData.data);
    } catch (err) {
      push('error', 'Erreur chargement post-vente', err instanceof Error ? err.message : 'Erreur reseau');
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

  const filtered = followups.filter(f =>
    (!filterStatus || f.status === filterStatus) &&
    (!filterType || f.type === filterType)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <HeartHandshake className="w-5 h-5 text-cyan-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Post-Vente & Rétention</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <StatsBar loading={!stats} items={stats ? [
          { label: 'À faire', value: stats.aFaire, icon: ClipboardList, color: 'text-cyan-400' },
          { label: 'NPS moyen', value: stats.scoreNpsMoyen != null ? `${stats.scoreNpsMoyen}/10` : '—', icon: Star, color: 'text-fuchsia-400' },
          { label: 'En retard', value: stats.overdueCount, icon: AlertTriangle, color: stats.overdueCount > 0 ? 'text-rose-400' : 'text-zinc-500', alert: true },
          { label: 'Upsells', value: stats.upsellsIdentifies, icon: TrendingUp, color: 'text-emerald-400' },
        ] : []} columns={4} className="mb-6" />
        <PageToolbar
          filters={[
            { type: 'pill', value: filterStatus, onChange: setFilterStatus, options: ['À faire', 'Fait', 'Annulé'], allLabel: 'Tous' },
            { type: 'pill', value: filterType, onChange: setFilterType, options: ['Check-in', 'Upsell', 'NPS', 'Support', 'Renouvellement'], allLabel: 'Tous types' },
          ]}
          createButton={{ label: 'Nouveau suivi', icon: Plus, onClick: () => setCreateOpen(true), color: 'bg-cyan-700 hover:bg-cyan-600' }}
          className="mb-4"
        />
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={HeartHandshake} color="cyan" message="Aucun suivi post-vente" submessage="Planifiez un suivi pour fidéliser vos clients" ctaLabel="Planifier un suivi" onAction={() => setCreateOpen(true)} />
        ) : (
          <FollowupList followups={filtered} onSelect={setSelected} />
        )}
      </main>

      <AnimatePresence>
        {createOpen && <FollowupFormModal onClose={() => setCreateOpen(false)} onCreated={fetchAll} />}
        {selected && <FollowupDetailModal followup={selected} onClose={() => setSelected(null)} onUpdated={fetchAll} />}
      </AnimatePresence>
    </div>
  );
}
