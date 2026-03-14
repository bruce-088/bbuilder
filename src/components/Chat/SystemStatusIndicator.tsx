import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type SystemHealth } from "@/hooks/useSystemHealth";
import { formatDistanceToNow } from "date-fns";

interface SystemStatusIndicatorProps {
  health: SystemHealth;
  isChecking: boolean;
  onRefresh: () => void;
}

function StatusDot({ status }: { status: "up" | "down" | "unknown" }) {
  const colors = {
    up: "bg-emerald-500 shadow-emerald-500/50",
    down: "bg-red-500 shadow-red-500/50",
    unknown: "bg-muted-foreground/40",
  };

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full shadow-sm ${colors[status]} ${status === "up" ? "animate-pulse" : ""}`}
    />
  );
}

export function SystemStatusIndicator({
  health,
  isChecking,
  onRefresh,
}: SystemStatusIndicatorProps) {
  const allUp =
    health.nexusai === "up" &&
    health.n8n === "up" &&
    health.nexusvocal === "up";
  const anyDown =
    health.nexusai === "down" ||
    health.n8n === "down" ||
    health.nexusvocal === "down";

  const overallColor = allUp
    ? "text-emerald-500"
    : anyDown
      ? "text-red-500"
      : "text-muted-foreground";

  const services = [
    { label: "NexusAI", status: health.nexusai },
    { label: "n8n", status: health.n8n },
    { label: "NexusVocal", status: health.nexusvocal },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 px-2 h-8 ${overallColor}`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs font-medium">System</span>
          {anyDown && (
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0 bg-popover/95 backdrop-blur-xl border-border/60"
        align="end"
      >
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Triad System Status
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRefresh}
              disabled={isChecking}
            >
              <RefreshCw
                className={`h-3 w-3 ${isChecking ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          {health.lastChecked && (
            <span className="text-[10px] text-muted-foreground">
              Last checked{" "}
              {formatDistanceToNow(new Date(health.lastChecked), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>

        <div className="p-3 space-y-2">
          {services.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-foreground font-medium">{s.label}</span>
              <div className="flex items-center gap-1.5">
                <StatusDot status={s.status} />
                <span
                  className={
                    s.status === "up"
                      ? "text-emerald-500"
                      : s.status === "down"
                        ? "text-red-500"
                        : "text-muted-foreground"
                  }
                >
                  {s.status === "up"
                    ? "Online"
                    : s.status === "down"
                      ? "Offline"
                      : "Unknown"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {health.recentErrors.length > 0 && (
          <div className="p-3 border-t border-border/50">
            <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
              Recent Errors
            </span>
            <div className="mt-1.5 space-y-1.5">
              {health.recentErrors.slice(0, 3).map((err) => (
                <div
                  key={err.id}
                  className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1"
                >
                  <span className="font-mono text-red-400">
                    {err.event_type}
                  </span>
                  <span className="mx-1">·</span>
                  <span>
                    {formatDistanceToNow(new Date(err.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Ask Mya "why is [service] red?" for details
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
