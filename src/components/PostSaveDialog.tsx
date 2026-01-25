import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, MessageSquare, Rocket } from "lucide-react";
import { motion } from "framer-motion";

interface PostSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  onOpenChecklist: () => void;
  onKeepChatting: () => void;
}

export default function PostSaveDialog({
  open,
  onOpenChange,
  businessName,
  onOpenChecklist,
  onKeepChatting,
}: PostSaveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </motion.div>
          <DialogTitle className="text-xl">Business Plan Saved!</DialogTitle>
          <DialogDescription className="text-base mt-2">
            <span className="font-semibold text-foreground">{businessName}</span> is now in your Business Plans.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground text-center">
            What would you like to do next?
          </p>

          <Button
            onClick={onOpenChecklist}
            className="w-full justify-between bg-gradient-accent text-accent-foreground hover:opacity-90 h-14"
          >
            <div className="flex items-center gap-3">
              <Rocket className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Open Quick Start Checklist</div>
                <div className="text-xs opacity-80">Start implementing now</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            onClick={onKeepChatting}
            variant="outline"
            className="w-full justify-between h-12"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4" />
              <span>Keep Chatting with Mya</span>
            </div>
            <ArrowRight className="w-4 h-4 opacity-50" />
          </Button>
        </div>

        <DialogFooter className="text-center sm:justify-center">
          <p className="text-xs text-muted-foreground">
            You can access your plan anytime from the Dashboard
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
