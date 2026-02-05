 import { useState } from "react";
 import { useAuth } from "@/contexts/AuthContext";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { toast } from "@/hooks/use-toast";
 import { supabase } from "@/integrations/supabase/client";
 import {
   Copy,
   CheckCircle2,
   Loader2,
   Link2,
   Code2,
   Zap,
   ExternalLink,
   Play,
   BookOpen,
 } from "lucide-react";
 import {
   generateWebhookNodeJSON,
   generateMcpDeployPrompt,
   getWebhookUrl,
   generateTestPayload,
   DEFAULT_FIELD_MAPPINGS,
 } from "@/lib/leadWebhookIntegration";
 
 interface WebhookEvent {
   id: string;
   name: string;
   source: string;
   created_at: string;
 }
 
 interface WebhookSetupPanelProps {
   recentLeads?: WebhookEvent[];
 }
 
 export function WebhookSetupPanel({ recentLeads = [] }: WebhookSetupPanelProps) {
   const { user } = useAuth();
   const [copied, setCopied] = useState<string | null>(null);
   const [testing, setTesting] = useState(false);
   const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
   const [selectedSource, setSelectedSource] = useState<'apollo' | 'linkedin' | 'hunter' | 'generic'>('apollo');
 
   const webhookUrl = getWebhookUrl();
   const userId = user?.id || '';
 
   const handleCopy = async (text: string, label: string) => {
     await navigator.clipboard.writeText(text);
     setCopied(label);
     toast({
       title: "Copied!",
       description: `${label} copied to clipboard`,
     });
     setTimeout(() => setCopied(null), 2000);
   };
 
   const handleTestConnection = async () => {
     if (!userId) {
       toast({
         title: "Not authenticated",
         description: "Please sign in to test the webhook",
         variant: "destructive",
       });
       return;
     }
 
     setTesting(true);
     setTestResult(null);
 
     try {
       const testPayload = generateTestPayload(userId);
       const { error } = await supabase.functions.invoke('lead-webhook', {
         body: testPayload,
       });
 
       if (error) throw error;
 
       setTestResult('success');
       toast({
         title: "Connection successful!",
         description: "A test lead was created in your pipeline",
       });
     } catch (error) {
       setTestResult('error');
       toast({
         title: "Connection failed",
         description: error instanceof Error ? error.message : "Unknown error",
         variant: "destructive",
       });
     } finally {
       setTesting(false);
     }
   };
 
   const formatTimeAgo = (dateStr: string) => {
     const date = new Date(dateStr);
     const now = new Date();
     const diff = now.getTime() - date.getTime();
     const minutes = Math.floor(diff / 60000);
     const hours = Math.floor(diff / 3600000);
     const days = Math.floor(diff / 86400000);
 
     if (minutes < 60) return `${minutes} min ago`;
     if (hours < 24) return `${hours} hours ago`;
     return `${days} days ago`;
   };
 
   const nodeConfigJson = generateWebhookNodeJSON(userId, selectedSource);
   const agentPrompt = generateMcpDeployPrompt(userId, 'GhostWriter AI: Lead Prospecting & Discovery Engine');
 
   return (
     <div className="space-y-6 p-4">
       {/* Webhook URL Card */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Link2 className="h-5 w-5 text-primary" />
             Webhook Integration
           </CardTitle>
           <CardDescription>
             Connect your n8n workflows to automatically push leads into your CRM
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div>
             <label className="text-sm font-medium text-muted-foreground">Your webhook URL</label>
             <div className="flex items-center gap-2 mt-1">
               <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono truncate">
                 {webhookUrl}
               </code>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => handleCopy(webhookUrl, 'Webhook URL')}
               >
                 {copied === 'Webhook URL' ? (
                   <CheckCircle2 className="h-4 w-4 text-green-500" />
                 ) : (
                   <Copy className="h-4 w-4" />
                 )}
               </Button>
             </div>
           </div>
 
           <div className="flex items-center gap-3">
             <Button
               variant="outline"
               onClick={handleTestConnection}
               disabled={testing || !userId}
             >
               {testing ? (
                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
               ) : (
                 <Play className="h-4 w-4 mr-2" />
               )}
               Test Connection
             </Button>
             {testResult === 'success' && (
               <Badge variant="secondary" className="bg-primary/20 text-primary">
                 <CheckCircle2 className="h-3 w-3 mr-1" />
                 Connected
               </Badge>
             )}
             {testResult === 'error' && (
               <Badge variant="destructive">
                 Connection failed
               </Badge>
             )}
           </div>
         </CardContent>
       </Card>
 
       {/* n8n Node Configuration */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Code2 className="h-5 w-5 text-primary" />
             n8n Node Configuration
           </CardTitle>
           <CardDescription>
             Copy this HTTP Request node configuration to add to your workflow
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <Tabs value={selectedSource} onValueChange={(v) => setSelectedSource(v as typeof selectedSource)}>
             <TabsList>
               <TabsTrigger value="apollo">Apollo</TabsTrigger>
               <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
               <TabsTrigger value="hunter">Hunter.io</TabsTrigger>
               <TabsTrigger value="generic">Generic</TabsTrigger>
             </TabsList>
             <TabsContent value={selectedSource} className="mt-4">
               <div className="relative">
                 <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-64">
                   {nodeConfigJson}
                 </pre>
                 <Button
                   variant="secondary"
                   size="sm"
                   className="absolute top-2 right-2"
                   onClick={() => handleCopy(nodeConfigJson, 'Node config')}
                 >
                   {copied === 'Node config' ? (
                     <CheckCircle2 className="h-4 w-4 text-green-500" />
                   ) : (
                     <Copy className="h-4 w-4" />
                   )}
                 </Button>
               </div>
               <p className="text-xs text-muted-foreground mt-2">
                 Field mappings optimized for {selectedSource === 'generic' ? 'standard' : selectedSource} data structure
               </p>
             </TabsContent>
           </Tabs>
         </CardContent>
       </Card>
 
       {/* Quick Setup Guide */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <BookOpen className="h-5 w-5 text-primary" />
             Quick Setup Guide
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <ol className="space-y-3 text-sm">
             <li className="flex items-start gap-3">
               <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium">
                 1
               </span>
               <span>Open your n8n workflow (e.g., Lead Prospecting Engine)</span>
             </li>
             <li className="flex items-start gap-3">
               <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium">
                 2
               </span>
               <span>Add a new HTTP Request node after your lead scoring/filtering step</span>
             </li>
             <li className="flex items-start gap-3">
               <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium">
                 3
               </span>
               <span>Copy the node configuration above and paste into the HTTP Request settings</span>
             </li>
             <li className="flex items-start gap-3">
               <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium">
                 4
               </span>
               <span>Test the connection and activate your workflow</span>
             </li>
           </ol>
 
           <div className="flex items-center gap-3 pt-2">
             <Button
               variant="outline"
               onClick={() => handleCopy(agentPrompt, 'Agent prompt')}
             >
               {copied === 'Agent prompt' ? (
                 <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
               ) : (
                 <Zap className="h-4 w-4 mr-2" />
               )}
               Copy Agent Prompt
             </Button>
             <span className="text-xs text-muted-foreground">
               Paste in your AI agent to auto-configure
             </span>
           </div>
         </CardContent>
       </Card>
 
       {/* Recent Webhook Events */}
       <Card>
         <CardHeader>
           <CardTitle className="text-base">Recent Webhook Events</CardTitle>
         </CardHeader>
         <CardContent>
           {recentLeads.length === 0 ? (
             <p className="text-sm text-muted-foreground">
               No webhook events yet. Test the connection or trigger your n8n workflow.
             </p>
           ) : (
             <ul className="space-y-2">
               {recentLeads.slice(0, 5).map((lead) => (
                 <li key={lead.id} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2">
                     <CheckCircle2 className="h-4 w-4 text-green-500" />
                     <span>{lead.name}</span>
                     <Badge variant="outline" className="text-xs">
                       {lead.source}
                     </Badge>
                   </div>
                   <span className="text-muted-foreground text-xs">
                     {formatTimeAgo(lead.created_at)}
                   </span>
                 </li>
               ))}
             </ul>
           )}
         </CardContent>
       </Card>
     </div>
   );
 }