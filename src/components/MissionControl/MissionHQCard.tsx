import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, Target, Sparkles } from "lucide-react";
import CurrentQuestCard from "./CurrentQuestCard";
import UnifiedProgressCard from "./UnifiedProgressCard";
import QuestList from "./QuestList";
import type { CapabilityArea } from "@/components/UnifiedSetupGuide";

interface BusinessIdeaProgress {
  id: string;
  business_name: string;
  niche: string;
  completedSteps: string[];
}

interface MissionHQCardProps {
  // CurrentQuestCard props
  completedQuests: string[];
  currentStage: number;
  onAction: () => void;
  businessIdeas: BusinessIdeaProgress[];
  onSelectIdea: (ideaId: string) => void;
  activeQuestId?: string | null;
  onSetActiveQuest: (ideaId: string) => void;
  // UnifiedProgressCard props
  completedMilestones: string[];
  capabilities: CapabilityArea[];
  onOpenSetupGuide: () => void;
  activeQuestName?: string;
  // QuestList props
  onQuestAction: (questId: string) => void;
  activeQuestMilestones?: {
    validation: boolean;
    landing: boolean;
    offer: boolean;
    outreach: boolean;
    sale: boolean;
  };
}

export default function MissionHQCard({
  completedQuests,
  currentStage,
  onAction,
  businessIdeas,
  onSelectIdea,
  activeQuestId,
  onSetActiveQuest,
  completedMilestones,
  capabilities,
  onOpenSetupGuide,
  activeQuestName,
  onQuestAction,
  activeQuestMilestones,
}: MissionHQCardProps) {
  return (
    <div className="space-y-0">
      <Tabs defaultValue="quest" className="w-full">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Rocket className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-display font-semibold">Mission HQ</span>
            {activeQuestName && (
              <span className="text-sm text-muted-foreground truncate">
                · {activeQuestName}
              </span>
            )}
          </div>
          <TabsList>
            <TabsTrigger value="quest" className="gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Quest
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-1.5">
              <Rocket className="w-3.5 h-3.5" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="questline" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Quest Line
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="quest" className="mt-0">
          <CurrentQuestCard
            completedQuests={completedQuests}
            currentStage={currentStage}
            onAction={onAction}
            businessIdeas={businessIdeas}
            onSelectIdea={onSelectIdea}
            activeQuestId={activeQuestId}
            onSetActiveQuest={onSetActiveQuest}
          />
        </TabsContent>

        <TabsContent value="progress" className="mt-0">
          <UnifiedProgressCard
            completedMilestones={completedMilestones}
            capabilities={capabilities}
            onOpenSetupGuide={onOpenSetupGuide}
            activeQuestName={activeQuestName}
          />
        </TabsContent>

        <TabsContent value="questline" className="mt-0">
          <QuestList
            completedQuests={completedQuests}
            currentStage={currentStage}
            onQuestAction={onQuestAction}
            activeQuestId={activeQuestId}
            activeQuestName={activeQuestName}
            activeQuestMilestones={activeQuestMilestones}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
