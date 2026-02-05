import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  Brain,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Globe,
  Lock,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { useAIProviders } from "@/hooks/useAIProviders";
import { useBrowserbaseSettings } from "@/hooks/useBrowserbaseSettings";
import { toast } from "sonner";

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISettingsDialog({
  open,
  onOpenChange,
}: AISettingsDialogProps) {
  const {
    providers,
    saving,
    testing,
    saveApiKey,
    removeApiKey,
  } = useAIProviders();

  const {
    contexts,
    credentialsConfigured,
    loading: browserbaseLoading,
    clearContext,
    clearAllContexts,
    refreshContexts,
  } = useBrowserbaseSettings();

  const [openaiKey, setOpenaiKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [perplexityKey, setPerplexityKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showPerplexityKey, setShowPerplexityKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showElevenlabsKey, setShowElevenlabsKey] = useState(false);
  const [activeTab, setActiveTab] = useState("openai");

  const openaiProvider = providers.find((p) => p.id === "openai");
  const claudeProvider = providers.find((p) => p.id === "claude");
  const perplexityProvider = providers.find((p) => p.id === "perplexity");
  const geminiProvider = providers.find((p) => p.id === "gemini");
  const elevenlabsProvider = providers.find((p) => p.id === "elevenlabs");

  const handleSaveOpenAI = async () => {
    if (!openaiKey.trim()) return;
    const success = await saveApiKey("openai", openaiKey.trim());
    if (success) {
      setOpenaiKey("");
    }
  };

  const handleSaveClaude = async () => {
    if (!claudeKey.trim()) return;
    const success = await saveApiKey("claude", claudeKey.trim());
    if (success) {
      setClaudeKey("");
    }
  };

  const handleRemoveOpenAI = async () => {
    await removeApiKey("openai");
  };

  const handleRemoveClaude = async () => {
    await removeApiKey("claude");
  };

  const handleSavePerplexity = async () => {
    if (!perplexityKey.trim()) return;
    const success = await saveApiKey("perplexity", perplexityKey.trim());
    if (success) {
      setPerplexityKey("");
    }
  };

  const handleRemovePerplexity = async () => {
    await removeApiKey("perplexity");
  };

  const handleSaveGemini = async () => {
    if (!geminiKey.trim()) return;
    const success = await saveApiKey("gemini", geminiKey.trim());
    if (success) {
      setGeminiKey("");
    }
  };

  const handleRemoveGemini = async () => {
    await removeApiKey("gemini");
  };

  const handleSaveElevenlabs = async () => {
    if (!elevenlabsKey.trim()) return;
    const success = await saveApiKey("elevenlabs", elevenlabsKey.trim());
    if (success) {
      setElevenlabsKey("");
    }
  };

  const handleRemoveElevenlabs = async () => {
    await removeApiKey("elevenlabs");
  };

  const handleClearContext = (url: string) => {
    const success = clearContext(url);
    if (success) {
      toast.success(`Cleared session for ${url}`);
    } else {
      toast.error("Failed to clear session");
    }
  };

  const handleClearAllContexts = () => {
    const success = clearAllContexts();
    if (success) {
      toast.success("Cleared all saved sessions");
    } else {
      toast.error("Failed to clear sessions");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Provider Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="openai" className="flex items-center gap-1 text-xs px-1">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">OpenAI</span>
              {openaiProvider?.configured && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="claude" className="flex items-center gap-1 text-xs px-1">
              <Brain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Claude</span>
              {claudeProvider?.configured && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="gemini" className="flex items-center gap-1 text-xs px-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Gemini</span>
              {geminiProvider?.configured && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="perplexity" className="flex items-center gap-1 text-xs px-1">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Perplexity</span>
              {perplexityProvider?.configured && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="elevenlabs" className="flex items-center gap-1 text-xs px-1">
              <Volume2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Voice</span>
              {elevenlabsProvider?.configured && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="browserbase" className="flex items-center gap-1 text-xs px-1">
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Browser</span>
              {credentialsConfigured && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* OpenAI Tab */}
            <TabsContent value="openai" className="space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">OpenAI GPT-5</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced reasoning and code generation
                  </p>
                </div>
              {openaiProvider?.configured ? (
                <Badge className="bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
              </div>

              {openaiProvider?.configured ? (
                <div className="space-y-3">
                  <Alert>
                    <AlertDescription className="flex items-center justify-between">
                      <span>Your OpenAI API key is configured and ready to use.</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveOpenAI}
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="openai-key">API Key</Label>
                    <div className="relative">
                      <Input
                        id="openai-key"
                        type={showOpenaiKey ? "text" : "password"}
                        placeholder="sk-proj-..."
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      >
                        {showOpenaiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Get your API key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      onClick={handleSaveOpenAI}
                      disabled={!openaiKey.trim() || saving || testing === "openai"}
                    >
                      {testing === "openai" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save & Connect"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Best for:</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Complex workflow analysis</li>
                  <li>• Detailed business plan generation</li>
                  <li>• Code generation and debugging</li>
                </ul>
              </div>
            </TabsContent>

            {/* Claude Tab */}
            <TabsContent value="claude" className="space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Claude (Anthropic)</h3>
                  <p className="text-sm text-muted-foreground">
                    Multi-step reasoning with long context
                  </p>
                </div>
              {claudeProvider?.configured ? (
                <Badge className="bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
              </div>

              {claudeProvider?.configured ? (
                <div className="space-y-3">
                  <Alert>
                    <AlertDescription className="flex items-center justify-between">
                      <span>Your Claude API key is configured and ready to use.</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveClaude}
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="claude-key">API Key</Label>
                    <div className="relative">
                      <Input
                        id="claude-key"
                        type={showClaudeKey ? "text" : "password"}
                        placeholder="sk-ant-..."
                        value={claudeKey}
                        onChange={(e) => setClaudeKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowClaudeKey(!showClaudeKey)}
                      >
                        {showClaudeKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Get your API key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      onClick={handleSaveClaude}
                      disabled={!claudeKey.trim() || saving || testing === "claude"}
                    >
                      {testing === "claude" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save & Connect"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Best for:</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Deep automation strategy</li>
                  <li>• Comprehensive troubleshooting</li>
                  <li>• Long-form content generation</li>
                </ul>
              </div>
            </TabsContent>

            {/* Gemini Tab */}
            <TabsContent value="gemini" className="space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Google Gemini</h3>
                  <p className="text-sm text-muted-foreground">
                    Multimodal AI with strong reasoning
                  </p>
                </div>
              {geminiProvider?.configured ? (
                <Badge className="bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
              </div>

              {geminiProvider?.configured ? (
                <div className="space-y-3">
                  <Alert>
                    <AlertDescription className="flex items-center justify-between">
                      <span>Your Gemini API key is configured and ready to use.</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveGemini}
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="gemini-key">API Key</Label>
                    <div className="relative">
                      <Input
                        id="gemini-key"
                        type={showGeminiKey ? "text" : "password"}
                        placeholder="AIza..."
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                      >
                        {showGeminiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Get your API key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      onClick={handleSaveGemini}
                      disabled={!geminiKey.trim() || saving || testing === "gemini"}
                    >
                      {testing === "gemini" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save & Connect"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Best for:</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Multimodal tasks (text + images)</li>
                  <li>• Large context processing</li>
                  <li>• Fast, cost-effective generation</li>
                </ul>
              </div>
            </TabsContent>

            {/* Perplexity Tab */}
            <TabsContent value="perplexity" className="space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Perplexity</h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time web search and research
                  </p>
                </div>
              {perplexityProvider?.configured ? (
                <Badge className="bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
              </div>

              {perplexityProvider?.configured ? (
                <div className="space-y-3">
                  <Alert>
                    <AlertDescription className="flex items-center justify-between">
                      <span>Your Perplexity API key is configured and ready to use.</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemovePerplexity}
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="perplexity-key">API Key</Label>
                    <div className="relative">
                      <Input
                        id="perplexity-key"
                        type={showPerplexityKey ? "text" : "password"}
                        placeholder="pplx-..."
                        value={perplexityKey}
                        onChange={(e) => setPerplexityKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPerplexityKey(!showPerplexityKey)}
                      >
                        {showPerplexityKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <a
                      href="https://www.perplexity.ai/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Get your API key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      onClick={handleSavePerplexity}
                      disabled={!perplexityKey.trim() || saving || testing === "perplexity"}
                    >
                      {testing === "perplexity" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save & Connect"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Best for:</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Market research with citations</li>
                  <li>• Competitor analysis</li>
                  <li>• Current trends and news</li>
                </ul>
              </div>
            </TabsContent>

            {/* ElevenLabs Voice Tab */}
            <TabsContent value="elevenlabs" className="space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">ElevenLabs Voice</h3>
                  <p className="text-sm text-muted-foreground">
                    Text-to-speech and voice input
                  </p>
                </div>
              {elevenlabsProvider?.configured ? (
                <Badge className="bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
              </div>

              {elevenlabsProvider?.configured ? (
                <div className="space-y-3">
                  <Alert>
                    <AlertDescription className="flex items-center justify-between">
                      <span>Your ElevenLabs API key is configured and ready to use.</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveElevenlabs}
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="elevenlabs-key">API Key</Label>
                    <div className="relative">
                      <Input
                        id="elevenlabs-key"
                        type={showElevenlabsKey ? "text" : "password"}
                        placeholder="xi-..."
                        value={elevenlabsKey}
                        onChange={(e) => setElevenlabsKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowElevenlabsKey(!showElevenlabsKey)}
                      >
                        {showElevenlabsKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <a
                      href="https://elevenlabs.io/app/settings/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Get your API key
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      onClick={handleSaveElevenlabs}
                      disabled={!elevenlabsKey.trim() || saving || testing === "elevenlabs"}
                    >
                      {testing === "elevenlabs" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save & Connect"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Enables:</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Voice input for chat with Mya</li>
                  <li>• Audio playback of Mya's responses</li>
                  <li>• Daily audio summaries</li>
                </ul>
              </div>
            </TabsContent>

            {/* Browserbase Tab */}
            <TabsContent value="browserbase" className="space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Browserbase (Browser Automation)</h3>
                  <p className="text-sm text-muted-foreground">
                    AI-powered browser automation for n8n fixes
                  </p>
                </div>
              {browserbaseLoading ? (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Checking...
                </Badge>
              ) : credentialsConfigured ? (
                <Badge className="bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
              </div>

              {/* Credentials Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    API Credentials
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {credentialsConfigured
                      ? "Your Browserbase API key and Project ID are configured in the backend."
                      : "Browserbase credentials are not configured. Ask Lovable to set them up."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <a
                    href="https://www.browserbase.com/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Get credentials from Browserbase
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>

              {/* Saved Sessions Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Saved Login Sessions
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        These sessions allow the AI agent to stay logged in to your n8n instances between automation runs.
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={refreshContexts}
                      className="h-8 w-8"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {contexts.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                      No saved sessions yet. Sessions are created automatically when you run browser automation.
                    </div>
                  ) : (
                    <>
                      {contexts.map((context) => (
                        <div
                          key={context.url}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="font-mono text-sm truncate">
                                {context.url}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate pl-5">
                              Context ID: {context.contextId.slice(0, 20)}...
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClearContext(context.url)}
                            className="flex-shrink-0 ml-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearAllContexts}
                          className="w-full"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Clear All Sessions
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Best for:</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Automated n8n workflow fixes</li>
                  <li>• AI-driven browser testing</li>
                  <li>• Persistent login across sessions</li>
                </ul>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
