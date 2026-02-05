import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  RefreshCw, 
  Plus, 
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import CompetitorCard from "./CompetitorCard";
import DifferentiationSuggestions from "./DifferentiationSuggestions";
import { useCompetitorAnalysis } from "@/hooks/useCompetitorAnalysis";

interface CompetitorAnalysisPanelProps {
  businessIdeaId?: string;
  niche?: string;
}

export default function CompetitorAnalysisPanel({ 
  businessIdeaId, 
  niche 
}: CompetitorAnalysisPanelProps) {
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitorList, setCompetitorList] = useState<string[]>([]);

  const {
    competitors,
    strategies,
    loading,
    analyzing,
    runAnalysis,
    removeCompetitor,
    clearAllAnalyses,
  } = useCompetitorAnalysis({ businessIdeaId });

  const handleAddCompetitor = () => {
    const trimmed = competitorInput.trim();
    if (trimmed && !competitorList.includes(trimmed)) {
      setCompetitorList(prev => [...prev, trimmed]);
      setCompetitorInput("");
    }
  };

  const handleRemoveFromList = (name: string) => {
    setCompetitorList(prev => prev.filter(c => c !== name));
  };

  const handleAnalyze = async () => {
    if (competitorList.length === 0) return;
    
    await runAnalysis(competitorList, niche);
    setCompetitorList([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCompetitor();
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Competitors Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Competitor Intelligence
          </CardTitle>
          <CardDescription>
            Add competitor names to analyze their positioning, pricing, and features using AI-powered research.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="competitor" className="sr-only">
                Competitor Name
              </Label>
              <Input
                id="competitor"
                placeholder="Enter competitor name (e.g., Salesforce)"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={analyzing}
              />
            </div>
            <Button 
              onClick={handleAddCompetitor} 
              variant="outline"
              disabled={!competitorInput.trim() || analyzing}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Pending competitors list */}
          {competitorList.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Competitors to analyze:
              </Label>
              <div className="flex flex-wrap gap-2">
                {competitorList.map((name) => (
                  <Badge 
                    key={name} 
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-destructive/20"
                      onClick={() => handleRemoveFromList(name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyze} 
              disabled={competitorList.length === 0 || analyzing}
              className="flex-1"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze {competitorList.length} Competitor{competitorList.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
            
            {competitors.length > 0 && (
              <Button 
                variant="outline" 
                onClick={clearAllAnalyses}
                disabled={analyzing}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Powered by Perplexity AI. Requires Perplexity API key in AI Settings.
          </p>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Competitor Cards */}
      {!loading && competitors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors.map((competitor) => (
            <CompetitorCard
              key={competitor.id}
              competitor={competitor}
              onRemove={removeCompetitor}
            />
          ))}
        </div>
      )}

      {/* Differentiation Strategies */}
      {!loading && strategies.length > 0 && (
        <DifferentiationSuggestions strategies={strategies} />
      )}

      {/* Empty State */}
      {!loading && competitors.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No competitor analyses yet. Add competitor names above to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
