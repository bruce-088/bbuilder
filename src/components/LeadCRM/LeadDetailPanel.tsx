 import { useState } from "react";
 import { SendEmailDialog } from "./SendEmailDialog";
 import { useLeadEmail } from "@/hooks/useLeadEmail";
 import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { 
   Mail, 
   Phone, 
   Building2, 
   DollarSign,
   MessageSquare,
   Trophy,
   XCircle,
   Save,
   Trash2,
   Send
 } from "lucide-react";
 import { LeadActivityTimeline } from "./LeadActivityTimeline";
 import type { Lead, LeadStage, LeadActivity, ActivityType } from "@/hooks/useLeadManagement";
 
 interface LeadDetailPanelProps {
   lead: Lead | null;
   activities: LeadActivity[];
   open: boolean;
   onClose: () => void;
   onUpdate: (id: string, updates: Partial<Lead>) => Promise<boolean>;
   onStageChange: (id: string, stage: LeadStage) => Promise<boolean>;
   onDelete: (id: string) => Promise<boolean>;
   onAddActivity: (leadId: string, type: ActivityType, content: string) => Promise<unknown>;
   onFetchActivities: (leadId: string) => void;
 }
 
const stageOptions: { value: LeadStage; label: string }[] = [
   { value: "captured", label: "Captured" },
   { value: "qualified", label: "Qualified" },
   { value: "outreach", label: "Outreach" },
   { value: "nurturing", label: "Nurturing" },
   { value: "won", label: "Won" },
   { value: "lost", label: "Lost" },
 ];
 
 export function LeadDetailPanel({
   lead,
   activities,
   open,
   onClose,
   onUpdate,
   onStageChange,
   onDelete,
   onAddActivity,
   onFetchActivities,
 }: LeadDetailPanelProps) {
   const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
   const [noteContent, setNoteContent] = useState("");
   const [isSaving, setIsSaving] = useState(false);
   const [emailDialogOpen, setEmailDialogOpen] = useState(false);
 
   const { sendEmail, isSending: isEmailSending } = useLeadEmail({
     onAddActivity: onAddActivity,
   });
 
   if (!lead) return null;
 
   const currentLead = { ...lead, ...editedLead };
 
   const handleSave = async () => {
     if (Object.keys(editedLead).length === 0) return;
     setIsSaving(true);
     const success = await onUpdate(lead.id, editedLead);
     if (success) {
       setEditedLead({});
     }
     setIsSaving(false);
   };
 
   const handleAddNote = async () => {
     if (!noteContent.trim()) return;
     await onAddActivity(lead.id, "note", noteContent.trim());
     setNoteContent("");
   };
 
   const handleSendEmail = async (subject: string, body: string): Promise<boolean> => {
     return sendEmail({ lead, subject, body });
   };
 
   const handleDelete = async () => {
     const success = await onDelete(lead.id);
     if (success) {
       onClose();
     }
   };
 
   return (
     <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
       <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
         <SheetHeader className="pb-4">
           <SheetTitle className="text-xl">{currentLead.name}</SheetTitle>
         </SheetHeader>
 
         <Tabs defaultValue="details" className="w-full">
           <TabsList className="w-full grid grid-cols-2">
             <TabsTrigger value="details">Details</TabsTrigger>
             <TabsTrigger value="activity">Activity</TabsTrigger>
           </TabsList>
 
           <TabsContent value="details" className="space-y-4 mt-4">
             {/* Stage selector */}
             <div className="space-y-2">
               <Label>Stage</Label>
               <Select
                 value={currentLead.stage}
                 onValueChange={(value) => onStageChange(lead.id, value as LeadStage)}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {stageOptions.map((option) => (
                     <SelectItem key={option.value} value={option.value}>
                       {option.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
 
             {/* Contact info */}
             <div className="grid gap-4">
               <div className="space-y-2">
                 <Label className="flex items-center gap-2">
                   <Mail className="h-4 w-4" /> Email
                 </Label>
                 <Input
                   value={currentLead.email || ""}
                   onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                   placeholder="email@example.com"
                 />
               </div>
 
               <div className="space-y-2">
                 <Label className="flex items-center gap-2">
                   <Phone className="h-4 w-4" /> Phone
                 </Label>
                 <Input
                   value={currentLead.phone || ""}
                   onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                   placeholder="+1 (555) 000-0000"
                 />
               </div>
 
               <div className="space-y-2">
                 <Label className="flex items-center gap-2">
                   <Building2 className="h-4 w-4" /> Company
                 </Label>
                 <Input
                   value={currentLead.company || ""}
                   onChange={(e) => setEditedLead({ ...editedLead, company: e.target.value })}
                   placeholder="Company name"
                 />
               </div>
 
               <div className="space-y-2">
                 <Label className="flex items-center gap-2">
                   <DollarSign className="h-4 w-4" /> Estimated Value
                 </Label>
                 <Input
                   type="number"
                   value={currentLead.estimated_value || 0}
                   onChange={(e) => setEditedLead({ ...editedLead, estimated_value: parseFloat(e.target.value) || 0 })}
                   placeholder="0"
                 />
               </div>
             </div>
 
             {/* Tags */}
             <div className="space-y-2">
               <Label>Tags</Label>
               <div className="flex flex-wrap gap-1">
                 {currentLead.tags?.map((tag) => (
                   <Badge key={tag} variant="secondary" className="text-xs">
                     {tag}
                   </Badge>
                 ))}
                 {(!currentLead.tags || currentLead.tags.length === 0) && (
                   <span className="text-sm text-muted-foreground">No tags</span>
                 )}
               </div>
             </div>
 
             {/* Save button */}
             {Object.keys(editedLead).length > 0 && (
               <Button onClick={handleSave} disabled={isSaving} className="w-full">
                 <Save className="h-4 w-4 mr-2" />
                 {isSaving ? "Saving..." : "Save Changes"}
               </Button>
             )}
 
             {/* Quick actions */}
             <div className="pt-4 border-t space-y-2">
               <Label>Quick Actions</Label>
               <div className="grid grid-cols-2 gap-2">
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => onStageChange(lead.id, "won")}
                   className="text-green-400 hover:text-green-300"
                 >
                   <Trophy className="h-4 w-4 mr-2" />
                   Mark Won
                 </Button>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => onStageChange(lead.id, "lost")}
                   className="text-red-400 hover:text-red-300"
                 >
                   <XCircle className="h-4 w-4 mr-2" />
                   Mark Lost
                 </Button>
               </div>
               <Button
                 variant="destructive"
                 size="sm"
                 onClick={handleDelete}
                 className="w-full"
               >
                 <Trash2 className="h-4 w-4 mr-2" />
                 Delete Lead
               </Button>
             </div>
           </TabsContent>
 
           <TabsContent value="activity" className="space-y-4 mt-4">
               {/* Add note / Send email */}
               <div className="space-y-3">
               <Label>Add Note</Label>
               <Textarea
                 value={noteContent}
                 onChange={(e) => setNoteContent(e.target.value)}
                 placeholder="Add a note about this lead..."
                 rows={3}
               />
                 <div className="flex gap-2">
                   <Button
                     onClick={handleAddNote}
                     disabled={!noteContent.trim()}
                     size="sm"
                   >
                     <MessageSquare className="h-4 w-4 mr-2" />
                     Add Note
                   </Button>
                   <Button
                     onClick={() => setEmailDialogOpen(true)}
                     size="sm"
                     variant="outline"
                     className="border-primary text-primary hover:bg-primary/10"
                   >
                     <Send className="h-4 w-4 mr-2" />
                     Send Email
                   </Button>
                 </div>
             </div>
 
             {/* Activity timeline */}
             <div className="pt-4 border-t">
               <Label className="mb-3 block">Activity History</Label>
               <LeadActivityTimeline
                 activities={activities}
                 leadId={lead.id}
                 onFetch={onFetchActivities}
               />
             </div>
           </TabsContent>
         </Tabs>
          
          {/* Email Dialog */}
          <SendEmailDialog
            lead={lead}
            open={emailDialogOpen}
            onClose={() => setEmailDialogOpen(false)}
            onSend={handleSendEmail}
            isSending={isEmailSending}
          />
       </SheetContent>
     </Sheet>
   );
 }