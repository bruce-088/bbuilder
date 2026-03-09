import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, AlertTriangle, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface GlobalPivotControlProps {
  currentBusinessId?: string;
  onPivotComplete: () => void;
}

export function GlobalPivotControl({
  currentBusinessId,
  onPivotComplete,
}: GlobalPivotControlProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPivoting, setIsPivoting] = useState(false);
  const [pivotReason, setPivotReason] = useState("");
  const [newDirection, setNewDirection] = useState("");

  const handlePivot = async () => {
    if (!user) return;

    if (!pivotReason.trim() || !newDirection.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both pivot reason and new direction.",
        variant: "destructive",
      });
      return;
    }

    setIsPivoting(true);

    try {
      // Archive current business idea if it exists
      if (currentBusinessId) {
        const { error: archiveError } = await supabase
          .from("business_ideas")
          .update({ archived: true })
          .eq("id", currentBusinessId);

        if (archiveError) throw archiveError;
      }

      // Emit PIVOT_EXECUTED event to Triad Event Bus
      const { error: eventError } = await supabase.from("triad_events").insert({
        user_id: user.id,
        event_type: "PIVOT_EXECUTED",
        source_app: "mya",
        payload: {
          previous_business_id: currentBusinessId,
          pivot_reason: pivotReason,
          new_direction: newDirection,
          timestamp: new Date().toISOString(),
        },
      });

      if (eventError) throw eventError;

      toast({
        title: "Pivot Executed Successfully",
        description:
          "Your business has been archived. The system is generating your new strategic manifest.",
      });

      setIsOpen(false);
      setPivotReason("");
      setNewDirection("");
      onPivotComplete();
    } catch (error) {
      console.error("Error executing pivot:", error);
      toast({
        title: "Pivot Failed",
        description: "An error occurred while executing the pivot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPivoting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r from-amber-900/50 to-red-900/50 border-amber-700 hover:border-amber-600 text-amber-100 hover:text-amber-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Execute Global Pivot
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gradient-to-br from-emerald-950 to-emerald-900 border-emerald-800 text-emerald-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-100">
            <Zap className="h-5 w-5 text-amber-400" />
            Execute Global Pivot
          </DialogTitle>
          <DialogDescription className="text-emerald-400">
            This will archive your current business and create a new strategic direction.
            The Triad system will sync automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-amber-900/30 border border-amber-700 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-200">
                <p className="font-semibold mb-1">This action is significant</p>
                <p>
                  Your current business idea will be archived (not deleted) for historical
                  reference, and the system will help you create a new strategic manifest.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-2">
            <Label htmlFor="pivot-reason" className="text-emerald-200">
              Why are you pivoting?
            </Label>
            <Textarea
              id="pivot-reason"
              value={pivotReason}
              onChange={(e) => setPivotReason(e.target.value)}
              placeholder="E.g., Market feedback showed different need, found better opportunity..."
              className="bg-emerald-900/50 border-emerald-700 text-emerald-100 placeholder:text-emerald-600"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-direction" className="text-emerald-200">
              What's your new direction?
            </Label>
            <Textarea
              id="new-direction"
              value={newDirection}
              onChange={(e) => setNewDirection(e.target.value)}
              placeholder="Describe your new business focus, niche, or strategic direction..."
              className="bg-emerald-900/50 border-emerald-700 text-emerald-100 placeholder:text-emerald-600"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPivoting}
            className="border-emerald-700 text-emerald-300 hover:bg-emerald-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePivot}
            disabled={isPivoting}
            className="bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white"
          >
            {isPivoting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <RefreshCw className="h-4 w-4" />
                </motion.div>
                Executing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Execute Pivot
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
