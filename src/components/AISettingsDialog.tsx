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
import {
  Zap,
  Brain,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { useAIProviders } from "@/hooks/useAIProviders";

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPerplexityConnect?: () => void;
}

export function AISettingsDialog({
  open,
  onOpenChange,
  onPerplexityConnect,
}: AISettingsDialogProps) {
  const {
    providers,
    saving,
    testing,
    saveApiKey,
    removeApiKey,
  } = useAIProviders();

  const [openaiKey, setOpenaiKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [activeTab, setActiveTab] = useState("openai");

  const openaiProvider = providers.find((p) => p.id === "openai");
  const claudeProvider = providers.find((p) => p.id === "claude");
  const perplexityProvider = providers.find((p) => p.id === "perplexity");

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Provider Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="openai" className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              OpenAI
              {openaiProvider?.configured && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="claude" className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              Claude
              {claudeProvider?.configured && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="perplexity" className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Perplexity
              {perplexityProvider?.configured && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* OpenAI Tab */}
          <TabsContent value="openai" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">OpenAI GPT-5</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced reasoning and code generation
                </p>
              </div>
              {openaiProvider?.configured ? (
                <Badge variant="default" className="bg-green-600">
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
          <TabsContent value="claude" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Claude (Anthropic)</h3>
                <p className="text-sm text-muted-foreground">
                  Multi-step reasoning with long context
                </p>
              </div>
              {claudeProvider?.configured ? (
                <Badge variant="default" className="bg-green-600">
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

          {/* Perplexity Tab */}
          <TabsContent value="perplexity" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Perplexity</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time web search and research
                </p>
              </div>
              {perplexityProvider?.configured ? (
                <Badge variant="default" className="bg-green-600">
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
              <Alert>
                <AlertDescription>
                  Perplexity is connected via the connector system and ready to use for
                  real-time web research.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <Alert>
                  <AlertDescription>
                    Perplexity is available as a managed connector. Click below to connect
                    your Perplexity account.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => {
                    onPerplexityConnect?.();
                    onOpenChange(false);
                  }}
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Connect Perplexity
                </Button>
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
