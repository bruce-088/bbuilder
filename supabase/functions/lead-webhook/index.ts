 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // Parse the incoming webhook payload
     const payload = await req.json();
 
     // Validate required fields
     const { user_id, name, email, phone, company, estimated_value, tags, custom_fields } = payload;
 
     if (!user_id) {
       return new Response(
         JSON.stringify({ error: "user_id is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     if (!name) {
       return new Response(
         JSON.stringify({ error: "name is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Create the lead
     const { data: lead, error: leadError } = await supabase
       .from("lead_contacts")
       .insert({
         user_id,
         name,
         email: email || null,
         phone: phone || null,
         company: company || null,
         stage: "captured",
         source: "n8n_webhook",
         estimated_value: estimated_value || 0,
         tags: tags || [],
         custom_fields: custom_fields || {},
       })
       .select()
       .single();
 
     if (leadError) {
       console.error("Error creating lead:", leadError);
       return new Response(
         JSON.stringify({ error: "Failed to create lead", details: leadError.message }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Create initial activity log
     const { error: activityError } = await supabase
       .from("lead_activities")
       .insert({
         user_id,
         lead_id: lead.id,
         activity_type: "webhook_event",
         content: "Lead captured via n8n automation",
         metadata: { source: "n8n_webhook", payload_keys: Object.keys(payload) },
       });
 
     if (activityError) {
       console.error("Error creating activity:", activityError);
       // Don't fail the request, lead was created successfully
     }
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         lead_id: lead.id,
         message: "Lead created successfully" 
       }),
       { 
         status: 201, 
         headers: { ...corsHeaders, "Content-Type": "application/json" } 
       }
     );
   } catch (error) {
     console.error("Webhook error:", error);
     return new Response(
       JSON.stringify({ error: "Internal server error", details: String(error) }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });