'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead, LeadStatus, LeadSource } from '@/lib/db/schema_leads';
import { LeadsStatsBar } from '@/components/leads/LeadsStatsBar';
import { LeadsToolbar } from '@/components/leads/LeadsToolbar';
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
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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
      console.error('Erreur chargement leads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
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
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterSource && l.source !== filterSource) return false;
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
  }, [leads, filterStatus, filterSource, search]);

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
      <div className="border-b border-white/[0.06] bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-zinc-200">Leads Pipeline</h1>
            <p className="text-[11px] text-zinc-600">Playbook Commercial — Lead → Client</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-500">Sync auto 30s</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <LeadsStatsBar stats={stats} />
        </motion.div>

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <LeadsToolbar
            viewMode={viewMode}
            onViewChange={setViewMode}
            search={search}
            onSearchChange={setSearch}
            filterStatus={filterStatus}
            onFilterStatus={setFilterStatus}
            filterSource={filterSource}
            onFilterSource={setFilterSource}
            onNewLead={() => setCreateOpen(true)}
            totalLeads={filteredLeads.length}
          />
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
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
                  <LeadsTable leads={filteredLeads} onRowClick={setSelectedLead} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

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
