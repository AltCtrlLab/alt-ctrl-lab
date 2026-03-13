/**
 * 🔌 HOOK: useCockpitStream
 *
 * Connexion SSE unique avec hydratation initiale d'état.
 * Ce hook est consommé UNIQUEMENT via le CockpitStreamProvider.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Types des événements SSE
export interface Vision {
  type: string;
  content: string;
}

export interface Evaluation {
  agent: string;
  role: string;
  content: string;
}

export interface WarRoomData {
  phase: 'IDLE' | 'EXPLORATION' | 'DEBATE' | 'DECISION' | 'EXECUTION' | 'COMPLETE';
  visions?: Record<string, Vision>;
  evaluations?: {
    cto: Evaluation;
    da: Evaluation;
  };
  decision?: string;
  plan?: unknown;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  status: string;
  stage: string;
  agent?: string;
  data?: Record<string, unknown>;
}

export interface CockpitState {
  connected: boolean;
  warRoom: WarRoomData;
  timeline: TimelineEvent[];
  lastUpdate: Date | null;
  error: string | null;
  isLoading: boolean;
}

const initialState: CockpitState = {
  connected: false,
  warRoom: { phase: 'IDLE' },
  timeline: [],
  lastUpdate: null,
  error: null,
  isLoading: true,
};

// Fonction d'hydratation depuis l'état serveur
function hydrateStateFromServer(serverState: {
  warRoom: {
    phase: string;
    visions?: Record<string, Vision>;
    evaluations?: { cto: Evaluation; da: Evaluation };
    decision?: string;
    plan?: unknown;
  };
  recentTasks?: Array<{
    id: string;
    status: string;
    stage?: string;
    agentName?: string;
    updatedAt?: Date | string | number;
  }>;
  eventHistory?: Array<{
    id: string;
    status: string;
    stage?: string;
    agentName?: string;
    data?: Record<string, unknown>;
    timestamp: number;
  }>;
}): Partial<CockpitState> {
  const updates: Partial<CockpitState> = {
    isLoading: false,
  };

  // Hydrater la War Room si elle est active
  if (serverState.warRoom && serverState.warRoom.phase !== 'IDLE') {
    updates.warRoom = {
      phase: serverState.warRoom.phase as WarRoomData['phase'],
      visions: serverState.warRoom.visions,
      evaluations: serverState.warRoom.evaluations,
      decision: serverState.warRoom.decision,
      plan: serverState.warRoom.plan,
    };
  }

  // Hydrater la timeline depuis l'historique d'events SSE (prioritaire)
  if (serverState.eventHistory && serverState.eventHistory.length > 0) {
    updates.timeline = serverState.eventHistory.map((evt) => ({
      id: `${evt.id}_${evt.status}`,
      timestamp: new Date(evt.timestamp),
      status: evt.status,
      stage: evt.stage || 'N/A',
      agent: evt.agentName || 'Système',
      data: evt.data,
    }));
    updates.lastUpdate = new Date();
  }
  // Fallback: hydrater depuis les tâches récentes de la DB
  else if (serverState.recentTasks && serverState.recentTasks.length > 0) {
    updates.timeline = serverState.recentTasks.map((task) => ({
      id: `${task.id}_${task.status}`,
      timestamp: new Date(task.updatedAt || Date.now()),
      status: task.status,
      stage: task.stage || 'N/A',
      agent: task.agentName || 'Système',
      data: undefined,
    }));
    updates.lastUpdate = new Date();
  }

  return updates;
}

export function useCockpitStream(): CockpitState {
  const [state, setState] = useState<CockpitState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  // FIX P0-2: useState au lieu de useRef pour déclencher un re-render
  const [isHydrated, setIsHydrated] = useState(false);

  // ÉTAPE 1: Hydratation initiale depuis l'API d'état
  useEffect(() => {
    let cancelled = false;

    const hydrateState = async () => {
      try {
        console.log('[useCockpitStream] 🔄 Hydratation initiale...');
        const response = await fetch('/api/supervisor/state');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled && data.success && data.data) {
          const updates = hydrateStateFromServer(data.data);

          setState(prev => ({
            ...prev,
            ...updates,
          }));

          console.log('[useCockpitStream] ✅ État hydraté:', updates.warRoom?.phase || 'IDLE');
        }
      } catch (error) {
        console.warn('[useCockpitStream] ⚠️ Échec hydratation:', error);
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    hydrateState();
    return () => { cancelled = true; };
  }, []);

  const connect = useCallback(() => {
    // Cleanup existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    console.log('[useCockpitStream] Connecting to SSE...');

    const es = new EventSource('/api/agents/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('[useCockpitStream] SSE Connected ✅');
      reconnectAttemptsRef.current = 0;
      setState(prev => ({ ...prev, connected: true, error: null }));
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'task_update' && payload.task) {
          const task = payload.task;

          setState(prev => {
            const newTimeline = [...prev.timeline];

            // Déduplication par ID composite
            const eventId = `${task.id}_${task.status}`;
            const eventExists = newTimeline.find(e => e.id === eventId);
            if (!eventExists) {
              newTimeline.unshift({
                id: eventId,
                timestamp: new Date(),
                status: task.status,
                stage: task.stage || 'N/A',
                agent: task.agentName,
                data: task.data,
              });
              if (newTimeline.length > 50) newTimeline.pop();
            }

            // Mettre à jour les données War Room
            let newWarRoom = { ...prev.warRoom };

            switch (task.status) {
              case 'WAR_ROOM_INITIATED':
                newWarRoom = { phase: 'EXPLORATION' };
                break;

              case 'WAR_ROOM_EXPLORATION_DONE':
                newWarRoom = {
                  ...newWarRoom,
                  phase: 'DEBATE',
                  visions: task.data?.visions,
                };
                break;

              case 'WAR_ROOM_DEBATE_DONE':
                newWarRoom = {
                  ...newWarRoom,
                  phase: 'DECISION',
                  evaluations: task.data?.evaluations,
                };
                break;

              case 'WAR_ROOM_DECISION_DONE':
                newWarRoom = {
                  ...newWarRoom,
                  phase: 'EXECUTION',
                  decision: task.data?.decision as string | undefined,
                  plan: task.data?.plan,
                };
                break;

              case 'COMPLETED':
                newWarRoom = { ...newWarRoom, phase: 'COMPLETE' };
                break;

              case 'WAR_ROOM_FAILED':
                newWarRoom = { phase: 'IDLE' };
                break;
            }

            return {
              ...prev,
              warRoom: newWarRoom,
              timeline: newTimeline,
              lastUpdate: new Date(),
              isLoading: false,
            };
          });
        }
      } catch (err) {
        console.warn('[useCockpitStream] Parse error:', err);
      }
    };

    es.onerror = () => {
      console.error('[useCockpitStream] SSE Error');
      setState(prev => ({
        ...prev,
        connected: false,
        error: 'Connection lost'
      }));

      es.close();
      eventSourceRef.current = null;

      // Reconnexion exponentielle
      const maxAttempts = 10;
      if (reconnectAttemptsRef.current < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`[useCockpitStream] Reconnecting in ${delay}ms...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };
  }, []);

  // ÉTAPE 2: Connexion SSE APRÈS hydratation (re-déclenché quand isHydrated passe à true)
  useEffect(() => {
    if (!isHydrated) return;

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isHydrated, connect]);

  return state;
}
