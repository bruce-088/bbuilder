import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, CheckCircle2, XCircle, Clock, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WebhookTestResult {
  success: boolean;
  status: number;
  statusText: string;
  body: string;
  headers: Record<string, string>;
  latencyMs: number;
  testedAt: string;
}

interface WebhookTestButtonProps {
  webhookUrl: string;
  className?: string;
}

export function WebhookTestButton({ webhookUrl, className }: WebhookTestButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<WebhookTestResult | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("n8n-webhook-health", {
        body: {
          test: true,
          url: webhookUrl,
          method: "POST",
          payload: {
            test: true,
            timestamp: new Date().toISOString(),
            source: "lovable-automation",
            message: "Test payload from Automation Engine",
          },
        },
      });

      if (error) {
        toast.error("Failed to test webhook");
        setResult({
          success: false,
          status: 0,
          statusText: "Error",
          body: error.message,
          headers: {},
          latencyMs: 0,
          testedAt: new Date().toISOString(),
        });
        return;
      }

      setResult(data);

      if (data.success) {
        toast.success(`Webhook responded with ${data.status}`);
      } else {
        toast.error(`Webhook failed: ${data.statusText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setResult({
        success: false,
        status: 0,
        statusText: "Error",
        body: errorMessage,
        headers: {},
        latencyMs: 0,
        testedAt: new Date().toISOString(),
      });
      toast.error("Failed to test webhook");
    } finally {
      setIsTesting(false);
    }
  };

  const copyResponse = () => {
    if (result) {
      navigator.clipboard.writeText(result.body);
      toast.success("Response copied to clipboard");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-7 w-7 p-0", className)}
          title="Test webhook"
        >
          {isTesting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Test Webhook</h4>
            {result && (
              <Badge
                variant={result.success ? "default" : "destructive"}
                className="text-xs"
              >
                {result.success ? (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {result.status || "Error"}
              </Badge>
            )}
          </div>

          {/* URL preview */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Endpoint</p>
            <p className="text-xs font-mono bg-muted p-2 rounded truncate" title={webhookUrl}>
              {webhookUrl}
            </p>
          </div>

          {/* Test button */}
          {!result && (
            <Button
              onClick={handleTest}
              disabled={isTesting}
              className="w-full"
              size="sm"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Send Test Payload
                </>
              )}
            </Button>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Status and latency */}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={result.success ? "text-primary" : "text-destructive"}>
                    {result.status} {result.statusText}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {result.latencyMs}ms
                </span>
              </div>

              {/* Response body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Response</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={copyResponse}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="text-xs bg-muted p-2 rounded max-h-40 overflow-auto font-mono whitespace-pre-wrap">
                  {result.body || "(empty response)"}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setResult(null)}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleTest}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Test Again"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
