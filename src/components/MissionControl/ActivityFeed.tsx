import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity } from 'lucide-react';
import type { MissionEvent } from '@/hooks/useMissionIntelligence';

const EVENT_ICONS: Record<string, string> = {
  plan_saved: '📌',
  lead_captured: '🎯',
  lead_won: '🏆',
  stage_changed: '📊',
  email_sent: '📧',
  workflow_deployed: '🤖',
  automation_completed: '⚙️',
  checklist_opened: '✅',
  outreach_started: '📣',
};

const EVENT_LABELS: Record<string, string> = {
  plan_saved: 'Plan saved',
  lead_captured: 'Lead captured',
  lead_won: 'Deal won!',
  stage_changed: 'Lead progressed',
  email_sent: 'Email sent',
  workflow_deployed: 'Workflow deployed',
  automation_completed: 'Automation completed',
  checklist_opened: 'Checklist reviewed',
  outreach_started: 'Outreach started',
};

interface ActivityFeedProps {
  events: MissionEvent[];
  compact?: boolean;
}

export default function ActivityFeed({ events, compact = false }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <Card className="glass">
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          <Activity className="w-5 h-5 mx-auto mb-2 opacity-50" />
          No activity yet. Start by generating a plan!
        </CardContent>
      </Card>
    );
  }

  const displayEvents = compact ? events.slice(0, 5) : events;

  return (
    <Card className="glass">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ScrollArea className={compact ? "max-h-[200px]" : "max-h-[400px]"}>
          <div className="space-y-2">
            {displayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0 animate-fade-in"
              >
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {EVENT_ICONS[event.event_type] || '📋'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {EVENT_LABELS[event.event_type] || event.event_type}
                  </p>
                  {event.event_data && (event.event_data as Record<string, unknown>).name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {String((event.event_data as Record<string, unknown>).name)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>
                </div>
                {event.xp_awarded > 0 && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    +{event.xp_awarded} XP
                  </Badge>
                )}
                {event.quest_unlocked && (
                  <Badge className="text-xs flex-shrink-0 bg-primary/20 text-primary border-primary/30">
                    Quest ✓
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
