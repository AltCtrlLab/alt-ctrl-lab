'use client';

import React from 'react';
import { Check, X, Clock, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { Task } from '@/lib/schemas/agents';

interface TaskHistoryProps {
  tasks: Task[];
}

export function TaskHistory({ tasks }: TaskHistoryProps) {
  const completedTasks = tasks.filter(t => 
    t.status === 'Completed' || t.status === 'Rejected'
  );

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'Completed':
        return <Check className="w-3 h-3 text-emerald-400" />;
      case 'Rejected':
        return <X className="w-3 h-3 text-rose-400" />;
      default:
        return <Clock className="w-3 h-3 text-zinc-500" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'Completed':
        return 'text-emerald-400';
      case 'Rejected':
        return 'text-rose-400';
      default:
        return 'text-zinc-500';
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">Historique</h3>
          <span className="text-xs text-zinc-500">{completedTasks.length} tâches</span>
        </div>

        {completedTasks.length === 0 ? (
          <div className="text-center py-6 text-zinc-500">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Aucune tâche dans l'historique</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div 
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  {getStatusIcon(task.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{task.title}</p>
                  <p className={`text-[10px] ${getStatusColor(task.status)}`}>
                    {task.status === 'Completed' ? 'Approuvé' : 'Rejeté'} • {task.agentType}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
