import { Globe, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openExternalUrl } from "@/lib/openExternalUrl";

interface CoworkBrowserPanelProps {
  debugUrl: string | null;
  onClose: () => void;
}

export default function CoworkBrowserPanel({ debugUrl, onClose }: CoworkBrowserPanelProps) {
  if (!debugUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 p-6">
        <Globe className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-center">
          Waiting for browser session...
        </p>
        <p className="text-xs text-center text-muted-foreground/60">
          The live view will appear here once Mya starts working in your n8n instance.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium">Live Browser</span>
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => openExternalUrl(debugUrl)}
            title="Open in new tab"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            title="Close panel"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* iframe */}
      <div className="flex-1 bg-black/20">
        <iframe
          src={debugUrl}
          className="w-full h-full border-0"
          title="Browserbase Live View"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}
