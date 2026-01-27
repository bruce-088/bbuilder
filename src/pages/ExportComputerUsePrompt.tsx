import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Download, 
  Copy, 
  Check, 
  Bot, 
  Zap,
  Clock,
  Target,
  Users,
  Presentation,
  Shield,
  Handshake,
  Heart,
  Wand2,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { generateComputerUsePrompt, generateStagePrompt, generateAutomationStages, BusinessIdeaData } from "@/lib/computerUsePromptGenerator";
import { generateDirectorAiPrompt } from "@/lib/directorAiPromptGenerator";
import { generateFullVerificationPrompt, getVerificationDataForStages, VerifiableStage } from "@/lib/verificationPromptGenerator";

interface DbBusinessIdea {
  id: string;
  business_name: string;
  niche: string;
  target_audience: string;
  value_proposition: string;
  service_offering: string;
  ai_automation_strategy: any;
}

const stageIcons: Record<string, React.ReactNode> = {
  "n8n-prospecting": <Target className="w-4 h-4" />,
  "n8n-outreach": <Users className="w-4 h-4" />,
  "n8n-qualification": <Presentation className="w-4 h-4" />,
  "n8n-proposal": <Shield className="w-4 h-4" />,
  "n8n-closing": <Handshake className="w-4 h-4" />,
  "n8n-client-success": <Heart className="w-4 h-4" />,
};

export default function ExportComputerUsePrompt() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [businessIdeas, setBusinessIdeas] = useState<DbBusinessIdea[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<"computer-use" | "director-ai" | "verification">("computer-use");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // n8n hosting configuration for Director.ai
  const [n8nHostingType, setN8nHostingType] = useState<'cloud' | 'self-hosted'>('self-hosted');
  const [selfHostedMethod, setSelfHostedMethod] = useState<'hostinger' | 'docker' | 'npm' | 'other'>('hostinger');
  const [n8nInstanceUrl, setN8nInstanceUrl] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadBusinessIdeas = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("business_ideas")
          .select("id, business_name, niche, target_audience, value_proposition, service_offering, ai_automation_strategy")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setBusinessIdeas(data || []);
        
        if (data && data.length > 0) {
          setSelectedIdeaId(data[0].id);
        }
      } catch (e) {
        console.error("Error loading business ideas:", e);
        toast.error("Failed to load business plans");
      } finally {
        setLoading(false);
      }
    };

    loadBusinessIdeas();
  }, [user]);

  const selectedIdea = businessIdeas.find(idea => idea.id === selectedIdeaId);
  
  const transformedIdea: BusinessIdeaData | null = selectedIdea ? {
    id: selectedIdea.id,
    businessName: selectedIdea.business_name,
    niche: selectedIdea.niche,
    targetAudience: selectedIdea.target_audience,
    valueProposition: selectedIdea.value_proposition,
    serviceOffering: selectedIdea.service_offering,
    aiAutomationStrategy: selectedIdea.ai_automation_strategy,
  } : null;

  const stages = transformedIdea ? generateAutomationStages(transformedIdea) : [];

  // Build verifiable stages for verification prompt
  const buildVerifiableStages = (): VerifiableStage[] => {
    if (!transformedIdea) return [];
    const verificationData = getVerificationDataForStages();
    const automationStages = generateAutomationStages(transformedIdea);
    
    return automationStages.map(stage => {
      const stageVerifications = verificationData.get(stage.id) || [];
      return {
        id: stage.id,
        title: stage.title,
        // Note: setupSteps from computerUsePromptGenerator are plain strings
        steps: stage.setupSteps.map((stepText, index) => ({
          text: stepText,
          verification: stageVerifications[index] || {
            checkDescription: `Verify step ${index + 1} is completed correctly`,
            automatedActions: ["Navigate to relevant service", "Check configuration", "Verify settings match requirements"],
            successIndicators: ["Configuration exists", "Settings are correct"],
            failureIndicators: ["Configuration missing", "Settings incorrect"]
          }
        }))
      };
    });
  };

  const generatedPrompt = transformedIdea 
    ? exportFormat === "verification"
      ? generateFullVerificationPrompt(buildVerifiableStages(), transformedIdea)
      : exportFormat === "director-ai"
        ? generateDirectorAiPrompt(transformedIdea, selectedStageId, {
            hostingType: n8nHostingType,
            deploymentMethod: selfHostedMethod,
            n8nInstanceUrl: n8nInstanceUrl || undefined
          })
        : (selectedStageId === "all" 
            ? generateComputerUsePrompt(transformedIdea) 
            : generateStagePrompt(transformedIdea, selectedStageId))
    : "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const downloadAsMarkdown = () => {
    const blob = new Blob([generatedPrompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stageSuffix = selectedStageId === "all" ? "full-setup" : selectedStageId;
    a.download = `n8n-computer-use-prompt-${selectedIdea?.business_name.toLowerCase().replace(/\s+/g, '-') || 'business'}-${stageSuffix}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Markdown!");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {exportFormat === "verification" ? (
                <CheckCircle2 className="w-6 h-6 text-accent" />
              ) : exportFormat === "director-ai" ? (
                <Wand2 className="w-6 h-6 text-accent" />
              ) : (
                <Bot className="w-6 h-6 text-accent" />
              )}
              Export for AI Agent
            </h1>
            <p className="text-muted-foreground">
              {exportFormat === "verification"
                ? "Generate verification prompts to test your automation setup"
                : exportFormat === "director-ai" 
                  ? "Generate prompts optimized for Director.ai automation"
                  : "Generate prompts for Claude Cowork or Gemini 2.5 Computer Use"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent" />
                  Configuration
                </CardTitle>
                <CardDescription>
                  Select your business idea and what to export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export Format Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Export Format</label>
                  <Tabs value={exportFormat} onValueChange={(v) => setExportFormat(v as "computer-use" | "director-ai" | "verification")}>
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="computer-use" className="gap-1 text-xs px-2">
                        <Bot className="w-3 h-3" />
                        <span className="hidden sm:inline">Computer Use</span>
                        <span className="sm:hidden">Build</span>
                      </TabsTrigger>
                      <TabsTrigger value="director-ai" className="gap-1 text-xs px-2">
                        <Wand2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Director.ai</span>
                        <span className="sm:hidden">Auto</span>
                      </TabsTrigger>
                      <TabsTrigger value="verification" className="gap-1 text-xs px-2">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Verification</span>
                        <span className="sm:hidden">Test</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Business Idea Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Plan</label>
                  <Select value={selectedIdeaId} onValueChange={setSelectedIdeaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a business plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessIdeas.map((idea) => (
                        <SelectItem key={idea.id} value={idea.id}>
                          {idea.business_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stage Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Export Scope</label>
                  <Tabs value={selectedStageId} onValueChange={setSelectedStageId}>
                    <TabsList className="w-full">
                      <TabsTrigger value="all" className="flex-1">All Stages</TabsTrigger>
                      <TabsTrigger value="single" className="flex-1" disabled>Single</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  {selectedStageId !== "all" && (
                    <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              {stageIcons[stage.id]}
                              {stage.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* n8n Instance Configuration - for Director.ai format */}
                {exportFormat === "director-ai" && (
                  <div className="space-y-3 pt-4 border-t">
                    <label className="text-sm font-medium">n8n Instance</label>
                    <RadioGroup 
                      value={n8nHostingType} 
                      onValueChange={(v) => setN8nHostingType(v as 'cloud' | 'self-hosted')}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cloud" id="export-cloud" />
                        <Label htmlFor="export-cloud">n8n Cloud</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self-hosted" id="export-self" />
                        <Label htmlFor="export-self">Self-Hosted</Label>
                      </div>
                    </RadioGroup>
                    
                    {n8nHostingType === 'self-hosted' && (
                      <>
                        <Select value={selfHostedMethod} onValueChange={(v) => setSelfHostedMethod(v as 'hostinger' | 'docker' | 'npm' | 'other')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Deployment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hostinger">Hostinger One-Click</SelectItem>
                            <SelectItem value="docker">Docker</SelectItem>
                            <SelectItem value="npm">npm/npx</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Input
                          placeholder="https://n8n.yourdomain.com"
                          value={n8nInstanceUrl}
                          onChange={(e) => setN8nInstanceUrl(e.target.value)}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter your n8n instance URL for accurate AI instructions
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Stage Overview */}
                {selectedIdeaId && (
                  <div className="space-y-2 pt-4 border-t">
                    <label className="text-sm font-medium">Stages Included</label>
                    <div className="space-y-2">
                      {stages.map((stage, index) => (
                        <div 
                          key={stage.id} 
                          className={`flex items-center justify-between p-2 rounded-lg border ${
                            selectedStageId === "all" || selectedStageId === stage.id 
                              ? "bg-accent/10 border-accent/30" 
                              : "bg-muted/30 border-transparent opacity-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <span className="text-sm">{stage.title}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {stage.estimatedTime}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-4">
                  <Button 
                    onClick={copyToClipboard} 
                    className="w-full" 
                    disabled={!selectedIdeaId}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={downloadAsMarkdown} 
                    variant="outline" 
                    className="w-full"
                    disabled={!selectedIdeaId}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download as Markdown
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Usage Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How to Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {exportFormat === "verification" ? (
                  <>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">1</Badge>
                      <span>Complete your N8N automation setup first</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">2</Badge>
                      <span>Copy the verification prompt</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">3</Badge>
                      <span>Paste into Director.ai or your AI agent</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">4</Badge>
                      <span>AI will systematically verify each step</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">5</Badge>
                      <span>Review report and fix any failures</span>
                    </div>
                  </>
                ) : exportFormat === "director-ai" ? (
                  <>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">1</Badge>
                      <span>Copy the generated prompt</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">2</Badge>
                      <span>Go to director.ai and sign in</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">3</Badge>
                      <span>Paste prompt in task description</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">4</Badge>
                      <span>Configure credentials in 1Password</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">5</Badge>
                      <span>Run or schedule the workflow</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">1</Badge>
                      <span>Copy or download the generated prompt</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">2</Badge>
                      <span>Open Claude Cowork or Gemini 2.5 with Computer Use</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">3</Badge>
                      <span>Paste the prompt and let the AI build your workflows</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0">4</Badge>
                      <span>Monitor progress and provide credentials when asked</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Generated Prompt Preview</span>
                {selectedIdeaId && (
                  <Badge variant="secondary">
                    ~{generatedPrompt.split(/\s+/).length} words
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                This is the prompt that will be sent to the computer-use AI agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedIdeaId ? (
                <ScrollArea className="h-[600px] rounded-lg border bg-muted/30 p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/80">
                    {generatedPrompt}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a business plan to generate the prompt</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
