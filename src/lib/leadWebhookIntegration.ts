 /**
  * Lead Webhook Integration Helpers
  * Generates n8n-compatible configurations for connecting workflows to the Mya CRM
  */
 
 const WEBHOOK_BASE_URL = "https://vxceyvrsxslxdvnttxxp.supabase.co/functions/v1/lead-webhook";
 
 export interface FieldMapping {
   name: string;
   email?: string;
   phone?: string;
   company?: string;
   estimated_value?: string;
   tags?: string;
   linkedin_url?: string;
 }
 
 /**
  * Default field mappings for common n8n workflow outputs
  */
 export const DEFAULT_FIELD_MAPPINGS: Record<string, FieldMapping> = {
   apollo: {
     name: '={{$json.first_name}} {{$json.last_name}}',
     email: '={{$json.email}}',
     company: '={{$json.organization_name}}',
     estimated_value: '={{$json.lead_score * 1000}}',
     linkedin_url: '={{$json.linkedin_url}}',
   },
   linkedin: {
     name: '={{$json.fullName}}',
     email: '={{$json.emailAddress}}',
     company: '={{$json.company.name}}',
     linkedin_url: '={{$json.profileUrl}}',
   },
   hunter: {
     name: '={{$json.first_name}} {{$json.last_name}}',
     email: '={{$json.email}}',
     company: '={{$json.company}}',
   },
   generic: {
     name: '={{$json.name}}',
     email: '={{$json.email}}',
     company: '={{$json.company}}',
     phone: '={{$json.phone}}',
     estimated_value: '={{$json.value}}',
   },
 };
 
 /**
  * Generates the n8n HTTP Request node configuration for pushing leads to Mya CRM
  */
 export function generateWebhookNodeConfig(
   userId: string,
   fieldMappings: FieldMapping = DEFAULT_FIELD_MAPPINGS.generic
 ): object {
   const bodyParameters: { name: string; value: string }[] = [
     { name: 'user_id', value: userId },
     { name: 'name', value: fieldMappings.name },
   ];
 
   if (fieldMappings.email) {
     bodyParameters.push({ name: 'email', value: fieldMappings.email });
   }
   if (fieldMappings.phone) {
     bodyParameters.push({ name: 'phone', value: fieldMappings.phone });
   }
   if (fieldMappings.company) {
     bodyParameters.push({ name: 'company', value: fieldMappings.company });
   }
   if (fieldMappings.estimated_value) {
     bodyParameters.push({ name: 'estimated_value', value: fieldMappings.estimated_value });
   }
 
   return {
     name: 'Push to Mya CRM',
     type: 'n8n-nodes-base.httpRequest',
     typeVersion: 4.2,
     position: [1250, 300],
     parameters: {
       method: 'POST',
       url: WEBHOOK_BASE_URL,
       sendHeaders: true,
       headerParameters: {
         parameters: [
           { name: 'Content-Type', value: 'application/json' },
         ],
       },
       sendBody: true,
       specifyBody: 'json',
       bodyParameters: {
         parameters: bodyParameters,
       },
     },
   };
 }
 
 /**
  * Generates a complete n8n workflow JSON snippet that can be imported
  */
 export function generateWebhookNodeJSON(
   userId: string,
   source: 'apollo' | 'linkedin' | 'hunter' | 'generic' = 'generic'
 ): string {
   const mapping = DEFAULT_FIELD_MAPPINGS[source] || DEFAULT_FIELD_MAPPINGS.generic;
   const nodeConfig = generateWebhookNodeConfig(userId, mapping);
   return JSON.stringify(nodeConfig, null, 2);
 }
 
 /**
  * Generates a prompt for the AI agent to add the webhook node to an existing workflow
  */
 export function generateMcpDeployPrompt(userId: string, workflowName?: string): string {
   const targetWorkflow = workflowName || 'Lead Prospecting Engine';
   
   return `Add an HTTP Request node to my "${targetWorkflow}" workflow in n8n that pushes captured leads to my Mya CRM.
 
 The node should:
 1. Use POST method to: ${WEBHOOK_BASE_URL}
 2. Send JSON body with these fields:
    - user_id: "${userId}" (hardcoded)
    - name: Combine first_name + last_name from the previous node
    - email: Map from the email field
    - company: Map from organization_name or company field
    - estimated_value: Calculate from lead_score * 1000
 3. Set Content-Type header to application/json
 4. Connect it after the lead scoring/filtering node
 5. Name the node "Push to Mya CRM"
 
 Please add this node and activate the workflow.`;
 }
 
 /**
  * Returns the webhook URL (useful for display)
  */
 export function getWebhookUrl(): string {
   return WEBHOOK_BASE_URL;
 }
 
 /**
  * Generates a test payload for verifying the webhook connection
  */
 export function generateTestPayload(userId: string): object {
   return {
     user_id: userId,
     name: 'Test Lead',
     email: 'test@example.com',
     company: 'Test Company',
     phone: '+1234567890',
     estimated_value: 5000,
     tags: ['webhook-test'],
     custom_fields: {
       source: 'webhook_test',
       timestamp: new Date().toISOString(),
     },
   };
 }