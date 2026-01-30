

# Plan: Real-Time n8n Workflow Status Connection

## Overview

Add a live status connection between the app and n8n workflows, providing real-time visibility into workflow health, configuration changes, and the ability to trigger test executions directly from the Automation Engine.

---

## What We Can Monitor in Real-Time

| Status Type | Method | Capability |
|-------------|--------|------------|
| Workflow Active/Inactive | MCP polling | Check if workflows are turned on |
| Node Configuration | Diff detection | Detect when nodes are added/modified |
| Webhook Endpoints | HTTP health checks | Verify webhooks respond correctly |
| Last Modified | Timestamp tracking | Show when workflows were last edited |
| Trigger Test Runs | MCP execute | Fire test executions and verify responses |

---

## Architecture

```text
+---------------------------+     +-------------------+
|   N8nLiveStatus Panel     |     |   n8n Instance    |
|                           |     |                   |
|  [Workflow Health Cards]  | <-- |  MCP Connector    |
|  [Webhook Status Icons]   |     |  - search         |
|  [Test Execution Button]  | --> |  - get_details    |
|  [Change Detection Alert] |     |  - execute        |
+---------------------------+     +-------------------+
           |
           v
+---------------------------+
|  Real-time State Hook     |
|  - Polling interval       |
|  - Diff engine            |
|  - Health check pings     |
+---------------------------+
```

---

## Implementation Details

### 1. New Hook: `useN8nLiveStatus`

Create a polling-based hook that provides real-time workflow status:

**Features:**
- Configurable polling interval (default: 30 seconds)
- Automatic diff detection between cached and live workflow state
- Webhook endpoint health verification
- Change event callbacks

**State provided:**
```typescript
interface N8nLiveStatus {
  workflows: WorkflowStatus[];
  lastChecked: Date | null;
  isPolling: boolean;
  changes: WorkflowChange[];
  webhookHealth: Record<string, 'healthy' | 'unhealthy' | 'unknown'>;
}

interface WorkflowStatus {
  id: string;
  name: string;
  active: boolean;
  nodeCount: number;
  lastUpdated: string;
  triggers: TriggerInfo[];
  hasChangedSinceLastCheck: boolean;
}
```

### 2. New Component: `N8nLiveStatusPanel`

A real-time status dashboard that shows:

**Workflow Cards (per workflow):**
- Active/Inactive badge with toggle animation
- Node count with change indicator (e.g., "+2 nodes since last check")
- Last modified timestamp with "recently changed" highlight
- Webhook health indicators (green/red dots)

**Live Features:**
- Auto-refresh countdown timer
- Manual "Refresh Now" button
- Change notification toast when workflows are modified in n8n
- Pulse animation on active workflows

### 3. Webhook Health Checker

Create a lightweight health check system:

**Approach:**
- Extract webhook URLs from workflow trigger info
- Ping each webhook with a HEAD request (or OPTIONS for CORS)
- Display health status inline with workflow cards

**Edge function: `n8n-webhook-health`**
- Accepts array of webhook URLs
- Returns health status for each
- Respects rate limiting

### 4. Test Execution Feature

Add ability to trigger test runs directly:

**"Test Workflow" Button:**
- Uses MCP `execute_workflow` tool
- Shows execution spinner
- Displays response or error inline
- For webhook-triggered workflows, provides a "Send Test Payload" option

### 5. Change Detection & Alerts

Implement diff-based change detection:

**What gets tracked:**
- Node additions/removals
- Node parameter changes (deep diff on node configs)
- Workflow activation status changes
- Connection changes

**Alert System:**
- Toast notification: "Workflow X was modified in n8n"
- Badge count on status panel: "3 changes detected"
- Expandable change log showing what changed

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useN8nLiveStatus.ts` | Polling hook with diff detection |
| `src/components/AutomationEngine/N8nLiveStatusPanel.tsx` | Live status dashboard |
| `src/components/AutomationEngine/WorkflowHealthCard.tsx` | Individual workflow status card |
| `src/components/AutomationEngine/WebhookHealthIndicator.tsx` | Webhook status dots |
| `supabase/functions/n8n-webhook-health/index.ts` | Webhook ping edge function |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useN8nMcpConnection.ts` | Add diff utilities and change tracking |
| `src/components/AutomationEngine/index.tsx` | Integrate live status panel |
| `src/components/AutomationEngine/N8nConnectionStatus.tsx` | Add live indicator and polling controls |

---

## UI Preview

```text
┌─────────────────────────────────────────────────────────────────┐
│  n8n Live Status                               ↻ Refreshing...  │
│  Last checked: 5 seconds ago                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────┐  ┌───────────────────┐ │
│  │ 🟢 Lead Prospecting & Discovery     │  │ 🟢 Authority      │ │
│  │    Active | 10 nodes               │  │    Engine         │ │
│  │    Webhooks: 🟢 Healthy             │  │    Active | 51    │ │
│  │    Updated: 2 hours ago             │  │    nodes          │ │
│  │    [Test Run] [Open in n8n]         │  │    🟡 1 change    │ │
│  └─────────────────────────────────────┘  └───────────────────┘ │
│                                                                 │
│  📢 Change detected: "Authority Engine" - 1 node added          │
│     └─ [Stage 5] New: "Slack: Payment Alert" node               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Polling Strategy

To avoid overwhelming the MCP connector, implement smart polling:

1. **Idle State**: Poll every 60 seconds
2. **Active Monitoring**: Poll every 15 seconds when panel is visible
3. **After Automation**: Poll every 5 seconds for 2 minutes after deployment
4. **Background Tab**: Pause polling when tab is not visible
5. **Rate Limit**: Maximum 1 request per 10 seconds

---

## Test Execution Flow

```text
User clicks "Test Run" on workflow
         │
         ▼
┌─────────────────────────────────────┐
│  MCP: execute_workflow              │
│  {                                  │
│    workflowId: "UTeSzk6g6Xy6qcDb",  │
│    inputs: { type: "webhook",       │
│              webhookData: {...} }   │
│  }                                  │
└─────────────────────────────────────┘
         │
         ▼
   Show result in UI:
   - ✓ Execution started successfully
   - Response data preview
   - Link to n8n execution log
```

---

## Technical Notes

### MCP Limitation Workaround

Since MCP tools are only available to the Lovable agent (not runtime JavaScript), the real-time polling will work as follows:

1. **Agent-Initiated Polling**: When user clicks "Refresh" or the panel mounts, we request the agent to call MCP tools
2. **Cache Updates**: Results are cached in `localStorage` and displayed in the UI
3. **Supabase Realtime Bridge**: For true real-time updates, we can store workflow snapshots in the database and use Supabase Realtime to push changes to the frontend

### Alternative: Supabase Realtime Bridge

For fully automatic real-time updates without user interaction:

1. Create `n8n_workflow_status` table with Realtime enabled
2. Periodically sync MCP data to this table (via scheduled agent task or webhook)
3. Frontend subscribes to table changes and updates UI instantly

---

## Success Criteria

- Workflow status updates reflected within 30 seconds of changes in n8n
- Webhook health checks provide accurate up/down status
- Test execution triggers work for all trigger types
- Change detection correctly identifies node additions/removals
- UI provides clear visual feedback during polling

