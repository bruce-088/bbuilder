import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  KeyRound, 
  Check, 
  ExternalLink, 
  Eye, 
  EyeOff,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { 
  useN8nServiceCredentials, 
  N8N_SERVICE_TYPES, 
  N8nServiceType 
} from "@/hooks/useN8nServiceCredentials";
import { CredentialWarning } from "@/lib/n8nWorkflowFormatter";

interface CredentialPreFillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialWarnings: CredentialWarning[];
  onComplete: () => void;
}

export function CredentialPreFillModal({
  open,
  onOpenChange,
  credentialWarnings,
  onComplete,
}: CredentialPreFillModalProps) {
  // Map node types to service types
  const requiredServices = Array.from(
    new Set(
      credentialWarnings.map(w => {
        // Extract service name from node type
        const nodeType = w.nodeType.toLowerCase();
        if (nodeType.includes("slack")) return "slack";
        if (nodeType.includes("gmail")) return "gmail";
        if (nodeType.includes("googlesheet")) return "googleSheets";
        if (nodeType.includes("stripe")) return "stripe";
        if (nodeType.includes("hubspot")) return "hubspot";
        if (nodeType.includes("sendgrid")) return "sendgrid";
        if (nodeType.includes("notion")) return "notion";
        if (nodeType.includes("airtable")) return "airtable";
        if (nodeType.includes("openai")) return "openai";
        if (nodeType.includes("anthropic")) return "anthropic";
        // For HTTP requests, we can't determine the service
        return null;
      }).filter(Boolean) as string[]
    )
  );

  const {
    credentials,
    loading,
    saving,
    saveCredential,
  } = useN8nServiceCredentials(requiredServices);

  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [savingService, setSavingService] = useState<string | null>(null);

  const handleSave = async (provider: string) => {
    const value = inputValues[provider];
    if (!value?.trim()) return;

    setSavingService(provider);
    const success = await saveCredential(provider, value.trim());
    if (success) {
      setInputValues(prev => ({ ...prev, [provider]: "" }));
    }
    setSavingService(null);
  };

  const handleSkipAndExport = () => {
    onComplete();
    onOpenChange(false);
  };

  const allConfigured = credentials.every(c => c.hasKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Credentials Required
          </DialogTitle>
          <DialogDescription>
            This workflow needs {requiredServices.length} service{requiredServices.length > 1 ? "s" : ""}. 
            Enter your API keys now to speed up n8n setup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            requiredServices.map(service => {
              const serviceInfo = N8N_SERVICE_TYPES[service as N8nServiceType];
              const credential = credentials.find(c => c.provider === service);
              const isConfigured = credential?.hasKey;
              const isOAuth = serviceInfo?.oauth;
              const isSaving = savingService === service;

              return (
                <div
                  key={service}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {serviceInfo?.label || service}
                    </Label>
                    {isConfigured ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Check className="h-3 w-3 mr-1" />
                        Saved
                      </Badge>
                    ) : isOAuth ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Manual
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Required
                      </Badge>
                    )}
                  </div>

                    {isOAuth ? (
                    <p className="text-xs text-muted-foreground">
                      OAuth credentials must be configured directly in n8n.{" "}
                      <a 
                        href="https://docs.n8n.io/integrations/builtin/credentials/"
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline ml-1"
                      >
                        Learn more →
                      </a>
                    </p>
                  ) : !isConfigured ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showValues[service] ? "text" : "password"}
                          placeholder={serviceInfo?.placeholder || "Enter API key"}
                          value={inputValues[service] || ""}
                          onChange={e => setInputValues(prev => ({ 
                            ...prev, 
                            [service]: e.target.value 
                          }))}
                          disabled={isSaving}
                        />
                        <button
                          type="button"
                          onClick={() => setShowValues(prev => ({ 
                            ...prev, 
                            [service]: !prev[service] 
                          }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showValues[service] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSave(service)}
                        disabled={!inputValues[service]?.trim() || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Credential stored securely
                    </div>
                  )}
                </div>
              );
            })
          )}

          {requiredServices.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <p>No configurable credentials detected.</p>
              <p className="text-xs mt-1">HTTP Request nodes may need manual configuration.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkipAndExport} disabled={saving}>
            Skip for Now
          </Button>
          <Button onClick={handleSkipAndExport} disabled={saving}>
            {allConfigured ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Export Workflow
              </>
            ) : (
              "Continue to Export"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
