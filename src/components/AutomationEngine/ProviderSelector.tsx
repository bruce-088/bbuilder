import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Brain, Search, Settings2, CheckCircle2 } from "lucide-react";
import { useAIProviders, type AIProvider } from "@/hooks/useAIProviders";

interface ProviderSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onOpenSettings?: () => void;
}

const providerMeta = [
  {
    id: "lovable" as AIProvider,
    name: "Lovable AI",
    description: "Default - Fast & reliable",
    icon: Sparkles,
  },
  {
    id: "openai" as AIProvider,
    name: "OpenAI GPT-5",
    description: "Advanced reasoning",
    icon: Zap,
  },
  {
    id: "claude" as AIProvider,
    name: "Claude",
    description: "Complex multi-step tasks",
    icon: Brain,
  },
  {
    id: "perplexity" as AIProvider,
    name: "Perplexity",
    description: "Real-time web research",
    icon: Search,
  },
  {
    id: "gemini" as AIProvider,
    name: "Gemini",
    description: "Google's multimodal AI",
    icon: Sparkles,
  },
];

export function ProviderSelector({ value, onChange, disabled, onOpenSettings }: ProviderSelectorProps) {
  const { providers } = useAIProviders();

  const getProviderStatus = (id: AIProvider) => {
    return providers.find((p) => p.id === id);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select AI Provider" />
        </SelectTrigger>
        <SelectContent>
          {providerMeta.map((provider) => {
            const Icon = provider.icon;
            const status = getProviderStatus(provider.id);
            const isAvailable = status?.available ?? provider.id === "lovable";

            return (
              <SelectItem
                key={provider.id}
                value={provider.id}
                disabled={!isAvailable}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{provider.name}</span>
                  {status?.configured && provider.id !== "lovable" && (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  )}
                  {!isAvailable && (
                    <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                      Setup
                    </Badge>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={onOpenSettings}
        title="AI Provider Settings"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
