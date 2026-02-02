
# Priority 5: MCP Direct Deployment

## Overview
Enable users to deploy workflows directly to their n8n instance via the connected n8n MCP connector, bypassing manual JSON imports entirely.

## Current State Analysis

### Existing Infrastructure
- **n8n MCP Connector**: Already connected and functional with `search_workflows`, `get_workflow_details`, and `execute_workflow` tools
- **DeploymentPanel**: Currently offers Copy JSON, Download All, and Open n8n as export options
- **useN8nMcpConnection hook**: Manages connection state, caches workflows, provides deep links
- **n8nWorkflowFormatter**: Transforms generated workflows into n8n-compatible JSON format
- **N8nConnectionStatus**: Displays connection state and allows URL configuration

### Technical Challenge
The n8n MCP tools are available to the **Lovable agent** during build time, not to runtime JavaScript code. This means:
- We **cannot** call MCP tools directly from React components
- We need a **bridge mechanism** to invoke MCP deployment

## Solution Architecture

### Approach: Agent-Assisted Deployment via Edge Function
Since MCP tools are agent-only, we'll create a hybrid approach:

1. **User clicks "Deploy to n8n"** in the DeploymentPanel
2. **Edge function `n8n-mcp-deploy`** receives the workflow JSON
3. **Edge function stores deployment request** in `n8n_deployment_requests` table
4. **Agent (Lovable)** periodically checks for pending deployments and uses MCP to execute
5. **Alternatively**: Provide a "Copy for Agent" button that prompts the user to ask the agent to deploy

### Simplified Immediate Solution
For now, we'll implement a **"Deploy via Agent" flow**:
- Add a "Deploy to n8n" button that shows deployment instructions
- When clicked, it saves the workflow to `n8n_workflow_snapshots` with `source: 'pending_deploy'`
- Shows a dialog explaining the user should ask the agent: "Deploy my generated workflow to n8n"
- The agent (me) will then use the MCP connector to create/update the workflow

## Implementation Plan

### 1. Database: Deployment Tracking Table
Create a new table to track deployment requests and status.

```sql
CREATE TABLE public.n8n_deployment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_idea_id UUID REFERENCES public.business_ideas(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  workflow_json JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'success', 'failed', 'cancelled')),
  n8n_workflow_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deployed_at TIMESTAMPTZ
);

-- RLS policies
ALTER TABLE public.n8n_deployment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deployment requests" 
  ON public.n8n_deployment_requests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create deployment requests" 
  ON public.n8n_deployment_requests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deployment requests" 
  ON public.n8n_deployment_requests FOR UPDATE 
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_deployment_requests_updated_at
  BEFORE UPDATE ON public.n8n_deployment_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. New Hook: useN8nDeployment
Manages deployment request creation and status polling.

```typescript
// src/hooks/useN8nDeployment.ts
interface DeploymentRequest {
  id: string;
  workflowName: string;
  status: 'pending' | 'deploying' | 'success' | 'failed' | 'cancelled';
  n8nWorkflowId?: string;
  errorMessage?: string;
  createdAt: string;
  deployedAt?: string;
}

export function useN8nDeployment() {
  // State for pending deployments
  // Function to create deployment request
  // Realtime subscription for status updates
  // Cancel deployment function
}
```

### 3. New Component: MCPDeploymentModal
Dialog for initiating and tracking MCP deployments.

```typescript
// src/components/AutomationEngine/MCPDeploymentModal.tsx

Features:
- Shows workflow preview (node count, stages)
- "Request Deployment" button → creates request in database
- Status tracking with realtime updates
- Conflict detection (existing workflow with same name)
- Options: Create New / Overwrite Existing / Cancel
- Success state with deep link to n8n workflow
- Error state with retry option
```

### 4. Updated DeploymentPanel
Add "Deploy to n8n" button alongside existing export options.

```typescript
// Changes to DeploymentPanel.tsx

- Add MCPDeploymentModal component
- New button: "Deploy to n8n" (primary action when MCP connected)
- Detect if n8n MCP is connected (check for cached workflows)
- Show deployment status badge when request is pending
- Disable deploy button if workflow is invalid
```

### 5. Agent-Side Deployment Handler
When the agent sees a pending deployment request, it will:

1. Fetch the deployment request from the database
2. Check for existing workflow with same name using `search_workflows`
3. Handle conflicts (create with suffix or prompt user)
4. Use the n8n API via the MCP connector to deploy
5. Update deployment request status to success/failed
6. Store the returned n8n workflow ID

## UI/UX Flow

```text
User Flow:
┌─────────────────────────────────────────────────────────────┐
│  Deploy Workflows                                           │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Copy JSON] [Download All] [By Stage ▼]  [Deploy to n8n →] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Deploy to n8n                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Workflow: "Acme Corp - Complete Automation"                │
│  Nodes: 24 across 6 stages                                  │
│                                                             │
│  ⚠ Existing workflow detected: "Acme Corp Sales"           │
│                                                             │
│  ○ Create as new workflow                                   │
│  ○ Overwrite existing workflow                              │
│                                                             │
│                              [Cancel]  [Request Deployment] │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Deployment Requested                                       │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🔵 Pending deployment...                                   │
│                                                             │
│  The Lovable agent will deploy this workflow to your        │
│  n8n instance. This typically takes a few moments.          │
│                                                             │
│  [Cancel Request]                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Agent deploys via MCP)
┌─────────────────────────────────────────────────────────────┐
│  Deployment Complete! ✓                                     │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Your workflow has been deployed to n8n.                    │
│                                                             │
│  Workflow ID: XopMVn0J7Ear4cZO                              │
│  Status: Active                                             │
│                                                             │
│  Next steps:                                                │
│  1. Configure credentials in n8n                            │
│  2. Test the workflow with sample data                      │
│  3. Activate for production use                             │
│                                                             │
│                              [Open in n8n →]  [Close]       │
└─────────────────────────────────────────────────────────────┘
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `migrations/xxx_n8n_deployment_requests.sql` | Create | Deployment tracking table |
| `src/hooks/useN8nDeployment.ts` | Create | Deployment request management hook |
| `src/components/AutomationEngine/MCPDeploymentModal.tsx` | Create | Deployment dialog component |
| `src/components/AutomationEngine/DeploymentPanel.tsx` | Modify | Add Deploy to n8n button |
| `src/hooks/useN8nMcpConnection.ts` | Modify | Add helper to check MCP availability |
| `src/integrations/supabase/types.ts` | Auto-update | Types for new table |

## Conflict Resolution Strategy

When deploying, check for existing workflows:
1. **No conflict**: Deploy directly
2. **Same name exists**: 
   - Show conflict dialog with options
   - "Create New" → append timestamp to name
   - "Overwrite" → update existing workflow
   - "Cancel" → abort deployment

## Security Considerations

- All deployment requests are scoped to authenticated users via RLS
- Workflow JSON is validated before storage
- Only the owning user can view/update their deployment requests
- MCP operations are executed by the trusted Lovable agent

## Success Metrics

- Deployment request created and stored successfully
- Status updates in realtime via Supabase
- Agent can retrieve and process pending deployments
- Successful deployments link to n8n workflow
- Failed deployments show clear error messages

## Implementation Order

1. Create database migration for `n8n_deployment_requests` table
2. Create `useN8nDeployment` hook
3. Create `MCPDeploymentModal` component
4. Update `DeploymentPanel` with deploy button
5. Test end-to-end flow with agent deployment
