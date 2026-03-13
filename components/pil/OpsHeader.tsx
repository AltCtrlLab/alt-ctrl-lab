'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Command, Cpu, Wifi, WifiOff, User, FileText, Database as DbIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUniversalSearch, SearchResult } from '@/hooks/useUniversalSearch';

interface OpsHeaderProps {
  isDark: boolean;
  selectedService: string;
  setSelectedService: (service: string) => void;
  systemLoad?: string;
  isConnected?: boolean;
  onNavigate?: (view: string) => void;
}

const getTheme = (isDark: boolean) => ({
  glass: isDark
    ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50'
    : 'bg-white/60 border-white/40 shadow-neutral-200/50',
  glassHover: isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-white/80',
  textMuted: isDark ? 'text-neutral-400' : 'text-neutral-500',
  textMain: isDark ? 'text-neutral-200' : 'text-neutral-800',
});

const services = [
  { id: 'full', icon: '🏢', label: 'Agence Complète' },
  { id: 'branding', icon: '🎨', label: 'Branding' },
  { id: 'web', icon: '💻', label: 'Web Dev' },
  { id: 'marketing', icon: '📈', label: 'Marketing' },
  { id: 'data', icon: '⚙️', label: 'Data' },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  agent: User,
  task: FileText,
  vault: DbIcon,
};

export const OpsHeader: React.FC<OpsHeaderProps> = ({
  isDark,
  selectedService,
  setSelectedService,
  systemLoad = '0.0 T/s',
  isConnected = false,
  onNavigate,
}) => {
  const t = getTheme(isDark);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const { results, loading, search, clear } = useUniversalSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => { setSelectedIdx(0); }, [results]);

  const handleSelect = (result: SearchResult) => {
    onNavigate?.(result.view);
    setSearchOpen(false);
    setQuery('');
    clear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[selectedIdx]) { handleSelect(results[selectedIdx]); }
    else if (e.key === 'Escape') { setSearchOpen(false); setQuery(''); clear(); }
  };

  return (
    <div className="flex gap-4 items-center">
      {/* Service Selector */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`flex-1 backdrop-blur-xl rounded-full shadow-2xl border transition-all duration-500 ${t.glass} p-1.5 flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden`}
      >
        {services.map(service => {
          const isActive = selectedService === service.id;
          return (
            <button key={service.id} onClick={() => setSelectedService(service.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium transition-all duration-300 whitespace-nowrap
                ${isActive
                  ? (isDark ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border border-white/10' : 'bg-white text-blue-600 shadow-sm border border-neutral-200')
                  : `${t.textMuted} hover:${t.textMain} ${t.glassHover} border border-transparent`}`}
            >
              <span className="opacity-80">{service.icon}</span>
              <span className="tracking-tight">{service.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Search Bar — Fonctionnelle */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="hidden lg:block relative"
        ref={dropdownRef}
      >
        <div
          onClick={() => { setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className={`flex items-center gap-3 px-4 py-3 backdrop-blur-xl rounded-full shadow-2xl border transition-all duration-500 ${t.glass} ${t.textMuted} cursor-text`}
        >
          <Search size={16} />
          {searchOpen ? (
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => { setSearchOpen(false); clear(); }, 200)}
              placeholder="Rechercher agents, tâches, vault..."
              className="bg-transparent outline-none text-sm w-48 text-white placeholder:text-neutral-500"
            />
          ) : (
            <span className="text-sm tracking-tight mr-4">Rechercher...</span>
          )}
          <div className={`flex items-center gap-1 px-2 py-1 rounded bg-black/5 ${isDark ? 'border-white/10' : 'border-neutral-200'} border text-[10px] font-mono`}>
            <Command size={10} /><span>K</span>
          </div>
        </div>

        {/* Dropdown résultats */}
        <AnimatePresence>
          {searchOpen && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`absolute top-full mt-2 right-0 w-80 rounded-xl border ${isDark ? 'bg-neutral-900/95 border-white/10' : 'bg-white border-neutral-200'} backdrop-blur-2xl shadow-2xl z-50 overflow-hidden`}
            >
              {results.map((r, i) => {
                const Icon = TYPE_ICONS[r.type] || FileText;
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onMouseDown={() => handleSelect(r)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      i === selectedIdx ? (isDark ? 'bg-white/[0.08]' : 'bg-neutral-100') : ''
                    } ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-neutral-50'}`}
                  >
                    <Icon size={14} className={t.textMuted} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>{r.title}</p>
                      <p className={`text-xs truncate ${t.textMuted}`}>{r.subtitle}</p>
                    </div>
                    <span className={`text-[10px] uppercase ${t.textMuted}`}>{r.type}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* System Load */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`px-5 py-3 backdrop-blur-xl rounded-full shadow-2xl border transition-all duration-500 ${t.glass} flex items-center gap-4`}
      >
        <div className="flex flex-col">
          <span className={`text-[10px] font-mono uppercase tracking-widest ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Charge Système</span>
          <span className={`text-sm font-semibold font-mono ${t.textMain}`}>{systemLoad}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border border-blue-500/30 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-[spin_3s_linear_infinite]" />
            <Cpu size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          </div>
          {isConnected ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-rose-500" />}
        </div>
      </motion.div>
    </div>
  );
};

export default OpsHeader;
