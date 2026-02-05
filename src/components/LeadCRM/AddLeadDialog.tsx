 import { useState } from "react";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Loader2, UserPlus } from "lucide-react";
 import type { Lead, LeadSource } from "@/hooks/useLeadManagement";
 
 interface AddLeadDialogProps {
   open: boolean;
   onClose: () => void;
   onCreate: (data: Partial<Lead>) => Promise<Lead | null>;
 }
 
 const sourceOptions: { value: LeadSource; label: string }[] = [
   { value: "manual", label: "Manual Entry" },
   { value: "landing_page", label: "Landing Page" },
   { value: "referral", label: "Referral" },
   { value: "n8n_webhook", label: "Automation" },
 ];
 
 export function AddLeadDialog({ open, onClose, onCreate }: AddLeadDialogProps) {
   const [formData, setFormData] = useState({
     name: "",
     email: "",
     phone: "",
     company: "",
     source: "manual" as LeadSource,
     estimated_value: 0,
   });
   const [isCreating, setIsCreating] = useState(false);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!formData.name.trim()) return;
 
     setIsCreating(true);
     const result = await onCreate({
       name: formData.name.trim(),
       email: formData.email.trim() || null,
       phone: formData.phone.trim() || null,
       company: formData.company.trim() || null,
       source: formData.source,
       estimated_value: formData.estimated_value,
     });
 
     if (result) {
       setFormData({
         name: "",
         email: "",
         phone: "",
         company: "",
         source: "manual",
         estimated_value: 0,
       });
       onClose();
     }
     setIsCreating(false);
   };
 
   return (
     <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <UserPlus className="h-5 w-5" />
             Add New Lead
           </DialogTitle>
           <DialogDescription>
             Enter the contact details for your new lead.
           </DialogDescription>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="name">Name *</Label>
             <Input
               id="name"
               value={formData.name}
               onChange={(e) => setFormData({ ...formData, name: e.target.value })}
               placeholder="John Smith"
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="email">Email</Label>
             <Input
               id="email"
               type="email"
               value={formData.email}
               onChange={(e) => setFormData({ ...formData, email: e.target.value })}
               placeholder="john@example.com"
             />
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="phone">Phone</Label>
               <Input
                 id="phone"
                 value={formData.phone}
                 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                 placeholder="+1 555-0000"
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="company">Company</Label>
               <Input
                 id="company"
                 value={formData.company}
                 onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                 placeholder="Acme Inc"
               />
             </div>
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="source">Source</Label>
               <Select
                 value={formData.source}
                 onValueChange={(value) => setFormData({ ...formData, source: value as LeadSource })}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {sourceOptions.map((option) => (
                     <SelectItem key={option.value} value={option.value}>
                       {option.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="value">Est. Value ($)</Label>
               <Input
                 id="value"
                 type="number"
                 min="0"
                 value={formData.estimated_value}
                 onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                 placeholder="0"
               />
             </div>
           </div>
 
           <DialogFooter>
             <Button type="button" variant="outline" onClick={onClose}>
               Cancel
             </Button>
             <Button type="submit" disabled={isCreating || !formData.name.trim()}>
               {isCreating ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Creating...
                 </>
               ) : (
                 <>
                   <UserPlus className="h-4 w-4 mr-2" />
                   Add Lead
                 </>
               )}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 }