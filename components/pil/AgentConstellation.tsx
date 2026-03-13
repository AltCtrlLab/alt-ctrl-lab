'use client';

import React from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  type: 'director' | 'executor';
  director?: string;
}

interface AgentConstellationProps {
  isDark: boolean;
  agents: Agent[];
  tasks: { agentName: string; status: string }[];
  onAgentClick?: (agentId: string) => void;
}

const HIERARCHY: Record<string, string> = {
  raqim: 'musawwir',
  banna: 'matin',
  khatib: 'fatah',
  sani: 'hasib',
};

export function AgentConstellation({ isDark, agents, tasks, onAgentClick }: AgentConstellationProps) {
  const textH = isDark ? 'text-white' : 'text-neutral-900';
  const textM = isDark ? 'text-neutral-400' : 'text-neutral-500';

  const ceo = agents.find(a => a.id === 'abdulhakim');
  const directors = agents.filter(a => a.type === 'director' && a.id !== 'abdulhakim');
  const executors = agents.filter(a => a.type === 'executor');

  const runningAgents = new Set(
    tasks
      .filter(t => ['RUNNING', 'EXECUTING_SUBTASK', 'EXECUTOR_DRAFTING', 'DIRECTOR_PLANNING', 'DIRECTOR_QA'].includes(t.status))
      .flatMap(t => t.agentName.split('→'))
  );

  const cx = 300, cy = 250;
  const r1 = 100, r2 = 190;

  const directorPositions = directors.map((d, i) => {
    const angle = (i / directors.length) * Math.PI * 2 - Math.PI / 2;
    return { agent: d, x: cx + Math.cos(angle) * r1, y: cy + Math.sin(angle) * r1 };
  });

  const executorPositions = executors.map((e) => {
    const dirId = HIERARCHY[e.id];
    const dirPos = directorPositions.find(d => d.agent.id === dirId);
    if (!dirPos) return { agent: e, x: cx, y: cy + r2 };
    const angle = Math.atan2(dirPos.y - cy, dirPos.x - cx);
    return { agent: e, x: cx + Math.cos(angle) * r2, y: cy + Math.sin(angle) * r2 };
  });

  const typeColors: Record<string, string> = {
    director: isDark ? '#818cf8' : '#4f46e5',
    executor: isDark ? '#34d399' : '#059669',
    ceo: isDark ? '#fbbf24' : '#d97706',
  };

  return (
    <div className="h-full flex flex-col p-1">
      <h1 className={`text-2xl font-bold mb-4 ${textH}`}>Constellation des Agents</h1>
      <p className={`text-sm mb-4 ${textM}`}>Vue hiérarchique temps réel — CEO → Directeurs → Exécutants</p>

      <div className={`flex-1 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-neutral-200'} overflow-hidden flex items-center justify-center`}>
        <svg viewBox="0 0 600 500" className="w-full max-w-[600px]">
          {/* Lines CEO → Directors */}
          {directorPositions.map(dp => (
            <line key={`line-ceo-${dp.agent.id}`} x1={cx} y1={cy} x2={dp.x} y2={dp.y} stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth={1.5} />
          ))}
          {/* Lines Directors → Executors */}
          {executorPositions.map(ep => {
            const dirId = HIERARCHY[ep.agent.id];
            const dirPos = directorPositions.find(d => d.agent.id === dirId);
            if (!dirPos) return null;
            return <line key={`line-${dirId}-${ep.agent.id}`} x1={dirPos.x} y1={dirPos.y} x2={ep.x} y2={ep.y} stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={1} strokeDasharray="4 4" />;
          })}

          {/* CEO node */}
          {ceo && (
            <g onClick={() => onAgentClick?.(ceo.id)} className="cursor-pointer">
              <circle cx={cx} cy={cy} r={28} fill={typeColors.ceo} fillOpacity={0.15} stroke={typeColors.ceo} strokeWidth={2} />
              {runningAgents.has(ceo.id) && <circle cx={cx} cy={cy} r={32} fill="none" stroke={typeColors.ceo} strokeWidth={1} opacity={0.5}>
                <animate attributeName="r" values="32;38;32" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
              </circle>}
              <text x={cx} y={cy - 6} textAnchor="middle" fill={isDark ? 'white' : '#1a1a1a'} fontSize={16}>{ceo.emoji}</text>
              <text x={cx} y={cy + 14} textAnchor="middle" fill={isDark ? 'white' : '#1a1a1a'} fontSize={9} fontWeight="600">{ceo.name}</text>
            </g>
          )}

          {/* Director nodes */}
          {directorPositions.map(dp => {
            const isActive = runningAgents.has(dp.agent.id);
            return (
              <g key={dp.agent.id} onClick={() => onAgentClick?.(dp.agent.id)} className="cursor-pointer">
                <circle cx={dp.x} cy={dp.y} r={22} fill={typeColors.director} fillOpacity={0.12} stroke={typeColors.director} strokeWidth={1.5} />
                {isActive && <circle cx={dp.x} cy={dp.y} r={26} fill="none" stroke={typeColors.director} strokeWidth={1} opacity={0.5}>
                  <animate attributeName="r" values="26;32;26" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>}
                <text x={dp.x} y={dp.y - 4} textAnchor="middle" fill={isDark ? 'white' : '#1a1a1a'} fontSize={14}>{dp.agent.emoji}</text>
                <text x={dp.x} y={dp.y + 12} textAnchor="middle" fill={isDark ? '#a5b4fc' : '#4f46e5'} fontSize={8} fontWeight="500">{dp.agent.name}</text>
              </g>
            );
          })}

          {/* Executor nodes */}
          {executorPositions.map(ep => {
            const isActive = runningAgents.has(ep.agent.id);
            return (
              <g key={ep.agent.id} onClick={() => onAgentClick?.(ep.agent.id)} className="cursor-pointer">
                <circle cx={ep.x} cy={ep.y} r={18} fill={typeColors.executor} fillOpacity={0.1} stroke={typeColors.executor} strokeWidth={1} />
                {isActive && <circle cx={ep.x} cy={ep.y} r={22} fill="none" stroke={typeColors.executor} strokeWidth={1} opacity={0.5}>
                  <animate attributeName="r" values="22;28;22" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>}
                <text x={ep.x} y={ep.y - 2} textAnchor="middle" fill={isDark ? 'white' : '#1a1a1a'} fontSize={12}>{ep.agent.emoji}</text>
                <text x={ep.x} y={ep.y + 12} textAnchor="middle" fill={isDark ? '#6ee7b7' : '#059669'} fontSize={7} fontWeight="500">{ep.agent.name}</text>
              </g>
            );
          })}

          {/* Legend */}
          <g transform="translate(20, 460)">
            {[
              { label: 'CEO', color: typeColors.ceo },
              { label: 'Directeur', color: typeColors.director },
              { label: 'Exécutant', color: typeColors.executor },
            ].map((l, i) => (
              <g key={l.label} transform={`translate(${i * 120}, 0)`}>
                <circle cx={6} cy={6} r={5} fill={l.color} fillOpacity={0.3} stroke={l.color} strokeWidth={1} />
                <text x={16} y={10} fill={isDark ? '#a1a1aa' : '#71717a'} fontSize={9}>{l.label}</text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
