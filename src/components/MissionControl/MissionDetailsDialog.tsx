import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, Sparkles, Trophy } from "lucide-react";
import UnifiedProgressCard from "@/components/MissionControl/UnifiedProgressCard";
import QuestList from "@/components/MissionControl/QuestList";
import AchievementBadges from "@/components/MissionControl/AchievementBadges";
import type { CapabilityArea } from "@/components/UnifiedSetupGuide";

interface MissionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedMilestones: string[];
  capabilities: CapabilityArea[];
  onOpenSetupGuide: () => void;
  activeQuestName?: string;
  completedQuests: string[];
  currentStage: number;
  onQuestAction: (questId: string) => void;
  activeQuestId?: string | null;
  activeQuestMilestones?: {
    validation: boolean;
    landing: boolean;
    offer: boolean;
    outreach: boolean;
    sale: boolean;
  };
  unlockedAchievements: string[];
}

export default function MissionDetailsDialog(props: MissionDetailsDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-emerald-400" />
            Mission HQ
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="progress" className="mt-4">
          <TabsList>
            <TabsTrigger value="progress" className="gap-1.5">
              <Rocket className="w-3.5 h-3.5" /> Progress
            </TabsTrigger>
            <TabsTrigger value="questline" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Quest Line
            </TabsTrigger>
            <TabsTrigger value="badges" className="gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Badges
            </TabsTrigger>
          </TabsList>
          <TabsContent value="progress" className="mt-4">
            <UnifiedProgressCard
              completedMilestones={props.completedMilestones}
              capabilities={props.capabilities}
              onOpenSetupGuide={props.onOpenSetupGuide}
              activeQuestName={props.activeQuestName}
            />
          </TabsContent>
          <TabsContent value="questline" className="mt-4">
            <QuestList
              completedQuests={props.completedQuests}
              currentStage={props.currentStage}
              onQuestAction={props.onQuestAction}
              activeQuestId={props.activeQuestId}
              activeQuestName={props.activeQuestName}
              activeQuestMilestones={props.activeQuestMilestones}
            />
          </TabsContent>
          <TabsContent value="badges" className="mt-4">
            <AchievementBadges unlockedAchievements={props.unlockedAchievements} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
