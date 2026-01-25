import { useState, useEffect } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Loader2,
  Scale,
  Plus,
  X,
  Sparkles,
  Target,
  Users,
  DollarSign,
  Zap,
  CheckCircle2,
  Workflow
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import N8nWorkflowDialog from "@/components/N8nWorkflowDialog";

type BusinessIdea = Tables<"business_ideas">;

interface CompareItem {
  id: string;
  label: string;
  key: keyof BusinessIdea;
  icon: React.ReactNode;
}

const compareItems: CompareItem[] = [
  { id: "niche", label: "Niche", key: "niche", icon: <Target className="w-4 h-4" /> },
  { id: "target_audience", label: "Target Audience", key: "target_audience", icon: <Users className="w-4 h-4" /> },
  { id: "value_proposition", label: "Value Proposition", key: "value_proposition", icon: <Sparkles className="w-4 h-4" /> },
  { id: "service_offering", label: "Service Offering", key: "service_offering", icon: <CheckCircle2 className="w-4 h-4" /> },
  { id: "revenue_math", label: "Revenue Math", key: "revenue_math", icon: <DollarSign className="w-4 h-4" /> },
  { id: "validation_path", label: "Validation Path", key: "validation_path", icon: <Zap className="w-4 h-4" /> },
];

export default function Compare() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [allIdeas, setAllIdeas] = useState<BusinessIdea[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    if (user) {
      fetchIdeas();
    }
  }, [user]);

  useEffect(() => {
    const ids = searchParams.get("ids");
    if (ids) {
      setSelectedIds(ids.split(","));
    }
  }, [searchParams]);

  const fetchIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from("business_ideas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllIdeas(data || []);
    } catch (error) {
      console.error("Error fetching ideas:", error);
      toast.error("Failed to load business plans");
    } finally {
      setLoading(false);
    }
  };

  const selectedIdeas = allIdeas.filter(idea => selectedIds.includes(idea.id));
  const availableIdeas = allIdeas.filter(idea => !selectedIds.includes(idea.id));

  const handleAddIdea = (id: string) => {
    if (selectedIds.length >= 4) {
      toast.error("Maximum 4 plans can be compared at once");
      return;
    }
    const newIds = [...selectedIds, id];
    setSelectedIds(newIds);
    navigate(`/compare?ids=${newIds.join(",")}`, { replace: true });
    setShowSelector(false);
  };

  const handleRemoveIdea = (id: string) => {
    const newIds = selectedIds.filter(i => i !== id);
    setSelectedIds(newIds);
    if (newIds.length > 0) {
      navigate(`/compare?ids=${newIds.join(",")}`, { replace: true });
    } else {
      navigate("/compare", { replace: true });
    }
  };

  const formatAutomationStrategy = (strategy: unknown): string => {
    if (!strategy) return "Not specified";
    if (typeof strategy === "string") return strategy;
    if (typeof strategy === "object") {
      return Object.entries(strategy as Record<string, unknown>)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
    }
    return String(strategy);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background glow effect */}
      <div className="fixed inset-0 bg-gradient-glow opacity-50 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Compare Plans</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length}/4 plans selected
            </span>
            {selectedIds.length < 4 && availableIdeas.length > 0 && (
              <Button 
                size="sm" 
                onClick={() => setShowSelector(true)}
                className="bg-gradient-primary"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Plan
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : selectedIdeas.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">
              Compare Business Plans
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Select up to 4 business plans to compare side by side
            </p>
            {allIdeas.length > 0 ? (
              <Button
                onClick={() => setShowSelector(true)}
                className="bg-gradient-accent text-accent-foreground hover:opacity-90 btn-glow"
              >
                <Plus className="w-4 h-4 mr-2" />
                Select Plans to Compare
              </Button>
            ) : (
              <div>
                <p className="text-muted-foreground mb-4">
                  No business plans yet. Generate some first!
                </p>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-gradient-primary"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Comparison Table */}
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                {/* Header Row - Business Names */}
                <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `200px repeat(${selectedIdeas.length}, 1fr)` }}>
                  <div className="font-display font-semibold text-muted-foreground">
                    Business Plan
                  </div>
                  {selectedIdeas.map((idea, index) => (
                    <motion.div
                      key={idea.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="glass relative group">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveIdea(idea.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-lg font-display">
                            {idea.business_name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0">
                          <N8nWorkflowDialog
                            businessIdeaId={idea.id}
                            businessName={idea.business_name}
                            trigger={
                              <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                                <Workflow className="w-3 h-3" />
                                n8n Workflow
                              </Button>
                            }
                          />
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Comparison Rows */}
                {compareItems.map((item, rowIndex) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIndex * 0.05 }}
                    className="grid gap-4 mb-4"
                    style={{ gridTemplateColumns: `200px repeat(${selectedIdeas.length}, 1fr)` }}
                  >
                    <div className="flex items-start gap-2 py-3 font-medium text-muted-foreground">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {selectedIdeas.map((idea) => (
                      <Card key={`${idea.id}-${item.id}`} className="glass">
                        <CardContent className="p-4">
                          <p className="text-sm whitespace-pre-wrap">
                            {String(idea[item.key] || "Not specified")}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </motion.div>
                ))}

                {/* AI Automation Strategy Row */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: compareItems.length * 0.05 }}
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `200px repeat(${selectedIdeas.length}, 1fr)` }}
                >
                  <div className="flex items-start gap-2 py-3 font-medium text-muted-foreground">
                    <Zap className="w-4 h-4" />
                    <span>AI Automation</span>
                  </div>
                  {selectedIdeas.map((idea) => (
                    <Card key={`${idea.id}-automation`} className="glass">
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">
                          {formatAutomationStrategy(idea.ai_automation_strategy)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              </div>
            </ScrollArea>
          </div>
        )}
      </main>

      {/* Idea Selector Modal */}
      <AnimatePresence>
        {showSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-bold">Select Plans to Compare</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowSelector(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2 pr-4">
                  {availableIdeas.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      All plans are already selected
                    </p>
                  ) : (
                    availableIdeas.map((idea) => (
                      <Card
                        key={idea.id}
                        className="glass card-hover cursor-pointer"
                        onClick={() => handleAddIdea(idea.id)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{idea.business_name}</h4>
                            <p className="text-sm text-muted-foreground">{idea.niche}</p>
                          </div>
                          <Plus className="w-5 h-5 text-primary" />
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
