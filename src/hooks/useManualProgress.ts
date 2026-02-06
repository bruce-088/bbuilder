import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "setup_guide_progress";

type ProgressState = Record<string, boolean[]>;

export function useManualProgress(capabilities: { id: string; manual: { steps: { text: string }[] } }[]) {
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

  const markStepDone = useCallback((capId: string, stepIndex: number, totalSteps: number) => {
    setProgress((prev) => {
      const current = prev[capId] || new Array(totalSteps).fill(false);
      if (current[stepIndex]) return prev;
      const next = [...current];
      next[stepIndex] = true;
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

  const getCurrentStep = useCallback(
    (capId: string, totalSteps: number): number => {
      const arr = progress[capId];
      if (!arr) return 0;
      const firstIncomplete = arr.findIndex((done) => !done);
      return firstIncomplete === -1 ? totalSteps : firstIncomplete;
    },
    [progress]
  );

  const getOverallProgress = useCallback((): { completed: number; total: number } => {
    let completed = 0;
    let total = 0;
    for (const cap of capabilities) {
      total += cap.manual.steps.length;
      completed += getCompleted(cap.id, cap.manual.steps.length);
    }
    return { completed, total };
  }, [capabilities, getCompleted]);

  const resetProgress = useCallback(() => {
    setProgress({});
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const hasAnyProgress = Object.values(progress).some(arr => arr.some(Boolean));

  return { toggleStep, markStepDone, getCompleted, isStepDone, getCurrentStep, getOverallProgress, resetProgress, hasAnyProgress };
}
