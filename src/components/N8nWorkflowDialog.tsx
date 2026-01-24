import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, Workflow, Copy, Check, RefreshCw, ExternalLink, Info, ChevronDown, Download, Zap, Mail, MessageSquare, Database, Globe, Clock, GitBranch, Code, Bot } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface N8nWorkflowDialogProps {
  businessIdeaId: string;
  businessName: string;
  trigger?: React.ReactNode;
}

interface AiPrompt {
  id?: string;
  prompt_content: string;
  prompt_type: string;
  created_at?: string;
}

// Map node types to friendly names and icons
const NODE_TYPE_MAP: Record<string, { label: string; icon: typeof Zap }> = {
  'webhook': { label: 'Webhook', icon: Zap },
  'httpRequest': { label: 'HTTP Request', icon: Globe },
  'gmail': { label: 'Gmail', icon: Mail },
  'slack': { label: 'Slack', icon: MessageSquare },
  'notion': { label: 'Notion', icon: Database },
  'airtable': { label: 'Airtable', icon: Database },
  'set': { label: 'Set Data', icon: Database },
  'if': { label: 'Condition', icon: GitBranch },
  'switch': { label: 'Switch', icon: GitBranch },
  'code': { label: 'Code', icon: Code },
  'wait': { label: 'Wait', icon: Clock },
  'manualTrigger': { label: 'Manual Trigger', icon: Zap },
  'scheduleTrigger': { label: 'Schedule', icon: Clock },
  'agent': { label: 'AI Agent', icon: Bot },
};

export default function N8nWorkflowDialog({
  businessIdeaId,
  businessName,
  trigger,
}: N8nWorkflowDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState<AiPrompt | null>(null);
  const [copied, setCopied] = useState(false);

  const generateWorkflow = async (regenerate = false) => {
    setLoading(true);
    try {
      // If regenerating, clear the current prompt state
      if (regenerate) {
        setPrompt(null);
      }

      const { data, error } = await supabase.functions.invoke("generate-n8n-workflow", {
        body: { businessIdeaId, regenerate },
      });

      if (error) throw error;

      if (data?.prompt) {
        setPrompt(data.prompt);
        if (regenerate) {
          toast.success("Fresh workflow generated!", {
            description: "The workflow has been regenerated with the latest template.",
          });
        } else if (data.saved) {
          toast.success("n8n workflow generated and saved!");
        } else {
          toast.success("n8n workflow generated!");
        }
      }
    } catch (error) {
      console.error("Error generating n8n workflow:", error);
      toast.error("Failed to generate n8n workflow");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !prompt) {
      generateWorkflow();
    }
  };

  const copyToClipboard = async () => {
    if (!prompt?.prompt_content) return;
    
    try {
      await navigator.clipboard.writeText(prompt.prompt_content);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  // Known valid n8n node type prefixes
  const VALID_N8N_NODE_PREFIXES = [
    'n8n-nodes-base.manualTrigger',
    'n8n-nodes-base.scheduleTrigger',
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.httpRequest',
    'n8n-nodes-base.set',
    'n8n-nodes-base.if',
    'n8n-nodes-base.switch',
    'n8n-nodes-base.code',
    'n8n-nodes-base.wait',
    'n8n-nodes-base.noOp',
    'n8n-nodes-base.merge',
    'n8n-nodes-base.gmail',
    'n8n-nodes-base.slack',
    'n8n-nodes-base.notion',
    'n8n-nodes-base.airtable',
    '@n8n/n8n-nodes-langchain.agent',
  ];

  const isValidNodeType = (type: string): boolean => {
    return VALID_N8N_NODE_PREFIXES.some(prefix => type === prefix || type.startsWith(prefix));
  };

  const extractN8nWorkflowJson = (markdownContent: string): object | null => {
    // Look for JSON code blocks in the markdown
    const jsonBlockRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
    const matches = [...markdownContent.matchAll(jsonBlockRegex)];
    
    // Find the best n8n workflow JSON block
    let bestWorkflow: Record<string, unknown> | null = null;
    let bestScore = 0;
    
    for (const match of matches) {
      try {
        const jsonContent = match[1].trim();
        const parsed = JSON.parse(jsonContent) as Record<string, unknown>;
        
        // Must have nodes array to be a valid n8n workflow
        if (!parsed || !Array.isArray(parsed.nodes)) continue;
        
        const nodes = parsed.nodes as Array<{ type?: string; name?: string }>;
        
        // Score based on completeness
        let score = nodes.length;
        if (parsed.connections) score += 10;
        if (parsed.settings) score += 5;
        if (parsed.name) score += 5;
        
        // Bonus points for valid node types
        const validNodeCount = nodes.filter(n => n.type && isValidNodeType(n.type)).length;
        score += validNodeCount * 2;
        
        if (score > bestScore) {
          bestWorkflow = parsed;
          bestScore = score;
        }
      } catch {
        // Not valid JSON, skip
        continue;
      }
    }
    
    // Ensure required fields exist for n8n import
    if (bestWorkflow) {
      if (!bestWorkflow.connections) bestWorkflow.connections = {};
      if (!bestWorkflow.settings) bestWorkflow.settings = { executionOrder: "v1" };
      if (!bestWorkflow.name) bestWorkflow.name = `${businessName} Automation`;
      if (bestWorkflow.active === undefined) bestWorkflow.active = false;
      
      // Log warning for potentially invalid node types
      const nodes = bestWorkflow.nodes as Array<{ type?: string; name?: string }>;
      const invalidNodes = nodes.filter(n => n.type && !isValidNodeType(n.type));
      if (invalidNodes.length > 0) {
        console.warn('Workflow contains potentially invalid node types:', invalidNodes.map(n => n.type));
      }
    }
    
    return bestWorkflow;
  };

  const downloadAsJson = () => {
    if (!prompt?.prompt_content) return;
    
    // Try to extract the actual n8n workflow JSON from the markdown
    const workflowJson = extractN8nWorkflowJson(prompt.prompt_content);
    
    if (!workflowJson) {
      toast.error("Could not extract valid n8n workflow JSON. Try regenerating the workflow.");
      return;
    }
    
    const blob = new Blob([JSON.stringify(workflowJson, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `n8n-workflow-${businessName.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("n8n workflow downloaded! Import via File → Import from File in n8n.");
  };

  // Extract unique node types from the workflow for display
  const workflowNodeTypes = useMemo(() => {
    if (!prompt?.prompt_content) return [];
    
    const workflow = extractN8nWorkflowJson(prompt.prompt_content);
    if (!workflow || !Array.isArray((workflow as { nodes?: unknown[] }).nodes)) return [];
    
    const nodes = (workflow as { nodes: Array<{ type?: string }> }).nodes;
    const typeSet = new Set<string>();
    
    nodes.forEach(node => {
      if (node.type) {
        // Extract the short type name (e.g., "webhook" from "n8n-nodes-base.webhook")
        const shortType = node.type.split('.').pop() || node.type;
        typeSet.add(shortType);
      }
    });
    
    return Array.from(typeSet).map(type => {
      const mapping = NODE_TYPE_MAP[type];
      return {
        type,
        label: mapping?.label || type.charAt(0).toUpperCase() + type.slice(1),
        Icon: mapping?.icon || Zap,
      };
    });
  }, [prompt?.prompt_content]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Workflow className="w-4 h-4" />
            n8n Workflow
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Workflow className="w-5 h-5 text-primary" />
            n8n Workflow Automation
          </DialogTitle>
          <DialogDescription>
            Ready-to-use n8n workflow for <strong>{businessName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                Generating n8n workflow automation...
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a moment
              </p>
            </div>
          </div>
        ) : prompt ? (
          <>
            {/* Instructions Card */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">How to use this in n8n:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Click <strong>"Copy to Clipboard"</strong> below to copy the workflow prompt</li>
                    <li>Open <a href="https://n8n.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">n8n <ExternalLink className="w-3 h-3" /></a> and create a new workflow</li>
                    <li>Add an <strong>AI Agent</strong> or <strong>Chat</strong> node</li>
                    <li>Paste the prompt into the{" "}
                      <a 
                        href="https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        system message or instructions field
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>Configure your triggers and connections as described in the workflow</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Node Types Badges */}
            {workflowNodeTypes.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Integrations included in this workflow:</p>
                <div className="flex flex-wrap gap-2">
                  {workflowNodeTypes.map(({ type, label, Icon }) => (
                    <Badge key={type} variant="secondary" className="gap-1.5 py-1">
                      <Icon className="w-3 h-3" />
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Guide - Collapsible */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="w-4 h-4 transition-transform data-[state=open]:rotate-180" />
                Show visual guide - where to paste the prompt
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 p-4 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-3 text-center">n8n Workflow Structure</p>
                  
                  {/* Workflow flow */}
                  <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 text-sm">
                    <div className="px-2 sm:px-3 py-2 rounded border bg-background text-xs sm:text-sm">
                      🔔 Trigger
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="px-2 sm:px-3 py-2 rounded border-2 border-primary bg-primary/10 text-xs sm:text-sm font-medium">
                      🤖 AI Agent
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="px-2 sm:px-3 py-2 rounded border bg-background text-xs sm:text-sm">
                      📤 Output
                    </div>
                  </div>
                  
                  {/* AI Agent config panel */}
                  <div className="border-2 border-primary rounded-lg p-3 sm:p-4 bg-background">
                    <p className="font-medium text-sm mb-3 flex items-center gap-2">
                      🤖 AI Agent Configuration Panel
                    </p>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="px-3 py-2 rounded bg-muted text-muted-foreground">
                        Model Selection (e.g., GPT-4, Claude)
                      </div>
                      <div className="px-3 py-2 rounded bg-success/20 border-2 border-success font-medium flex items-center gap-2">
                        <span className="text-success">⭐</span>
                        <span>System Message</span>
                        <span className="ml-auto text-success font-bold">← PASTE PROMPT HERE</span>
                      </div>
                      <div className="px-3 py-2 rounded bg-muted text-muted-foreground">
                        Temperature, Max Tokens, etc.
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Click on the AI Agent node to open its configuration panel, then paste your prompt in the System Message field
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="gap-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAsJson}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateWorkflow(true)}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </Button>
            </div>
            <ScrollArea className="flex-1 max-h-[50vh] rounded-lg border bg-muted/50 p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    pre: ({ children }) => (
                      <pre className="bg-background rounded-lg p-4 overflow-x-auto text-xs">
                        {children}
                      </pre>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-background px-1.5 py-0.5 rounded text-xs">
                          {children}
                        </code>
                      ) : (
                        <code className="text-xs">{children}</code>
                      );
                    },
                  }}
                >
                  {prompt.prompt_content}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Failed to generate workflow
              </p>
              <Button onClick={() => generateWorkflow()} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
