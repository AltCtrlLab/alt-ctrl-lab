'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStatusCapsule } from '@/hooks/useStatusCapsule';
import { getStoredDarkMode } from '@/lib/theme';

const DAY_NAMES = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatDate(d: Date) {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(d: Date) {
  return d.toTimeString().slice(0, 8); // HH:MM:SS
}

export function StatusCapsule() {
  const { weather, now, serverOk } = useStatusCapsule();
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(getStoredDarkMode());
    setMounted(true);

    // Sync with sidebar dark mode changes
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'altctrl-dark-mode') {
        setIsDark(e.newValue !== 'false');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!mounted) return null;

  const glass = isDark
    ? 'bg-white/[0.04] border-white/[0.09] shadow-black/50'
    : 'bg-white/75 border-white/60 shadow-neutral-200/60';

  const textMuted = isDark ? 'text-neutral-500' : 'text-neutral-400';
  const textMain = isDark ? 'text-zinc-100' : 'text-zinc-800';
  const divider = isDark ? 'border-white/[0.07]' : 'border-neutral-200';

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.3 }}
      className={`fixed bottom-6 right-6 z-30 hidden md:block w-56 rounded-2xl border backdrop-blur-xl shadow-2xl overflow-hidden ${glass}`}
    >
      {/* MÉTÉO — moitié haute */}
      <div className="px-4 pt-3 pb-2.5">
        {weather ? (
          <>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none">{weather.emoji}</span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-lg font-bold leading-none ${textMain}`}>
                    {weather.temperature}°C
                  </span>
                  <span className={`text-xs truncate ${textMuted}`}>{weather.label}</span>
                </div>
                <p className={`text-[11px] mt-0.5 ${textMuted}`}>
                  Paris &middot; 💨 {weather.windspeed} km/h
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">🌡️</span>
            <div>
              <div className={`text-sm font-medium ${textMuted}`}>Chargement…</div>
              <p className={`text-[11px] mt-0.5 ${textMuted}`}>Paris</p>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={`mx-3 border-t ${divider}`} />

      {/* STATUT + DATE/HEURE — moitié basse */}
      <div className="px-4 pt-2.5 pb-3">
        {/* Server status + date */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                serverOk === null
                  ? 'bg-neutral-500'
                  : serverOk
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                  : 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]'
              }`}
            />
            <span className={`text-[11px] font-medium ${serverOk === false ? 'text-rose-400' : textMuted}`}>
              {serverOk === null ? 'Vérification…' : serverOk ? 'Connecté' : 'Hors ligne'}
            </span>
          </div>
          <span className={`text-[11px] ${textMuted}`}>{formatDate(now)}</span>
        </div>

        {/* Live clock */}
        <p className={`text-center font-mono text-base font-semibold tracking-widest ${textMain}`}>
          {formatTime(now)}
        </p>
      </div>
    </motion.div>
  );
}

export default StatusCapsule;
