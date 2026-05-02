import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ExportSpecButton from "@/components/ExportSpecButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  LogOut,
  Loader2,
  HelpCircle,
  Users,
  Workflow,
  MessagesSquare,
  FileText,
  Map as MapIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import BusinessIdeaDialog from "@/components/BusinessIdeaDialog";
import HowToUseDialog from "@/components/HowToUseDialog";
import GettingStartedCard from "@/components/GettingStartedCard";
import { TodaysTasks } from "@/components/MissionControl";
import MissionCard, { MissionStep } from "@/components/MissionControl/MissionCard";
import MilestoneCard from "@/components/MissionControl/MilestoneCard";
import MissionDetailsDialog from "@/components/MissionControl/MissionDetailsDialog";
import { capabilities } from "@/components/UnifiedSetupGuide";
import UnifiedSetupGuide from "@/components/UnifiedSetupGuide";
import { useMissionProgress } from "@/hooks/useMissionProgress";
import { useMissionIntelligenceContext } from "@/contexts/MissionIntelligenceContext";
import { useLeadManagement } from "@/hooks/useLeadManagement";
import { LeadStatsCard } from "@/components/LeadCRM";
import OnboardingTour, { useOnboardingTour } from "@/components/OnboardingTour";
import { RevenueCard } from "@/components/RevenueCard";

interface BusinessIdea {
  id: string;
  business_name: string;
  niche: string;
  created_at: string;
  is_favorite: boolean;
  conversation_id: string | null;
}

interface BusinessIdeaWithProgress extends BusinessIdea {
  completedSteps: string[];
}

const STEP_DEFS: { key: keyof MissionStepFlags; label: string }[] = [
  { key: "validation", label: "Valid" },
  { key: "landing", label: "Land" },
  { key: "offer", label: "Offer" },
  { key: "outreach", label: "Out" },
  { key: "sale", label: "Sale" },
];

type MissionStepFlags = {
  validation: boolean;
  landing: boolean;
  offer: boolean;
  outreach: boolean;
  sale: boolean;
};

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [businessIdeas, setBusinessIdeas] = useState<BusinessIdea[]>([]);
  const [businessIdeasWithProgress, setBusinessIdeasWithProgress] = useState<BusinessIdeaWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIndustryDialog, setShowIndustryDialog] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showMissionDetails, setShowMissionDetails] = useState(false);

  const {
    completedQuests,
    activeQuestId,
    currentStage,
    unlockedAchievements,
  } = useMissionProgress();

  const {
    completedQuests: eventCompletedQuests,
    momentumCount,
    getNextAction,
  } = useMissionIntelligenceContext();

  const mergedCompletedQuests = [...new Set([...completedQuests, ...eventCompletedQuests])];

  const { showTour, completeTour, skipTour, resetTour } = useOnboardingTour();

  const { getStats, loading: leadsLoading } = useLeadManagement();
  const leadStats = getStats();

  const industries = [
    { value: "any", label: "Any Industry (Surprise me!)" },
    { value: "health-wellness", label: "Health & Wellness" },
    { value: "finance", label: "Finance & Investing" },
    { value: "technology", label: "Technology & SaaS" },
    { value: "education", label: "Education & Coaching" },
    { value: "ecommerce", label: "E-commerce & Retail" },
    { value: "real-estate", label: "Real Estate" },
    { value: "marketing", label: "Marketing & Advertising" },
    { value: "creative", label: "Creative & Design" },
    { value: "ai-automation", label: "AI & Automation" },
  ];

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [ideasResult, progressResult] = await Promise.all([
        supabase
          .from("business_ideas")
          .select("id, business_name, niche, created_at, is_favorite, conversation_id")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("implementation_progress")
          .select("business_idea_id, completed_steps")
          .eq("section_id", "quick-start")
          .not("business_idea_id", "is", null),
      ]);

      if (ideasResult.data) setBusinessIdeas(ideasResult.data);

      const progressMap = new Map<string, string[]>();
      if (progressResult.data) {
        progressResult.data.forEach((p) => {
          if (p.business_idea_id) progressMap.set(p.business_idea_id, p.completed_steps || []);
        });
      }

      if (ideasResult.data) {
        setBusinessIdeasWithProgress(
          ideasResult.data.map((i) => ({ ...i, completedSteps: progressMap.get(i.id) || [] }))
        );
      }
    } catch (e) {
      console.error("Dashboard fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const handleNewChat = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "New Conversation" })
      .select()
      .single();
    if (error) return toast.error("Failed to create conversation");
    navigate(`/chat/${data.id}`);
  };

  const openIndustryDialog = () => {
    setSelectedIndustry("");
    setShowIndustryDialog(true);
  };

  const handleGenerateIdeas = async () => {
    if (!user) return;
    setShowIndustryDialog(false);
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "Business Ideas Generation" })
      .select()
      .single();
    if (error) return toast.error("Failed to start idea generation");
    const industryParam =
      selectedIndustry && selectedIndustry !== "any" ? `&industry=${encodeURIComponent(selectedIndustry)}` : "";
    navigate(`/chat/${data.id}?generate=true${industryParam}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  // Compute mission stepper from active quest's completed steps
  const activeIdea =
    businessIdeasWithProgress.find((i) => i.id === activeQuestId) || businessIdeasWithProgress[0];
  const steps = activeIdea?.completedSteps || [];
  const flags: MissionStepFlags = {
    validation: steps.some((s) => /valid/i.test(s)),
    landing: steps.some((s) => /landing|website/i.test(s)),
    offer: steps.some((s) => /offer|pricing/i.test(s)),
    outreach: steps.some((s) => /outreach|prospect/i.test(s)),
    sale: steps.some((s) => /sale|customer/i.test(s)),
  };

  const firstUnfinished = STEP_DEFS.find((d) => !flags[d.key]);
  const missionSteps: MissionStep[] = STEP_DEFS.map((d) => ({
    key: d.key,
    label: d.label,
    status: flags[d.key]
      ? "done"
      : d.key === firstUnfinished?.key
      ? "current"
      : "upcoming",
  }));

  const nextActionLabel =
    getNextAction()?.title ||
    (firstUnfinished ? `Complete ${firstUnfinished.label.toLowerCase()}` : "Land your first sale");

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-glow opacity-50 pointer-events-none" />

      {/* Top nav */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">Mya</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              onClick={handleNewChat}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 mr-1"
            >
              <MessagesSquare className="w-4 h-4" />
              Chat with Mya
            </Button>
            <Button onClick={() => navigate("/leads")} variant="ghost" size="sm">
              <Users className="w-4 h-4 mr-2" /> Leads
            </Button>
            <Button onClick={() => navigate("/workflows")} variant="ghost" size="sm">
              <Workflow className="w-4 h-4 mr-2" /> Workflows
            </Button>
            <Button onClick={() => navigate("/conversations")} variant="ghost" size="sm">
              <MessagesSquare className="w-4 h-4 mr-2" /> Conversations
            </Button>
            <Button onClick={() => navigate("/plans")} variant="ghost" size="sm">
              <FileText className="w-4 h-4 mr-2" /> Plans
            </Button>
            <Button onClick={() => navigate("/strategy")} variant="ghost" size="sm">
              <MapIcon className="w-4 h-4 mr-2" /> Strategy
            </Button>
            <Button onClick={() => setShowHowToUse(true)} variant="ghost" size="sm">
              <HelpCircle className="w-4 h-4 mr-2" /> How to Use
            </Button>
            <ExportSpecButton />
            <Button onClick={handleSignOut} variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
            
          </div>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : businessIdeas.length === 0 ? (
            <GettingStartedCard onGenerateIdea={openIndustryDialog} onStartChat={handleNewChat} />
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left column (2/3) */}
              <div className="lg:col-span-2 space-y-6">
                <TodaysTasks
                  onNavigateToChat={async (prompt) => {
                    if (!user) return;
                    const { data } = await supabase
                      .from("conversations")
                      .insert({ user_id: user.id, title: "Follow-up" })
                      .select()
                      .single();
                    if (data) navigate(`/chat/${data.id}`, { state: { initialPrompt: prompt } });
                  }}
                  onOpenSetupGuide={() => setShowSetupGuide(true)}
                  currentSetupStep="Continue your Setup Guide"
                />

                <MissionCard
                  title="Mission: First Customer"
                  subtitle={
                    activeIdea?.business_name ||
                    `${momentumCount > 0 ? `${momentumCount} actions today · ` : ""}Build your $10K/month empire`
                  }
                  ideaCount={businessIdeas.length}
                  steps={missionSteps}
                  nextStepLabel={nextActionLabel}
                  onContinue={() => {
                    const next = mergedCompletedQuests.length === 0
                      ? "generate_idea"
                      : !mergedCompletedQuests.includes("save_idea")
                      ? "save_idea"
                      : !mergedCompletedQuests.includes("review_checklist")
                      ? "review_checklist"
                      : "review_checklist";
                    if (next === "review_checklist" && businessIdeas.length > 0) {
                      setSelectedIdeaId(businessIdeas[0].id);
                    } else {
                      openIndustryDialog();
                    }
                  }}
                  onChat={handleNewChat}
                  onViewDetails={() => setShowMissionDetails(true)}
                />
              </div>

              {/* Right column (1/3) */}
              <div className="space-y-4">
                <MilestoneCard />
                <LeadStatsCard stats={leadStats} loading={leadsLoading} />
                <RevenueCard />
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Industry Selection Dialog */}
      <Dialog open={showIndustryDialog} onOpenChange={setShowIndustryDialog} modal={false}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-display">Choose an Industry</DialogTitle>
            <DialogDescription>Select an industry to focus your business idea, or let us surprise you.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="industry" className="mb-2 block">Industry</Label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger id="industry"><SelectValue placeholder="Select an industry..." /></SelectTrigger>
              <SelectContent>
                {industries.map((i) => (<SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIndustryDialog(false)}>Cancel</Button>
            <Button onClick={handleGenerateIdeas} disabled={!selectedIndustry} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Sparkles className="w-4 h-4 mr-2" /> Generate Idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BusinessIdeaDialog
        ideaId={selectedIdeaId}
        open={!!selectedIdeaId}
        onOpenChange={(open) => !open && setSelectedIdeaId(null)}
        onFavoriteToggle={(id, isFavorite) => {
          setBusinessIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, is_favorite: isFavorite } : i)));
        }}
      />

      <HowToUseDialog open={showHowToUse} onOpenChange={setShowHowToUse} onRestartTour={resetTour} />
      <UnifiedSetupGuide externalOpen={showSetupGuide} onExternalOpenChange={setShowSetupGuide} />

      <MissionDetailsDialog
        open={showMissionDetails}
        onOpenChange={setShowMissionDetails}
        completedMilestones={activeIdea?.completedSteps || []}
        capabilities={capabilities}
        onOpenSetupGuide={() => { setShowMissionDetails(false); setShowSetupGuide(true); }}
        activeQuestName={activeIdea?.business_name}
        completedQuests={mergedCompletedQuests}
        currentStage={currentStage}
        onQuestAction={(q) => {
          if (q === "review_checklist" && businessIdeas.length > 0) setSelectedIdeaId(businessIdeas[0].id);
          else openIndustryDialog();
        }}
        activeQuestId={activeQuestId}
        activeQuestMilestones={flags}
        unlockedAchievements={unlockedAchievements}
      />

      {showTour && <OnboardingTour onComplete={completeTour} onSkip={skipTour} />}
    </div>
  );
}
