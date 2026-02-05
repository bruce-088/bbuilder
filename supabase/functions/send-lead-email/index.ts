 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
 
 const RESEND_API_URL = "https://api.resend.com/emails";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface SendEmailRequest {
   to: string;
   subject: string;
   body: string;
   leadId: string;
   leadName: string;
   fromName?: string;
 }
 
 const handler = async (req: Request): Promise<Response> => {
   // Handle CORS preflight requests
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     // Verify JWT authentication
     const authHeader = req.headers.get("Authorization");
     if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
    const token = authHeader.replace("Bearer ", "");

     const supabase = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
     );
 
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
     if (userError || !userData?.user) {
      console.error("User verification failed:", userError?.message);
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     const userId = userData.user.id;
 
     // Parse and validate request body
     const requestBody: SendEmailRequest = await req.json();
     const { to, subject, body, leadId, leadName, fromName } = requestBody;
 
     // Validate required fields
     if (!to || !subject || !body || !leadId || !leadName) {
       return new Response(
         JSON.stringify({ error: "Missing required fields: to, subject, body, leadId, leadName" }),
         { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     // Validate email format
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     if (!emailRegex.test(to)) {
       return new Response(
         JSON.stringify({ error: "Invalid email address format" }),
         { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     // Validate field lengths
     if (subject.length > 100) {
       return new Response(
         JSON.stringify({ error: "Subject must be 100 characters or less" }),
         { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     if (body.length > 5000) {
       return new Response(
         JSON.stringify({ error: "Body must be 5000 characters or less" }),
         { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     // Verify lead ownership
     const { data: lead, error: leadError } = await supabase
       .from("lead_contacts")
       .select("id, user_id")
       .eq("id", leadId)
       .eq("user_id", userId)
       .maybeSingle();
 
     if (leadError || !lead) {
       return new Response(
         JSON.stringify({ error: "Lead not found or access denied" }),
         { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     // Get Resend API key
     const resendApiKey = Deno.env.get("RESEND_API_KEY");
     if (!resendApiKey) {
       console.error("RESEND_API_KEY not configured");
       return new Response(
        JSON.stringify({ error: "Email service not configured. Please add RESEND_API_KEY to your secrets." }),
         { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     // Send email via Resend API
     // Convert plain text body to HTML with proper line breaks
     const htmlBody = body
       .split("\n")
       .map((line: string) => `<p>${line || "&nbsp;"}</p>`)
       .join("");
 
     const senderName = fromName || "Business Builder";
     
     const emailPayload = {
       from: `${senderName} <onboarding@resend.dev>`,
       to: [to],
       subject: subject,
       html: htmlBody,
     };
 
     const emailResponse = await fetch(RESEND_API_URL, {
       method: "POST",
       headers: {
         "Authorization": `Bearer ${resendApiKey}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify(emailPayload),
     });
 
     const responseData = await emailResponse.json();
 
     if (!emailResponse.ok) {
       console.error("Resend error:", responseData);
       return new Response(
         JSON.stringify({ error: `Failed to send email: ${responseData.message || "Unknown error"}` }),
         { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
       );
     }
 
     console.log("Email sent successfully:", responseData.id);
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         messageId: responseData.id,
         message: `Email sent to ${leadName}` 
       }),
       { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
     );
   } catch (error: unknown) {
     console.error("Error in send-lead-email function:", error);
     const errorMessage = error instanceof Error ? error.message : "Unknown error";
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
     );
   }
 };
 
 serve(handler);