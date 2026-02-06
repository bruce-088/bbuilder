import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RevenueEntry {
  id: string;
  amount: number;
  source: string;
  lead_id: string | null;
  entry_date: string;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
}

interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  mrr: number;
  revenueBySource: Record<string, number>;
  progressToGoal: number;
  entries: RevenueEntry[];
}

export function useRevenueTracking(goal = 10000) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("revenue_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false });
      setEntries(data || []);
    } catch (e) {
      console.error("Revenue fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = useCallback(async (entry: { amount: number; source: string; lead_id?: string; is_recurring?: boolean; notes?: string }) => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from("revenue_entries")
        .insert({ ...entry, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      setEntries((prev) => [data, ...prev]);
      return data;
    } catch (e) {
      console.error("Add revenue error:", e);
      throw e;
    }
  }, [user]);

  const getStats = useCallback((): RevenueStats => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthlyEntries = entries.filter((e) => e.entry_date.startsWith(thisMonth));
    const monthlyRevenue = monthlyEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalRevenue = entries.reduce((sum, e) => sum + Number(e.amount), 0);
    const mrr = entries.filter((e) => e.is_recurring).reduce((sum, e) => sum + Number(e.amount), 0);

    const revenueBySource: Record<string, number> = {};
    for (const e of entries) {
      revenueBySource[e.source] = (revenueBySource[e.source] || 0) + Number(e.amount);
    }

    return {
      totalRevenue,
      monthlyRevenue,
      mrr,
      revenueBySource,
      progressToGoal: Math.min((monthlyRevenue / goal) * 100, 100),
      entries,
    };
  }, [entries, goal]);

  return { entries, loading, addEntry, fetchEntries, getStats };
}
