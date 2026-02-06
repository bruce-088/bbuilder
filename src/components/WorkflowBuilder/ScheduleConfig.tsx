import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, Loader2 } from "lucide-react";

interface ScheduleConfigProps {
  cronExpression: string;
  enabled: boolean;
  saving: boolean;
  onSave: (cron: string, enabled: boolean) => void;
  onToggle: () => void;
}

const PRESETS = [
  { label: "Every minute", cron: "* * * * *" },
  { label: "Every 5 min", cron: "*/5 * * * *" },
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Daily 9 AM", cron: "0 9 * * *" },
  { label: "Weekdays 9 AM", cron: "0 9 * * 1-5" },
  { label: "Weekly Monday", cron: "0 9 * * 1" },
];

export function ScheduleConfig({ cronExpression, enabled, saving, onSave, onToggle }: ScheduleConfigProps) {
  const [cron, setCron] = useState(cronExpression);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={enabled ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
        >
          <Clock className="h-3.5 w-3.5" />
          {enabled ? "Scheduled" : "Schedule"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Auto-Run Schedule</Label>
            <Switch checked={enabled} onCheckedChange={onToggle} disabled={saving} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cron Expression</Label>
            <Input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              className="h-8 text-sm font-mono"
              placeholder="0 9 * * *"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.cron}
                onClick={() => setCron(p.cron)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                  cron === p.cron
                    ? "bg-primary/20 border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            className="w-full"
            disabled={saving || cron === cronExpression}
            onClick={() => onSave(cron, enabled)}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Save Schedule
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
