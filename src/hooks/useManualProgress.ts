import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "setup_guide_progress";

type ProgressState = Record<string, boolean[]>;

export function useManualProgress(capabilities: { id: string; manual: { steps: { text: string }[] } }[]) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });
  const dbLoaded = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from DB on mount when authenticated
  useEffect(() => {
    if (!user || dbLoaded.current) return;

    const load = async () => {
      const { data } = await supabase
        .from("setup_guide_progress")
        .select("progress")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.progress) {
        const dbProgress = data.progress as ProgressState;
        setProgress((local) => {
          // Merge: take the union (any step done in either source stays done)
          const merged: ProgressState = { ...local };
          for (const key of Object.keys(dbProgress)) {
            const dbArr = dbProgress[key] || [];
            const localArr = local[key] || [];
            const maxLen = Math.max(dbArr.length, localArr.length);
            merged[key] = Array.from({ length: maxLen }, (_, i) =>
              (dbArr[i] ?? false) || (localArr[i] ?? false)
            );
          }
          return merged;
        });
      }
      dbLoaded.current = true;
    };
    load();
  }, [user]);

  // Persist to localStorage + debounced DB save
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {}

    if (!user) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      await supabase
        .from("setup_guide_progress")
        .upsert(
          { user_id: user.id, progress: progress as any },
          { onConflict: "user_id" }
        );
    }, 1000);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [progress, user]);

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

  const resetProgress = useCallback(async () => {
    setProgress({});
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if (user) {
      await supabase
        .from("setup_guide_progress")
        .delete()
        .eq("user_id", user.id);
    }
  }, [user]);

  const hasAnyProgress = Object.values(progress).some(arr => arr.some(Boolean));

  return { toggleStep, markStepDone, getCompleted, isStepDone, getCurrentStep, getOverallProgress, resetProgress, hasAnyProgress };
}
