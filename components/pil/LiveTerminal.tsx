'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Pause, Play, Filter } from 'lucide-react';
import { useCockpitContext } from '@/providers/CockpitStreamProvider';

export function LiveTerminal() {
  const { timeline, connected } = useCockpitContext();
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = filter === 'all'
    ? timeline
    : filter === 'warroom'
      ? timeline.filter(e => e.status.startsWith('WAR_ROOM'))
      : timeline.filter(e => !e.status.startsWith('WAR_ROOM'));

  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [timeline.length, paused]);

  const statusColor = (s: string) => {
    if (s.includes('COMPLETED')) return 'text-emerald-400';
    if (s.includes('FAILED') || s.includes('ERROR')) return 'text-red-400';
    if (s.includes('WAR_ROOM')) return 'text-indigo-400';
    if (s.includes('QA')) return 'text-amber-400';
    if (s.includes('RUNNING') || s.includes('EXECUTING') || s.includes('DRAFTING')) return 'text-cyan-400';
    return 'text-neutral-500';
  };

  return (
    <div className="rounded-2xl border bg-black/80 border-white/[0.08] overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-emerald-400" />
          <span className="text-sm font-medium text-white/80">Terminal en Direct</span>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-[10px] bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-neutral-300 outline-none"
          >
            <option value="all">Tous Événements</option>
            <option value="warroom">War Room</option>
            <option value="tasks">Tâches Seulement</option>
          </select>
          <button onClick={() => setPaused(!paused)} className="p-1.5 rounded hover:bg-white/10 text-neutral-400">
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
      </div>

      {/* Terminal body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {filtered.length === 0 ? (
          <div className="text-neutral-600 py-8 text-center">
            <p>En attente d'événements...</p>
            <p className="text-neutral-700 mt-1">$ tail -f /api/agents/stream</p>
          </div>
        ) : (
          filtered.map(event => (
            <div key={event.id} className="flex gap-2 py-0.5 hover:bg-white/[0.02] rounded px-1">
              <span className="text-neutral-600 shrink-0">
                {event.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`shrink-0 ${statusColor(event.status)}`}>
                [{event.status}]
              </span>
              <span className="text-neutral-400 truncate">
                {event.agent || 'system'} — {event.stage}
              </span>
            </div>
          ))
        )}
        {/* Cursor */}
        {!paused && <div className="flex items-center gap-1 text-emerald-500 pt-1"><span>$</span><span className="w-2 h-4 bg-emerald-500 animate-pulse" /></div>}
      </div>
    </div>
  );
}
