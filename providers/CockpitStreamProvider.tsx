'use client';

import React, { createContext, useContext } from 'react';
import { useCockpitStream, CockpitState } from '@/hooks/useCockpitStream';

const CockpitStreamContext = createContext<CockpitState | null>(null);

export function CockpitStreamProvider({ children }: { children: React.ReactNode }) {
  const state = useCockpitStream();
  return (
    <CockpitStreamContext.Provider value={state}>
      {children}
    </CockpitStreamContext.Provider>
  );
}

export function useCockpitContext(): CockpitState {
  const ctx = useContext(CockpitStreamContext);
  if (!ctx) {
    throw new Error('useCockpitContext must be used within a CockpitStreamProvider');
  }
  return ctx;
}
