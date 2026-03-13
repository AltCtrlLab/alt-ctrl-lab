'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HeartHandshake } from 'lucide-react';
import type { Followup } from '@/lib/db/schema_postvente';
import { PostVenteStatsBar } from '@/components/postvente/PostVenteStatsBar';
import { PostVenteToolbar } from '@/components/postvente/PostVenteToolbar';
import { FollowupList } from '@/components/postvente/FollowupList';
import { FollowupFormModal } from '@/components/postvente/FollowupFormModal';
import { FollowupDetailModal } from '@/components/postvente/FollowupDetailModal';

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
      console.error('Erreur chargement post-vente:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const filtered = followups.filter(f =>
    (!filterStatus || f.status === filterStatus) &&
    (!filterType || f.type === filterType)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/50 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <HeartHandshake className="w-5 h-5 text-cyan-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Post-Vente & Rétention</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <PostVenteStatsBar stats={stats} />
        <PostVenteToolbar
          filterStatus={filterStatus}
          onFilterStatus={setFilterStatus}
          filterType={filterType}
          onFilterType={setFilterType}
          onCreate={() => setCreateOpen(true)}
        />
        {loading ? (
          <div className="text-center py-12 text-zinc-500 text-sm">Chargement...</div>
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
