'use client';

import { useMemo } from 'react';

export type AgentStatus = {
  status: 'idle' | 'busy' | 'failed' | 'swarm';
  currentTask?: string;
};

export interface Task {
  id: string;
  agentName: string;
  status: string;
  prompt: string;
  result?: string;
  error?: string;
  iteration?: number;
  stage?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Hook qui dérive le statut en temps réel des agents à partir des tasks.
 * Ne fetch pas — accepte les tasks comme paramètre pour éviter les appels redondants.
 *
 * Logique de dérivation:
 * - Si l'agent a une tâche RUNNING/EXECUTING → busy
 * - Si la dernière tâche est FAILED/FAILED_QA → failed
 * - Si l'agent est en SWARMING → swarm
 * - Sinon → idle
 */
export function useAgentStatus(tasks: Task[]): Record<string, AgentStatus> {
  return useMemo(() => {
    const statusMap: Record<string, AgentStatus> = {};

    // Groupe les tâches par agent
    const tasksByAgent: Record<string, Task[]> = {};

    tasks.forEach(task => {
      const agentName = task.agentName.split('→')[0] || task.agentName;
      if (!tasksByAgent[agentName]) {
        tasksByAgent[agentName] = [];
      }
      tasksByAgent[agentName].push(task);
    });

    // Détermine le statut pour chaque agent
    Object.entries(tasksByAgent).forEach(([agentName, agentTasks]) => {
      // Trie par date de mise à jour (plus récent d'abord)
      const sortedTasks = [...agentTasks].sort((a, b) => b.updatedAt - a.updatedAt);

      // Cherche d'abord une tâche en cours
      const runningTask = sortedTasks.find(t =>
        t.status === 'RUNNING' ||
        t.status === 'EXECUTING_SUBTASK' ||
        t.status === 'EXECUTOR_DRAFTING' ||
        t.status === 'DIRECTOR_PLANNING' ||
        t.status === 'DIRECTOR_QA' ||
        t.status === 'EXECUTOR_REVISING' ||
        t.status === 'EXECUTOR_SYNTHESIZING'
      );

      if (runningTask) {
        statusMap[agentName] = {
          status: 'busy',
          currentTask: runningTask.prompt?.substring(0, 60) + '...',
        };
        return;
      }

      // Cherche une tâche en swarm
      const swarmTask = sortedTasks.find(t => t.status === 'EXECUTOR_SWARMING');
      if (swarmTask) {
        statusMap[agentName] = {
          status: 'swarm',
          currentTask: swarmTask.prompt?.substring(0, 60) + '...',
        };
        return;
      }

      // Vérifie si la dernière tâche a échoué
      const lastTask = sortedTasks[0];
      if (lastTask && (lastTask.status === 'FAILED' || lastTask.status === 'FAILED_QA')) {
        statusMap[agentName] = {
          status: 'failed',
          currentTask: lastTask.prompt?.substring(0, 60) + '...',
        };
        return;
      }

      // Par défaut: idle
      statusMap[agentName] = {
        status: 'idle',
      };
    });

    return statusMap;
  }, [tasks]);
}
