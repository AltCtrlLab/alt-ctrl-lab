'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, ClipboardList, Archive, Loader2 } from 'lucide-react';
import { useUniversalSearch } from '@/hooks/useUniversalSearch';
import { getStoredDarkMode } from '@/lib/theme';

const TYPE_ICON: Record<string, React.ElementType> = {
  agent: Users,
  task: ClipboardList,
  vault: Archive,
};

const TYPE_ROUTE: Record<string, string> = {
  roster: '/pil',
  kanban: '/pil',
  assets: '/pil',
};

export function SearchPill() {
  const router = useRouter();
  const { results, loading, search, clear } = useUniversalSearch();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(getStoredDarkMode());
    setMounted(true);
  }, []);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && focused) {
        inputRef.current?.blur();
        setFocused(false);
        clear();
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [focused, clear]);

  // Click outside to close
  useEffect(() => {
    if (!focused) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
        clear();
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [focused, clear]);

  const handleChange = (val: string) => {
    setQuery(val);
    search(val);
  };

  const handleSelect = (view: string) => {
    const route = TYPE_ROUTE[view] || `/${view}`;
    router.push(route);
    setFocused(false);
    clear();
    setQuery('');
  };

  if (!mounted) return null;

  const glass = isDark
    ? 'bg-white/[0.05] border-white/[0.1] shadow-black/40'
    : 'bg-white/80 border-white/60 shadow-neutral-200/50';
  const textMain = isDark ? 'text-zinc-100' : 'text-zinc-800';
  const textMuted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const dropGlass = isDark
    ? 'bg-zinc-900/95 border-white/[0.1]'
    : 'bg-white/95 border-zinc-200';

  const showResults = focused && query.length >= 2;

  return (
    <motion.div
      ref={containerRef}
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.4 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 hidden md:block w-[90vw] max-w-lg"
    >
      {/* Results dropdown (above pill) */}
      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`mb-2 rounded-2xl border backdrop-blur-xl shadow-2xl overflow-hidden ${dropGlass}`}
          >
            {results.map((r) => {
              const Icon = TYPE_ICON[r.type] || ClipboardList;
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r.view)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-zinc-50'
                  }`}
                >
                  <Icon size={15} className={textMuted} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${textMain}`}>{r.title}</p>
                    <p className={`text-[11px] truncate ${textMuted}`}>{r.subtitle}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-medium ${textMuted}`}>{r.type}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results message */}
      <AnimatePresence>
        {showResults && !loading && results.length === 0 && (
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className={`mb-2 rounded-2xl border backdrop-blur-xl shadow-2xl px-4 py-3 text-center ${dropGlass}`}
          >
            <p className={`text-sm ${textMuted}`}>Aucun resultat pour &ldquo;{query}&rdquo;</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search pill */}
      <div
        className={`relative flex items-center gap-3 px-5 py-3.5 rounded-full border backdrop-blur-xl shadow-2xl transition-all duration-200 ${glass} ${
          focused ? (isDark ? 'border-white/[0.2] bg-white/[0.08]' : 'border-zinc-300 bg-white/90') : ''
        }`}
      >
        {loading ? (
          <Loader2 size={17} className={`shrink-0 animate-spin ${textMuted}`} />
        ) : (
          <Search size={17} className={`shrink-0 ${textMuted}`} />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Rechercher..."
          className={`flex-1 bg-transparent outline-none text-sm ${textMain} placeholder:${textMuted}`}
        />
        <kbd className={`hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono ${
          isDark ? 'bg-white/[0.06] text-zinc-500' : 'bg-zinc-100 text-zinc-400'
        }`}>
          Ctrl+K
        </kbd>
      </div>
    </motion.div>
  );
}
