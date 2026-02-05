 import { useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import type { Lead, ActivityType } from "@/hooks/useLeadManagement";
 
 interface UseLeadEmailProps {
   onAddActivity: (leadId: string, type: ActivityType, content: string) => Promise<unknown>;
 }
 
 export function useLeadEmail({ onAddActivity }: UseLeadEmailProps) {
   const [isSending, setIsSending] = useState(false);
 
   const sendEmail = async (params: {
     lead: Lead;
     subject: string;
     body: string;
   }): Promise<boolean> => {
     const { lead, subject, body } = params;
 
     if (!lead.email) {
       toast.error("Lead has no email address");
       return false;
     }
 
     setIsSending(true);
 
     try {
       const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
       if (sessionError || !sessionData.session) {
         toast.error("You must be logged in to send emails");
         return false;
       }
 
       const response = await supabase.functions.invoke("send-lead-email", {
         body: {
           to: lead.email,
           subject,
           body,
           leadId: lead.id,
           leadName: lead.name,
         },
       });
 
       if (response.error) {
         console.error("Edge function error:", response.error);
         toast.error(response.error.message || "Failed to send email");
         return false;
       }
 
       if (response.data?.error) {
         console.error("Email sending error:", response.data.error);
         toast.error(response.data.error);
         return false;
       }
 
       // Log the email activity
       await onAddActivity(lead.id, "email_sent", `Email sent: "${subject}"`);
 
       toast.success(`Email sent to ${lead.name}`);
       return true;
     } catch (error) {
       console.error("Error sending email:", error);
       toast.error("Failed to send email. Please try again.");
       return false;
     } finally {
       setIsSending(false);
     }
   };
 
   return { sendEmail, isSending };
 }