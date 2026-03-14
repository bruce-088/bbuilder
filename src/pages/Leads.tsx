 import { useState } from "react";
 import { Navigate, useNavigate } from "react-router-dom";
 import { useAuth } from "@/contexts/AuthContext";
 import { useLeadManagement, type Lead, type LeadStage, type LeadSource } from "@/hooks/useLeadManagement";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { 
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Badge } from "@/components/ui/badge";
 import { 
   LeadPipeline, 
   LeadDetailPanel, 
   AddLeadDialog,
  LeadStatsCard,
  WebhookSetupPanel,
 } from "@/components/LeadCRM";
 import { 
   ArrowLeft, 
   Plus, 
   Search, 
   Users,
   DollarSign,
   TrendingUp,
  Loader2,
  Link2,
 } from "lucide-react";
 
 export default function Leads() {
   const { user, loading: authLoading } = useAuth();
   const navigate = useNavigate();
   const {
     leads,
     activities,
     loading,
     filters,
     setFilters,
     createLead,
     updateLead,
     changeStage,
     deleteLead,
     addActivity,
     fetchActivities,
     getStats,
    getLeadsByStage,
    syncState,
  } = useLeadManagement();
 
   const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
   const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "webhook">("pipeline");
 
   if (authLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   if (!user) {
     return <Navigate to="/auth" replace />;
   }
 
   const stats = getStats();
   const leadsByStage = getLeadsByStage();
 
   return (
     <div className="min-h-screen bg-background">
       {/* Header */}
       <header className="sticky top-0 z-50 glass border-b">
         <div className="container mx-auto px-4 py-4">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
               <Button
                 variant="ghost"
                 size="icon"
                 onClick={() => navigate("/dashboard")}
               >
                 <ArrowLeft className="h-5 w-5" />
               </Button>
               <div>
                 <h1 className="text-xl font-bold flex items-center gap-2">
                   <Users className="h-5 w-5 text-primary" />
                   Lead Pipeline
                 </h1>
                 <p className="text-sm text-muted-foreground">
                   Manage your sales funnel
                 </p>
               </div>
             </div>
             <Button onClick={() => setShowAddDialog(true)}>
               <Plus className="h-4 w-4 mr-2" />
               Add Lead
             </Button>
           </div>
         </div>
       </header>
 
       {/* Stats bar */}
       <div className="border-b bg-card/50">
         <div className="container mx-auto px-4 py-4">
           <div className="flex items-center gap-6 overflow-x-auto">
             <div className="flex items-center gap-2">
               <Badge variant="secondary" className="text-sm px-3 py-1">
                 <Users className="h-4 w-4 mr-1" />
                 {stats.total} leads
               </Badge>
             </div>
             <div className="flex items-center gap-2">
               <Badge variant="secondary" className="text-sm px-3 py-1 bg-green-500/20 text-green-400">
                 <TrendingUp className="h-4 w-4 mr-1" />
                 {stats.conversionRate.toFixed(1)}% conversion
               </Badge>
             </div>
             {stats.totalValue > 0 && (
               <div className="flex items-center gap-2">
                 <Badge variant="secondary" className="text-sm px-3 py-1 bg-amber-500/20 text-amber-400">
                   <DollarSign className="h-4 w-4 mr-1" />
                   ${stats.totalValue.toLocaleString()} pipeline
                 </Badge>
               </div>
             )}
           </div>
         </div>
       </div>
 
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
        <div className="border-b bg-card/30">
          <div className="container mx-auto px-4">
            <TabsList className="h-12 bg-transparent">
              <TabsTrigger value="pipeline" className="data-[state=active]:bg-primary/10">
                <Users className="h-4 w-4 mr-2" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="webhook" className="data-[state=active]:bg-primary/10">
                <Link2 className="h-4 w-4 mr-2" />
                Webhook Setup
              </TabsTrigger>
            </TabsList>
           </div>
        </div>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="flex-1 mt-0">
          {/* Filters */}
          <div className="border-b bg-card/30">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={filters.search || ""}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={filters.source || "all"}
                  onValueChange={(value) => setFilters({ ...filters, source: value as LeadSource | "all" })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="landing_page">Landing Page</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="n8n_webhook">Automation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pipeline Content */}
          <main className="container mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No leads yet</h2>
                <p className="text-muted-foreground mb-4">
                  Start building your pipeline by adding your first lead.
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Lead
                </Button>
              </div>
            ) : (
              <LeadPipeline
                leadsByStage={leadsByStage}
                onSelectLead={setSelectedLead}
                onStageChange={changeStage}
                onDeleteLead={deleteLead}
                syncState={syncState}
              />
            )}
          </main>
        </TabsContent>

        {/* Webhook Setup Tab */}
        <TabsContent value="webhook" className="flex-1 mt-0">
          <div className="container mx-auto max-w-3xl">
            <WebhookSetupPanel
              recentLeads={leads
                .filter((l) => l.source === 'n8n_webhook')
                .slice(0, 5)
                .map((l) => ({
                  id: l.id,
                  name: l.name,
                  source: l.source,
                  created_at: l.created_at,
                }))}
            />
          </div>
        </TabsContent>
      </Tabs>
 
       {/* Lead detail panel */}
       <LeadDetailPanel
         lead={selectedLead}
         activities={selectedLead ? activities[selectedLead.id] || [] : []}
         open={!!selectedLead}
         onClose={() => setSelectedLead(null)}
         onUpdate={updateLead}
         onStageChange={changeStage}
         onDelete={deleteLead}
         onAddActivity={addActivity}
         onFetchActivities={fetchActivities}
       />
 
       {/* Add lead dialog */}
       <AddLeadDialog
         open={showAddDialog}
         onClose={() => setShowAddDialog(false)}
         onCreate={createLead}
       />
     </div>
   );
 }