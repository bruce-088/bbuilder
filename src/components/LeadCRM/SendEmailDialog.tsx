 import { useState, useEffect } from "react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Badge } from "@/components/ui/badge";
 import { Send, Mail, FileText, Eye, AlertCircle } from "lucide-react";
 import type { Lead } from "@/hooks/useLeadManagement";
 
 interface SendEmailDialogProps {
   lead: Lead;
   open: boolean;
   onClose: () => void;
   onSend: (subject: string, body: string) => Promise<boolean>;
   isSending: boolean;
 }
 
 interface EmailTemplate {
   id: string;
   name: string;
   subject: string;
   body: string;
 }
 
 const EMAIL_TEMPLATES: EmailTemplate[] = [
   {
     id: "initial-outreach",
     name: "Initial Outreach",
     subject: "Quick question about {{company}}",
     body: `Hi {{name}},
 
 I came across {{company}} and wanted to reach out. I think there might be some great opportunities for us to work together.
 
 Would you be open to a brief conversation to explore this further?
 
 Best regards`,
   },
   {
     id: "follow-up",
     name: "Follow-up Check-in",
     subject: "Following up on our conversation",
     body: `Hi {{name}},
 
 I wanted to check in and see if you had any questions about what we discussed.
 
 I'm happy to provide more information or schedule a follow-up call at your convenience.
 
 Looking forward to hearing from you!`,
   },
   {
     id: "meeting-request",
     name: "Meeting Request",
     subject: "Quick call this week?",
     body: `Hi {{name}},
 
 I'd love to schedule a brief call to discuss how we might be able to help {{company}}.
 
 Would you have 15-20 minutes available this week? I'm flexible on timing.
 
 Let me know what works best for you.`,
   },
   {
     id: "thank-you",
     name: "Thank You",
     subject: "Thank you, {{name}}!",
     body: `Hi {{name}},
 
 I just wanted to send a quick note to thank you for taking the time to speak with me.
 
 I really enjoyed our conversation and look forward to the possibility of working together.
 
 Best regards`,
   },
 ];
 
 function replacePlaceholders(text: string, lead: Lead): string {
   return text
     .replace(/\{\{name\}\}/g, lead.name || "there")
     .replace(/\{\{company\}\}/g, lead.company || "your company");
 }
 
 export function SendEmailDialog({
   lead,
   open,
   onClose,
   onSend,
   isSending,
 }: SendEmailDialogProps) {
   const [subject, setSubject] = useState("");
   const [body, setBody] = useState("");
   const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");
 
   const hasEmail = Boolean(lead.email);
   const subjectLength = subject.length;
   const bodyLength = body.length;
   const isValid = hasEmail && subject.trim().length > 0 && body.trim().length > 0;
 
   useEffect(() => {
     if (open) {
       setSubject("");
       setBody("");
       setActiveTab("compose");
     }
   }, [open]);
 
   const handleApplyTemplate = (template: EmailTemplate) => {
     setSubject(replacePlaceholders(template.subject, lead));
     setBody(replacePlaceholders(template.body, lead));
   };
 
   const handleSend = async () => {
     if (!isValid) return;
     const success = await onSend(subject.trim(), body.trim());
     if (success) {
       onClose();
     }
   };
 
   const previewHtml = body
     .split("\n")
     .map((line) => (line ? `<p>${line}</p>` : "<p>&nbsp;</p>"))
     .join("");
 
   return (
     <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
       <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Mail className="h-5 w-5 text-primary" />
             Send Email to {lead.name}
           </DialogTitle>
         </DialogHeader>
 
         {!hasEmail && (
           <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
             <AlertCircle className="h-4 w-4" />
             <span className="text-sm">
               This lead doesn't have an email address. Add one in the Details tab first.
             </span>
           </div>
         )}
 
         {hasEmail && (
           <>
             {/* Template buttons */}
             <div className="space-y-2">
               <Label className="text-xs text-muted-foreground">Quick Templates</Label>
               <div className="flex flex-wrap gap-2">
                 {EMAIL_TEMPLATES.map((template) => (
                   <Button
                     key={template.id}
                     variant="outline"
                     size="sm"
                     onClick={() => handleApplyTemplate(template)}
                     className="text-xs"
                   >
                     <FileText className="h-3 w-3 mr-1" />
                     {template.name}
                   </Button>
                 ))}
               </div>
             </div>
 
             <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "compose" | "preview")}>
               <TabsList className="w-full grid grid-cols-2">
                 <TabsTrigger value="compose">Compose</TabsTrigger>
                 <TabsTrigger value="preview">
                   <Eye className="h-4 w-4 mr-1" />
                   Preview
                 </TabsTrigger>
               </TabsList>
 
               <TabsContent value="compose" className="space-y-4 mt-4">
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <Label>To</Label>
                   </div>
                   <Input value={lead.email || ""} disabled className="bg-muted" />
                 </div>
 
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <Label>Subject</Label>
                     <Badge variant={subjectLength > 100 ? "destructive" : "secondary"} className="text-xs">
                       {subjectLength}/100
                     </Badge>
                   </div>
                   <Input
                     value={subject}
                     onChange={(e) => setSubject(e.target.value.slice(0, 100))}
                     placeholder="Email subject..."
                     maxLength={100}
                   />
                 </div>
 
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <Label>Message</Label>
                     <Badge variant={bodyLength > 5000 ? "destructive" : "secondary"} className="text-xs">
                       {bodyLength}/5000
                     </Badge>
                   </div>
                   <Textarea
                     value={body}
                     onChange={(e) => setBody(e.target.value.slice(0, 5000))}
                     placeholder="Write your email message..."
                     rows={10}
                     maxLength={5000}
                     className="resize-none"
                   />
                 </div>
               </TabsContent>
 
               <TabsContent value="preview" className="mt-4">
                 <div className="border rounded-md p-4 bg-card">
                   <div className="border-b pb-2 mb-4">
                     <p className="text-sm text-muted-foreground">
                       <strong>To:</strong> {lead.email}
                     </p>
                     <p className="text-sm text-muted-foreground">
                       <strong>Subject:</strong> {subject || "(No subject)"}
                     </p>
                   </div>
                   <div
                     className="prose prose-sm dark:prose-invert max-w-none"
                     dangerouslySetInnerHTML={{ __html: previewHtml || "<p class='text-muted-foreground'>(No content)</p>" }}
                   />
                 </div>
               </TabsContent>
             </Tabs>
           </>
         )}
 
         <DialogFooter>
           <Button variant="outline" onClick={onClose} disabled={isSending}>
             Cancel
           </Button>
           <Button
             onClick={handleSend}
             disabled={!isValid || isSending}
             className="bg-primary hover:bg-primary/90 text-primary-foreground"
           >
             <Send className="h-4 w-4 mr-2" />
             {isSending ? "Sending..." : "Send Email"}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }