import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, MessageSquare, ArrowRight, BookOpen } from "lucide-react";
import { useLeadManagement, type Lead } from "@/hooks/useLeadManagement";
import { useMemo } from "react";

interface TodaysTasksProps {
  onNavigateToChat: (prompt: string) => void;
  onOpenSetupGuide: () => void;
  currentSetupStep?: string;
}

export default function TodaysTasks({ onNavigateToChat, onOpenSetupGuide, currentSetupStep }: TodaysTasksProps) {
  const { leads } = useLeadManagement();

  const staleLeads = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return leads
      .filter((l: Lead) => {
        if (l.stage === "won" || l.stage === "lost") return false;
        const lastContact = l.last_contact_at ? new Date(l.last_contact_at) : new Date(l.created_at);
        return lastContact < threeDaysAgo;
      })
      .slice(0, 3);
  }, [leads]);

  const tasks = useMemo(() => {
    const items: { label: string; action: () => void; icon: React.ElementType }[] = [];
    staleLeads.forEach((lead) => {
      items.push({
        label: `Follow up with ${lead.name}`,
        action: () => onNavigateToChat(`Draft a follow-up message for ${lead.name} at ${lead.company || "their company"}`),
        icon: MessageSquare,
      });
    });
    if (currentSetupStep) {
      items.push({
        label: currentSetupStep,
        action: onOpenSetupGuide,
        icon: BookOpen,
      });
    }
    return items.slice(0, 5);
  }, [staleLeads, currentSetupStep, onNavigateToChat, onOpenSetupGuide]);

  if (tasks.length === 0) return null;

  return (
    <Card className="glass mb-6">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Today's Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {tasks.map((task, i) => (
          <button
            key={i}
            onClick={task.action}
            className="w-full flex items-center gap-3 text-left text-sm p-2 rounded-md hover:bg-accent/10 transition-colors group"
          >
            <task.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 truncate">{task.label}</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
