import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface LogEvent {
  id: string;
  event_type: string;
  created_at: string;
  source_app: string;
  payload: any;
}

export function SystemLog() {
  const { user } = useAuth();
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(
    () => localStorage.getItem("systemLogOpen") === "true"
  );

  const toggleOpen = (open: boolean) => {
    setIsOpen(open);
    localStorage.setItem("systemLogOpen", String(open));
  };

  useEffect(() => {
    if (!user) return;

    const fetchRecentEvents = async () => {
      const { data } = await supabase
        .from("triad_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setEvents(data);
      }
    };

    fetchRecentEvents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("system-log")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "triad_events",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setEvents((prev) => [payload.new as LogEvent, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!isOpen) {
    return (
      <motion.button
        initial={{ x: 300 }}
        animate={{ x: 0 }}
        onClick={() => toggleOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 px-2 py-4 rounded-l-lg shadow-lg z-40 border-l border-t border-b border-emerald-700"
      >
        <Terminal className="h-5 w-5" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ x: 300 }}
      animate={{ x: 0 }}
      exit={{ x: 300 }}
      className="fixed right-0 top-16 bottom-0 w-80 bg-gradient-to-b from-emerald-950 to-emerald-900 border-l border-emerald-800 z-40 shadow-2xl"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-800">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-100">System Log</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleOpen(false)}
          className="h-6 w-6 text-emerald-400 hover:text-emerald-100 hover:bg-emerald-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)] px-4 py-2">
        <AnimatePresence mode="popLayout">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: index * 0.05 }}
              className="mb-3 p-2 bg-emerald-900/50 border border-emerald-800 rounded text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-emerald-300 font-semibold">
                  {event.event_type}
                </span>
                <span className="text-emerald-500 text-[10px]">
                  {formatDistanceToNow(new Date(event.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="text-emerald-400 font-mono text-[10px]">
                Source: {event.source_app}
              </div>
              {event.payload && Object.keys(event.payload).length > 0 && (
                <div className="mt-1 text-emerald-500 font-mono text-[10px] truncate">
                  {JSON.stringify(event.payload).slice(0, 100)}...
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </ScrollArea>
    </motion.div>
  );
}
