'use client';

import React from 'react';
import { BrainCircuit, Zap, Target, ShieldCheck, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface TeamRosterProps {
  isDark: boolean;
  agents?: Array<{
    id: string;
    name: string;
    role: string;
    bio: string;
    icon: string;
    level: number;
    xpProgress: number;
    successRate: number;
    tokens: string;
    perks: string[];
    isCEO?: boolean;
    color: string;
    shadow: string;
  }>;
  stats?: {
    totalTokens: number;
    qaRate: string;
  };
  onAgentClick?: (agentId: string) => void;
}

const getTheme = (isDark: boolean) => ({
  glass: isDark 
    ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50' 
    : 'bg-white/60 border-white/40 shadow-neutral-200/50',
  glassHover: isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-white/80',
  textMuted: isDark ? 'text-neutral-400' : 'text-neutral-500',
  textMain: isDark ? 'text-neutral-200' : 'text-neutral-800',
  textHeading: isDark ? 'text-neutral-100' : 'text-neutral-900',
  borderLight: isDark ? 'border-white/[0.05]' : 'border-neutral-200/60',
  cardBg: isDark ? 'bg-black/20' : 'bg-white/50',
  ambient: isDark ? 'bg-blue-900/10' : 'bg-blue-400/5',
});

// XP Ring Component
const XPRing = ({ progress, icon, colorClass, shadowClass, isDark }: {
  progress: number;
  icon: string;
  colorClass: string;
  shadowClass: string;
  isDark: boolean;
}) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg className="absolute inset-0 w-full h-full transform -rotate-90">
        <circle cx="28" cy="28" r={radius} fill="none" className={isDark ? "stroke-white/5" : "stroke-black/5"} strokeWidth="3" />
        <circle 
          cx="28" cy="28" r={radius} fill="none" 
          className={`stroke-current ${colorClass} ${isDark ? shadowClass : ''} transition-all duration-1000 ease-out`}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-xl z-10 opacity-90">{icon}</div>
    </div>
  );
};

const agents = [
  {
    id: 'ceo', name: 'AbdulHakim', role: 'Directeur Général',
    bio: 'Orchestration stratégique & vision globale.', icon: '👑',
    level: 99, xpProgress: 100, successRate: 99.8, tokens: '12.4M',
    perks: ['Flux AGI', 'Mode Dieu'], isCEO: true, color: 'text-yellow-500', shadow: 'drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]'
  },
  {
    id: 'musawwir', name: 'Musawwir', role: 'Chef de Branding',
    bio: 'Création d\'identités visuelles et DA.', icon: '🎨',
    level: 42, xpProgress: 65, successRate: 92.4, tokens: '2.1M',
    perks: ['Visuel Zero-Shot', 'Psychologie Couleur'], color: 'text-purple-500', shadow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
  },
  {
    id: 'matin', name: 'Matin', role: 'Ingénieur Web Principal',
    bio: 'Architecture frontend et performance.', icon: '💻',
    level: 56, xpProgress: 88, successRate: 96.1, tokens: '4.8M',
    perks: ['Refactoring Code+', 'Auto-Réparation'], color: 'text-blue-500', shadow: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]'
  },
  {
    id: 'fatah', name: 'Fatah', role: 'Croissance & Marketing',
    bio: 'Acquisition et Copywriting.', icon: '📈',
    level: 38, xpProgress: 42, successRate: 88.5, tokens: '1.9M',
    perks: ['Génération Virale', 'Tests A/B'], color: 'text-emerald-500', shadow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
  },
  {
    id: 'hasib', name: 'Hasib', role: 'Scientifique Données',
    bio: 'Analyse prédictive et tracking.', icon: '⚙️',
    level: 49, xpProgress: 75, successRate: 94.2, tokens: '3.6M',
    perks: ['Analytique Profonde', 'Reconn. Motifs'], color: 'text-cyan-500', shadow: 'drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]'
  },
  {
    id: 'banna', name: 'Banna', role: 'Directeur QA',
    bio: 'Validation stricte des livrables.', icon: '⚡',
    level: 60, xpProgress: 30, successRate: 98.9, tokens: '8.2M',
    perks: ['Révision Impitoyable', 'Audit Sécurité'], color: 'text-rose-500', shadow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'
  },
];

export const TeamRoster: React.FC<TeamRosterProps> = ({ 
  isDark,
  agents = [],
  stats = { totalTokens: 33000000, qaRate: '94.8' },
  onAgentClick
}) => {
  const t = getTheme(isDark);

  // Format tokens
  const formatTokens = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-20 px-2">
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className={`${t.textHeading} text-2xl font-semibold tracking-tight flex items-center gap-3`}>
            <BrainCircuit className={isDark ? "text-blue-500" : "text-blue-600"} /> 
            Evolution Synaptique
          </h1>
          <p className={`${t.textMuted} text-sm mt-1`}>Supervision du Roster et fine-tuning par renforcement positif.</p>
        </div>
        
        <div className="flex gap-4">
          <div className={`${t.glass} backdrop-blur-xl rounded-2xl border px-4 py-2 flex items-center gap-3 shadow-sm`}>
            <Zap size={16} className={isDark ? "text-yellow-500" : "text-yellow-600"} />
            <div>
              <p className={`text-[10px] ${t.textMuted} font-mono uppercase`}>Total Tokens</p>
              <p className={`text-sm ${t.textHeading} font-semibold font-mono`}>{formatTokens(stats.totalTokens)}</p>
            </div>
          </div>

          <div className={`${t.glass} backdrop-blur-xl rounded-2xl border px-4 py-2 flex items-center gap-3 shadow-sm`}>
            <Target size={16} className={isDark ? "text-emerald-500" : "text-emerald-600"} />
            <div>
              <p className={`text-[10px] ${t.textMuted} font-mono uppercase`}>Taux QA Global</p>
              <p className={`text-sm ${t.textHeading} font-semibold font-mono`}>{stats.qaRate}%</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {agents.map((agent, idx) => (
          <motion.div 
            key={agent.id} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onAgentClick?.(agent.id)}
            className={`
              ${t.glass} backdrop-blur-xl rounded-3xl border p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer
              ${agent.isCEO 
                ? (isDark 
                    ? 'ring-1 ring-yellow-500/30 bg-white/[0.02] hover:bg-white/[0.04] shadow-[0_0_30px_rgba(234,179,8,0.05)]' 
                    : 'ring-1 ring-yellow-400/50 bg-white hover:bg-white shadow-[0_5px_20px_rgba(234,179,8,0.15)]') 
                : t.glassHover}
            `}
          >
            {agent.isCEO && <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500/0 ${isDark ? 'via-yellow-500/50' : 'via-yellow-400'} to-yellow-500/0`} />}
            
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <XPRing progress={agent.xpProgress} icon={agent.icon} colorClass={agent.color} shadowClass={agent.shadow} isDark={isDark} />
                <div>
                  <h3 className={`font-medium text-lg tracking-tight flex items-center gap-2 ${agent.isCEO ? (isDark ? 'text-yellow-400' : 'text-yellow-700') : t.textHeading}`}>
                    {agent.name}
                    <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-white/10 text-white border-white/20' : 'bg-neutral-100 text-neutral-800 border-neutral-200'} text-[10px] font-mono border`}>
                      Lv.{agent.level}
                    </span>
                  </h3>
                  <p className={`text-xs ${t.textMuted} font-mono mt-0.5`}>{agent.role}</p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className={`text-sm ${t.textMain} opacity-90 leading-relaxed border-l-2 ${isDark ? 'border-white/10' : 'border-neutral-200'} pl-3`}>
              {agent.bio}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className={`${t.cardBg} rounded-xl p-3 border ${t.borderLight} flex flex-col gap-1 shadow-sm`}>
                <div className={`flex items-center gap-1.5 ${t.textMuted} text-xs font-mono`}>
                  <ShieldCheck size={12} className={agent.successRate > 95 ? (isDark ? 'text-emerald-500' : 'text-emerald-600') : (isDark ? 'text-yellow-500' : 'text-yellow-600')} />
                  Taux Réussite
                </div>
                <div className={`text-lg font-semibold ${t.textHeading} tracking-tight`}>{agent.successRate}%</div>
              </div>

              <div className={`${t.cardBg} rounded-xl p-3 border ${t.borderLight} flex flex-col gap-1 shadow-sm`}>
                <div className={`flex items-center gap-1.5 ${t.textMuted} text-xs font-mono`}>
                  <TrendingUp size={12} className={isDark ? "text-blue-500" : "text-blue-600"} />
                  Tokens
                </div>
                <div className={`text-lg font-semibold ${t.textHeading} tracking-tight`}>{agent.tokens}</div>
              </div>
            </div>

            {/* Perks */}
            <div className={`flex flex-col gap-2 mt-auto pt-4 border-t ${t.borderLight}`}>
              <span className={`text-[10px] ${t.textMuted} font-mono uppercase tracking-widest`}>Traits Actifs</span>
              <div className="flex flex-wrap gap-2">
                {agent.perks.map(perk => (
                  <span key={perk} className={`px-2.5 py-1 ${isDark ? 'bg-white/[0.03] text-neutral-300' : 'bg-white text-neutral-700'} border ${t.borderLight} rounded-md text-[11px] font-mono flex items-center gap-1.5 shadow-sm`}>
                    <div className={`w-1 h-1 rounded-full bg-current ${agent.color}`} />
                    {perk}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TeamRoster;
