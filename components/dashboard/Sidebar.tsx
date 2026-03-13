'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  PlusCircle,
  TrendingUp,
  FolderKanban,
  Wallet,
  Target,
  HeartHandshake,
  CalendarDays,
  Workflow,
  Cpu,
  Terminal,
  Briefcase,
  Palette,
  Code2,
  Megaphone,
  FlaskConical,
  History,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getStoredSidebarExpanded,
  setStoredSidebarExpanded,
  getStoredDarkMode,
  setStoredDarkMode,
} from '@/lib/theme';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
  agent?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Commande',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-zinc-300' },
      { label: 'Nouveau Brief', href: '/brief', icon: PlusCircle, color: 'text-cyan-400' },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      { label: 'Leads', href: '/leads', icon: TrendingUp, color: 'text-cyan-400' },
      { label: 'Projets', href: '/projets', icon: FolderKanban, color: 'text-violet-400' },
      { label: 'Finances', href: '/finances', icon: Wallet, color: 'text-emerald-400' },
      { label: 'Prospection', href: '/prospection', icon: Target, color: 'text-orange-400' },
      { label: 'Post-Vente', href: '/postvente', icon: HeartHandshake, color: 'text-pink-400' },
    ],
  },
  {
    title: 'Ops',
    items: [
      { label: 'Content', href: '/content', icon: CalendarDays, color: 'text-pink-400' },
      { label: 'Automations', href: '/automations', icon: Workflow, color: 'text-violet-400' },
      { label: 'Cockpit', href: '/cockpit', icon: Cpu, color: 'text-indigo-400' },
    ],
  },
  {
    title: 'Agents & Outils',
    items: [
      { label: 'PIL', href: '/pil', icon: Terminal, color: 'text-rose-400' },
      { label: 'Portfolio', href: '/portfolio', icon: Briefcase, color: 'text-amber-400' },
      { label: 'Branding', href: '/branding', icon: Palette, color: 'text-pink-400', agent: 'Abdul Musawwir' },
      { label: 'Web Dev', href: '/web-dev', icon: Code2, color: 'text-emerald-400', agent: 'Abdul Matin' },
      { label: 'Marketing', href: '/marketing', icon: Megaphone, color: 'text-amber-400', agent: 'Abdul Fatah' },
      { label: 'R&D', href: '/rd', icon: FlaskConical, color: 'text-teal-400' },
      { label: 'Historique', href: '/history', icon: History, color: 'text-zinc-500' },
    ],
  },
];

interface SidebarProps {
  pendingCounts?: Record<string, number>;
}

export function Sidebar({ pendingCounts = {} }: SidebarProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsExpanded(getStoredSidebarExpanded());
    setIsDark(getStoredDarkMode());
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const next = !isExpanded;
        setIsExpanded(next);
        setStoredSidebarExpanded(next);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isExpanded]);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    setStoredDarkMode(next);
  };

  const glass = isDark
    ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50'
    : 'bg-white/70 border-white/50 shadow-neutral-200/60';
  const textMuted = isDark ? 'text-neutral-500' : 'text-neutral-400';

  return (
    <motion.nav
      initial={false}
      animate={{ width: isExpanded ? 224 : 64 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ opacity: mounted ? 1 : 0 }}
      className={`my-4 ml-4 hidden md:flex flex-col py-4 shrink-0 backdrop-blur-xl rounded-3xl shadow-2xl border overflow-hidden z-10 ${glass}`}
    >
      {/* Header */}
      <div className={`flex items-center ${isExpanded ? 'px-4 justify-between' : 'justify-center'} mb-4`}>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer shrink-0 ${isDark ? 'bg-gradient-to-br from-neutral-800 to-neutral-900 border-white/10 text-white' : 'bg-gradient-to-br from-white to-neutral-100 border-neutral-200/60 text-neutral-900'}`}>
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
            className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-neutral-500' : 'hover:bg-neutral-200 text-neutral-400'}`}
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* CTA — Nouveau Brief */}
      <div className="px-2 mb-3">
        <Link
          href="/brief"
          className={`
            relative group w-full flex items-center gap-3 rounded-xl border transition-all duration-200
            ${isExpanded ? 'px-3 py-2' : 'justify-center py-2.5'}
            ${isDark
              ? 'bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border-cyan-500/20 text-cyan-400 hover:from-cyan-500/20 hover:to-violet-500/20'
              : 'bg-gradient-to-r from-cyan-500/15 to-violet-500/15 border-cyan-400/30 text-cyan-600 hover:from-cyan-500/25 hover:to-violet-500/25'
            }
          `}
          title={!isExpanded ? 'Nouveau Brief' : undefined}
        >
          <PlusCircle size={17} className="shrink-0" />
          {isExpanded && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold">
              Nouveau Brief
            </motion.span>
          )}
          {!isExpanded && (
            <div className={`absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 -translate-x-2 group-hover:translate-x-0 ${isDark ? 'bg-neutral-800 border border-white/10 text-white' : 'bg-white border border-neutral-200 text-neutral-800 shadow-lg'}`}>
              Nouveau Brief
            </div>
          )}
        </Link>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2">
        {navSections.map((section, sIdx) => (
          <div key={section.title}>
            {sIdx > 0 && <div className={`mx-2 my-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-neutral-200'}`} />}
            {isExpanded && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`px-3 py-1 text-[10px] uppercase tracking-widest font-medium ${textMuted}`}>
                {section.title}
              </motion.p>
            )}
            {section.items.map((item) => {
              // Skip /brief in Commande section (it's the CTA above)
              if (item.href === '/brief') return null;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              const badgeCount = item.agent ? pendingCounts[item.agent] || 0 : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={`
                    relative group w-full flex items-center gap-3 rounded-xl transition-all duration-200
                    ${isExpanded ? 'px-3 py-2' : 'justify-center py-2.5'}
                    ${isActive
                      ? isDark ? 'bg-white/[0.08] text-white' : 'bg-blue-50 text-blue-700'
                      : isDark ? 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                    }
                  `}
                  title={!isExpanded ? item.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActive"
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${isDark ? 'bg-[rgb(var(--accent-500))]' : 'bg-blue-600'}`}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon size={17} className={`shrink-0 ${isActive ? item.color : ''}`} />
                  {isExpanded && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{item.label}</span>
                      {item.agent && (
                        <span className={`text-[10px] block truncate ${textMuted}`}>{item.agent}</span>
                      )}
                    </motion.div>
                  )}
                  {isExpanded && badgeCount > 0 && (
                    <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[rgb(var(--accent-500))] text-white text-[10px] font-bold px-1">
                      {badgeCount}
                    </span>
                  )}
                  {!isExpanded && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[rgb(var(--accent-500))] text-white text-[10px] font-bold px-1">
                      {badgeCount}
                    </span>
                  )}
                  {!isExpanded && (
                    <div className={`absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 -translate-x-2 group-hover:translate-x-0 ${isDark ? 'bg-neutral-800 border border-white/10 text-white' : 'bg-white border border-neutral-200 text-neutral-800 shadow-lg'}`}>
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className={`flex flex-col gap-1 pt-2 ${isExpanded ? 'px-3' : 'items-center px-2'}`}>
        <div className={`border-t mb-1 ${isExpanded ? 'mx-0' : 'mx-0 w-full'} ${isDark ? 'border-white/[0.06]' : 'border-neutral-200'}`} />

        {!isExpanded && (
          <button
            onClick={() => { setIsExpanded(true); setStoredSidebarExpanded(true); }}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-neutral-500' : 'hover:bg-neutral-200 text-neutral-400'}`}
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Dark/Light toggle */}
        <button
          onClick={toggleDark}
          className={`${isExpanded ? 'flex items-center gap-3 px-3 py-2 rounded-xl w-full' : 'p-2 rounded-lg'} transition-colors ${isDark ? 'hover:bg-white/[0.04] text-neutral-400 hover:text-neutral-200' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'}`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isExpanded && <span className="text-sm">{isDark ? 'Mode clair' : 'Mode sombre'}</span>}
        </button>

        {/* Settings */}
        <button
          className={`${isExpanded ? 'flex items-center gap-3 px-3 py-2 rounded-xl w-full' : 'p-2 rounded-lg'} transition-colors ${isDark ? 'hover:bg-white/[0.04] text-neutral-400 hover:text-neutral-200' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'}`}
        >
          <Settings size={16} />
          {isExpanded && <span className="text-sm">Paramètres</span>}
        </button>

        {/* User profile */}
        <div className={`${isExpanded ? 'flex items-center gap-3 px-2 py-2' : 'flex justify-center py-1'}`}>
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">CEO</span>
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center ${isDark ? 'bg-neutral-950' : 'bg-[#F4F5F7]'}`}>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
          {isExpanded && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>AbdulHakim</p>
              <p className={`text-[10px] ${textMuted}`}>CEO / Superviseur</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}

export default Sidebar;
