'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  RefreshCw, ExternalLink, TrendingUp, CheckCircle2, Clock, Zap,
  Beaker, AlertCircle, ArrowRight, Newspaper, Activity, BarChart3,
  Play, Wifi, WifiOff, Globe, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MorningBriefingWidget = dynamic(() => import('@/components/dashboard/MorningBriefing').then(m => ({ default: m.MorningBriefing })), { ssr: false });
const RevenueIntelligenceWidget = dynamic(() => import('@/components/dashboard/RevenueIntelligence').then(m => ({ default: m.RevenueIntelligence })), { ssr: false });
const RecommendedActionsWidget = dynamic(() => import('@/components/dashboard/RecommendedActions').then(m => ({ default: m.RecommendedActions })), { ssr: false });
const AIMonitoringWidget = dynamic(() => import('@/components/dashboard/AIMonitoringWidget').then(m => ({ default: m.AIMonitoringWidget })), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  imageUrl: string | null;
  sourceLabel: string | null;
  source: string;
  publishedAt: string | null;
  fetchedAt: string;
  category: string | null;
}

interface DashboardStats {
  activeTasks: number;
  completedToday: number;
  failedToday: number;
  pendingInnovations: number;
  totalDiscoveries: number;
  successRate: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}j`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}min`;
  return 'à l\'instant';
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function formatDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const SOURCE_COLORS: Record<string, string> = {
  le_monde: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  bfm_tv: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  bbc_news: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  the_guardian: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

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

const newsItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 20, stiffness: 300 },
  },
};

const staticVariants = {
  hidden: {},
  visible: {},
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const colorClass = SOURCE_COLORS[item.source] || 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
  const isFeatured = index === 0;

  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      variants={newsItemVariants}
      className={`group block rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 overflow-hidden ${isFeatured ? 'col-span-2' : ''}`}
    >
      {item.imageUrl && (
        <div className={`relative overflow-hidden ${isFeatured ? 'h-48' : 'h-36'}`}>
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
              {item.sourceLabel || item.source}
            </span>
          </div>
        </div>
      )}
      <div className="p-4">
        {!item.imageUrl && (
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
              {item.sourceLabel || item.source}
            </span>
            <span className="text-xs text-zinc-600">{timeAgo(item.publishedAt)}</span>
          </div>
        )}
        <h3 className={`font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug ${isFeatured ? 'text-base' : 'text-sm'} line-clamp-3`}>
          {item.title}
        </h3>
        {item.summary && (
          <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
            {item.summary}
          </p>
        )}
        {item.imageUrl && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-zinc-600">{timeAgo(item.publishedAt)}</span>
            <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 ml-auto transition-colors" />
          </div>
        )}
      </div>
    </motion.a>
  );
}

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
      className="group flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200"
    >
      <div className={`flex-shrink-0 p-2.5 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
      </div>
      {href && <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 ml-auto transition-colors" />}
    </motion.div>
  );

  if (href) return <Link href={href as any}>{content}</Link>;
  return content;
}

function QuickAction({ label, description, href, icon: Icon, accent }: {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Link href={href as any}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`group flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] transition-all duration-200 cursor-pointer`}
      >
        <div className={`p-2.5 rounded-lg ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{label}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
      </motion.div>
    </Link>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const prefersReduced = useReducedMotion();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [time, setTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Network status
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const fetchNews = useCallback(async () => {
    try {
      const r = await fetch('/api/news?limit=7');
      const data = await r.json();
      if (data.success) setNews(data.data);
    } catch (err) {
      console.error('Failed to fetch news:', err);
    } finally {
      setNewsLoading(false);
    }
  }, []);

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

  const handleRefreshNews = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refresh' }) });
      await fetchNews();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchStats();
  }, [fetchNews, fetchStats]);

  const featuredNews = news.slice(0, 1);
  const gridNews = news.slice(1, 7);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 flex items-center justify-center">
              <span className="text-[10px] font-black text-white">AC</span>
            </div>
            <span className="text-sm font-semibold text-zinc-200">Alt Ctrl Lab</span>
            <span className="text-zinc-700">·</span>
            <span className="text-xs text-zinc-500 capitalize">{formatDate()}</span>
          </div>
          <div className="flex items-center gap-4">
            {online ? (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
                <span className="text-xs">En ligne</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-red-400">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="text-xs">Hors ligne</span>
              </div>
            )}
            <span className="text-sm font-mono text-zinc-400">
              {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      <motion.div
        variants={prefersReduced ? staticVariants : pageVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-6 py-8 space-y-8"
      >

        {/* ── Intelligence Layer ── */}
        <motion.div variants={sectionVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <MorningBriefingWidget />
            <RevenueIntelligenceWidget />
          </div>
          <div className="space-y-4">
            <RecommendedActionsWidget />
            <AIMonitoringWidget />
          </div>
        </motion.div>

        {/* ── Hero greeting ── */}
        <motion.div
          variants={sectionVariants}
          className="flex items-end justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">
              {getGreeting()} 👋
            </h1>
            <p className="mt-1 text-zinc-500 text-sm">
              Voici l'état de votre agence IA ce {new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/pil" className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium rounded-lg transition-colors">
              <Play className="w-3.5 h-3.5" />
              Lancer un brief
            </Link>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div variants={sectionVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Briefs actifs"
            value={stats?.activeTasks ?? '—'}
            icon={Activity}
            color="bg-fuchsia-500/10 text-fuchsia-400"
            href="/pil"
          />
          <StatCard
            label="Complétées aujourd'hui"
            value={stats?.completedToday ?? '—'}
            icon={CheckCircle2}
            color="bg-emerald-500/20 text-emerald-400"
            href="/history"
          />
          <StatCard
            label="Innovations R&D"
            value={stats?.pendingInnovations ?? '—'}
            sub="En attente de décision"
            icon={Beaker}
            color="bg-zinc-800 text-zinc-300"
            href="/rd"
          />
          <StatCard
            label="Taux de succès"
            value={stats ? `${stats.successRate}%` : '—'}
            sub="Sur tous les briefs"
            icon={TrendingUp}
            color="bg-cyan-500/10 text-cyan-400"
          />
        </motion.div>

        {/* ── Main content grid ── */}
        <motion.div variants={sectionVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* News — 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Actualités du jour</h2>
                <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">Auto 8h</span>
              </div>
              <button
                onClick={handleRefreshNews}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Rafraîchir
              </button>
            </div>

            {newsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`rounded-xl border border-white/[0.06] bg-white/[0.03] animate-pulse ${i === 0 ? 'col-span-2 h-64' : 'h-40'}`} />
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/[0.08] rounded-xl">
                <Globe className="w-8 h-8 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">Aucune actualité disponible</p>
                <button
                  onClick={handleRefreshNews}
                  className="mt-3 text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
                >
                  Récupérer les actus →
                </button>
              </div>
            ) : (
              <motion.div
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 gap-3"
              >
                {featuredNews.map((item, i) => (
                  <NewsCard key={item.id} item={item} index={i} />
                ))}
                {gridNews.map((item, i) => (
                  <NewsCard key={item.id} item={item} index={i + 1} />
                ))}
              </motion.div>
            )}
          </div>

          {/* Sidebar — 1/3 width */}
          <div className="space-y-6">

            {/* Quick actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Accès rapide</h2>
              </div>
              <div className="space-y-2">
                <QuickAction
                  label="Cockpit Ops"
                  description="Lancer un nouveau brief"
                  href="/pil"
                  icon={Play}
                  accent="bg-fuchsia-500/10 text-fuchsia-400"
                />
                <QuickAction
                  label="Kanban Board"
                  description="Suivre les tâches en cours"
                  href="/pil"
                  icon={BarChart3}
                  accent="bg-zinc-800 text-zinc-300"
                />
                <QuickAction
                  label="Labo R&D"
                  description="Innovations et découvertes"
                  href="/rd"
                  icon={Beaker}
                  accent="bg-zinc-800 text-zinc-300"
                />
                <QuickAction
                  label="Historique"
                  description="Tous les briefs passés"
                  href="/history"
                  icon={Clock}
                  accent="bg-emerald-500/20 text-emerald-400"
                />
              </div>
            </div>

            {/* Agent status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Agents disponibles</h2>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] divide-y divide-white/[0.04]">
                {[
                  { id: 'musawwir', label: 'Musawwir', role: 'Direction Artistique', emoji: '🎨' },
                  { id: 'matin', label: 'Matin', role: 'Lead Développeur', emoji: '⚙️' },
                  { id: 'fatah', label: 'Fatah', role: 'Chief Growth Officer', emoji: '📈' },
                  { id: 'khatib', label: 'Khatib', role: 'Copywriter Senior', emoji: '✍️' },
                  { id: 'hasib', label: 'Hasib', role: 'Data & Analytics', emoji: '📊' },
                  { id: 'sani', label: 'Sani', role: 'Automatisation', emoji: '🤖' },
                ].map((agent) => (
                  <div key={agent.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-base">{agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-300">{agent.label}</p>
                      <p className="text-[10px] text-zinc-600 truncate">{agent.role}</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* Sources info */}
            {news.length > 0 && (
              <div className="text-[10px] text-zinc-700 space-y-1 px-1">
                <p className="font-medium text-zinc-600">Sources d'actualité</p>
                <p>Le Monde · BFM TV · BBC News · The Guardian</p>
                <p>Mise à jour automatique à 8h chaque matin</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
