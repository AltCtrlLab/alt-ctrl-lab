'use client';

import React from 'react';
import { TerminalSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface WarRoomProps {
  isDark: boolean;
  logs?: Array<{
    id: number;
    time: string;
    agent: string;
    role: string;
    message: string;
    status: 'VALIDATED' | 'REJECTED' | 'EXECUTING' | 'PENDING';
  }>;
  tasks?: any[];
  swarmStatus?: { active: boolean; workers: number } | null;
}

const getTheme = (isDark: boolean) => ({
  glass: isDark 
    ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50' 
    : 'bg-white/60 border-white/40 shadow-neutral-200/50',
  textMuted: isDark ? 'text-neutral-400' : 'text-neutral-500',
  textMain: isDark ? 'text-neutral-200' : 'text-neutral-800',
  textHeading: isDark ? 'text-neutral-100' : 'text-neutral-900',
  borderLight: isDark ? 'border-white/[0.05]' : 'border-neutral-200/60',
  cardBg: isDark ? 'bg-black/20' : 'bg-white/50',
});

const getStatusBadge = (status: string, isDark: boolean) => {
  switch (status) {
    case 'VALIDATED':
      return <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono rounded border ${isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>[VALIDATED]</span>;
    case 'REJECTED':
      return <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono rounded border ${isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>[REJECTED]</span>;
    case 'EXECUTING':
    case 'EXECUTOR_SWARMING':
      return <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono rounded border ${isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-cyan-100 text-cyan-700 border-cyan-200 shadow-sm'}`}>[SWARMING]</span>;
    case 'EXECUTOR_SYNTHESIZING':
      return <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono rounded border ${isDark ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 shadow-sm'}`}>[SYNTHESIZING]</span>;
    default:
      return <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono rounded border ${isDark ? 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' : 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>[PENDING]</span>;
  }
};

const defaultLogs = [
  { id: 1, time: '14:02:05', agent: 'OpenClaw', role: 'ORCHESTRATOR', message: 'Analyse du brief client et découpage des tâches.', status: 'VALIDATED' as const },
  { id: 2, time: '14:02:08', agent: 'Musawwir', role: 'BRANDING', message: 'Génération de la palette colorimétrique.', status: 'EXECUTING' as const },
  { id: 3, time: '14:02:12', agent: 'Fatah', role: 'MARKETING', message: 'Draft du copy de la landing page.', status: 'REJECTED' as const },
  { id: 4, time: '14:02:15', agent: 'Fatah', role: 'MARKETING', message: 'Correction du ton : plus agressif exigé.', status: 'EXECUTING' as const },
  { id: 5, time: '14:02:20', agent: 'Hasib', role: 'DATA', message: 'Préparation du tracking server-side.', status: 'PENDING' as const },
];

export const WarRoom: React.FC<WarRoomProps> = ({ 
  isDark,
  logs = defaultLogs,
  tasks = [],
  swarmStatus = null
}) => {
  const t = getTheme(isDark);

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className={`flex-1 flex flex-col overflow-hidden relative h-full backdrop-blur-xl rounded-3xl shadow-2xl border transition-all duration-500 ${t.glass}`}
    >
      {/* Ambient top gradient */}
      <div className={`absolute top-0 w-full h-32 bg-gradient-to-b ${isDark ? 'from-cyan-900/10' : 'from-cyan-100/30'} to-transparent pointer-events-none transition-colors duration-500`} />
      
      {/* Header */}
      <div className={`px-5 py-4 border-b ${t.borderLight} flex flex-col gap-2 relative z-10`}>
        <div className="flex justify-between items-center">
          <h2 className={`${t.textHeading} font-medium tracking-tight flex items-center gap-2`}>
            <TerminalSquare size={16} className={t.textMuted} />
            QA Loop
            {swarmStatus?.active && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono ${isDark ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30' : 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200'} animate-pulse`}>
                ⚡ SWARM {swarmStatus.workers} workers
              </span>
            )}
          </h2>
          <div className="flex gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-neutral-300'}`} />
            <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-neutral-300'}`} />
            <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-neutral-300'}`} />
          </div>
        </div>
        
        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[11px] w-fit ${isDark ? 'bg-neutral-900/50 border-white/5 text-neutral-300' : 'bg-white/80 border-neutral-200 text-neutral-700'}`}>
          <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>Matin</span>
          <span className="text-yellow-500">⚡</span>
          <span>Banna</span>
          <span className={t.textMuted}>::</span>
          <span className={`font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>DIRECTOR_QA</span>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-4 scrollbar-hide">
        {logs.map((log, idx) => (
          <motion.div 
            key={log.id} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex flex-col gap-1.5"
          >
            <div className={`flex items-center gap-2 ${t.textMuted}`}>
              <span>{log.time}</span>
              <span className={isDark ? "text-neutral-700" : "text-neutral-300"}>|</span>
              <span className={isDark ? "text-neutral-300" : "text-neutral-700"}>{log.agent}</span>
              <span className="text-[10px] opacity-70">({log.role})</span>
            </div>
            <div className={`flex items-start justify-between gap-3 pl-2 border-l ${isDark ? 'border-white/10' : 'border-neutral-300'}`}>
              <span className={`${isDark ? 'text-neutral-300' : 'text-neutral-700'} leading-relaxed`}>{log.message}</span>
              <div className="shrink-0 pt-0.5">
                {getStatusBadge(log.status, isDark)}
              </div>
            </div>
          </motion.div>
        ))}
        
        {/* Cursor */}
        <div className={`flex items-center gap-2 ${t.textMuted} mt-6 pl-2`}>
          <span>{'>'}</span>
          <div className="w-2 h-3 bg-cyan-500 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
};

export default WarRoom;
