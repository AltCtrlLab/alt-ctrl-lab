'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AgentActivity {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  taskId: string;
  activityType: 'DIRECT_EXECUTION' | 'SWARM_LEADER' | 'MICRO_WORKER' | 'QA_VALIDATION' | 'QA_REJECTION' | 'DIRECTOR_TAKEOVER';
  prompt: string;
  result?: string;
  resultSize?: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  qaResult?: string;
  isSwarm?: boolean;
  swarmSize?: number;
  startedAt: string;
  completedAt?: string;
  executionTimeMs?: number;
}

export interface AgentMetrics {
  agentId: string;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  qaRejections: number;
  successRate: number;
  totalTokensIn: number;
  totalTokensOut: number;
  avgExecutionTimeMs: number;
  totalSwarmsLed: number;
  lastActivityAt?: string;
  lastStatus?: 'online' | 'busy' | 'offline';
}

export function useAgentActivity(agentId?: string) {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const fetchActivity = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    
    try {
      const newOffset = reset ? 0 : offset;
      const url = `/api/agents/activity?${agentId ? `agent_id=${agentId}&` : ''}limit=20&offset=${newOffset}&timeframe=${timeframe}`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        if (reset) {
          setActivities(data.data.activities);
        } else {
          setActivities(prev => [...prev, ...data.data.activities]);
        }
        setMetrics(data.data.metrics);
        setHasMore(data.data.pagination.hasMore);
        setOffset(newOffset + 20);
      }
    } catch (err) {
      console.error('Failed to fetch agent activity:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId, offset, timeframe, loading]);

  // Polling toutes les 5 secondes pour le temps réel
  useEffect(() => {
    fetchActivity(true);
    const interval = setInterval(() => fetchActivity(true), 5000);
    return () => clearInterval(interval);
  }, [agentId, timeframe]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchActivity(false);
    }
  };

  return {
    activities,
    metrics,
    loading,
    hasMore,
    loadMore,
    timeframe,
    setTimeframe,
    refresh: () => fetchActivity(true),
  };
}
