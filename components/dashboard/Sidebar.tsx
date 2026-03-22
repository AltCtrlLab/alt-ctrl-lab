'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Terminal,
  Briefcase,
  Palette,
  Code2,
  Megaphone,
  FlaskConical,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  HelpCircle,
  History,
} from 'lucide-react';
import {
  getStoredDarkMode,
  setStoredDarkMode,
} from '@/lib/theme';
import { SettingsModal } from './SettingsModal';
import { GuidePanel } from './GuidePanel';

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
      { label: 'Cockpit Ops', href: '/pil', icon: Terminal, color: 'text-rose-400' },
      { label: 'Historique', href: '/history', icon: History, color: 'text-zinc-400' },
    ],
  },
];

const teamAiItems: NavItem[] = [
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase, color: 'text-amber-400' },
  { label: 'Branding', href: '/branding', icon: Palette, color: 'text-pink-400', agent: 'Abdul Musawwir' },
  { label: 'Web Dev', href: '/web-dev', icon: Code2, color: 'text-emerald-400', agent: 'Abdul Matin' },
  { label: 'Marketing', href: '/marketing', icon: Megaphone, color: 'text-amber-400', agent: 'Abdul Fatah' },
  { label: 'R&D', href: '/rd', icon: FlaskConical, color: 'text-teal-400' },
];

interface SidebarProps {
  pendingCounts?: Record<string, number>;
}

export function Sidebar({ pendingCounts = {} }: SidebarProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [teamAiOpen, setTeamAiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setIsDark(getStoredDarkMode());
    setMounted(true);
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    setStoredDarkMode(next);
  };

  const glass = isDark
    ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50'
    : 'bg-white/70 border-white/50 shadow-neutral-200/60';
  const textMuted = isDark ? 'text-neutral-500' : 'text-neutral-400';

  // Hover classes: magenta (fuchsia) on hover
  const navHover = isDark
    ? 'text-neutral-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-400'
    : 'text-neutral-500 hover:bg-fuchsia-500/10 hover:text-fuchsia-600';

  const navActive = isDark ? 'bg-white/[0.08] text-white' : 'bg-blue-50 text-blue-700';

  const renderNavLink = (item: NavItem) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
    const Icon = item.icon;
    const badgeCount = item.agent ? pendingCounts[item.agent] || 0 : 0;

    return (
      <Link
        key={item.href}
        href={item.href as any}
        className={`relative group w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
          isActive ? navActive : navHover
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="sidebarActive"
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${isDark ? 'bg-[rgb(var(--accent-500))]' : 'bg-blue-600'}`}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <Icon size={17} className={`shrink-0 transition-colors ${isActive ? item.color : 'text-current'}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block truncate">{item.label}</span>
          {item.agent && (
            <span className={`text-[10px] block truncate ${textMuted}`}>{item.agent}</span>
          )}
        </div>
        {badgeCount > 0 && (
          <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[rgb(var(--accent-500))] text-white text-[10px] font-bold px-1">
            {badgeCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav
      style={{ opacity: mounted ? 1 : 0, width: 224 }}
      className={`my-4 ml-4 hidden md:flex flex-col py-4 shrink-0 backdrop-blur-xl rounded-3xl shadow-2xl border overflow-hidden z-10 transition-opacity duration-200 ${glass}`}
    >
      {/* Header — Logo */}
      <div className="flex items-center justify-center px-4 mb-2">
        <Image
          src={isDark ? '/email/LogoHeader1.png' : '/email/LogoHeader.png'}
          alt="Alt Ctrl Lab"
          width={130}
          height={36}
          className="object-contain"
          priority
        />
      </div>

      {/* Separator */}
      <div className={`mx-3 mb-3 border-t ${isDark ? 'border-white/[0.08]' : 'border-neutral-200'}`} />

      {/* CTA — Nouveau Brief */}
      <div className="px-2 mb-3">
        <Link
          href="/brief"
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-200
            ${isDark
              ? 'bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border-cyan-500/20 text-cyan-400 hover:from-cyan-500/20 hover:to-violet-500/20'
              : 'bg-gradient-to-r from-cyan-500/15 to-violet-500/15 border-cyan-400/30 text-cyan-600 hover:from-cyan-500/25 hover:to-violet-500/25'
            }
          `}
        >
          <PlusCircle size={17} className="shrink-0" />
          <span className="text-sm font-semibold">Nouveau Brief</span>
        </Link>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2">
        {navSections.map((section, sIdx) => (
          <div key={section.title}>
            {sIdx > 0 && <div className={`mx-2 my-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-neutral-200'}`} />}
            <p className={`px-3 py-1 text-[10px] uppercase tracking-widest font-medium ${textMuted}`}>
              {section.title}
            </p>
            {section.items.map((item) => {
              if (item.href === '/brief') return null;
              return renderNavLink(item);
            })}
          </div>
        ))}

        {/* Équipe IA — collapsible */}
        <div>
          <div className={`mx-2 my-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-neutral-200'}`} />
          <button
            onClick={() => setTeamAiOpen(o => !o)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl justify-between transition-all duration-200 ${navHover}`}
          >
            <p className={`text-[10px] uppercase tracking-widest font-medium ${textMuted}`}>
              Équipe IA
            </p>
            <ChevronDown size={12} className={`transition-transform duration-200 ${teamAiOpen ? 'rotate-0' : '-rotate-90'} ${textMuted}`} />
          </button>
          <AnimatePresence initial={false}>
            {teamAiOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {teamAiItems.map(renderNavLink)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex flex-col gap-1 pt-2 px-3">
        <div className={`border-t mb-1 ${isDark ? 'border-white/[0.06]' : 'border-neutral-200'}`} />

        {/* Dark/Light toggle */}
        <button
          onClick={toggleDark}
          aria-label="Basculer le theme"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl w-full transition-colors ${navHover}`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          <span className="text-sm">{isDark ? 'Mode clair' : 'Mode sombre'}</span>
        </button>

        {/* Guide */}
        <button
          onClick={() => setGuideOpen(true)}
          aria-label="Guide d'utilisation"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl w-full transition-colors ${navHover}`}
        >
          <HelpCircle size={16} />
          <span className="text-sm">Guide</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Paramètres"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl w-full transition-colors ${navHover}`}
        >
          <Settings size={16} />
          <span className="text-sm">Paramètres</span>
        </button>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDark={isDark}
        onToggleDark={toggleDark}
      />
      <GuidePanel
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        isDark={isDark}
      />
    </nav>
  );
}

export default Sidebar;
