 import { memo } from "react";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { 
   Mail, 
   Phone, 
   Building2, 
   DollarSign, 
   Clock, 
   GripVertical,
   MoreHorizontal
 } from "lucide-react";
 import { 
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { formatDistanceToNow } from "date-fns";
 import type { Lead, LeadStage } from "@/hooks/useLeadManagement";
 
 interface LeadCardProps {
   lead: Lead;
   onSelect: (lead: Lead) => void;
   onStageChange: (id: string, stage: LeadStage) => void;
   onDelete: (id: string) => void;
   isDragging?: boolean;
 }
 
 const sourceColors: Record<string, string> = {
   landing_page: "bg-primary/20 text-primary",
   referral: "bg-green-500/20 text-green-400",
   n8n_webhook: "bg-amber-500/20 text-amber-400",
   manual: "bg-muted text-muted-foreground",
 };
 
 const sourceLabels: Record<string, string> = {
   landing_page: "Landing Page",
   referral: "Referral",
   n8n_webhook: "Automation",
   manual: "Manual",
 };
 
 export const LeadCard = memo(function LeadCard({ 
   lead, 
   onSelect, 
   onStageChange,
   onDelete,
   isDragging 
 }: LeadCardProps) {
   const lastContact = lead.last_contact_at 
     ? formatDistanceToNow(new Date(lead.last_contact_at), { addSuffix: true })
     : "Never";
 
   return (
     <Card 
       className={`
         glass cursor-pointer transition-all duration-200 group
         ${isDragging ? "opacity-50 scale-105 shadow-lg" : "hover:border-primary/30"}
       `}
       onClick={() => onSelect(lead)}
     >
       <CardContent className="p-3 space-y-2">
         {/* Header with drag handle and menu */}
         <div className="flex items-start justify-between gap-2">
           <div className="flex items-center gap-2 flex-1 min-w-0">
             <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
             <h4 className="font-medium text-sm truncate">{lead.name}</h4>
           </div>
           <DropdownMenu>
             <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
               <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                 <MoreHorizontal className="h-4 w-4" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
               <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStageChange(lead.id, "qualified"); }}>
                 Move to Qualified
               </DropdownMenuItem>
               <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStageChange(lead.id, "outreach"); }}>
                 Move to Outreach
               </DropdownMenuItem>
               <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStageChange(lead.id, "nurturing"); }}>
                 Move to Nurturing
               </DropdownMenuItem>
               <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStageChange(lead.id, "won"); }}>
                 Mark as Won
               </DropdownMenuItem>
               <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStageChange(lead.id, "lost"); }}>
                 Mark as Lost
               </DropdownMenuItem>
               <DropdownMenuItem 
                 onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
                 className="text-destructive"
               >
                 Delete Lead
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
 
         {/* Contact info */}
         <div className="space-y-1 text-xs text-muted-foreground">
           {lead.email && (
             <div className="flex items-center gap-1.5 truncate">
               <Mail className="h-3 w-3 flex-shrink-0" />
               <span className="truncate">{lead.email}</span>
             </div>
           )}
           {lead.company && (
             <div className="flex items-center gap-1.5 truncate">
               <Building2 className="h-3 w-3 flex-shrink-0" />
               <span className="truncate">{lead.company}</span>
             </div>
           )}
         </div>
 
         {/* Footer with value and metadata */}
         <div className="flex items-center justify-between pt-1">
           <div className="flex items-center gap-2">
             {lead.estimated_value > 0 && (
               <Badge variant="secondary" className="text-xs px-1.5 py-0">
                 <DollarSign className="h-3 w-3 mr-0.5" />
                 {lead.estimated_value.toLocaleString()}
               </Badge>
             )}
             <Badge className={`text-xs px-1.5 py-0 ${sourceColors[lead.source]}`}>
               {sourceLabels[lead.source]}
             </Badge>
           </div>
           <div className="flex items-center gap-1 text-xs text-muted-foreground">
             <Clock className="h-3 w-3" />
             <span>{lastContact}</span>
           </div>
         </div>
 
         {/* Tags */}
         {lead.tags.length > 0 && (
           <div className="flex flex-wrap gap-1 pt-1">
             {lead.tags.slice(0, 3).map((tag) => (
               <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                 {tag}
               </Badge>
             ))}
             {lead.tags.length > 3 && (
               <Badge variant="outline" className="text-[10px] px-1 py-0">
                 +{lead.tags.length - 3}
               </Badge>
             )}
           </div>
         )}
       </CardContent>
     </Card>
   );
 });