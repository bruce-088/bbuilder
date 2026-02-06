import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Play, Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WorkflowToolbarProps {
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onRun: () => void;
  saving: boolean;
  running: boolean;
}

export function WorkflowToolbar({ name, onNameChange, onSave, onRun, saving, running }: WorkflowToolbarProps) {
  const navigate = useNavigate();

  return (
    <div className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 px-4 shrink-0">
      <Button variant="ghost" size="icon" onClick={() => navigate("/workflows")} className="shrink-0">
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="max-w-xs h-8 text-sm font-medium bg-transparent border-transparent hover:border-border focus:border-primary"
      />

      <div className="flex-1" />

      <Button variant="outline" size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save
      </Button>

      <Button size="sm" onClick={onRun} disabled={running} className="gap-1.5 bg-gradient-to-r from-primary to-primary/80">
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        Run
      </Button>
    </div>
  );
}
