import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WebhookHealthIndicatorProps {
  status: "healthy" | "unhealthy" | "unknown";
  url?: string;
  className?: string;
}

export function WebhookHealthIndicator({ status, url, className }: WebhookHealthIndicatorProps) {
  const statusConfig = {
    healthy: {
      color: "bg-green-500",
      pulseColor: "bg-green-400",
      label: "Healthy",
      description: "Webhook endpoint is responding",
    },
    unhealthy: {
      color: "bg-red-500",
      pulseColor: "bg-red-400",
      label: "Unhealthy",
      description: "Webhook endpoint is not responding",
    },
    unknown: {
      color: "bg-muted-foreground/50",
      pulseColor: "bg-muted-foreground/30",
      label: "Unknown",
      description: "Health status not checked yet",
    },
  };

  const config = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("relative inline-flex h-3 w-3", className)}>
            {status === "healthy" && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  config.pulseColor
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex h-3 w-3 rounded-full",
                config.color
              )}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {url && (
              <p className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                {url}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
