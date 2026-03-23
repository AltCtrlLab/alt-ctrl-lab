'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, BarChart3, Target, Calendar } from 'lucide-react';

interface QuickSuggestionsProps {
  onSelect: (text: string) => void;
  contextual?: string[];
}

const DEFAULT_SUGGESTIONS = [
  { text: 'Résume ma semaine', icon: Calendar },
  { text: 'Analyse mon pipeline', icon: BarChart3 },
  { text: 'Stratégie Q2', icon: Target },
  { text: 'Quelles priorités aujourd\'hui ?', icon: Sparkles },
];

export function QuickSuggestions({ onSelect, contextual }: QuickSuggestionsProps) {
  const shouldReduce = useReducedMotion();
  const suggestions = contextual
    ? contextual.map((text) => ({ text, icon: Sparkles }))
    : DEFAULT_SUGGESTIONS;

  return (
    <div className="flex flex-col gap-2 px-1">
      {contextual && (
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1">Suggestions</p>
      )}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={s.text}
              initial={shouldReduce ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.3 }}
              onClick={() => onSelect(s.text)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:bg-white/[0.08] hover:border-fuchsia-500/20 hover:text-zinc-100 transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-fuchsia-400/70" />
              {s.text}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
