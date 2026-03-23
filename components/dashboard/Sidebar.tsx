'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PlusCircle,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import {
  getStoredDarkMode,
  setStoredDarkMode,
} from '@/lib/theme';
import { NAV_SECTIONS, TEAM_AI_ITEMS } from '@/lib/constants/navigation';
import type { NavItem } from '@/lib/constants/navigation';
import { SettingsModal } from './SettingsModal';
import { GuidePanel } from './GuidePanel';

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

  const textMuted = isDark ? 'text-zinc-500' : 'text-neutral-400';

  const navHover = isDark
    ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
    : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100';

  const navActive = isDark
    ? 'bg-fuchsia-500/10 text-fuchsia-400'
    : 'bg-fuchsia-50 text-fuchsia-700';

  const renderNavLink = (item: NavItem) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
    const Icon = item.icon;
    const badgeCount = item.agent ? pendingCounts[item.agent] || 0 : 0;

    return (
      <Link
        key={item.href}
        href={item.href as any}
        className={`group w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 ${
          isActive ? navActive : navHover
        }`}
      >
        <Icon size={17} className={`shrink-0 transition-colors ${isActive ? item.color : 'text-current'}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block truncate font-headline">{item.label}</span>
          {item.agent && (
            <span className={`text-[10px] block truncate ${textMuted}`}>{item.agent}</span>
          )}
        </div>
        {badgeCount > 0 && (
          <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-fuchsia-500 text-white text-[10px] font-bold px-1">
            {badgeCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navigation principale"
      style={{ opacity: mounted ? 1 : 0 }}
      className={`fixed left-0 top-0 h-screen w-64 hidden md:flex flex-col p-4 gap-2 z-40 transition-opacity duration-200 ${
        isDark ? 'bg-zinc-950' : 'bg-white border-r border-neutral-200'
      }`}
    >
      {/* Header — Logo */}
      <div className="flex items-center justify-center px-4 py-6">
        <Image
          src={isDark ? '/email/LogoHeader1.png' : '/email/LogoHeader.png'}
          alt="Alt Ctrl Lab"
          width={130}
          height={36}
          className="object-contain"
          priority
        />
      </div>

      {/* CTA — Nouveau Brief */}
      <div className="px-2 mb-2">
        <Link
          href="/brief"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 text-white font-bold py-3 rounded-full active:scale-95 duration-200 shadow-lg shadow-fuchsia-500/20 hover:brightness-110 transition-all"
        >
          <PlusCircle size={17} />
          <span className="text-sm font-headline">Nouveau Brief</span>
        </Link>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.title}>
            {sIdx > 0 && <div className={`mx-4 my-2 border-t ${isDark ? 'border-white/5' : 'border-neutral-200'}`} />}
            <p className={`px-4 py-1 text-[10px] uppercase tracking-widest font-bold ${textMuted}`}>
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
          <div className={`mx-4 my-2 border-t ${isDark ? 'border-white/5' : 'border-neutral-200'}`} />
          <button
            onClick={() => setTeamAiOpen(o => !o)}
            aria-expanded={teamAiOpen}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full justify-between transition-all duration-200 ${navHover}`}
          >
            <p className={`text-[10px] uppercase tracking-widest font-bold ${textMuted}`}>
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
                {TEAM_AI_ITEMS.map(renderNavLink)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-1">
        <button
          onClick={toggleDark}
          aria-label="Basculer le theme"
          className={`flex items-center gap-3 px-4 py-2 rounded-full w-full transition-colors text-sm ${navHover}`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
        </button>

        <button
          onClick={() => setGuideOpen(true)}
          aria-label="Guide d'utilisation"
          className={`flex items-center gap-3 px-4 py-2 rounded-full w-full transition-colors text-sm ${navHover}`}
        >
          <HelpCircle size={16} />
          <span>Guide</span>
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Paramètres"
          className={`flex items-center gap-3 px-4 py-2 rounded-full w-full transition-colors text-sm ${navHover}`}
        >
          <Settings size={16} />
          <span>Paramètres</span>
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
