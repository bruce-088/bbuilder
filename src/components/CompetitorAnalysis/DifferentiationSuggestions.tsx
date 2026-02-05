import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  DollarSign, 
  Zap, 
  Users,
  Lightbulb,
} from "lucide-react";

interface Strategy {
  id: string;
  strategy_type: string;
  recommendation: string;
  confidence_score: number;
  supporting_data?: {
    why_it_works?: string;
  };
}

interface DifferentiationSuggestionsProps {
  strategies: Strategy[];
}

const strategyIcons: Record<string, React.ReactNode> = {
  pricing: <DollarSign className="h-4 w-4" />,
  features: <Zap className="h-4 w-4" />,
  positioning: <Target className="h-4 w-4" />,
  niche: <Users className="h-4 w-4" />,
};

const strategyColors: Record<string, string> = {
  pricing: "bg-green-100 text-green-700 border-green-200",
  features: "bg-blue-100 text-blue-700 border-blue-200",
  positioning: "bg-purple-100 text-purple-700 border-purple-200",
  niche: "bg-orange-100 text-orange-700 border-orange-200",
};

export default function DifferentiationSuggestions({ strategies }: DifferentiationSuggestionsProps) {
  if (!strategies || strategies.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Differentiation Strategies
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {strategies.map((strategy, index) => (
          <div
            key={strategy.id}
            className="p-3 rounded-lg border bg-card"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={strategyColors[strategy.strategy_type] || ""}
                >
                  {strategyIcons[strategy.strategy_type] || <Target className="h-4 w-4" />}
                  <span className="ml-1 capitalize">{strategy.strategy_type}</span>
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Strategy {index + 1}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {strategy.confidence_score}% confidence
                </span>
              </div>
            </div>

            <p className="text-sm mb-2">{strategy.recommendation}</p>

            <Progress 
              value={strategy.confidence_score} 
              className="h-1.5 mb-2"
            />

            {strategy.supporting_data?.why_it_works && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Why: {strategy.supporting_data.why_it_works}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
