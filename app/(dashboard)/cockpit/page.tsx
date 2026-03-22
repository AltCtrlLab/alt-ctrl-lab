'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, FolderKanban, Wallet,
  PlusCircle, ArrowRight, Loader2, Users, Activity,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useNotifications } from '@/providers/NotificationProvider';

interface KpiData {
  leadsActifs: number;
  projetsEnCours: number;
  caMois: number;
  tachesAgents: number;
}

interface RecentActivity {
  id: string;
  agentName: string;
  status: string;
  prompt: string;
  createdAt: number;
}

export default function CockpitPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useNotifications();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [leadsRes, projRes, finRes, actRes] = await Promise.all([
          fetch('/api/leads?stats=true'),
          fetch('/api/projects?stats=true'),
          fetch('/api/finances?stats=true'),
          fetch('/api/agents/activity'),
        ]);
        const leads = await leadsRes.json();
        const proj = await projRes.json();
        const fin = await finRes.json();
        const act = await actRes.json();

        setKpis({
          leadsActifs: leads.data?.totalLeads ?? 0,
          projetsEnCours: proj.data?.projetsActifs ?? 0,
          caMois: fin.data?.caEncaisse ?? 0,
          tachesAgents: (act.data?.activities ?? act.activities ?? []).length,
        });

        const allActs = act.data?.activities ?? act.activities ?? [];
        setActivities(allActs.slice(0, 5));
      } catch (err) { push('error', 'Erreur chargement cockpit', err instanceof Error ? err.message : 'Erreur reseau'); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const kpiCards = kpis ? [
    { label: 'Leads actifs', value: kpis.leadsActifs, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { label: 'Projets en cours', value: kpis.projetsEnCours, icon: FolderKanban, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    { label: 'CA du mois', value: `${(kpis.caMois / 1000).toFixed(1)}k`, icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Taches agents', value: kpis.tachesAgents, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ] : [];

  const quickLinks = [
    { label: 'Nouveau Brief', href: '/brief', icon: PlusCircle, color: 'bg-cyan-600 hover:bg-cyan-500' },
    { label: 'Voir Leads', href: '/leads', icon: TrendingUp, color: 'bg-violet-600 hover:bg-violet-500' },
    { label: 'Voir Projets', href: '/projets', icon: FolderKanban, color: 'bg-emerald-600 hover:bg-emerald-500' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Cockpit</h1>
            <p className="text-xs text-zinc-500">Vue d'ensemble — AltCtrl.Lab</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-4 ${kpi.bg}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                  <span className="text-xs text-zinc-500">{kpi.label}</span>
                </div>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Activite recente */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-200">Activite recente</h2>
            </div>
            <div className="space-y-2">
              {activities.length === 0 && (
                <p className="text-sm text-zinc-600 py-8 text-center">Aucune activite recente</p>
              )}
              {activities.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/50"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    a.status === 'COMPLETED' ? 'bg-emerald-400' :
                    a.status.includes('FAIL') ? 'bg-rose-400' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{a.prompt?.slice(0, 60) || 'Tache'}</p>
                    <p className="text-[11px] text-zinc-600">{a.agentName}</p>
                  </div>
                  <span className="text-[11px] text-zinc-600 shrink-0">
                    {formatRelativeTime(new Date(a.createdAt))}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Actions rapides */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">Actions rapides</h2>
            <div className="space-y-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium transition-colors ${link.color}`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={16} />
                      {link.label}
                    </span>
                    <ArrowRight size={14} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
