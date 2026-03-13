'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StatusBadge } from './StatusBadge';
import { Agent, Status } from './types';

interface AgentListProps {
  agents?: Agent[];
  onAgentClick?: (agentId: string) => void;
  className?: string;
}

const mockAgents: Agent[] = [
  { id: 'abdulhakim', name: 'AbdulHakim', status: 'running', lastSeen: new Date() },
  { id: 'musawwir', name: 'Musawwir', status: 'idle', lastSeen: new Date(Date.now() - 300000) },
  { id: 'matin', name: 'Matin', status: 'completed', lastSeen: new Date() },
  { id: 'fatah', name: 'Fatah', status: 'running', lastSeen: new Date() },
  { id: 'hasib', name: 'Hasib', status: 'idle', lastSeen: new Date(Date.now() - 600000) },
  { id: 'raqim', name: 'Raqim', status: 'paused', lastSeen: new Date() },
  { id: 'banna', name: 'Banna', status: 'running', lastSeen: new Date() },
  { id: 'khatib', name: 'Khatib', status: 'idle', lastSeen: new Date(Date.now() - 900000) },
  { id: 'sani', name: 'Sani', status: 'completed', lastSeen: new Date() },
];

const statusOrder: Record<Status, number> = {
  error: 0,
  running: 1,
  paused: 2,
  idle: 3,
  completed: 4,
};

const getRoleBadge = (id: string): { text: string; color: string } => {
  if (id === 'abdulhakim') return { text: 'CEO', color: 'bg-indigo-500' };
  if (['musawwir', 'matin', 'fatah', 'hasib'].includes(id)) return { text: 'Director', color: 'bg-purple-500' };
  return { text: 'Executor', color: 'bg-emerald-500' };
};

export const AgentList: React.FC<AgentListProps> = ({ 
  agents = mockAgents,
  onAgentClick,
  className = '' 
}) => {
  const sortedAgents = [...agents].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const formatLastSeen = (date?: Date): string => {
    if (!date) return 'Jamais';
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    return `Il y a ${Math.floor(minutes / 60)}h`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <h2 className="font-semibold text-white">Agents ({agents.length})</h2>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>
      
      <div className="divide-y divide-neutral-800/50">
        {sortedAgents.map((agent, index) => {
          const role = getRoleBadge(agent.id);
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onAgentClick?.(agent.id)}
              whileHover={{ backgroundColor: 'rgba(38, 38, 38, 0.5)' }}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group"
            >
              {/* Avatar avec gradient */}
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-neutral-900 ${
                  agent.status === 'running' ? 'bg-emerald-500 animate-pulse' :
                  agent.status === 'error' ? 'bg-red-500' :
                  agent.status === 'paused' ? 'bg-amber-500' :
                  agent.status === 'completed' ? 'bg-blue-500' :
                  'bg-neutral-500'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white truncate">{agent.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${role.color} text-white font-medium`}>
                    {role.text}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">{formatLastSeen(agent.lastSeen)}</p>
              </div>
              
              <StatusBadge status={agent.status} size="sm" />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AgentList;
