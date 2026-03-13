'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  type: 'director' | 'executor';
  director?: string;
}

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

export interface LogEntry {
  id: number;
  time: string;
  agent: string;
  role: string;
  message: string;
  status: 'VALIDATED' | 'REJECTED' | 'EXECUTING' | 'PENDING';
}

export function usePilBackend() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [systemLoad, setSystemLoad] = useState('42.8 T/s');
  const [swarmStatus, setSwarmStatus] = useState<{ active: boolean; workers: number } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents?action=get_agents');
      const data = await res.json();
      if (data.success) {
        setAgents(data.data.agents);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  }, []);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/agents?action=get_tasks');
      const data = await res.json();
      if (data.success) {
        setTasks(data.data.tasks);
        updateLogsFromTasks(data.data.tasks);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  // Convert tasks to WarRoom logs
  const updateLogsFromTasks = (tasks: Task[]) => {
    const newLogs: LogEntry[] = tasks.slice(-10).map((task, idx) => ({
      id: idx + 1,
      time: new Date(task.updatedAt || task.createdAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      agent: task.agentName.split('→')[0] || 'System',
      role: task.stage || 'AGENT',
      message: task.prompt?.substring(0, 80) + '...' || 'Task execution',
      status: mapStatusToLogStatus(task.status),
    }));
    setLogs(newLogs);
  };

  const mapStatusToLogStatus = (status: string): LogEntry['status'] => {
    switch (status) {
      case 'COMPLETED': return 'VALIDATED';
      case 'FAILED':
      case 'FAILED_QA': return 'REJECTED';
      case 'RUNNING':
      case 'EXECUTING_SUBTASK':
      case 'EXECUTOR_DRAFTING':
      case 'EXECUTOR_SWARMING':
      case 'EXECUTOR_SYNTHESIZING':
      case 'SWARM_COMPLETED': return 'EXECUTING';
      default: return 'PENDING';
    }
  };

  // FIX P0-3: Route vers /api/supervisor pour full_agency, /api/orchestrate sinon
  const submitMission = useCallback(async (brief: string, serviceId: string) => {
    try {
      // Full Agency → War Room Protocol via /api/supervisor
      if (serviceId === 'full' || serviceId === 'full_agency') {
        const res = await fetch('/api/supervisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brief,
            service_id: 'full_agency',
            priority: 'normal',
          }),
        });

        const data = await res.json();

        if (data.success) {
          setTimeout(fetchTasks, 1000);
          return { success: true, taskId: data.data?.protocol || 'war_room' };
        }

        return { success: false, error: data.error?.message || data.error };
      }

      // Autres services → délégation directe via /api/orchestrate
      const TEAM_MAPPING: Record<string, { director: string; executor: string }> = {
        'branding': { director: 'musawwir', executor: 'raqim' },
        'web': { director: 'matin', executor: 'banna' },
        'marketing': { director: 'fatah', executor: 'khatib' },
        'data': { director: 'hasib', executor: 'sani' },
      };

      const team = TEAM_MAPPING[serviceId];
      if (!team) {
        return { success: false, error: `Unknown service: ${serviceId}` };
      }

      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          director_id: team.director,
          executor_id: team.executor,
          brief,
          timeout: 900,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTimeout(fetchTasks, 1000);
        return { success: true, taskId: data.data.taskId };
      }

      return { success: false, error: data.error?.message };
    } catch (err) {
      console.error('Failed to submit mission:', err);
      return { success: false, error: 'Network error' };
    }
  }, [fetchTasks]);

  // Fetch métriques système réelles (remplace Math.random)
  const fetchSystemMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics/system');
      const data = await res.json();
      if (data.success) {
        setSystemLoad(data.data.tokensPerSecond);
      }
    } catch { /* silencieux */ }
  }, []);

  // SSE Connection — réutilise le même stream que le CockpitStreamProvider
  // mais ne gère que les updates tasks/logs (pas la War Room)
  useEffect(() => {
    const maxAttempts = 10;

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const eventSource = new EventSource('/api/agents/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        console.log('[usePilBackend:SSE] Connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'task_update') {
            const task = data.task;

            if (task.status === 'EXECUTOR_SWARMING') {
              setSwarmStatus({ active: true, workers: task.swarmWorkers || 0 });
            } else if (task.status === 'SWARM_COMPLETED' || task.status === 'COMPLETED') {
              setSwarmStatus(null);
            }

            fetchTasks();
            fetchSystemMetrics();
          }
        } catch (err) {
          console.error('[usePilBackend:SSE] Parse error:', err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        if (reconnectAttemptsRef.current < maxAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectSSE();
          }, delay);
        }
      };
    };

    fetchAgents();
    fetchTasks();
    fetchSystemMetrics();
    connectSSE();

    // Poll métriques système toutes les 10s
    const metricsInterval = setInterval(fetchSystemMetrics, 10_000);

    return () => {
      clearInterval(metricsInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [fetchAgents, fetchTasks, fetchSystemMetrics]);

  // Calculate stats
  const stats = {
    totalTokens: tasks.reduce((acc, t) => acc + (t.prompt?.length || 0) * 10, 0),
    completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
    runningTasks: tasks.filter(t => ['RUNNING', 'EXECUTING_SUBTASK', 'EXECUTOR_DRAFTING'].includes(t.status)).length,
    failedTasks: tasks.filter(t => ['FAILED', 'FAILED_QA'].includes(t.status)).length,
    qaRate: tasks.length > 0
      ? ((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100).toFixed(1)
      : '0.0',
  };

  return {
    agents,
    tasks,
    logs,
    isConnected,
    systemLoad,
    stats,
    swarmStatus,
    submitMission,
    refresh: fetchTasks,
  };
}
