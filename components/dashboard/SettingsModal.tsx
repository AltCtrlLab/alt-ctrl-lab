'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X, LogOut, Sun, Moon, HelpCircle, RotateCcw } from 'lucide-react';
import { getStoredDarkMode, setStoredDarkMode } from '@/lib/theme';
import { resetOnboarding } from '@/components/ui/OnboardingTour';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export function SettingsModal({ open, onClose, isDark, onToggleDark }: SettingsModalProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const glass = isDark
    ? 'bg-zinc-900/90 border-white/[0.1]'
    : 'bg-white/90 border-zinc-200';
  const textMain = isDark ? 'text-zinc-100' : 'text-zinc-900';
  const textMuted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const btnHover = isDark
    ? 'hover:bg-white/[0.06] text-zinc-300'
    : 'hover:bg-zinc-100 text-zinc-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        ref={panelRef}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={`relative w-80 rounded-2xl border shadow-2xl backdrop-blur-xl p-5 ${glass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-sm font-semibold ${textMain}`}>Parametres</h2>
          <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${btnHover}`}>
            <X size={16} />
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleDark}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${btnHover}`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          <span className="text-sm">{isDark ? 'Mode clair' : 'Mode sombre'}</span>
        </button>

        {/* Re-launch tour */}
        <button
          onClick={() => { resetOnboarding(); window.location.reload(); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${btnHover}`}
        >
          <RotateCcw size={16} />
          <span className="text-sm">Relancer la visite guidée</span>
        </button>

        {/* Re-show guide */}
        <button
          onClick={() => { localStorage.removeItem('acl-guide-dismissed'); onClose(); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${btnHover}`}
        >
          <HelpCircle size={16} />
          <span className="text-sm">Réafficher le guide</span>
        </button>

        {/* Divider */}
        <div className={`my-3 border-t ${isDark ? 'border-white/[0.08]' : 'border-zinc-200'}`} />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut size={16} />
          <span className="text-sm font-medium">Se deconnecter</span>
        </button>

        {/* Version */}
        <p className={`text-center text-[10px] mt-4 ${textMuted}`}>
          AltCtrl.Lab &middot; Cockpit v2
        </p>
      </motion.div>
    </div>
  );
}
