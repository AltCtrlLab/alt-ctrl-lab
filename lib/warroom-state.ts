/**
 * ÉTAT GLOBAL WAR ROOM
 *
 * Stockage en mémoire partagé entre le supervisor et l'API state.
 * Inclut un buffer circulaire d'events SSE pour l'hydratation.
 */

export interface WarRoomState {
  id: string;
  phase: 'IDLE' | 'EXPLORATION' | 'DEBATE' | 'DECISION' | 'EXECUTION' | 'COMPLETE';
  visions?: Record<string, { type: string; content: string }>;
  evaluations?: {
    cto: { agent: string; role: string; content: string };
    da: { agent: string; role: string; content: string };
  };
  decision?: string;
  plan?: unknown;
  startedAt: number;
  updatedAt: number;
}

export interface SSEEventRecord {
  id: string;
  status: string;
  stage?: string;
  agentName?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

// Variable globale pour stocker l'état
declare global {
  var __warRoomState: WarRoomState | undefined;
  var __sseEventHistory: SSEEventRecord[] | undefined;
}

// Initialiser si pas déjà fait
if (typeof globalThis.__warRoomState === 'undefined') {
  globalThis.__warRoomState = {
    id: '',
    phase: 'IDLE',
    startedAt: 0,
    updatedAt: 0,
  };
}

if (typeof globalThis.__sseEventHistory === 'undefined') {
  globalThis.__sseEventHistory = [];
}

export function getGlobalWarRoomState(): WarRoomState {
  return globalThis.__warRoomState || {
    id: '',
    phase: 'IDLE',
    startedAt: 0,
    updatedAt: 0,
  };
}

// FIX P0-4: Reset complet entre sessions War Room
export function resetGlobalWarRoomState(): void {
  globalThis.__warRoomState = {
    id: '',
    phase: 'IDLE',
    startedAt: 0,
    updatedAt: 0,
  };
  globalThis.__sseEventHistory = [];
}

export function updateGlobalWarRoomState(updates: Partial<WarRoomState>): void {
  if (!globalThis.__warRoomState) {
    globalThis.__warRoomState = {
      id: '',
      phase: 'IDLE',
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  globalThis.__warRoomState = {
    ...globalThis.__warRoomState,
    ...updates,
    updatedAt: Date.now(),
  };
}

// P1-5: Buffer circulaire d'events SSE pour hydratation
export function pushEventToHistory(event: SSEEventRecord): void {
  if (!globalThis.__sseEventHistory) {
    globalThis.__sseEventHistory = [];
  }
  globalThis.__sseEventHistory.unshift(event);
  if (globalThis.__sseEventHistory.length > 50) {
    globalThis.__sseEventHistory.pop();
  }
}

export function getEventHistory(): SSEEventRecord[] {
  return globalThis.__sseEventHistory || [];
}
