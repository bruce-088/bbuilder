import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowStats } from "@/hooks/useExecutionMonitor";
import { cn } from "@/lib/utils";

interface WorkflowStatsChartProps {
  stats: WorkflowStats[];
  className?: string;
}

export function WorkflowStatsChart({ stats, className }: WorkflowStatsChartProps) {
  const chartData = useMemo(() => {
    return stats.map((s) => ({
      name: s.workflow_name.length > 20 
        ? s.workflow_name.substring(0, 20) + "..." 
        : s.workflow_name,
      fullName: s.workflow_name,
      success: s.success_count,
      error: s.error_count,
      successRate: Number(s.success_rate),
      total: s.total_executions,
    }));
  }, [stats]);

  if (stats.length === 0) {
    return null;
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Workflow Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis type="number" className="text-xs" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={120}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium mb-2">{data.fullName}</p>
                      <div className="space-y-1 text-xs">
                        <p className="text-green-600 dark:text-green-400">
                          Success: {data.success}
                        </p>
                        <p className="text-destructive">
                          Errors: {data.error}
                        </p>
                        <p className="text-muted-foreground">
                          Success Rate: {data.successRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="success" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="error" stackId="a" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[hsl(var(--chart-2))]" />
            <span className="text-muted-foreground">Success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-destructive" />
            <span className="text-muted-foreground">Error</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
