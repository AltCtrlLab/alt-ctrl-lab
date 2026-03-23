'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead, LeadStatus, LeadSource } from '@/lib/db/schema_leads';
import { Users, TrendingUp, Euro, Clock, AlertTriangle, LayoutGrid, Table2, Plus } from 'lucide-react';
import { exportCSV } from '@/lib/utils';
import { useNotifications } from '@/providers/NotificationProvider';
import { StatsBar } from '@/components/ui/StatsBar';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { LeadsKanban } from '@/components/leads/LeadsKanban';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { LeadFormModal } from '@/components/leads/LeadFormModal';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';

interface LeadsStats {
  totalLeads: number;
  tauxConversion: number;
  panierMoyen: number;
  delaiMoyenJours: number;
  overdueRelances: number;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<LeadStatus | ''>('');
  const [filterSource, setFilterSource] = useState<LeadSource | ''>('');
  const [filterDate, setFilterDate] = useState('');
  const [filterScore, setFilterScore] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<LeadStatus | ''>('');
  const { push } = useNotifications();

  const fetchAll = useCallback(async () => {
    try {
      const [leadsRes, statsRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/leads?stats=true'),
      ]);
      const leadsData = await leadsRes.json();
      const statsData = await statsRes.json();
      if (leadsData.success) setLeads(leadsData.data.leads);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      push('error', 'Erreur chargement leads', err instanceof Error ? err.message : 'Erreur reseau');
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

  const handleStatusChange = useCallback(async (leadId: string, newStatus: LeadStatus) => {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    try {
      await fetch(`/api/leads?id=${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      fetchAll(); // rollback
    }
  }, [fetchAll]);

  const handleCreated = useCallback(() => {
    setCreateOpen(false);
    fetchAll();
  }, [fetchAll]);

  const handleDeleted = useCallback(() => {
    setSelectedLead(null);
    fetchAll();
  }, [fetchAll]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Hide archived leads unless explicitly filtered
      if (!filterStatus && l.status === 'Archivé') return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterSource && l.source !== filterSource) return false;
      if (filterDate) {
        const now = Date.now();
        const created = new Date(l.createdAt).getTime();
        if (filterDate === '7d' && now - created > 7 * 86400000) return false;
        if (filterDate === '30d' && now - created > 30 * 86400000) return false;
        if (filterDate === 'month') {
          const d = new Date();
          const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
          if (created < start) return false;
        }
      }
      if (filterScore) {
        const min = parseInt(filterScore, 10);
        if ((l.score ?? 0) <= min) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          (l.company ?? '').toLowerCase().includes(q) ||
          (l.email ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, filterStatus, filterSource, filterDate, filterScore, search]);

  const handleToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === filteredLeads.length
        ? new Set()
        : new Set(filteredLeads.map(l => l.id))
    );
  }, [filteredLeads]);

  const handleBulkStatus = useCallback(async (newStatus: LeadStatus) => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id =>
      fetch(`/api/leads?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    ));
    setSelectedIds(new Set());
    setBulkStatus('');
    fetchAll();
  }, [selectedIds, fetchAll]);

  const handleExport = useCallback(() => {
    const data = filteredLeads.map(l => ({
      Nom: l.name,
      Entreprise: l.company ?? '',
      Email: l.email ?? '',
      Telephone: l.phone ?? '',
      Statut: l.status,
      Source: l.source ?? '',
      Score: l.score ?? 0,
      Budget: l.budget ?? '',
      Date: new Date(l.createdAt).toLocaleDateString('fr-FR'),
    }));
    exportCSV(data, `leads-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [filteredLeads]);

  // Sync selectedLead with updated data
  useEffect(() => {
    if (selectedLead) {
      const updated = leads.find(l => l.id === selectedLead.id);
      if (updated) setSelectedLead(updated);
    }
  }, [leads]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Top bar */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.08]">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-zinc-200">Leads Pipeline</h1>
            <p className="text-[11px] text-zinc-400">Playbook Commercial — Lead → Client</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-400">Sync auto 30s</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <StatsBar loading={!stats} items={stats ? [
            { label: 'Total leads', value: stats.totalLeads, icon: Users, color: 'text-fuchsia-400' },
            { label: 'Taux de conversion', value: stats.tauxConversion, suffix: '%', icon: TrendingUp, color: 'text-emerald-400', sub: 'Leads → Signés' },
            { label: 'Panier moyen', value: stats.panierMoyen, suffix: ' €', icon: Euro, color: 'text-zinc-400', sub: 'Sur leads signés' },
            { label: 'Délai moyen', value: stats.delaiMoyenJours, suffix: 'j', icon: Clock, color: 'text-amber-400', sub: 'Lead → Signé' },
            { label: 'Relances en retard', value: stats.overdueRelances, icon: AlertTriangle, color: 'text-rose-400', alert: true },
          ] : []} columns={5} />
        </motion.div>

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <PageToolbar
            search={{ value: search, onChange: setSearch, placeholder: 'Chercher un lead...' }}
            filters={[
              { type: 'select', value: filterStatus, onChange: v => setFilterStatus(v as LeadStatus | ''), placeholder: 'Tous les statuts', options: ['Nouveau', 'Qualifié', 'À creuser', 'Discovery fait', 'Proposition envoyée', 'Relance 1', 'Relance 2', 'Signé', 'Perdu', 'Archivé'] },
              { type: 'select', value: filterSource, onChange: v => setFilterSource(v as LeadSource | ''), placeholder: 'Toutes les sources', options: ['LinkedIn', 'Email', 'Instagram', 'GMB', 'Referral', 'Site'] },
              { type: 'select', value: filterDate, onChange: setFilterDate, placeholder: 'Toutes dates', options: [{ value: '7d', label: '7 derniers jours' }, { value: '30d', label: '30 derniers jours' }, { value: 'month', label: 'Ce mois' }] },
              { type: 'select', value: filterScore, onChange: setFilterScore, placeholder: 'Tous scores', options: [{ value: '5', label: 'Score > 5' }, { value: '7', label: 'Score > 7' }] },
            ]}
            count={{ value: filteredLeads.length, label: filteredLeads.length !== 1 ? 'leads' : 'lead' }}
            onExport={handleExport}
            viewToggle={{
              current: viewMode,
              onChange: v => setViewMode(v as 'kanban' | 'table'),
              options: [
                { key: 'kanban', label: 'Kanban', icon: LayoutGrid },
                { key: 'table', label: 'Table', icon: Table2 },
              ],
            }}
            createButton={{ label: 'Nouveau lead', icon: Plus, onClick: () => setCreateOpen(true) }}
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
              {viewMode === 'kanban' ? (
                <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <LeadsKanban
                    leads={filteredLeads}
                    onCardClick={setSelectedLead}
                    onStatusChange={handleStatusChange}
                  />
                </motion.div>
              ) : (
                <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <LeadsTable
                    leads={filteredLeads}
                    onRowClick={setSelectedLead}
                    selectedIds={selectedIds}
                    onToggle={handleToggle}
                    onToggleAll={handleToggleAll}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Bulk toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-900/95 border border-fuchsia-500/30 shadow-2xl backdrop-blur-xl">
          <span className="text-sm text-zinc-300 font-medium">{selectedIds.size} selectionne{selectedIds.size > 1 ? 's' : ''}</span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value as LeadStatus | '')}
            className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-300"
          >
            <option value="">Changer statut...</option>
            {['Nouveau', 'Qualifié', 'À creuser', 'Discovery fait', 'Proposition envoyée', 'Relance 1', 'Relance 2', 'Signé', 'Perdu'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => bulkStatus && handleBulkStatus(bulkStatus as LeadStatus)}
            disabled={!bulkStatus}
            className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Appliquer
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {createOpen && (
          <LeadFormModal
            key="create-modal"
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
        )}
        {selectedLead && (
          <LeadDetailModal
            key="detail-modal"
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onStatusChange={handleStatusChange}
            onUpdated={fetchAll}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
