'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AgentList, TaskTimeline, StatusBadge } from '@/components/cockpit';
import { BriefInput } from '@/components/cockpit/BriefInput';
import { Status, Task } from '@/components/cockpit/types';

const statusMapping: Record<string, Status> = {
  'PENDING': 'idle',
  'DIRECTOR_PLANNING': 'paused',
  'EXECUTING_SUBTASK': 'running',
  'EXECUTOR_DRAFTING': 'running',
  'DIRECTOR_QA': 'paused',
  'EXECUTOR_REVISING': 'running',
  'COMPLETED': 'completed',
  'FAILED': 'error',
  'FAILED_QA': 'error',
};

export default function CockpitPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/agents?action=get_tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.data.tasks.slice(-10));
      }
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleBriefSubmit = () => {
    setTimeout(fetchTasks, 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl font-bold">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Alt Ctrl Lab</h1>
                <p className="text-sm text-zinc-500">Cockpit de monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm text-zinc-400">Système actif</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <AgentList className="sticky top-24" />
          </div>

          <div className="col-span-6 space-y-6">
            <TaskTimeline className="shadow-2xl shadow-black/50" />
            <BriefInput onSubmit={handleBriefSubmit} />
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 rounded-xl border border-zinc-800 p-4"
            >
              <h2 className="text-lg font-semibold mb-4">Tâches récentes</h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">Aucune tâche. Lancez votre première mission !</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task, idx) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white truncate">{task.agentName}</p>
                          {task.serviceId && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                              {task.serviceId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 truncate">
                          {task.prompt?.substring(0, 60)}...
                        </p>
                      </div>
                      <StatusBadge status={statusMapping[task.status] || 'idle'} size="sm" />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          <div className="col-span-3 space-y-4">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-zinc-900 rounded-xl border border-zinc-800 p-4"
            >
              <h3 className="font-semibold mb-4">Statistiques</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg">
                  <span className="text-zinc-400">Agents actifs</span>
                  <span className="font-bold text-white text-lg">9</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg">
                  <span className="text-zinc-400">En cours</span>
                  <span className="font-bold text-blue-400 text-lg">
                    {tasks.filter(t => ['DIRECTOR_PLANNING', 'EXECUTING_SUBTASK', 'EXECUTOR_DRAFTING'].includes(t.status)).length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg">
                  <span className="text-zinc-400">Complétées</span>
                  <span className="font-bold text-emerald-400 text-lg">
                    {tasks.filter(t => t.status === 'COMPLETED').length}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-950 rounded-lg">
                  <span className="text-zinc-400">Échecs</span>
                  <span className="font-bold text-red-400 text-lg">
                    {tasks.filter(t => t.status === 'FAILED' || t.status === 'FAILED_QA').length}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900 rounded-xl border border-zinc-800 p-4"
            >
              <h3 className="font-semibold mb-4">Architecture</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span className="text-sm text-zinc-400">Micro-Délégation</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="text-sm text-zinc-400">Director Takeover</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-sm text-zinc-400">SSE Temps réel</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
