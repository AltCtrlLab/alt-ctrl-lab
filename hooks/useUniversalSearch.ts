'use client';

import { useState, useCallback, useRef } from 'react';

export interface SearchResult {
  type: 'agent' | 'task' | 'vault';
  id: string;
  title: string;
  subtitle: string;
  view: string; // vue vers laquelle naviguer
}

export function useUniversalSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController>();

  const search = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const q = query.toLowerCase();
    const allResults: SearchResult[] = [];

    try {
      // Recherche agents
      const agentsRes = await fetch('/api/agents?action=get_agents', { signal: controller.signal });
      const agentsData = await agentsRes.json();
      if (agentsData.success) {
        for (const agent of agentsData.data.agents) {
          if (agent.name.toLowerCase().includes(q) || agent.role.toLowerCase().includes(q) || agent.id.toLowerCase().includes(q)) {
            allResults.push({
              type: 'agent',
              id: agent.id,
              title: `${agent.emoji} ${agent.name}`,
              subtitle: agent.role,
              view: 'roster',
            });
          }
        }
      }

      // Recherche tasks récentes
      const tasksRes = await fetch('/api/agents?action=get_tasks', { signal: controller.signal });
      const tasksData = await tasksRes.json();
      if (tasksData.success) {
        for (const task of tasksData.data.tasks.slice(-30)) {
          if (task.prompt?.toLowerCase().includes(q) || task.agentName?.toLowerCase().includes(q)) {
            allResults.push({
              type: 'task',
              id: task.id,
              title: task.prompt?.substring(0, 60) + '...',
              subtitle: `${task.agentName} — ${task.status}`,
              view: 'kanban',
            });
          }
        }
      }

      // Recherche vault
      const vaultRes = await fetch(`/api/vault?q=${encodeURIComponent(query)}`, { signal: controller.signal });
      const vaultData = await vaultRes.json();
      if (vaultData.success && vaultData.data?.items) {
        for (const item of vaultData.data.items.slice(0, 5)) {
          allResults.push({
            type: 'vault',
            id: item.id,
            title: item.briefText?.substring(0, 60),
            subtitle: `Vault — ${item.serviceId || 'générique'}`,
            view: 'assets',
          });
        }
      }

      if (!controller.signal.aborted) {
        setResults(allResults.slice(0, 10));
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setResults([]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    abortRef.current?.abort();
  }, []);

  return { results, loading, search, clear };
}
