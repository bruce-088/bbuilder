import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { NODE_TYPE_CONFIG, type WorkflowNode } from "./types";

interface NodeInspectorProps {
  node: WorkflowNode;
  onUpdate: (id: string, updates: Partial<WorkflowNode>) => void;
  onClose: () => void;
}

const AI_MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
];

export function NodeInspector({ node, onUpdate, onClose }: NodeInspectorProps) {
  const cfg = NODE_TYPE_CONFIG[node.type];

  const updateConfig = (key: string, value: unknown) => {
    onUpdate(node.id, { config: { ...node.config, [key]: value } });
  };

  return (
    <div className="w-80 border-l border-border bg-card/50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <h3 className="text-sm font-semibold text-foreground">Node Settings</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={node.name} onChange={(e) => onUpdate(node.id, { name: e.target.value })} className="h-8 text-sm" />
        </div>

        {/* AI Agent config */}
        {node.type === "ai_agent" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Model</Label>
              <Select value={node.ai_model || "google/gemini-2.5-flash"} onValueChange={(v) => onUpdate(node.id, { ai_model: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">System Prompt</Label>
              <Textarea
                value={node.ai_prompt || ""}
                onChange={(e) => onUpdate(node.id, { ai_prompt: e.target.value })}
                rows={6}
                className="text-sm resize-none"
                placeholder="You are a lead scoring expert..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Temperature</Label>
              <Input
                type="number" min={0} max={2} step={0.1}
                value={(node.config.temperature as number) ?? 0.7}
                onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
          </>
        )}

        {/* HTTP Request config */}
        {node.type === "http_request" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Method</Label>
              <Select value={(node.config.method as string) || "GET"} onValueChange={(v) => updateConfig("method", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL</Label>
              <Input value={(node.config.url as string) || ""} onChange={(e) => updateConfig("url", e.target.value)} className="h-8 text-sm" placeholder="https://api.example.com" />
            </div>
          </>
        )}

        {/* Email config */}
        {node.type === "email_send" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input value={(node.config.to as string) || ""} onChange={(e) => updateConfig("to", e.target.value)} className="h-8 text-sm" placeholder="user@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input value={(node.config.subject as string) || ""} onChange={(e) => updateConfig("subject", e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Body</Label>
              <Textarea value={(node.config.body as string) || ""} onChange={(e) => updateConfig("body", e.target.value)} rows={4} className="text-sm resize-none" />
            </div>
          </>
        )}

        {/* Filter config */}
        {node.type === "filter" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Condition Field</Label>
              <Input value={(node.config.condition as string) || ""} onChange={(e) => updateConfig("condition", e.target.value)} className="h-8 text-sm" placeholder="data.score" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Operator</Label>
              <Select value={(node.config.operator as string) || "equals"} onValueChange={(v) => updateConfig("operator", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["equals", "not_equals", "greater_than", "less_than", "contains"].map((op) => (
                    <SelectItem key={op} value={op}>{op.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Value</Label>
              <Input value={(node.config.value as string) || ""} onChange={(e) => updateConfig("value", e.target.value)} className="h-8 text-sm" />
            </div>
          </>
        )}

        {/* Code config */}
        {node.type === "code" && (
          <div className="space-y-1.5">
            <Label className="text-xs">JavaScript Code</Label>
            <Textarea
              value={(node.config.code as string) || "return input;"}
              onChange={(e) => updateConfig("code", e.target.value)}
              rows={8}
              className="text-sm font-mono resize-none"
              placeholder="// Transform input data"
            />
          </div>
        )}

        {/* Delay config */}
        {node.type === "delay" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Delay (seconds)</Label>
            <Input type="number" min={1} value={(node.config.seconds as number) || 5} onChange={(e) => updateConfig("seconds", parseInt(e.target.value))} className="h-8 text-sm" />
          </div>
        )}

        {/* Schedule trigger config */}
        {node.type === "schedule_trigger" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Cron Expression</Label>
            <Input value={(node.config.cron as string) || "0 9 * * *"} onChange={(e) => updateConfig("cron", e.target.value)} className="h-8 text-sm" placeholder="0 9 * * *" />
            <p className="text-[10px] text-muted-foreground">e.g. "0 9 * * *" = daily at 9am</p>
          </div>
        )}

        {/* Webhook trigger */}
        {node.type === "webhook_trigger" && (
          <div className="space-y-1.5">
            <Label className="text-xs">HTTP Method</Label>
            <Select value={(node.config.method as string) || "POST"} onValueChange={(v) => updateConfig("method", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
