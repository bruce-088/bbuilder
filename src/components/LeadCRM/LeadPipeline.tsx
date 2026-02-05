 import { useState } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
 import { Badge } from "@/components/ui/badge";
 import { LeadCard } from "./LeadCard";
 import type { Lead, LeadStage } from "@/hooks/useLeadManagement";
 
 interface LeadPipelineProps {
   leadsByStage: Record<LeadStage, Lead[]>;
   onSelectLead: (lead: Lead) => void;
   onStageChange: (id: string, stage: LeadStage) => void;
   onDeleteLead: (id: string) => void;
 }
 
 const stageConfig: { stage: LeadStage; label: string; color: string }[] = [
   { stage: "captured", label: "Captured", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
   { stage: "qualified", label: "Qualified", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
   { stage: "outreach", label: "Outreach", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
   { stage: "nurturing", label: "Nurturing", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
   { stage: "won", label: "Won", color: "bg-green-500/20 text-green-400 border-green-500/30" },
   { stage: "lost", label: "Lost", color: "bg-red-500/20 text-red-400 border-red-500/30" },
 ];
 
 export function LeadPipeline({ 
   leadsByStage, 
   onSelectLead, 
   onStageChange,
   onDeleteLead 
 }: LeadPipelineProps) {
   const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
   const [dropTarget, setDropTarget] = useState<LeadStage | null>(null);
 
   const handleDragStart = (lead: Lead) => {
     setDraggedLead(lead);
   };
 
   const handleDragEnd = () => {
     if (draggedLead && dropTarget && draggedLead.stage !== dropTarget) {
       onStageChange(draggedLead.id, dropTarget);
     }
     setDraggedLead(null);
     setDropTarget(null);
   };
 
   const handleDragOver = (stage: LeadStage) => {
     if (draggedLead && draggedLead.stage !== stage) {
       setDropTarget(stage);
     }
   };
 
   const handleDragLeave = () => {
     setDropTarget(null);
   };
 
   // Calculate total value per stage
   const getStageValue = (stage: LeadStage) => {
     return leadsByStage[stage].reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
   };
 
   return (
     <ScrollArea className="w-full">
       <div className="flex gap-4 p-4 min-w-max">
         {stageConfig.map(({ stage, label, color }) => {
           const leads = leadsByStage[stage];
           const totalValue = getStageValue(stage);
           const isDropTarget = dropTarget === stage;
 
           return (
             <div
               key={stage}
               className={`
                 w-72 flex-shrink-0 rounded-lg border transition-all duration-200
                 ${isDropTarget 
                   ? "border-primary bg-primary/5 scale-[1.02]" 
                   : "border-border bg-card/50"
                 }
               `}
               onDragOver={(e) => {
                 e.preventDefault();
                 handleDragOver(stage);
               }}
               onDragLeave={handleDragLeave}
               onDrop={handleDragEnd}
             >
               {/* Column Header */}
               <div className="p-3 border-b border-border/50">
                 <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center gap-2">
                     <h3 className="font-medium text-sm">{label}</h3>
                     <Badge variant="secondary" className="text-xs px-1.5 py-0">
                       {leads.length}
                     </Badge>
                   </div>
                 </div>
                 {totalValue > 0 && (
                   <p className="text-xs text-muted-foreground">
                     ${totalValue.toLocaleString()} potential
                   </p>
                 )}
               </div>
 
               {/* Lead Cards */}
               <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
                 <AnimatePresence mode="popLayout">
                   {leads.map((lead) => (
                     <motion.div
                       key={lead.id}
                       layout
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       draggable
                       onDragStart={() => handleDragStart(lead)}
                       onDragEnd={handleDragEnd}
                       className="cursor-grab active:cursor-grabbing"
                     >
                       <LeadCard
                         lead={lead}
                         onSelect={onSelectLead}
                         onStageChange={onStageChange}
                         onDelete={onDeleteLead}
                         isDragging={draggedLead?.id === lead.id}
                       />
                     </motion.div>
                   ))}
                 </AnimatePresence>
 
                 {leads.length === 0 && (
                   <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                     No leads
                   </div>
                 )}
               </div>
             </div>
           );
         })}
       </div>
       <ScrollBar orientation="horizontal" />
     </ScrollArea>
   );
 }