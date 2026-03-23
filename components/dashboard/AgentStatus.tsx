'use client';

import React from 'react';
import { Bot, Circle } from 'lucide-react';
import type { AgentType, Task } from '@/lib/schemas/agents';

interface AgentStatusProps {
  tasks: Task[];
}

const AGENTS: { id: AgentType; name: string; specialty: string }[] = [
  { id: 'Supervisor', name: 'Abdul Hakim', specialty: 'Supervisor/CTO' },
  { id: 'Branding_Agent', name: 'Abdul Musawwir', specialty: 'Branding/Design' },
  { id: 'WebDev_Agent', name: 'Abdul Matin', specialty: 'WebDev/Architecture' },
  { id: 'Marketing_Agent', name: 'Abdul Fatah', specialty: 'Growth/Marketing' },
  { id: 'Automation_Agent', name: 'Abdul Hasib', specialty: 'Data/Automation' },
];

function getAgentStatus(agentId: AgentType, tasks: Task[]) {
  const agentTasks = tasks.filter(t => t.agentType === agentId);
  const processingTask = agentTasks.find(t => t.status === 'Processing');
  
  if (processingTask) return { status: 'working', task: processingTask };
  if (agentTasks.some(t => t.status === 'Pending_Validation')) return { status: 'pending' };
  return { status: 'idle' };
}

export function AgentStatus({ tasks }: AgentStatusProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-100 mb-4">Agents</h3>
      
      <div className="space-y-2">
        {AGENTS.map((agent) => {
          const { status } = getAgentStatus(agent.id, tasks);
          
          const statusConfig: Record<string, { color: string; label: string }> = {
            idle: { color: 'bg-zinc-500', label: 'Inactif' },
            working: { color: 'bg-emerald-500', label: 'En cours' },
            pending: { color: 'bg-amber-500', label: 'Validation' },
          };
          
          const config = statusConfig[status];
          
          return (
            <div 
              key={agent.id}
              className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800/50 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{agent.name}</p>
                  <p className="text-xs text-zinc-400">{agent.specialty}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Circle className={`w-2 h-2 ${config.color} rounded-full`} />
                <span className="text-xs text-zinc-400">{config.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
