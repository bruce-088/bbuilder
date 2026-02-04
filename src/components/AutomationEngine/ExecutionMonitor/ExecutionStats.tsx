import { Card, CardContent } from "@/components/ui/card";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutionStatsProps {
  totalExecutions: number;
  totalSuccess: number;
  totalErrors: number;
  avgSuccessRate: number;
  runningCount: number;
  workflowCount: number;
  className?: string;
}

export function ExecutionStats({
  totalExecutions,
  totalSuccess,
  totalErrors,
  avgSuccessRate,
  runningCount,
  workflowCount,
  className,
}: ExecutionStatsProps) {
  const stats = [
    {
      label: "Total Executions",
      value: totalExecutions,
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Success",
      value: totalSuccess,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Errors",
      value: totalErrors,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Success Rate",
      value: `${avgSuccessRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: avgSuccessRate >= 80 
        ? "text-green-600 dark:text-green-400" 
        : avgSuccessRate >= 50 
          ? "text-yellow-600 dark:text-yellow-400" 
          : "text-destructive",
      bgColor: avgSuccessRate >= 80 
        ? "bg-green-100 dark:bg-green-900/30" 
        : avgSuccessRate >= 50 
          ? "bg-yellow-100 dark:bg-yellow-900/30" 
          : "bg-destructive/10",
    },
    {
      label: "Running",
      value: runningCount,
      icon: Clock,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
      pulse: runningCount > 0,
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-5 gap-3", className)}>
      {stats.map((stat) => (
        <Card key={stat.label} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", stat.bgColor, stat.pulse && "animate-pulse")}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
