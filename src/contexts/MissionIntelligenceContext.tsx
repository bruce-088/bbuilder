import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useMissionIntelligence } from '@/hooks/useMissionIntelligence';

type MissionIntelligenceValue = ReturnType<typeof useMissionIntelligence>;

const MissionIntelligenceContext = createContext<MissionIntelligenceValue | null>(null);

export function MissionIntelligenceProvider({ children }: { children: ReactNode }) {
  const intelligence = useMissionIntelligence();

  // Register emitEvent globally so hooks on any page can fire events
  useEffect(() => {
    (window as any).__emitMissionEvent = intelligence.emitEvent;
    return () => { delete (window as any).__emitMissionEvent; };
  }, [intelligence.emitEvent]);

  return (
    <MissionIntelligenceContext.Provider value={intelligence}>
      {children}
    </MissionIntelligenceContext.Provider>
  );
}

export function useMissionIntelligenceContext() {
  const ctx = useContext(MissionIntelligenceContext);
  if (!ctx) throw new Error('useMissionIntelligenceContext must be used within MissionIntelligenceProvider');
  return ctx;
}
