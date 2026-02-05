 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { 
   Users, 
   TrendingUp, 
   DollarSign, 
   ArrowRight,
   Target
 } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import type { LeadStats } from "@/hooks/useLeadManagement";
 
 interface LeadStatsCardProps {
   stats: LeadStats;
   loading?: boolean;
 }
 
 export function LeadStatsCard({ stats, loading }: LeadStatsCardProps) {
   const navigate = useNavigate();
 
   const activeLeads = stats.byStage.captured + stats.byStage.qualified + 
                       stats.byStage.outreach + stats.byStage.nurturing;
   const closedLeads = stats.byStage.won + stats.byStage.lost;
 
   if (loading) {
     return (
       <Card className="glass card-hover">
         <CardContent className="p-6">
           <div className="animate-pulse space-y-4">
             <div className="h-4 bg-muted rounded w-1/2" />
             <div className="h-8 bg-muted rounded w-1/3" />
             <div className="h-2 bg-muted rounded" />
           </div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card className="glass card-hover">
       <CardHeader className="pb-2">
         <div className="flex items-center justify-between">
           <CardTitle className="text-lg flex items-center gap-2">
             <Users className="h-5 w-5 text-primary" />
             Lead Pipeline
           </CardTitle>
           <Button
             variant="ghost"
             size="sm"
             onClick={() => navigate("/leads")}
             className="text-primary"
           >
             View All
             <ArrowRight className="h-4 w-4 ml-1" />
           </Button>
         </div>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* Quick stats */}
         <div className="grid grid-cols-3 gap-4">
           <div className="text-center">
             <p className="text-2xl font-bold">{stats.total}</p>
             <p className="text-xs text-muted-foreground">Total Leads</p>
           </div>
           <div className="text-center">
             <p className="text-2xl font-bold text-primary">{activeLeads}</p>
             <p className="text-xs text-muted-foreground">Active</p>
           </div>
           <div className="text-center">
             <p className="text-2xl font-bold text-green-400">{stats.byStage.won}</p>
             <p className="text-xs text-muted-foreground">Won</p>
           </div>
         </div>
 
         {/* Pipeline value */}
         {stats.totalValue > 0 && (
           <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
             <div className="flex items-center gap-2">
               <DollarSign className="h-4 w-4 text-amber-400" />
               <span className="text-sm">Pipeline Value</span>
             </div>
             <span className="font-semibold">${stats.totalValue.toLocaleString()}</span>
           </div>
         )}
 
         {/* Conversion rate */}
         {closedLeads > 0 && (
           <div className="space-y-2">
             <div className="flex items-center justify-between text-sm">
               <span className="flex items-center gap-2">
                 <Target className="h-4 w-4 text-primary" />
                 Conversion Rate
               </span>
               <span className="font-medium">{stats.conversionRate.toFixed(1)}%</span>
             </div>
             <Progress value={stats.conversionRate} className="h-2" />
           </div>
         )}
 
         {/* Stage breakdown */}
         <div className="flex flex-wrap gap-1.5">
           {stats.byStage.captured > 0 && (
             <Badge variant="secondary" className="text-xs">
               {stats.byStage.captured} Captured
             </Badge>
           )}
           {stats.byStage.qualified > 0 && (
             <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">
               {stats.byStage.qualified} Qualified
             </Badge>
           )}
           {stats.byStage.outreach > 0 && (
             <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">
               {stats.byStage.outreach} Outreach
             </Badge>
           )}
           {stats.byStage.nurturing > 0 && (
             <Badge variant="secondary" className="text-xs bg-cyan-500/20 text-cyan-400">
               {stats.byStage.nurturing} Nurturing
             </Badge>
           )}
         </div>
       </CardContent>
     </Card>
   );
 }