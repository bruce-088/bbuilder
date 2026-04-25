import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, Calendar, Edit, X, Check, RotateCcw } from "lucide-react";

const STORAGE_KEY = "mya.milestone";

type Milestone = {
  label: string;
  targetDate: string;
  setAt: string;
  hitAt?: string | null;
} | null;

const PRESETS = [
  "First customer",
  "Landing page live",
  "First $1k revenue",
  "10 leads in pipeline",
  "Custom...",
];

function readMilestone(): Milestone {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Milestone) : null;
  } catch {
    return null;
  }
}

function writeMilestone(m: Milestone) {
  if (m === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
}

function computeDelta(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff / 3_600_000) % 24);
  const minutes = Math.floor((diff / 60_000) % 60);
  return { days, hours, minutes };
}

export default function MilestoneCard() {
  const [milestone, setMilestone] = useState<Milestone>(null);
  const [editing, setEditing] = useState(false);
  const [preset, setPreset] = useState<string>("First customer");
  const [customLabel, setCustomLabel] = useState("");
  const [date, setDate] = useState("");
  const [, forceTick] = useState(0);

  useEffect(() => {
    setMilestone(readMilestone());
  }, []);

  // Re-render every minute so countdown stays fresh
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const startEditing = () => {
    if (milestone) {
      const isPreset = PRESETS.includes(milestone.label);
      setPreset(isPreset ? milestone.label : "Custom...");
      setCustomLabel(isPreset ? "" : milestone.label);
      setDate(milestone.targetDate.slice(0, 10));
    } else {
      setPreset("First customer");
      setCustomLabel("");
      setDate("");
    }
    setEditing(true);
  };

  const handleSave = () => {
    const label = preset === "Custom..." ? customLabel.trim() : preset;
    if (!label || !date) return;
    const m: Milestone = {
      label,
      targetDate: new Date(date).toISOString(),
      setAt: new Date().toISOString(),
      hitAt: null,
    };
    writeMilestone(m);
    setMilestone(m);
    setEditing(false);
  };

  const handleClear = () => {
    writeMilestone(null);
    setMilestone(null);
    setEditing(false);
  };

  const handleHit = () => {
    if (!milestone) return;
    const m = { ...milestone, hitAt: new Date().toISOString() };
    writeMilestone(null); // archive — clear active
    setMilestone(null);
  };

  // EDITING / UNSET state
  if (editing || !milestone) {
    return (
      <Card className="glass border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm">
              {milestone ? "Edit milestone" : "Set your next milestone"}
            </h3>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">What</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {preset === "Custom..." && (
              <Input
                placeholder="Custom milestone label"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="h-9 mt-1.5"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">By</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9"
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
              disabled={!date || (preset === "Custom..." && !customLabel.trim())}
            >
              Set milestone
            </Button>
            {milestone && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const remaining = computeDelta(milestone.targetDate);
  const targetDateStr = new Date(milestone.targetDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // PAST DUE
  if (!remaining) {
    return (
      <Card className="glass border-amber-500/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-sm truncate">
              {milestone.label} — past due
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Originally targeted: {targetDateStr}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleHit}
              className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Mark hit
            </Button>
            <Button size="sm" variant="outline" onClick={startEditing} className="flex-1">
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reschedule
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ACTIVE
  return (
    <Card className="glass border-emerald-500/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm truncate flex-1">{milestone.label}</h3>
        </div>
        <div className="text-center py-2">
          <p className="font-display font-bold text-2xl text-emerald-300">
            {remaining.days}d · {String(remaining.hours).padStart(2, "0")}h ·{" "}
            {String(remaining.minutes).padStart(2, "0")}m
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Calendar className="w-3 h-3" />
            until {targetDateStr}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={startEditing} className="flex-1">
            <Edit className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClear} className="flex-1">
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
