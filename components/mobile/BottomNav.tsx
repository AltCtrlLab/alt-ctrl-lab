'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  TrendingUp,
  Plus,
  Wallet,
  Workflow,
  UserPlus,
  CheckSquare,
  FileText,
  X,
} from 'lucide-react';

interface NavTab {
  label: string;
  href: string;
  icon: React.ElementType;
}

const TABS: NavTab[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pipeline', href: '/leads', icon: TrendingUp },
  // FAB slot is index 2 — rendered separately
  { label: 'Finance', href: '/finances', icon: Wallet },
  { label: 'Ops', href: '/automations', icon: Workflow },
];

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Lead', href: '/leads?action=new', icon: UserPlus, color: 'bg-cyan-500' },
  { label: 'Tâche', href: '/pil?tab=todo', icon: CheckSquare, color: 'bg-emerald-500' },
  { label: 'Contenu', href: '/content?action=new', icon: FileText, color: 'bg-amber-500' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* FAB Radial Menu */}
      <AnimatePresence>
        {fabOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setFabOpen(false)}
            />
            <div className="fixed bottom-20 left-0 right-0 z-[45] flex justify-center md:hidden pb-[env(safe-area-inset-bottom)]">
              <div className="flex gap-6">
                {QUICK_ACTIONS.map((action, idx) => (
                  <motion.button
                    key={action.label}
                    aria-label={`Ajouter ${action.label}`}
                    initial={{ opacity: 0, y: 30, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.5 }}
                    transition={{
                      type: 'spring',
                      damping: 20,
                      stiffness: 300,
                      delay: idx * 0.05,
                    }}
                    onClick={() => {
                      setFabOpen(false);
                      router.push(action.href);
                    }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center shadow-lg`}
                    >
                      <action.icon size={20} className="text-white" />
                    </div>
                    <span className="text-[10px] text-zinc-300 font-medium">
                      {action.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav
        role="navigation"
        aria-label="Navigation mobile"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-zinc-900/80 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-around h-16">
          {/* Left tabs */}
          {TABS.slice(0, 2).map((tab) => (
            <TabButton
              key={tab.href}
              tab={tab}
              active={isActive(tab.href)}
              onClick={() => router.push(tab.href)}
            />
          ))}

          {/* Center FAB */}
          <div className="flex items-center justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setFabOpen((prev) => !prev)}
              aria-label={fabOpen ? 'Fermer le menu rapide' : 'Ouvrir le menu rapide'}
              aria-expanded={fabOpen}
              className="w-14 h-14 -mt-5 rounded-full bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 flex items-center justify-center shadow-lg shadow-fuchsia-500/30 border-4 border-zinc-950"
            >
              <motion.div
                animate={{ rotate: fabOpen ? 45 : 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                {fabOpen ? (
                  <X size={22} className="text-white" />
                ) : (
                  <Plus size={22} className="text-white" />
                )}
              </motion.div>
            </motion.button>
          </div>

          {/* Right tabs */}
          {TABS.slice(2).map((tab) => (
            <TabButton
              key={tab.href}
              tab={tab}
              active={isActive(tab.href)}
              onClick={() => router.push(tab.href)}
            />
          ))}
        </div>
      </nav>
    </>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: NavTab;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={tab.label}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-0.5 transition-colors ${
        active ? 'text-fuchsia-500' : 'text-zinc-500'
      }`}
    >
      <motion.div
        animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={
          active
            ? { type: 'spring', stiffness: 300, damping: 20 }
            : { duration: 0.15 }
        }
      >
        <tab.icon size={22} />
      </motion.div>
      <span className="text-[10px] font-medium">{tab.label}</span>
    </button>
  );
}

export default BottomNav;
