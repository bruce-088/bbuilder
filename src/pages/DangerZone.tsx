import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SubPageHeader from "@/components/SubPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, RefreshCw, Zap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DangerZone() {
  const { user, loading } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pivotReason, setPivotReason] = useState("");
  const [newDirection, setNewDirection] = useState("");
  const [running, setRunning] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const canConfirm = confirmText === "RESET" && pivotReason.trim() && newDirection.trim();

  const executePivot = async () => {
    if (!canConfirm) return;
    setRunning(true);
    try {
      const { data: active } = await supabase
        .from("business_ideas")
        .select("id")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (active) {
        await supabase.from("business_ideas").update({ archived: true }).eq("id", active.id);
      }

      await supabase.from("triad_events").insert({
        user_id: user.id,
        event_type: "PIVOT_EXECUTED",
        source_app: "mya",
        payload: {
          previous_business_id: active?.id,
          pivot_reason: pivotReason,
          new_direction: newDirection,
          timestamp: new Date().toISOString(),
        },
      });

      toast.success("Pivot executed. Active niche, current quest, and in-flight tasks were reset.");
      setConfirmOpen(false);
      setConfirmText("");
      setPivotReason("");
      setNewDirection("");
    } catch (e) {
      toast.error("Pivot failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SubPageHeader title="Settings · Danger Zone" description="Destructive actions. Use with care." />
      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Execute Global Pivot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will archive your current business idea, reset your active niche, current quest,
              and all in-flight tasks. Use it only when you are starting over with a brand-new direction.
            </p>
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmOpen(true)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Execute Global Pivot
            </Button>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Confirm Global Pivot
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will reset your active niche, current quest, and all in-flight tasks. Type <span className="font-mono font-bold text-foreground">RESET</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Why are you pivoting?</Label>
              <Textarea value={pivotReason} onChange={(e) => setPivotReason(e.target.value)} rows={2} placeholder="Market feedback, better opportunity..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">What's your new direction?</Label>
              <Textarea value={newDirection} onChange={(e) => setNewDirection(e.target.value)} rows={2} placeholder="Describe your new business focus..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type RESET to confirm</Label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" autoComplete="off" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); executePivot(); }}
              disabled={!canConfirm || running}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Execute Pivot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
