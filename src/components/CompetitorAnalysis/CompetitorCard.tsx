import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CompetitorCardProps {
  competitor: {
    id: string;
    competitor_name: string;
    pricing_info?: any;
    features?: string[];
    positioning?: string;
    strengths?: string[];
    weaknesses?: string[];
    source_urls?: string[];
    analyzed_at: string;
  };
  onRemove?: (id: string) => void;
}

export default function CompetitorCard({ competitor, onRemove }: CompetitorCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{competitor.competitor_name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(competitor.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Positioning */}
        {competitor.positioning && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {competitor.positioning}
          </p>
        )}

        {/* Pricing */}
        {competitor.pricing_info?.raw && (
          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-green-500 mt-0.5" />
            <p className="text-sm line-clamp-1">{competitor.pricing_info.raw}</p>
          </div>
        )}

        {/* Features Preview */}
        {competitor.features && competitor.features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {competitor.features.slice(0, 3).map((feature, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {feature.substring(0, 30)}{feature.length > 30 ? '...' : ''}
              </Badge>
            ))}
            {competitor.features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{competitor.features.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Expandable Section */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-xs text-muted-foreground">
            {expanded ? "Show less" : "Show details"}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {/* Strengths */}
            {competitor.strengths && competitor.strengths.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs font-medium text-green-600">Strengths</span>
                </div>
                <ul className="text-xs space-y-1 pl-5">
                  {competitor.strengths.map((s, i) => (
                    <li key={i} className="text-muted-foreground list-disc">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {competitor.weaknesses && competitor.weaknesses.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-medium text-red-600">Weaknesses</span>
                </div>
                <ul className="text-xs space-y-1 pl-5">
                  {competitor.weaknesses.map((w, i) => (
                    <li key={i} className="text-muted-foreground list-disc">{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources */}
            {competitor.source_urls && competitor.source_urls.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {competitor.source_urls.slice(0, 3).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    Source {i + 1}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Analyzed {new Date(competitor.analyzed_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
