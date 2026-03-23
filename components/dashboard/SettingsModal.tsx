'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Sun, Moon, HelpCircle, RotateCcw } from 'lucide-react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';
import { resetOnboarding } from '@/components/ui/OnboardingTour';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export function SettingsModal({ open, onClose, isDark, onToggleDark }: SettingsModalProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const glass = isDark
    ? 'bg-zinc-900/90 border-white/[0.1]'
    : 'bg-white/90 border-zinc-200';
  const textMain = isDark ? 'text-zinc-100' : 'text-zinc-900';
  const textMuted = isDark ? 'text-zinc-400' : 'text-zinc-400';
  const btnHover = isDark
    ? 'hover:bg-white/[0.06] text-zinc-300'
    : 'hover:bg-zinc-100 text-zinc-600';

  return (
    <AdaptiveModal isOpen={open} onClose={onClose} title="Parametres" maxWidth="max-w-md">
      {/* Theme toggle */}
      <div className="p-5">
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
          <span className="text-sm">Relancer la visite guidee</span>
        </button>

        {/* Re-show guide */}
        <button
          onClick={() => { localStorage.removeItem('acl-guide-dismissed'); onClose(); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${btnHover}`}
        >
          <HelpCircle size={16} />
          <span className="text-sm">Reafficher le guide</span>
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
      </div>
    </AdaptiveModal>
  );
}
