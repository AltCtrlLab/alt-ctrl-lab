'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X,
  LayoutDashboard, PlusCircle, TrendingUp, FolderKanban, Wallet,
  Target, HeartHandshake, CalendarDays, Workflow, Terminal, History,
  Briefcase, Palette, Code2, Megaphone, FlaskConical,
} from 'lucide-react';
import { getStoredDarkMode } from '@/lib/theme';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
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
      { label: 'Projets', href: '/projets', icon: FolderKanban, color: 'text-zinc-400' },
      { label: 'Finances', href: '/finances', icon: Wallet, color: 'text-emerald-400' },
      { label: 'Prospection', href: '/prospection', icon: Target, color: 'text-zinc-400' },
      { label: 'Post-Vente', href: '/postvente', icon: HeartHandshake, color: 'text-zinc-400' },
    ],
  },
  {
    title: 'Ops',
    items: [
      { label: 'Content', href: '/content', icon: CalendarDays, color: 'text-zinc-400' },
      { label: 'Automations', href: '/automations', icon: Workflow, color: 'text-zinc-400' },
      { label: 'Cockpit Ops', href: '/pil', icon: Terminal, color: 'text-rose-400' },
      { label: 'Historique', href: '/history', icon: History, color: 'text-zinc-400' },
    ],
  },
  {
    title: 'Equipe IA',
    items: [
      { label: 'Portfolio', href: '/portfolio', icon: Briefcase, color: 'text-amber-400' },
      { label: 'Branding', href: '/branding', icon: Palette, color: 'text-zinc-400' },
      { label: 'Web Dev', href: '/web-dev', icon: Code2, color: 'text-emerald-400' },
      { label: 'Marketing', href: '/marketing', icon: Megaphone, color: 'text-amber-400' },
      { label: 'R&D', href: '/rd', icon: FlaskConical, color: 'text-zinc-400' },
    ],
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(getStoredDarkMode());
  }, []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Find current page label
  const currentPage = navSections
    .flatMap(s => s.items)
    .find(item => pathname === item.href || pathname?.startsWith(item.href + '/'));

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden h-14 flex items-center justify-between px-4 bg-zinc-950/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Image
            src={isDark ? '/email/LogoHeader1.png' : '/email/LogoHeader.png'}
            alt="Alt Ctrl Lab"
            width={90}
            height={24}
            className="object-contain"
          />
        </div>
        {currentPage && (
          <span className="text-xs text-zinc-500 font-medium">{currentPage.label}</span>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            {/* Panel */}
            <motion.nav
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              role="navigation"
              aria-label="Menu principal"
              className="fixed left-0 top-0 bottom-0 w-72 z-50 md:hidden overflow-y-auto bg-zinc-950/95 backdrop-blur-xl border-r border-white/[0.08]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <Image
                  src={isDark ? '/email/LogoHeader1.png' : '/email/LogoHeader.png'}
                  alt="Alt Ctrl Lab"
                  width={110}
                  height={30}
                  className="object-contain"
                />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fermer le menu"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav sections */}
              <div className="p-3 space-y-1">
                {navSections.map((section, sIdx) => (
                  <div key={section.title}>
                    {sIdx > 0 && (
                      <div className="mx-2 my-2 border-t border-white/[0.06]" />
                    )}
                    <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-medium text-zinc-600">
                      {section.title}
                    </p>
                    {section.items.map(item => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.href}
                          href={item.href as string}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                            isActive
                              ? 'bg-white/[0.08] text-white'
                              : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                          }`}
                        >
                          <Icon size={18} className={isActive ? item.color : 'text-current'} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
