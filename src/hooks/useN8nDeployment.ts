import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface DeploymentRequest {
  id: string;
  user_id: string;
  business_idea_id: string | null;
  workflow_name: string;
  workflow_json: Record<string, unknown>;
  status: "pending" | "deploying" | "success" | "failed" | "cancelled";
  n8n_workflow_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  deployed_at: string | null;
}

interface CreateDeploymentParams {
  workflowName: string;
  workflowJson: Record<string, unknown>;
  businessIdeaId?: string;
}

export function useN8nDeployment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deployments, setDeployments] = useState<DeploymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDeployment, setActiveDeployment] = useState<DeploymentRequest | null>(null);

  // Fetch existing deployment requests
  const fetchDeployments = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("n8n_deployment_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Type assertion since Supabase types may not be updated yet
      const typedData = (data || []) as unknown as DeploymentRequest[];
      setDeployments(typedData);

      // Set active deployment if there's a pending one
      const pending = typedData.find(d => d.status === "pending" || d.status === "deploying");
      setActiveDeployment(pending || null);
    } catch (error) {
      console.error("Error fetching deployments:", error);
    }
  }, [user]);

  // Create a new deployment request
  const createDeploymentRequest = useCallback(async ({
    workflowName,
    workflowJson,
    businessIdeaId,
  }: CreateDeploymentParams): Promise<DeploymentRequest | null> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to deploy workflows",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);

    try {
      // Cast to any to bypass strict JSON typing - the table accepts JSONB
      const insertData = {
        user_id: user.id,
        workflow_name: workflowName,
        workflow_json: workflowJson,
        business_idea_id: businessIdeaId || null,
        status: "pending",
      };
      
      const { data, error } = await supabase
        .from("n8n_deployment_requests")
        .insert([insertData] as any)
        .select()
        .single();

      if (error) throw error;

      const typedData = data as unknown as DeploymentRequest;
      setActiveDeployment(typedData);
      setDeployments(prev => [typedData, ...prev]);

      toast({
        title: "Deployment requested",
        description: "Ask the assistant to deploy your workflow to n8n",
      });

      return typedData;
    } catch (error) {
      console.error("Error creating deployment request:", error);
      toast({
        title: "Failed to create deployment request",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Cancel a deployment request
  const cancelDeployment = useCallback(async (deploymentId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("n8n_deployment_requests")
        .update({ status: "cancelled" })
        .eq("id", deploymentId)
        .eq("user_id", user.id);

      if (error) throw error;

      setDeployments(prev =>
        prev.map(d => d.id === deploymentId ? { ...d, status: "cancelled" as const } : d)
      );

      if (activeDeployment?.id === deploymentId) {
        setActiveDeployment(null);
      }

      toast({
        title: "Deployment cancelled",
        description: "The deployment request has been cancelled",
      });

      return true;
    } catch (error) {
      console.error("Error cancelling deployment:", error);
      toast({
        title: "Failed to cancel deployment",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return false;
    }
  }, [user, activeDeployment, toast]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    fetchDeployments();

    const channel = supabase
      .channel("n8n_deployment_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "n8n_deployment_requests",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as DeploymentRequest;
          const oldData = payload.old as { id: string };

          if (payload.eventType === "INSERT") {
            setDeployments(prev => [newData, ...prev.filter(d => d.id !== newData.id)]);
          } else if (payload.eventType === "UPDATE") {
            setDeployments(prev =>
              prev.map(d => d.id === newData.id ? newData : d)
            );

            // Update active deployment
            if (activeDeployment?.id === newData.id) {
              setActiveDeployment(newData);
            }

            // Show toast for status changes
            if (newData.status === "success") {
              toast({
                title: "Deployment successful!",
                description: `Workflow deployed to n8n${newData.n8n_workflow_id ? ` (ID: ${newData.n8n_workflow_id})` : ""}`,
              });
            } else if (newData.status === "failed") {
              toast({
                title: "Deployment failed",
                description: newData.error_message || "Unknown error occurred",
                variant: "destructive",
              });
            }
          } else if (payload.eventType === "DELETE") {
            setDeployments(prev => prev.filter(d => d.id !== oldData.id));
            if (activeDeployment?.id === oldData.id) {
              setActiveDeployment(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDeployments, activeDeployment?.id, toast]);

  // Get the most recent pending deployment for a business idea
  const getPendingDeployment = useCallback((businessIdeaId?: string): DeploymentRequest | null => {
    if (businessIdeaId) {
      return deployments.find(
        d => d.business_idea_id === businessIdeaId && 
             (d.status === "pending" || d.status === "deploying")
      ) || null;
    }
    return deployments.find(
      d => d.status === "pending" || d.status === "deploying"
    ) || null;
  }, [deployments]);

  return {
    deployments,
    activeDeployment,
    isLoading,
    createDeploymentRequest,
    cancelDeployment,
    fetchDeployments,
    getPendingDeployment,
  };
}
