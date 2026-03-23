'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead, LeadStatus, LeadSource } from '@/lib/db/schema_leads';
import { Users, TrendingUp, Euro, Clock, AlertTriangle, LayoutGrid, Table2, Plus, Search, Download, CheckCircle2 } from 'lucide-react';
import { exportCSV } from '@/lib/utils';
import { useNotifications } from '@/providers/NotificationProvider';
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

// ─── KPI Card ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, subColor, icon: Icon, iconColor }: {
  label: string;
  value: string | number;
  sub: string;
  subColor: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <div className="bg-zinc-800/50 p-6 rounded-lg border-t border-white/5 flex flex-col justify-between">
      <div>
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">{label}</p>
        <h3 className="text-3xl font-headline font-bold text-zinc-100">{value}</h3>
      </div>
      <div className={`mt-4 flex items-center gap-2 text-sm ${subColor}`}>
        <Icon className="w-4 h-4" />
        <span>{sub}</span>
      </div>
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────

function FilterPill({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly string[] | { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-zinc-800 text-zinc-300 text-sm font-medium px-5 py-2 rounded-full border-none focus:ring-1 focus:ring-fuchsia-500/30 cursor-pointer appearance-none hover:bg-zinc-700 transition-colors"
    >
      <option value="">{placeholder}</option>
      {options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return <option key={val} value={val}>{label}</option>;
      })}
    </select>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

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
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    try {
      await fetch(`/api/leads?id=${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
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
    setSelectedLead(null);
    fetchAll();
  }, [fetchAll]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
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
      <div className="p-8 pb-32 space-y-8">

        {/* ── Hero Title & CTA ── */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-extrabold font-headline tracking-tight text-zinc-100 mb-2">
              Leads Pipeline
            </h2>
            <p className="text-zinc-400">Playbook commercial — Lead → Client</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-fuchsia-500 hover:brightness-110 text-white font-bold px-8 py-3 rounded-full flex items-center gap-2 shadow-xl shadow-fuchsia-500/10 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nouveau lead
          </button>
        </div>

        {/* ── KPI Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <KpiCard
            label="Total leads"
            value={stats?.totalLeads ?? '—'}
            icon={TrendingUp}
            iconColor="text-cyan-400"
            sub={`${filteredLeads.length} affichés`}
            subColor="text-cyan-400"
          />
          <KpiCard
            label="Taux de conversion"
            value={stats ? `${stats.tauxConversion}%` : '—'}
            icon={CheckCircle2}
            iconColor="text-emerald-400"
            sub="Leads → Signés"
            subColor="text-emerald-400"
          />
          <KpiCard
            label="Panier moyen"
            value={stats ? `${stats.panierMoyen.toLocaleString('fr-FR')}€` : '—'}
            icon={Euro}
            iconColor="text-zinc-400"
            sub="Sur leads signés"
            subColor="text-zinc-400"
          />
          <KpiCard
            label="Délai moyen"
            value={stats ? `${stats.delaiMoyenJours}j` : '—'}
            icon={Clock}
            iconColor="text-amber-400"
            sub={stats?.overdueRelances ? `${stats.overdueRelances} relances en retard` : 'Pipeline fluide'}
            subColor={stats?.overdueRelances ? 'text-rose-400' : 'text-zinc-400'}
          />
        </motion.div>

        {/* ── Filters & Controls ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap gap-3 items-center"
        >
          <span className="text-sm font-semibold text-zinc-500 mr-1">Filtres :</span>

          <FilterPill
            value={filterStatus}
            onChange={v => setFilterStatus(v as LeadStatus | '')}
            placeholder="Tous les statuts"
            options={['Nouveau', 'Qualifié', 'À creuser', 'Discovery fait', 'Proposition envoyée', 'Relance 1', 'Relance 2', 'Signé', 'Perdu', 'Archivé']}
          />
          <FilterPill
            value={filterSource}
            onChange={v => setFilterSource(v as LeadSource | '')}
            placeholder="Toutes les sources"
            options={['LinkedIn', 'Email', 'Instagram', 'GMB', 'Referral', 'Site']}
          />
          <FilterPill
            value={filterDate}
            onChange={setFilterDate}
            placeholder="Toutes dates"
            options={[{ value: '7d', label: '7 derniers jours' }, { value: '30d', label: '30 derniers jours' }, { value: 'month', label: 'Ce mois' }]}
          />
          <FilterPill
            value={filterScore}
            onChange={setFilterScore}
            placeholder="Tous scores"
            options={[{ value: '5', label: 'Score > 5' }, { value: '7', label: 'Score > 7' }]}
          />

          {/* Right side: search + view toggle + export */}
          <div className="ml-auto flex items-center gap-3">
            {/* Inline search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 pr-3 py-2 text-sm bg-zinc-800 border-none rounded-full text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/30 w-48 transition-all"
              />
            </div>

            <button
              onClick={handleExport}
              className="text-zinc-500 hover:text-zinc-300 p-2 rounded-full hover:bg-white/5 transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* View toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-full transition-colors ${viewMode === 'kanban' ? 'bg-fuchsia-500/10 text-fuchsia-400' : 'text-zinc-500 hover:bg-white/5'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-full transition-colors ${viewMode === 'table' ? 'bg-fuchsia-500/10 text-fuchsia-400' : 'text-zinc-500 hover:bg-white/5'}`}
              >
                <Table2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Content ── */}
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
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3 rounded-2xl bg-zinc-900/95 border border-fuchsia-500/30 shadow-2xl backdrop-blur-xl max-w-[90vw]">
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
