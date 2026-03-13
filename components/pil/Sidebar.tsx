'use client';

import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Gauge,
  TerminalSquare,
  BarChart3,
  Columns3,
  Database,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Activity,
  Network,
  PieChart,
  Home,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { setStoredSidebarExpanded } from '@/lib/theme';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  badges?: { todos?: number; proposals?: number };
}

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  shortcut?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  isDark,
  setIsDark,
  isExpanded,
  setIsExpanded,
  badges = {},
}) => {
  const sections: NavSection[] = [
    {
      title: 'Commande',
      items: [
        { id: 'ops', icon: LayoutDashboard, label: 'Centre Ops', shortcut: '1' },
        { id: 'mission', icon: Gauge, label: 'Contrôle Mission', shortcut: '2' },
      ],
    },
    {
      title: 'Équipe',
      items: [
        { id: 'roster', icon: TerminalSquare, label: 'Effectif Équipe', shortcut: '3' },
        { id: 'activity', icon: BarChart3, label: 'Activité & Timeline', shortcut: '4' },
        { id: 'kanban', icon: Columns3, label: 'Tableau Kanban', shortcut: '5', badge: badges.todos },
      ],
    },
    {
      title: 'Système',
      items: [
        { id: 'assets', icon: Database, label: 'La Voûte', shortcut: '6' },
        { id: 'constellation', icon: Network, label: 'Constellation', shortcut: '7' },
        { id: 'analytics', icon: PieChart, label: 'Analytique', shortcut: '8' },
        { id: 'health', icon: Activity, label: 'Santé Système' },
      ],
    },
  ];

  // Keyboard shortcuts [ ] for toggle, 1-8 for nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const next = !isExpanded;
        setIsExpanded(next);
        setStoredSidebarExpanded(next);
      }
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8) {
        const allItems = sections.flatMap(s => s.items);
        if (allItems[num - 1]) setCurrentView(allItems[num - 1].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isExpanded, setIsExpanded, setCurrentView]);

  const glass = isDark
    ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50'
    : 'bg-white/60 border-white/40 shadow-neutral-200/50';
  const textMuted = isDark ? 'text-neutral-500' : 'text-neutral-400';

  return (
    <motion.nav
      initial={false}
      animate={{ width: isExpanded ? 220 : 64 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={`my-4 ml-4 hidden md:flex flex-col py-4 shrink-0 backdrop-blur-xl rounded-3xl shadow-2xl border overflow-hidden ${glass}`}
    >
      {/* Header */}
      <div className={`flex items-center ${isExpanded ? 'px-4 justify-between' : 'justify-center'} mb-4`}>
        <div className={`w-9 h-9 rounded-xl ${isDark ? 'bg-gradient-to-br from-neutral-800 to-neutral-900 border-white/10 text-white' : 'bg-gradient-to-br from-white to-neutral-100 border-neutral-200/50 text-neutral-900'} border flex items-center justify-center cursor-pointer`}>
          <span className="font-bold text-xs tracking-tighter">AC</span>
        </div>
        {isExpanded && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Alt Ctrl Lab
          </motion.span>
        )}
        {isExpanded && (
          <button
            onClick={() => { setIsExpanded(false); setStoredSidebarExpanded(false); }}
            className={`p-1 rounded-lg ${isDark ? 'hover:bg-white/10 text-neutral-500' : 'hover:bg-neutral-200 text-neutral-400'} transition-colors`}
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Home link */}
      <div className="px-2 mb-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 rounded-xl transition-all duration-200 ${isExpanded ? 'px-3 py-2' : 'justify-center py-2.5'} ${isDark ? 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800'}`}
          title={!isExpanded ? 'Dashboard' : undefined}
        >
          <Home size={18} />
          {isExpanded && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium truncate">
              Accueil
            </motion.span>
          )}
        </Link>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden px-2">
        {sections.map((section, sIdx) => (
          <div key={section.title}>
            {sIdx > 0 && <div className={`mx-2 my-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-neutral-200'}`} />}
            {isExpanded && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`px-3 py-1 text-[10px] uppercase tracking-widest font-medium ${textMuted}`}>
                {section.title}
              </motion.p>
            )}
            {section.items.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`
                    relative group w-full flex items-center gap-3 rounded-xl transition-all duration-200
                    ${isExpanded ? 'px-3 py-2' : 'justify-center py-2.5'}
                    ${isActive
                      ? isDark ? 'bg-white/[0.08] text-white' : 'bg-blue-50 text-blue-700'
                      : isDark ? 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActive"
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${isDark ? 'bg-[rgb(var(--accent-500))]' : 'bg-blue-600'}`}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon size={18} className={isActive && isDark ? 'text-[rgb(var(--accent-400))]' : ''} />
                  {isExpanded && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium truncate">
                      {item.label}
                    </motion.span>
                  )}
                  {item.badge && item.badge > 0 && (
                    <span className={`${isExpanded ? 'ml-auto' : 'absolute -top-1 -right-1'} min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[rgb(var(--accent-500))] text-white text-[10px] font-bold px-1`}>
                      {item.badge}
                    </span>
                  )}
                  {!isExpanded && (
                    <div className={`absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 ${isDark ? 'bg-neutral-800 border border-white/10 text-white' : 'bg-white border border-neutral-200 text-neutral-800 shadow-lg'} opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 -translate-x-2 group-hover:translate-x-0`}>
                      {item.label}
                      {item.shortcut && <kbd className="ml-2 text-[10px] text-neutral-500">{item.shortcut}</kbd>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className={`flex flex-col gap-2 pt-2 ${isExpanded ? 'px-3' : 'items-center'}`}>
        <div className={`mx-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-neutral-200'} mb-1`} />
        {!isExpanded && (
          <button onClick={() => { setIsExpanded(true); setStoredSidebarExpanded(true); }} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-neutral-500' : 'hover:bg-neutral-200 text-neutral-400'} transition-colors`}>
            <ChevronRight size={16} />
          </button>
        )}
        <button
          onClick={() => setIsDark(!isDark)}
          className={`${isExpanded ? 'flex items-center gap-3 px-3 py-2 rounded-xl w-full' : 'p-2 rounded-lg'} ${isDark ? 'hover:bg-white/[0.04] text-neutral-400 hover:text-neutral-200' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'} transition-colors`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isExpanded && <span className="text-sm">{isDark ? 'Mode clair' : 'Mode sombre'}</span>}
        </button>
        <div className={`${isExpanded ? 'flex items-center gap-3 px-2 py-2' : 'flex justify-center py-1'}`}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">CEO</span>
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${isDark ? 'bg-neutral-950' : 'bg-[#F4F5F7]'} rounded-full flex items-center justify-center`}>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>AbdulHakim</p>
              <p className={`text-[10px] ${textMuted}`}>CEO / Superviseur</p>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Sidebar;
