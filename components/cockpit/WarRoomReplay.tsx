'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';

interface ReplayEvent {
  timestamp: string;
  status: string;
  agent?: string;
  stage?: string;
  data?: Record<string, unknown>;
}

interface WarRoomReplayProps {
  isDark: boolean;
}

const PHASE_COLORS: Record<string, string> = {
  WAR_ROOM_STARTED: 'bg-indigo-500',
  WAR_ROOM_EXPLORATION: 'bg-cyan-500',
  WAR_ROOM_DEBATE: 'bg-amber-500',
  WAR_ROOM_DECISION: 'bg-purple-500',
  WAR_ROOM_EXECUTION: 'bg-emerald-500',
  WAR_ROOM_COMPLETE: 'bg-green-500',
  WAR_ROOM_FAILED: 'bg-red-500',
};

export function WarRoomReplay({ isDark }: WarRoomReplayProps) {
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/supervisor/state')
      .then(r => r.json())
      .then(data => {
        if (data.eventHistory) {
          setEvents(data.eventHistory);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!playing || events.length === 0) return;
    const iv = setInterval(() => {
      setCurrentIndex(i => {
        if (i >= events.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 1500);
    return () => clearInterval(iv);
  }, [playing, events.length]);

  const warRoomEvents = useMemo(() =>
    events.filter(e => e.status.startsWith('WAR_ROOM')),
    [events]
  );

  const textH = isDark ? 'text-white' : 'text-neutral-900';
  const textM = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const glass = isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-neutral-200';

  const currentEvent = warRoomEvents[currentIndex];

  return (
    <div className="h-full flex flex-col p-1">
      <h1 className={`text-2xl font-bold mb-2 ${textH}`}>Rejeu War Room</h1>
      <p className={`text-sm mb-4 ${textM}`}>Revivez les sessions War Room passées</p>

      {loading ? (
        <div className={`text-center py-12 ${textM}`}>Chargement de l'historique...</div>
      ) : warRoomEvents.length === 0 ? (
        <div className={`flex-1 rounded-2xl border ${glass} flex items-center justify-center`}>
          <div className="text-center">
            <Clock size={32} className={`mx-auto mb-3 ${textM} opacity-40`} />
            <p className={textM}>Aucune session War Room enregistrée</p>
            <p className={`text-xs mt-1 ${textM}`}>Lancez une mission full_agency pour créer un historique</p>
          </div>
        </div>
      ) : (
        <>
          {/* Timeline scrubber */}
          <div className={`rounded-xl border ${glass} p-4 mb-4`}>
            <div className="flex items-center gap-2 mb-3">
              {warRoomEvents.map((e, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentIndex(i); setPlaying(false); }}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    i <= currentIndex
                      ? (PHASE_COLORS[e.status] || 'bg-neutral-500')
                      : isDark ? 'bg-white/[0.08]' : 'bg-neutral-200'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => { setCurrentIndex(0); setPlaying(false); }} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}>
                <SkipBack size={16} className={textM} />
              </button>
              <button
                onClick={() => setPlaying(!playing)}
                className="p-3 rounded-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button onClick={() => setCurrentIndex(Math.min(currentIndex + 1, warRoomEvents.length - 1))} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'}`}>
                <SkipForward size={16} className={textM} />
              </button>
              <span className={`text-xs font-mono ${textM} ml-2`}>{currentIndex + 1}/{warRoomEvents.length}</span>
            </div>
          </div>

          {/* Current event detail */}
          {currentEvent && (
            <div className={`flex-1 rounded-2xl border ${glass} p-5 overflow-y-auto`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${PHASE_COLORS[currentEvent.status] || 'bg-neutral-500'}`} />
                <span className={`text-lg font-semibold ${textH}`}>{currentEvent.status.replace('WAR_ROOM_', '')}</span>
                <span className={`text-xs font-mono ${textM} ml-auto`}>
                  {new Date(currentEvent.timestamp).toLocaleTimeString('fr-FR')}
                </span>
              </div>
              {currentEvent.agent && (
                <p className={`text-sm ${textM} mb-2`}>Agent: <span className={textH}>{currentEvent.agent}</span></p>
              )}
              {currentEvent.stage && (
                <p className={`text-sm ${textM} mb-2`}>Étape: <span className={textH}>{currentEvent.stage}</span></p>
              )}
              {currentEvent.data && (
                <pre className={`text-xs font-mono p-3 rounded-lg mt-3 overflow-x-auto ${isDark ? 'bg-black/40 text-neutral-300' : 'bg-neutral-50 text-neutral-700'}`}>
                  {JSON.stringify(currentEvent.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
