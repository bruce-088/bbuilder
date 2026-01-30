import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Brain, Search } from "lucide-react";

interface ProviderSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const providers = [
  {
    id: "lovable",
    name: "Lovable AI",
    description: "Default - Fast & reliable",
    icon: Sparkles,
    available: true,
  },
  {
    id: "openai",
    name: "OpenAI GPT-5",
    description: "Advanced reasoning",
    icon: Zap,
    available: false, // Requires API key
  },
  {
    id: "claude",
    name: "Claude",
    description: "Complex multi-step tasks",
    icon: Brain,
    available: false, // Requires API key
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "Real-time web research",
    icon: Search,
    available: false, // Requires connector
  },
];

export function ProviderSelector({ value, onChange, disabled }: ProviderSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select AI Provider" />
      </SelectTrigger>
      <SelectContent>
        {providers.map((provider) => {
          const Icon = provider.icon;
          return (
            <SelectItem
              key={provider.id}
              value={provider.id}
              disabled={!provider.available}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{provider.name}</span>
                {!provider.available && (
                  <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                    Soon
                  </Badge>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
