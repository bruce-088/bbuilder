
# Connect n8n Workflow to Lead Webhook

## Overview

This plan adds a dedicated UI component and workflow template to help users connect their existing n8n workflows (like the "GhostWriter AI: Lead Prospecting & Discovery Engine") to automatically push captured leads into the Mya CRM via the `lead-webhook` edge function.

## Current State

**Available Infrastructure:**
- `lead-webhook` edge function already exists and accepts:
  - `user_id` (required)
  - `name` (required)
  - `email`, `phone`, `company`, `estimated_value`, `tags`, `custom_fields` (optional)
- The endpoint is: `https://vxceyvrsxslxdvnttxxp.supabase.co/functions/v1/lead-webhook`
- User's n8n instance has "GhostWriter AI: Lead Prospecting & Discovery Engine" workflow (Apollo/Hunter prospecting)
- Template library exists for deploying n8n workflows

**Gap:** No guided connection between n8n workflows and the webhook endpoint.

## Implementation Plan

### 1. Create N8N HTTP Request Node Template

Create a ready-to-copy n8n HTTP Request node configuration that users can add to their workflows:

```json
{
  "name": "Push to Mya CRM",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "{{WEBHOOK_URL}}",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Content-Type", "value": "application/json" }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        { "name": "user_id", "value": "={{$json.user_id}}" },
        { "name": "name", "value": "={{$json.name}}" },
        { "name": "email", "value": "={{$json.email}}" },
        { "name": "company", "value": "={{$json.company}}" },
        { "name": "estimated_value", "value": "={{$json.estimated_value}}" }
      ]
    }
  }
}
```

### 2. Create WebhookSetupPanel Component

**File:** `src/components/LeadCRM/WebhookSetupPanel.tsx`

A panel in the Leads page that helps users:
- View their unique webhook URL with user_id pre-filled
- Copy n8n node configuration JSON
- Test the connection with sample data
- See real-time connection status

**Key features:**
- Auto-generates webhook URL with authenticated user_id
- Copy buttons for webhook URL and full n8n node JSON
- "Test Connection" button to verify endpoint works
- Quick setup guide with step-by-step instructions
- Connection status indicator showing last successful webhook

### 3. Add Webhook Setup Tab to Leads Page

**File:** `src/pages/Leads.tsx`

Add a "Webhook Setup" tab alongside the pipeline view:
- Shows WebhookSetupPanel
- Displays recent webhook events from activity log
- Link to Template Library for ready-made workflows

### 4. Create Lead Capture Workflow Template

**File:** `src/lib/workflowTemplates/templates.ts`

Add a new template specifically for LinkedIn/Apollo lead capture:

```typescript
{
  id: 'lead-capture-to-crm',
  name: 'LinkedIn Lead Capture to Mya CRM',
  description: 'Automatically capture leads from LinkedIn/Apollo and push them to your Mya CRM pipeline.',
  industry: 'agency',
  automationCategory: 'lead-generation',
  complexity: 'beginner',
  estimatedSetupTime: '10 min',
  requiredCredentials: ['Apollo or LinkedIn Sales Navigator'],
  tags: ['linkedin', 'apollo', 'crm', 'lead capture'],
  featured: true,
  nodes: [
    // Schedule Trigger
    // Apollo/LinkedIn Search
    // Filter/Score
    // Push to Mya CRM (HTTP Request to lead-webhook)
  ]
}
```

### 5. Add Integration with Existing Workflows

Create a helper function that generates the correct HTTP Request node configuration based on the user's existing workflow output format:

**File:** `src/lib/leadWebhookIntegration.ts`

```typescript
export function generateWebhookNodeConfig(userId: string, fieldMappings: Record<string, string>) {
  // Returns n8n-compatible node configuration
  // with dynamic field mappings based on source data structure
}

export function generateMcpDeployPrompt(userId: string) {
  // Returns a prompt users can paste to have the agent
  // add the webhook node to their existing workflow
}
```

## UI Design

```text
┌─────────────────────────────────────────────────────────────────┐
│ Leads                                                [+ Add Lead]│
├─────────────────────────────────────────────────────────────────┤
│  [Pipeline] [Webhook Setup]                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  🔗 Webhook Integration                                     ││
│  │                                                             ││
│  │  Your webhook URL:                                          ││
│  │  ┌───────────────────────────────────────────────┐ [Copy]   ││
│  │  │ https://...functions/v1/lead-webhook          │          ││
│  │  └───────────────────────────────────────────────┘          ││
│  │                                                             ││
│  │  [Copy n8n Node Config]  [Test Connection]                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  📋 Quick Setup Guide                                       ││
│  │                                                             ││
│  │  1. Open your n8n workflow (e.g., Lead Prospecting Engine)  ││
│  │  2. Add a new HTTP Request node after your lead scoring     ││
│  │  3. Paste the webhook URL and map your fields               ││
│  │  4. Test with sample data                                   ││
│  │                                                             ││
│  │  [View Template Library] [Copy Agent Prompt]                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Recent Webhook Events                                      ││
│  │  ─────────────────────────────────────────────────          ││
│  │  ✓ John Doe (Webhook Test) - 20 min ago                     ││
│  │  ✓ Lead via Apollo - 2 hours ago                            ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/LeadCRM/WebhookSetupPanel.tsx` | Create | Main webhook setup UI component |
| `src/lib/leadWebhookIntegration.ts` | Create | Helper functions for generating n8n configs |
| `src/pages/Leads.tsx` | Modify | Add Webhook Setup tab |
| `src/components/LeadCRM/index.ts` | Modify | Export WebhookSetupPanel |
| `src/lib/workflowTemplates/templates.ts` | Modify | Add LinkedIn Lead Capture template |

## Technical Details

### Webhook URL Construction
```typescript
const webhookUrl = `https://vxceyvrsxslxdvnttxxp.supabase.co/functions/v1/lead-webhook`;
```

### Required Payload Structure
```json
{
  "user_id": "uuid-from-auth",
  "name": "John Doe",
  "email": "john@company.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "estimated_value": 15000,
  "tags": ["linkedin", "apollo"],
  "custom_fields": {
    "linkedin_url": "https://linkedin.com/in/johndoe",
    "lead_score": 85
  }
}
```

### Field Mapping for GhostWriter Workflow
Based on the existing Lead Prospecting Engine output:
- `$json.first_name + " " + $json.last_name` -> `name`
- `$json.email` -> `email`
- `$json.organization_name` -> `company`
- `$json.lead_score * 1000` -> `estimated_value`
- `$json.linkedin_url` -> `custom_fields.linkedin_url`

## Implementation Sequence

1. Create `leadWebhookIntegration.ts` with helper functions
2. Create `WebhookSetupPanel.tsx` component
3. Add webhook tab to `Leads.tsx` page
4. Update exports in `index.ts`
5. Add LinkedIn Lead Capture template to template library
6. Test end-to-end: copy config -> add to n8n -> trigger -> verify lead appears
