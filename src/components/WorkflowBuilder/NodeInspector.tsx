import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, Wrench, Brain, FileJson } from "lucide-react";
import { NODE_TYPE_CONFIG, type WorkflowNode } from "./types";

interface NodeInspectorProps {
  node: WorkflowNode;
  onUpdate: (id: string, updates: Partial<WorkflowNode>) => void;
  onClose: () => void;
}

const AI_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
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
              <Select value={node.ai_model || "google/gemini-3-flash-preview"} onValueChange={(v) => onUpdate(node.id, { ai_model: v })}>
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
                rows={5}
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

            {/* ── Tool Calling ── */}
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold">Tool Calling</Label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Enable autonomous tool use</span>
                <Switch
                  checked={node.config.tool_calling_enabled === true}
                  onCheckedChange={(v) => updateConfig("tool_calling_enabled", v)}
                />
              </div>
              {node.config.tool_calling_enabled === true && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Agent can call HTTP requests, run code, and search data mid-reasoning.
                </p>
              )}
            </div>

            {/* ── Multi-Turn Reasoning ── */}
            <div className="border-t border-border pt-3 mt-1">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold">Multi-Turn Reasoning</Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Max iterations</Label>
                <Input
                  type="number" min={1} max={10} step={1}
                  value={(node.config.max_iterations as number) ?? 3}
                  onChange={(e) => updateConfig("max_iterations", parseInt(e.target.value))}
                  className="h-8 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  How many reasoning loops the agent can perform (1–10).
                </p>
              </div>
            </div>

            {/* ── Structured Output ── */}
            <div className="border-t border-border pt-3 mt-1">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold">Structured Output</Label>
              </div>
              <Textarea
                value={(node.config.output_schema as string) || ""}
                onChange={(e) => updateConfig("output_schema", e.target.value)}
                rows={4}
                className="text-xs font-mono resize-none"
                placeholder={`{
  "type": "object",
  "properties": {
    "score": { "type": "number" },
    "reason": { "type": "string" }
  },
  "required": ["score", "reason"]
}`}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                JSON Schema to enforce structured output. Leave empty for free-form.
              </p>
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

        {/* Database Query config */}
        {node.type === "database_query" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Table Name</Label>
              <Input value={(node.config.table as string) || ""} onChange={(e) => updateConfig("table", e.target.value)} className="h-8 text-sm" placeholder="lead_contacts" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Operation</Label>
              <Select value={(node.config.operation as string) || "select"} onValueChange={(v) => updateConfig("operation", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["select", "insert", "update", "delete"].map((op) => (
                    <SelectItem key={op} value={op}>{op.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Filter Column</Label>
              <Input value={(node.config.filter_column as string) || ""} onChange={(e) => updateConfig("filter_column", e.target.value)} className="h-8 text-sm" placeholder="email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Filter Value</Label>
              <Input value={(node.config.filter_value as string) || ""} onChange={(e) => updateConfig("filter_value", e.target.value)} className="h-8 text-sm" placeholder="{{email}}" />
              <p className="text-[10px] text-muted-foreground">Use {"{{field}}"} for upstream data</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Columns</Label>
              <Input value={(node.config.columns as string) || "*"} onChange={(e) => updateConfig("columns", e.target.value)} className="h-8 text-sm" placeholder="*" />
              <p className="text-[10px] text-muted-foreground">Comma-separated or * for all</p>
            </div>
          </>
        )}

        {/* Loop config */}
        {node.type === "loop" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Array Field</Label>
            <Input value={(node.config.array_field as string) || "items"} onChange={(e) => updateConfig("array_field", e.target.value)} className="h-8 text-sm" placeholder="items" />
            <p className="text-[10px] text-muted-foreground">Key in upstream data that holds the array</p>
          </div>
        )}

        {/* Merge config */}
        {node.type === "merge" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Merge Strategy</Label>
            <Select value={(node.config.strategy as string) || "combine"} onValueChange={(v) => updateConfig("strategy", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="combine">Combine (merge keys)</SelectItem>
                <SelectItem value="wait_all">Wait All (collect array)</SelectItem>
                <SelectItem value="append">Append (concatenate)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">How to merge inputs from multiple branches</p>
          </div>
        )}
      </div>
    </div>
  );
}
