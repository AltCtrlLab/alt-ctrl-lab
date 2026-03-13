'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Loader2, CheckCircle, XCircle, Clock, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/pil/Sidebar';
import { OpsHeader } from '@/components/pil/OpsHeader';
import { InputCapsule } from '@/components/pil/InputCapsule';
import { TeamRoster } from '@/components/pil/TeamRoster';
import { AgentActivityPanel } from '@/components/pil/AgentActivityPanel';
import { TodoPanel } from '@/components/pil/TodoPanel';
import { WarRoomArena } from '@/components/cockpit/WarRoomArena';
import { SemanticTimeline } from '@/components/cockpit/SemanticTimeline';
import { CockpitStreamProvider } from '@/providers/CockpitStreamProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { usePilBackend } from '@/hooks/usePilBackend';
import { getTheme, getStoredAccent, getStoredSidebarExpanded, applyAccentColor, AccentColor } from '@/lib/theme';
import { useTeamMetrics } from '@/hooks/useTeamMetrics';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';

// Lazy imports for new components
import CommandPalette from '@/components/pil/CommandPalette';
import MissionControl from '@/components/pil/MissionControl';
import KanbanBoard from '@/components/pil/KanbanBoard';
import { VaultExplorer } from '@/components/pil/VaultExplorer';
import { AgentConstellation } from '@/components/pil/AgentConstellation';
import { LiveTerminal } from '@/components/pil/LiveTerminal';
import { ShortcutsOverlay } from '@/components/pil/ShortcutsOverlay';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TokenAnalytics } from '@/components/pil/TokenAnalytics';
import { SystemHealth } from '@/components/pil/SystemHealth';


// ─── Active Tasks Feed ───────────────────────────────────────────────────────

const AGENT_EMOJI: Record<string, string> = {
  musawwir: '🎨', raqim: '✏️', matin: '💻', banna: '🔧',
  fatah: '📣', khatib: '📝', hasib: '🤖', sani: '⚙️',
};
const STAGE_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  DIRECTOR_PLANNING: 'Cahier des charges en cours',
  EXECUTOR_DRAFTING: 'Implémentation en cours',
  DIRECTOR_QA: 'Audit qualité en cours',
  EXECUTOR_REVISING: 'Révision en cours',
  COMPLETED: 'Livrable validé',
  FAILED: 'Échec',
  FAILED_QA: 'Échec QA',
};

function ActiveTasksFeed({ tasks, onOpenKanban }: { tasks: any[]; onOpenKanban: () => void }) {
  const sorted = [...tasks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
  const active = sorted.filter(t => !['COMPLETED','FAILED','FAILED_QA'].includes(t.status));
  const recent = sorted.filter(t => ['COMPLETED','FAILED','FAILED_QA'].includes(t.status)).slice(0, 4);

  function parseBriefShort(prompt: string) {
    const m = prompt.match(/Brief:\s*\n([\s\S]*)/i);
    const brief = m?.[1]?.trim() || prompt;
    const dir = prompt.match(/Director:\s*(\w+)/i)?.[1] || '';
    const exc = prompt.match(/Executor:\s*(\w+)/i)?.[1] || '';
    return { brief, dir, exc };
  }

  function elapsed(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}m`;
    return `${Math.floor(s/3600)}h`;
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Active */}
      {active.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
              {active.length} mission{active.length > 1 ? 's' : ''} en cours
            </span>
          </div>
          {active.map(task => {
            const { brief, dir, exc } = parseBriefShort(task.prompt);
            return (
              <button key={task.id} onClick={onOpenKanban}
                className="w-full text-left p-4 rounded-2xl bg-blue-500/8 border border-blue-500/25 hover:bg-blue-500/15 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <span>{AGENT_EMOJI[dir] || '🤖'}</span>
                    <span className="capitalize">{dir}</span>
                    <ChevronRight className="w-3 h-3 text-neutral-500" />
                    <span>{AGENT_EMOJI[exc] || '⚙️'}</span>
                    <span className="capitalize">{exc}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                    <Clock className="w-3 h-3" />
                    <span>{elapsed(task.createdAt)}</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 line-clamp-2 mb-2">{brief}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-300 font-medium">
                    {STAGE_LABEL[task.status] || task.status}
                  </span>
                  <span className="text-[10px] text-neutral-600 group-hover:text-neutral-400 transition-colors">
                    Voir Kanban →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Recent completed */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Récentes</span>
          {recent.map(task => {
            const { brief, dir, exc } = parseBriefShort(task.prompt);
            const ok = task.status === 'COMPLETED';
            return (
              <button key={task.id} onClick={onOpenKanban}
                className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-neutral-300">
                    {ok
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    }
                    <span className="capitalize">{dir} → {exc}</span>
                  </div>
                  <span className="text-[10px] text-neutral-600">{elapsed(task.createdAt)}</span>
                </div>
                <p className="text-xs text-neutral-500 line-clamp-1 mt-1 ml-5">{brief}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {sorted.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8
          bg-white/[0.02] border border-white/[0.05] rounded-2xl border-dashed">
          <LayoutDashboard className="w-8 h-8 text-neutral-700" />
          <p className="text-sm text-neutral-500">Aucune mission en cours</p>
          <p className="text-xs text-neutral-600">Sélectionnez un service et soumettez votre première directive</p>
        </div>
      )}

      {sorted.length > 0 && (
        <button onClick={onOpenKanban}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors text-center py-1">
          Voir tout le tableau Kanban →
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function PilCockpit() {
  const [currentView, setCurrentView] = useState('ops');
  const [isDark, setIsDark] = useState(true);
  const [selectedService, setSelectedService] = useState('full');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [accentColor, setAccentColor] = useState<AccentColor>('indigo');

  // Initialize from localStorage
  useEffect(() => {
    setIsExpanded(getStoredSidebarExpanded());
    const stored = getStoredAccent();
    setAccentColor(stored);
    applyAccentColor(stored);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const { agents, tasks, logs, isConnected, systemLoad, stats, submitMission, refresh } = usePilBackend();
  const t = getTheme(isDark);
  const rosterAgents = useTeamMetrics(agents);
  const badges = useSidebarBadges();

  // After submitting a mission (non-full_agency), auto-navigate to Kanban
  const handleMissionSubmit = async (brief: string, serviceId: string) => {
    const result = await submitMission(brief, serviceId);
    if (result?.success && serviceId !== 'full' && serviceId !== 'full_agency') {
      setTimeout(() => setCurrentView('kanban'), 800);
    }
    return result;
  };

  const viewAnimation = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.2 },
  };

  return (
    <NotificationProvider>
      <div className={`h-screen w-full ${t.mainBg} ${t.textMain} font-sans flex overflow-hidden selection:bg-blue-500/30 transition-colors duration-500`}>
        {/* Ambient */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none transition-colors duration-700 ${t.ambient}`} />

        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          isDark={isDark}
          setIsDark={setIsDark}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          badges={badges}
        />

        <div className="flex-1 my-4 mr-4 ml-4 overflow-hidden relative z-10">
          <ErrorBoundary>
          <AnimatePresence mode="wait">
            {/* === OPS CENTER === */}
            {currentView === 'ops' && (
              <motion.div key="ops" {...viewAnimation} className="h-full flex flex-col gap-4">
                <OpsHeader
                  isDark={isDark}
                  selectedService={selectedService}
                  setSelectedService={setSelectedService}
                  systemLoad={systemLoad}
                  isConnected={isConnected}
                  onNavigate={setCurrentView}
                />
                <CockpitStreamProvider>
                  <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                    <div className="col-span-8 flex flex-col gap-4 h-full overflow-y-auto">
                      <InputCapsule isDark={isDark} selectedService={selectedService} onSubmit={handleMissionSubmit} />
                      {/* War Room uniquement pour Full Agency */}
                      {selectedService === 'full' || selectedService === 'full_agency' ? (
                        <div className="flex-1 min-h-0 overflow-y-auto">
                          <WarRoomArena />
                        </div>
                      ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto">
                          <ActiveTasksFeed tasks={tasks} onOpenKanban={() => setCurrentView('kanban')} />
                        </div>
                      )}
                      <div className="h-56 shrink-0">
                        <LiveTerminal />
                      </div>
                    </div>
                    <div className="col-span-4 flex flex-col gap-4 h-full">
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <SemanticTimeline />
                      </div>
                    </div>
                  </div>
                </CockpitStreamProvider>
              </motion.div>
            )}

            {/* === MISSION CONTROL === */}
            {currentView === 'mission' && (
              <motion.div key="mission" {...viewAnimation} className="h-full overflow-y-auto">
                <MissionControl isDark={isDark} stats={stats} agents={agents} isConnected={isConnected} />
              </motion.div>
            )}

            {/* === TEAM ROSTER === */}
            {currentView === 'roster' && (
              <motion.div key="roster" {...viewAnimation} className="h-full">
                <TeamRoster isDark={isDark} agents={rosterAgents} stats={stats} onAgentClick={setSelectedAgentId} />
              </motion.div>
            )}

            {/* === ACTIVITY === */}
            {currentView === 'activity' && (
              <motion.div key="activity" {...viewAnimation} className="h-full">
                <AgentActivityPanel isDark={isDark} />
              </motion.div>
            )}

            {/* === KANBAN === */}
            {currentView === 'kanban' && (
              <motion.div key="kanban" {...viewAnimation} className="h-full">
                <KanbanBoard isDark={isDark} tasks={tasks} onRefresh={refresh} />
              </motion.div>
            )}

            {/* === THE VAULT === */}
            {currentView === 'assets' && (
              <motion.div key="assets" {...viewAnimation} className="h-full">
                <VaultExplorer isDark={isDark} />
              </motion.div>
            )}

            {/* === CONSTELLATION === */}
            {currentView === 'constellation' && (
              <motion.div key="constellation" {...viewAnimation} className="h-full">
                <AgentConstellation isDark={isDark} agents={agents} tasks={tasks} onAgentClick={setSelectedAgentId} />
              </motion.div>
            )}

            {/* === TOKEN ANALYTICS === */}
            {currentView === 'analytics' && (
              <motion.div key="analytics" {...viewAnimation} className="h-full overflow-y-auto">
                <TokenAnalytics isDark={isDark} />
              </motion.div>
            )}

            {/* === SYSTEM HEALTH === */}
            {currentView === 'health' && (
              <motion.div key="health" {...viewAnimation} className="h-full">
                <SystemHealth isDark={isDark} isConnected={isConnected} />
              </motion.div>
            )}

            {/* === TODOS (accessible from palette) === */}
            {currentView === 'todos' && (
              <motion.div key="todos" {...viewAnimation} className="h-full">
                <TodoPanel isDark={isDark} />
              </motion.div>
            )}
          </AnimatePresence>
          </ErrorBoundary>
        </div>

        {/* Agent Drawer */}
        <AnimatePresence>
          {selectedAgentId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedAgentId(null)}>
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`absolute right-0 top-0 h-full w-[600px] ${t.mainBg} border-l ${isDark ? 'border-white/10' : 'border-neutral-200'} shadow-2xl`}
                onClick={e => e.stopPropagation()}
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h2 className={`text-lg font-semibold ${t.textHeading}`}>Profil Agent: {selectedAgentId}</h2>
                  <button onClick={() => setSelectedAgentId(null)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'} transition-colors`}>
                    <X size={20} />
                  </button>
                </div>
                <div className="h-[calc(100%-60px)] overflow-hidden">
                  <AgentActivityPanel isDark={isDark} agentId={selectedAgentId} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={setCurrentView}
          onToggleTheme={() => setIsDark(!isDark)}
          onToggleSidebar={() => setIsExpanded(!isExpanded)}
          isDark={isDark}
        />

        {/* Shortcuts Overlay */}
        <ShortcutsOverlay isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </div>
    </NotificationProvider>
  );
}
