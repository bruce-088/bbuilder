 import { useEffect } from "react";
 import { Badge } from "@/components/ui/badge";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { 
   MessageSquare, 
   Mail, 
   Phone, 
   ArrowRightLeft, 
   Webhook,
   Clock
 } from "lucide-react";
 import { formatDistanceToNow } from "date-fns";
 import type { LeadActivity, ActivityType } from "@/hooks/useLeadManagement";
 
 interface LeadActivityTimelineProps {
   activities: LeadActivity[];
   leadId: string;
   onFetch: (leadId: string) => void;
 }
 
 const activityIcons: Record<ActivityType, React.ReactNode> = {
   note: <MessageSquare className="h-4 w-4" />,
   email_sent: <Mail className="h-4 w-4" />,
   call: <Phone className="h-4 w-4" />,
   stage_change: <ArrowRightLeft className="h-4 w-4" />,
   webhook_event: <Webhook className="h-4 w-4" />,
 };
 
 const activityColors: Record<ActivityType, string> = {
   note: "bg-blue-500/20 text-blue-400",
   email_sent: "bg-green-500/20 text-green-400",
   call: "bg-purple-500/20 text-purple-400",
   stage_change: "bg-amber-500/20 text-amber-400",
   webhook_event: "bg-cyan-500/20 text-cyan-400",
 };
 
 const activityLabels: Record<ActivityType, string> = {
   note: "Note",
   email_sent: "Email Sent",
   call: "Call",
   stage_change: "Stage Changed",
   webhook_event: "Webhook Event",
 };
 
 export function LeadActivityTimeline({ activities, leadId, onFetch }: LeadActivityTimelineProps) {
   useEffect(() => {
     onFetch(leadId);
   }, [leadId, onFetch]);
 
   if (activities.length === 0) {
     return (
       <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
         <Clock className="h-8 w-8 mb-2 opacity-50" />
         <p className="text-sm">No activity yet</p>
       </div>
     );
   }
 
   return (
     <ScrollArea className="h-[300px] pr-4">
       <div className="relative pl-6">
         {/* Timeline line */}
         <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
 
         <div className="space-y-4">
           {activities.map((activity) => (
             <div key={activity.id} className="relative">
               {/* Timeline dot */}
               <div className={`
                 absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full border-2 border-background
                 ${activityColors[activity.activity_type]}
               `}>
                 <div className="w-full h-full rounded-full flex items-center justify-center">
                   <div className="w-1.5 h-1.5 rounded-full bg-current" />
                 </div>
               </div>
 
               {/* Activity content */}
               <div className="glass rounded-lg p-3 space-y-1.5">
                 <div className="flex items-center justify-between gap-2">
                   <div className="flex items-center gap-2">
                     <span className={`p-1 rounded ${activityColors[activity.activity_type]}`}>
                       {activityIcons[activity.activity_type]}
                     </span>
                     <Badge variant="outline" className="text-xs">
                       {activityLabels[activity.activity_type]}
                     </Badge>
                   </div>
                   <span className="text-xs text-muted-foreground">
                     {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                   </span>
                 </div>
 
                 {activity.content && (
                   <p className="text-sm text-foreground/90">{activity.content}</p>
                 )}
 
                 {/* Stage change metadata */}
                 {activity.activity_type === "stage_change" && activity.metadata && (
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <Badge variant="secondary" className="text-xs">
                       {String(activity.metadata.from)}
                     </Badge>
                     <ArrowRightLeft className="h-3 w-3" />
                     <Badge variant="secondary" className="text-xs">
                       {String(activity.metadata.to)}
                     </Badge>
                   </div>
                 )}
               </div>
             </div>
           ))}
         </div>
       </div>
     </ScrollArea>
   );
 }