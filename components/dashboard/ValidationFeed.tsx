'use client';

import React from 'react';
import { Check, X, Clock, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Task } from '@/lib/schemas/agents';

interface ValidationFeedProps {
  tasks: Task[];
  onApprove: (taskId: string) => void;
  onReject: (taskId: string) => void;
  onViewDetails?: (taskId: string) => void;
}

export function ValidationFeed({ 
  tasks, 
  onApprove, 
  onReject,
  onViewDetails 
}: ValidationFeedProps) {
  const pendingTasks = tasks.filter(t => t.status === 'Pending_Validation');

  if (pendingTasks.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <div className="p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
            <Check className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-400">Aucune tâche en attente de validation</p>
          <p className="text-xs text-zinc-400 mt-1">Les livrables apparaîtront ici</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">
          En attente de validation
        </h3>
        <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full font-medium">
          {pendingTasks.length}
        </span>
      </div>

      {pendingTasks.map((task) => (
        <Card key={task.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-100">{task.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400">
                      Agent: {task.agentType}
                    </span>
                    <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                    <span className="text-xs text-zinc-400">
                      Playbook: {task.playbook || 'default'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-medium">En attente</span>
              </div>
            </div>

            {task.deliverable && (
              <div className="bg-zinc-950 rounded-lg p-3 mb-3 border border-zinc-800/50">
                <p className="text-xs text-zinc-400 line-clamp-3 font-mono">
                  {JSON.stringify(task.deliverable).slice(0, 200)}...
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewDetails?.(task.id)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Détails
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
              
              <div className="flex-1" />
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReject(task.id)}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              >
                <X className="w-4 h-4 mr-1" />
                Rejeter
              </Button>
              
              <Button
                size="sm"
                onClick={() => onApprove(task.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                Approuver
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
