'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  TrendingUp, CheckCircle2, Activity, Beaker, Play, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MorningBriefingWidget = dynamic(() => import('@/components/dashboard/MorningBriefing').then(m => ({ default: m.MorningBriefing })), { ssr: false });
const RevenueIntelligenceWidget = dynamic(() => import('@/components/dashboard/RevenueIntelligence').then(m => ({ default: m.RevenueIntelligence })), { ssr: false });
const RecommendedActionsWidget = dynamic(() => import('@/components/dashboard/RecommendedActions').then(m => ({ default: m.RecommendedActions })), { ssr: false });
const AIMonitoringWidget = dynamic(() => import('@/components/dashboard/AIMonitoringWidget').then(m => ({ default: m.AIMonitoringWidget })), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardStats {
  activeTasks: number;
  completedToday: number;
  failedToday: number;
  pendingInnovations: number;
  totalDiscoveries: number;
  successRate: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// ─── Animation variants ──────────────────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const statCardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 20, stiffness: 300 },
  },
};

const staticVariants = {
  hidden: {},
  visible: {},
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, href }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const content = (
    <motion.div
      variants={statCardVariants}
      className="group flex items-center gap-4 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200"
    >
      <div className={`flex-shrink-0 p-2.5 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
      </div>
      {href && <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 ml-auto transition-colors" />}
    </motion.div>
  );

  if (href) return <Link href={href as any}>{content}</Link>;
  return content;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const prefersReduced = useReducedMotion();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [tasksR, rdR] = await Promise.all([
        fetch('/api/agents?action=list_tasks'),
        fetch('/api/rd?action=overview'),
      ]);
      const tasksData = await tasksR.json().catch(() => null);
      const rdData = await rdR.json().catch(() => null);

      if (tasksData?.success) {
        const tasks = tasksData.data || [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const active = tasks.filter((t: any) => !['COMPLETED', 'FAILED', 'FAILED_QA'].includes(t.status)).length;
        const completedToday = tasks.filter((t: any) =>
          t.status === 'COMPLETED' && new Date(t.updatedAt) >= todayStart
        ).length;
        const failedToday = tasks.filter((t: any) =>
          ['FAILED', 'FAILED_QA'].includes(t.status) && new Date(t.updatedAt) >= todayStart
        ).length;

        const totalDone = tasks.filter((t: any) => t.status === 'COMPLETED').length;
        const totalFailed = tasks.filter((t: any) => ['FAILED', 'FAILED_QA'].includes(t.status)).length;
        const successRate = (totalDone + totalFailed) > 0
          ? Math.round((totalDone / (totalDone + totalFailed)) * 100)
          : 0;

        setStats(s => ({
          ...s!,
          activeTasks: active,
          completedToday,
          failedToday,
          successRate,
          pendingInnovations: rdData?.data?.stats?.totalInnovations || s?.pendingInnovations || 0,
          totalDiscoveries: rdData?.data?.stats?.totalDiscoveries || s?.totalDiscoveries || 0,
        }));
      }

      if (rdData?.success) {
        setStats(s => ({
          activeTasks: s?.activeTasks || 0,
          completedToday: s?.completedToday || 0,
          failedToday: s?.failedToday || 0,
          successRate: s?.successRate || 0,
          pendingInnovations: rdData.data?.stats?.totalInnovations || 0,
          totalDiscoveries: rdData.data?.stats?.totalDiscoveries || 0,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <motion.div
        variants={prefersReduced ? staticVariants : pageVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6"
      >

        {/* ── Greeting compact ── */}
        <motion.div
          variants={sectionVariants}
          className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-0"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">
              {getGreeting()} 👋
            </h1>
            <p className="mt-1 text-zinc-400 text-sm">
              Voici l&apos;état de votre agence ce {new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Link href="/pil" className="flex items-center justify-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium rounded-lg transition-colors w-full md:w-auto">
              <Play className="w-3.5 h-3.5" />
              Lancer un brief
            </Link>
          </div>
        </motion.div>

        {/* ── KPI cards ── */}
        <motion.div variants={sectionVariants} className="overflow-x-auto snap-x snap-mandatory md:overflow-visible md:snap-none scrollbar-hide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[540px] md:min-w-0">
            <div className="snap-center">
              <StatCard
                label="Briefs actifs"
                value={stats?.activeTasks ?? '—'}
                icon={Activity}
                color="bg-fuchsia-500/10 text-fuchsia-400"
                href="/pil"
              />
            </div>
            <div className="snap-center">
              <StatCard
                label="Complétées aujourd'hui"
                value={stats?.completedToday ?? '—'}
                icon={CheckCircle2}
                color="bg-emerald-500/20 text-emerald-400"
                href="/history"
              />
            </div>
            <div className="snap-center">
              <StatCard
                label="Innovations R&D"
                value={stats?.pendingInnovations ?? '—'}
                sub="En attente de décision"
                icon={Beaker}
                color="bg-zinc-800 text-zinc-300"
                href="/rd"
              />
            </div>
            <div className="snap-center">
              <StatCard
                label="Taux de succès"
                value={stats ? `${stats.successRate}%` : '—'}
                sub="Sur tous les briefs"
                icon={TrendingUp}
                color="bg-cyan-500/10 text-cyan-400"
              />
            </div>
          </div>
        </motion.div>

        {/* ── Revenue Intelligence ── */}
        <motion.div variants={sectionVariants}>
          <RevenueIntelligenceWidget />
        </motion.div>

        {/* ── Actions par thème (full-width) ── */}
        <motion.div variants={sectionVariants}>
          <RecommendedActionsWidget />
        </motion.div>

        {/* ── Morning Briefing + AI Monitoring ── */}
        <motion.div variants={sectionVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MorningBriefingWidget />
          <AIMonitoringWidget />
        </motion.div>

      </motion.div>
    </div>
  );
}
