import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "setup_guide_progress";

type ProgressState = Record<string, boolean[]>;

export function useManualProgress(capabilities: { id: string; manual: { steps: string[] } }[]) {
  const [progress, setProgress] = useState<ProgressState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {}
  }, [progress]);

  const toggleStep = useCallback((capId: string, stepIndex: number, totalSteps: number) => {
    setProgress((prev) => {
      const current = prev[capId] || new Array(totalSteps).fill(false);
      const next = [...current];
      next[stepIndex] = !next[stepIndex];
      return { ...prev, [capId]: next };
    });
  }, []);

  const getCompleted = useCallback(
    (capId: string, totalSteps: number): number => {
      const arr = progress[capId];
      if (!arr) return 0;
      return arr.filter(Boolean).length;
    },
    [progress]
  );

  const isStepDone = useCallback(
    (capId: string, stepIndex: number): boolean => {
      return progress[capId]?.[stepIndex] ?? false;
    },
    [progress]
  );

  return { toggleStep, getCompleted, isStepDone };
}
