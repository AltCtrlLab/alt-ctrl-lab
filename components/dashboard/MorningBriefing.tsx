'use client';

import { useState, useEffect } from 'react';
import { Sun, AlertTriangle, Lightbulb, CalendarDays, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BriefingData {
  greeting: string;
  summary: string;
  urgent: string[];
  recommended: string[];
  today: string[];
  generatedAt: number;
}

export function MorningBriefing() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  // Only show in the morning (before 14h)
  const hour = new Date().getHours();
  const showBriefing = hour < 14;

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/morning-briefing');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('MorningBriefing load error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (!showBriefing && !data) return null;
  if (loading) {
    return (
      <div className="rounded-xl border border-fuchsia-500/15 bg-fuchsia-950/10 p-4">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-fuchsia-400 animate-pulse" />
          <span className="text-sm text-zinc-400">Génération du Morning Briefing...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalUrgent = data.urgent?.length ?? 0;
  const totalActions = totalUrgent + (data.recommended?.length ?? 0) + (data.today?.length ?? 0);

  return (
    <div className="rounded-xl border border-fuchsia-500/15 bg-fuchsia-950/10">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-fuchsia-400" />
          <span className="text-sm font-semibold text-zinc-100">Morning Briefing</span>
          {totalUrgent > 0 && (
            <span className="text-xs bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded">
              {totalUrgent} urgent{totalUrgent > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); load(); }}
            className="text-zinc-400 hover:text-zinc-400 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-sm text-zinc-300">{data.greeting}</p>
              <p className="text-xs text-zinc-400">{data.summary}</p>

              {data.urgent?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs font-semibold text-rose-400">Urgent</span>
                  </div>
                  <ul className="space-y-1">
                    {data.urgent.map((item, i) => (
                      <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                        <span className="text-rose-400 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.recommended?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-400">Recommandations</span>
                  </div>
                  <ul className="space-y-1">
                    {data.recommended.map((item, i) => (
                      <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.today?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold text-cyan-400">Aujourd'hui</span>
                  </div>
                  <ul className="space-y-1">
                    {data.today.map((item, i) => (
                      <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
