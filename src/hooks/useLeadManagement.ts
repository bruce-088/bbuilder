import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { celebrateFirstIdea } from "@/lib/confetti";

export type SyncStatus = "idle" | "syncing" | "success" | "error";
export interface SyncState {
  status: SyncStatus;
  message: string;
  lastSyncAt: string | null;
}

 export type LeadStage = "captured" | "qualified" | "outreach" | "nurturing" | "won" | "lost";
 export type LeadSource = "landing_page" | "referral" | "n8n_webhook" | "manual";
 export type ActivityType = "note" | "email_sent" | "call" | "stage_change" | "webhook_event";
 
 export interface Lead {
   id: string;
   user_id: string;
   business_idea_id: string | null;
   name: string;
   email: string | null;
   phone: string | null;
   company: string | null;
   stage: LeadStage;
   source: LeadSource;
   estimated_value: number;
   tags: string[];
   custom_fields: Record<string, unknown>;
   created_at: string;
   updated_at: string;
   last_contact_at: string | null;
 }
 
 export interface LeadActivity {
   id: string;
   user_id: string;
   lead_id: string;
   activity_type: ActivityType;
   content: string | null;
   metadata: Record<string, unknown>;
   created_at: string;
 }
 
 export interface LeadStats {
   total: number;
   byStage: Record<LeadStage, number>;
   totalValue: number;
   conversionRate: number;
 }
 
 export interface LeadFilters {
   stage?: LeadStage | "all";
   source?: LeadSource | "all";
   search?: string;
   tags?: string[];
 }
 
 const STAGES: LeadStage[] = ["captured", "qualified", "outreach", "nurturing", "won", "lost"];
 
 export function useLeadManagement() {
   const { user } = useAuth();
   const [leads, setLeads] = useState<Lead[]>([]);
   const [activities, setActivities] = useState<Record<string, LeadActivity[]>>({});
   const [loading, setLoading] = useState(true);
   const [filters, setFilters] = useState<LeadFilters>({ stage: "all", source: "all" });
 
   // Fetch all leads
   const fetchLeads = useCallback(async () => {
     if (!user) return;
     
     try {
       setLoading(true);
       const { data, error } = await supabase
         .from("lead_contacts")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setLeads((data || []) as Lead[]);
     } catch (error) {
       console.error("Error fetching leads:", error);
       toast.error("Failed to fetch leads");
     } finally {
       setLoading(false);
     }
   }, [user]);
 
   // Fetch activities for a specific lead
   const fetchActivities = useCallback(async (leadId: string) => {
     if (!user) return;
     
     try {
       const { data, error } = await supabase
         .from("lead_activities")
         .select("*")
         .eq("lead_id", leadId)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setActivities(prev => ({ ...prev, [leadId]: (data || []) as LeadActivity[] }));
     } catch (error) {
       console.error("Error fetching activities:", error);
     }
   }, [user]);
 
   // Create a new lead
   const createLead = useCallback(async (leadData: Partial<Lead>) => {
     if (!user) return null;
     
     try {
       const { data, error } = await supabase
         .from("lead_contacts")
        .insert([{
           user_id: user.id,
           name: leadData.name || "New Lead",
           email: leadData.email,
           phone: leadData.phone,
           company: leadData.company,
           stage: leadData.stage || "captured",
           source: leadData.source || "manual",
           estimated_value: leadData.estimated_value || 0,
           tags: leadData.tags || [],
          custom_fields: (leadData.custom_fields || {}) as Json,
           business_idea_id: leadData.business_idea_id,
        }])
         .select()
         .single();
 
       if (error) throw error;
       
        const newLead = data as Lead;
        setLeads(prev => [newLead, ...prev]);
        
        // Create initial activity
        await addActivity(newLead.id, "note", "Lead created");
        
        // Emit mission event for lead capture
        if ((window as any).__emitMissionEvent) {
          (window as any).__emitMissionEvent('lead_captured', { 
            name: newLead.name, 
            leadId: newLead.id 
          });
         }

         // ── Mya's Memory (Mem0): save lead context ──
         supabase.functions.invoke("mem0", {
           body: {
             action: "add",
             messages: [{
               role: "system" as const,
               content: `New lead added: ${newLead.name}${newLead.company ? ` from ${newLead.company}` : ''}. Email: ${newLead.email || 'N/A'}. Stage: ${newLead.stage}. Estimated value: $${newLead.estimated_value?.toLocaleString() || '0'}. Source: ${newLead.source}.`,
             }],
           },
         }).catch(err => console.warn("Mem0 save (new lead) failed:", err));
         
         toast.success("Lead created successfully");
       return newLead;
     } catch (error) {
       console.error("Error creating lead:", error);
       toast.error("Failed to create lead");
       return null;
     }
   }, [user]);
 
   // Update a lead
   const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
     if (!user) return false;
     
     try {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
       const { error } = await supabase
         .from("lead_contacts")
        .update(updateData)
         .eq("id", id);
 
       if (error) throw error;
       
       setLeads(prev => prev.map(lead => 
         lead.id === id ? { ...lead, ...updates } : lead
       ));
       
       toast.success("Lead updated");
       return true;
     } catch (error) {
       console.error("Error updating lead:", error);
       toast.error("Failed to update lead");
       return false;
     }
   }, [user]);
 
    // Change lead stage with activity logging, Triad sync, and gamification
    const changeStage = useCallback(async (id: string, newStage: LeadStage) => {
      if (!user) return false;
      
      const lead = leads.find(l => l.id === id);
      if (!lead || lead.stage === newStage) return false;
      
      const oldStage = lead.stage;
      
      try {
        const { error } = await supabase
          .from("lead_contacts")
          .update({
            stage: newStage,
            updated_at: new Date().toISOString(),
            last_contact_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;
        
        setLeads(prev => prev.map(l => 
          l.id === id ? { ...l, stage: newStage, last_contact_at: new Date().toISOString() } : l
        ));
        
         // Log the stage change
         await addActivity(id, "stage_change", `Stage changed from ${oldStage} to ${newStage}`, {
           from: oldStage,
           to: newStage,
         });

        // ── Triad Sync: broadcast LEAD_STAGE_CHANGED to NexusAI ──
        supabase.functions.invoke("sync-to-nexus", {
          body: {
            event_type: "LEAD_STAGE_CHANGED",
            source_app: "business_builder",
            payload: {
              lead_id: id,
              lead_name: lead.name,
              company: lead.company,
              from_stage: oldStage,
              to_stage: newStage,
              estimated_value: lead.estimated_value,
            },
          },
        }).catch(err => console.warn("Triad sync (stage change) failed:", err));

        // Also persist locally to triad_events
        supabase.from("triad_events").insert({
          user_id: user.id,
          event_type: "LEAD_STAGE_CHANGED",
          source_app: "business_builder",
          payload: {
            lead_id: id,
            lead_name: lead.name,
            from_stage: oldStage,
            to_stage: newStage,
            estimated_value: lead.estimated_value,
          } as unknown as Json,
        }).then(({ error: insertErr }) => { if (insertErr) console.warn('triad_events insert:', insertErr); });

        // ── Gamification: emit mission events with stage-specific XP ──
        if ((window as any).__emitMissionEvent) {
          // Base stage_changed event (10 XP default)
          (window as any).__emitMissionEvent('stage_changed', { 
            leadId: id, 
            from: oldStage, 
            to: newStage,
            name: lead.name,
          });

          // Qualified → extra XP already included via stage_changed (10 XP)
          // Won → 500 XP + Deal Closer achievement + double confetti
          if (newStage === 'won') {
            (window as any).__emitMissionEvent('lead_won', { 
              name: lead.name, 
              leadId: id,
              value: lead.estimated_value,
            });
            // Double confetti burst for Deal Closer
            celebrateFirstIdea();
            setTimeout(() => celebrateFirstIdea(), 800);
          }
          
          if (newStage === 'outreach') {
            (window as any).__emitMissionEvent('outreach_started', { 
              name: lead.name, 
              leadId: id,
            });

            // ── Mya Proactive Outreach popup ──
            window.dispatchEvent(new CustomEvent('mya-celebrate', {
              detail: {
                xp: 0,
                message: `${lead.name} is ready for outreach! Should I send the draft to NexusAI so we can start the automation? 🚀`,
              },
            }));
          }
        }

        // ── Revenue Math: sync pipeline value to Mission Control ──
        const updatedLeads = leads.map(l => l.id === id ? { ...l, stage: newStage } : l);
        const pipelineTotal = updatedLeads
          .filter(l => l.stage !== 'lost')
          .reduce((sum, l) => sum + (l.estimated_value || 0), 0);
        
        // Broadcast pipeline total for dashboard consumption
         window.dispatchEvent(new CustomEvent('pipeline-value-updated', {
           detail: { total: pipelineTotal },
         }));

        // ── Mya's Memory (Mem0): save stage change context ──
        supabase.functions.invoke("mem0", {
          body: {
            action: "add",
            messages: [{
              role: "system" as const,
              content: `Lead "${lead.name}"${lead.company ? ` (${lead.company})` : ''} moved from ${oldStage} to ${newStage}. Pipeline value: $${pipelineTotal.toLocaleString()}. Estimated deal value: $${(lead.estimated_value || 0).toLocaleString()}.${newStage === 'won' ? ' 🏆 DEAL WON! This is a major milestone toward the $10K/month goal.' : ''}`,
            }],
          },
        }).catch(err => console.warn("Mem0 save (stage change) failed:", err));
          
         toast.success(`Lead moved to ${newStage}`);
        return true;
      } catch (error) {
        console.error("Error changing stage:", error);
        toast.error("Failed to change stage");
        return false;
      }
    }, [user, leads]);
 
   // Delete a lead
   const deleteLead = useCallback(async (id: string) => {
     if (!user) return false;
     
     try {
       const { error } = await supabase
         .from("lead_contacts")
         .delete()
         .eq("id", id);
 
       if (error) throw error;
       
       setLeads(prev => prev.filter(lead => lead.id !== id));
       toast.success("Lead deleted");
       return true;
     } catch (error) {
       console.error("Error deleting lead:", error);
       toast.error("Failed to delete lead");
       return false;
     }
   }, [user]);
 
   // Add an activity to a lead
   const addActivity = useCallback(async (
     leadId: string,
     type: ActivityType,
     content: string,
     metadata: Record<string, unknown> = {}
   ) => {
     if (!user) return null;
     
     try {
       const { data, error } = await supabase
         .from("lead_activities")
        .insert([{
           user_id: user.id,
           lead_id: leadId,
           activity_type: type,
           content,
          metadata: metadata as Json,
        }])
         .select()
         .single();
 
       if (error) throw error;
       
       const newActivity = data as LeadActivity;
       setActivities(prev => ({
         ...prev,
         [leadId]: [newActivity, ...(prev[leadId] || [])],
       }));
       
       // Update last_contact_at
       await supabase
         .from("lead_contacts")
         .update({ last_contact_at: new Date().toISOString() })
         .eq("id", leadId);
       
       return newActivity;
     } catch (error) {
       console.error("Error adding activity:", error);
       return null;
     }
   }, [user]);
 
   // Calculate stats
   const getStats = useCallback((): LeadStats => {
     const byStage: Record<LeadStage, number> = {
       captured: 0,
       qualified: 0,
       outreach: 0,
       nurturing: 0,
       won: 0,
       lost: 0,
     };
     
     let totalValue = 0;
     
      leads.forEach(lead => {
        if (byStage[lead.stage] !== undefined) {
          byStage[lead.stage]++;
        }
        totalValue += lead.estimated_value || 0;
      });
     
     const wonCount = byStage.won;
     const closedCount = wonCount + byStage.lost;
     const conversionRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;
     
     return {
       total: leads.length,
       byStage,
       totalValue,
       conversionRate,
     };
   }, [leads]);
 
   // Filter leads
   const getFilteredLeads = useCallback(() => {
     return leads.filter(lead => {
       if (filters.stage && filters.stage !== "all" && lead.stage !== filters.stage) {
         return false;
       }
       if (filters.source && filters.source !== "all" && lead.source !== filters.source) {
         return false;
       }
       if (filters.search) {
         const search = filters.search.toLowerCase();
         const matchesName = lead.name.toLowerCase().includes(search);
         const matchesEmail = lead.email?.toLowerCase().includes(search);
         const matchesCompany = lead.company?.toLowerCase().includes(search);
         if (!matchesName && !matchesEmail && !matchesCompany) {
           return false;
         }
       }
       if (filters.tags && filters.tags.length > 0) {
         const hasTag = filters.tags.some(tag => lead.tags.includes(tag));
         if (!hasTag) return false;
       }
       return true;
     });
   }, [leads, filters]);
 
   // Get leads by stage for pipeline view
   const getLeadsByStage = useCallback(() => {
     const filtered = getFilteredLeads();
     const byStage: Record<LeadStage, Lead[]> = {
       captured: [],
       qualified: [],
       outreach: [],
       nurturing: [],
       won: [],
       lost: [],
     };
     
      filtered.forEach(lead => {
        if (byStage[lead.stage]) {
          byStage[lead.stage].push(lead);
        } else {
          // Fallback: treat unknown stages as "captured"
          byStage.captured.push(lead);
        }
      });
     
     return byStage;
   }, [getFilteredLeads]);
 
   // Set up realtime subscription
   useEffect(() => {
     if (!user) return;
 
     fetchLeads();
 
     const channel = supabase
       .channel("lead_changes")
       .on(
         "postgres_changes",
         { event: "*", schema: "public", table: "lead_contacts" },
         (payload) => {
           if (payload.eventType === "INSERT") {
             setLeads(prev => [payload.new as Lead, ...prev]);
           } else if (payload.eventType === "UPDATE") {
             setLeads(prev => prev.map(l => 
               l.id === payload.new.id ? payload.new as Lead : l
             ));
           } else if (payload.eventType === "DELETE") {
             setLeads(prev => prev.filter(l => l.id !== payload.old.id));
           }
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [user, fetchLeads]);
 
   return {
     leads,
     activities,
     loading,
     filters,
     setFilters,
     fetchLeads,
     fetchActivities,
     createLead,
     updateLead,
     changeStage,
     deleteLead,
     addActivity,
     getStats,
     getFilteredLeads,
     getLeadsByStage,
     STAGES,
   };
 }