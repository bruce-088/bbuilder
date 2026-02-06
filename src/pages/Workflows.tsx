import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowLeft, Loader2, Workflow, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Workflow as WorkflowType } from "@/components/WorkflowBuilder/types";

export default function Workflows() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchWorkflows();
  }, [user]);

  const fetchWorkflows = async () => {
    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setWorkflows(data as unknown as WorkflowType[]);
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("workflows").delete().eq("id", id);
    if (!error) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toast.success("Workflow deleted");
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
              <p className="text-sm text-muted-foreground">Build visual automation pipelines with AI agents</p>
            </div>
          </div>
          <Button onClick={() => navigate("/workflows/new")} className="gap-2">
            <Plus className="h-4 w-4" /> New Workflow
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : workflows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Workflow className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No workflows yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first workflow to automate tasks with AI agents</p>
              <Button onClick={() => navigate("/workflows/new")} className="gap-2">
                <Plus className="h-4 w-4" /> Create Workflow
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {workflows.map((wf) => (
              <Card
                key={wf.id}
                className="cursor-pointer hover:border-primary/30 transition-colors group"
                onClick={() => navigate(`/workflows/${wf.id}`)}
              >
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div className="flex items-center gap-3">
                    <Workflow className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{wf.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(wf.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDelete(wf.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
