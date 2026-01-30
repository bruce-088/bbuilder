
# Fix: Live n8n Verification Not Finding Workflow

## Problem Diagnosis

The "Verify Against Live Workflow" button always returns "Workflow not found" even though:
- MCP is connected (green badge shows "MCP Connected")
- The workflow "GhostWriter AI: Lead Prospecting & Discovery Engine" exists in n8n
- The workflow has `availableInMCP: true` enabled

**Root Cause**: The `handleLiveVerifyStage` function passes a `workflowData` variable to the edge function, but this variable is **always null** because nothing ever populates it. The edge function at line 269 checks `if (!mcpConnected || !workflowData)` and returns "Workflow not found" when `workflowData` is null.

**Key Insight**: Edge functions cannot call MCP directly - only the Lovable agent can use MCP tools. The current architecture expects `workflowData` to be pre-fetched, but there's no code that does this.

---

## Solution: Direct MCP Verification in Frontend

Instead of passing `workflowData` through the edge function, the frontend should:
1. Use the MCP `search_workflows` tool to find the workflow by name
2. Use the MCP `get_workflow_details` tool to fetch full node data
3. Perform verification logic client-side using the fetched data

However, since the frontend cannot call MCP tools directly, we need a different approach:

**New Architecture**: Store the last successful MCP search result and use it for verification.

---

## Implementation Plan

### 1. Add Workflow Fetching Before Verification

**File:** `src/components/N8nAutomationGuideDialog.tsx`

When "Verify Against Live Workflow" is clicked, the function should first try to fetch workflow data from a stored cache (populated during "Test Connection" or "Verify Workflow Exists"):

```typescript
// Store found workflows from MCP search
const [cachedWorkflows, setCachedWorkflows] = useState<Map<string, WorkflowDetails>>(new Map());

// In handleLiveVerifyStage, use cached data
const cachedWorkflow = cachedWorkflows.get(stageWorkflowName);
if (cachedWorkflow) {
  // Pass cached workflow data to edge function
  body: { workflowData: cachedWorkflow, ... }
}
```

### 2. Populate Cache During Connection Test

**File:** `src/components/N8nAutomationGuideDialog.tsx`

When the "Test Connection" button successfully finds workflows, store them:

```typescript
// After successful MCP search in handleTestConnection
const foundWorkflows = searchResults.data;
const workflowMap = new Map();
foundWorkflows.forEach(wf => workflowMap.set(wf.name, wf));
setCachedWorkflows(workflowMap);
```

### 3. Update Edge Function Fallback Behavior

**File:** `supabase/functions/verify-n8n-workflow/index.ts`

When `workflowData` is null but `mcpConnected` is true, provide clearer guidance:

```typescript
if (!mcpConnected || !workflowData) {
  return new Response(
    JSON.stringify({
      status: "MCP_NOT_CONNECTED",
      summary: mcpConnected 
        ? `Workflow data not cached. Click "Verify Workflow Exists" in Stage 0 first to load '${workflowNamePattern}' into memory.`
        : "Connect n8n MCP to enable live verification.",
      suggestions: [
        mcpConnected 
          ? "Go to Stage 0 → Click 'Verify Workflow Exists' to cache workflow data"
          : "Go to Project Settings → Connectors → Connect n8n"
      ]
    }),
    ...
  );
}
```

### 4. Alternative: Trigger MCP Search On-Demand

Since the agent CAN call MCP tools, add a helper that triggers the search when verification is requested. This would require adding a new button "Refresh Workflow Data from n8n" that prompts the user to ask the agent to fetch the latest workflow details.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/N8nAutomationGuideDialog.tsx` | Add workflow caching, populate cache during test connection, use cache in verification |
| `supabase/functions/verify-n8n-workflow/index.ts` | Improve error message when workflowData is null but MCP is connected |

---

## Detailed Code Changes

### N8nAutomationGuideDialog.tsx

**Add state for cached workflows (around line 770):**
```typescript
const [cachedWorkflows, setCachedWorkflows] = useState<Record<string, {
  id: string;
  name: string;
  active: boolean;
  nodes: Array<{ name: string; type: string }>;
}>>({});
```

**Update the workflow verification result handler (around line 980-1020):**
When "Verify Workflow Exists" succeeds via the agent's MCP call, the result should be stored. This requires the UI to accept a callback when the agent provides workflow data.

**Update handleLiveVerifyStage (around line 1360):**
```typescript
const handleLiveVerifyStage = async (stageId: string, stageName: string) => {
  const key = `${stageId}-live`;
  setVerificationResults(prev => new Map(prev).set(key, { status: 'loading' }));

  const stageWorkflowName = stageWorkflowNames[stageId] || workflowName;
  
  // Try to get cached workflow data
  const cachedWorkflow = cachedWorkflows[stageWorkflowName];
  
  if (!cachedWorkflow && mcpConnected) {
    // No cached data - prompt user to fetch it
    setVerificationResults(prev => new Map(prev).set(key, {
      status: 'manual',
      summary: `Workflow data not loaded. Click "Verify Workflow Exists" in Stage 0 to load '${stageWorkflowName}' first.`,
      suggestions: [
        "Go to Stage 0: n8n Instance Setup",
        "Click 'Verify Workflow Exists' to fetch workflow data from n8n",
        "Return here and click 'Verify Against Live Workflow' again"
      ]
    }));
    toast.warning("Load workflow data first using 'Verify Workflow Exists'");
    return;
  }

  // Proceed with verification using cached data
  const { data, error } = await supabase.functions.invoke('verify-n8n-workflow', {
    body: {
      workflowData: cachedWorkflow ? {
        id: cachedWorkflow.id,
        name: cachedWorkflow.name,
        active: cachedWorkflow.active,
        nodes: cachedWorkflow.nodes
      } : null,
      stageId,
      stageName,
      workflowNamePattern: stageWorkflowName,
      businessContext: {...},
      mcpConnected
    }
  });
  // ... rest of handler
};
```

**Add a function to store workflows from external source (after line 798):**
```typescript
// Function to cache workflow data (called after MCP search)
const cacheWorkflowData = useCallback((workflows: Array<{
  id: string;
  name: string;
  active: boolean;
  nodes: Array<{ name: string; type: string }>;
}>) => {
  const newCache: Record<string, typeof workflows[0]> = {};
  workflows.forEach(wf => {
    newCache[wf.name] = wf;
  });
  setCachedWorkflows(prev => ({ ...prev, ...newCache }));
  localStorage.setItem('n8n_cached_workflows', JSON.stringify({ ...cachedWorkflows, ...newCache }));
}, [cachedWorkflows]);

// Load cached workflows from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem('n8n_cached_workflows');
  if (saved) {
    try {
      setCachedWorkflows(JSON.parse(saved));
    } catch { /* ignore */ }
  }
}, []);
```

### verify-n8n-workflow/index.ts

**Update the fallback message (line 269-287):**
```typescript
if (!mcpConnected || !workflowData) {
  return new Response(
    JSON.stringify({
      status: "MCP_NOT_CONNECTED",
      confidence: "low",
      summary: mcpConnected 
        ? `Workflow data not loaded. Use "Verify Workflow Exists" in Stage 0 to fetch '${workflowNamePattern || 'GhostWriter AI: Lead Prospecting & Discovery Engine'}' from your n8n instance first.`
        : "n8n MCP not connected. Connect your n8n instance in Project Settings → Connectors to enable live verification.",
      workflowActive: false,
      nodeVerification: [],
      suggestions: mcpConnected
        ? [
            "Go to Stage 0: n8n Instance Setup",
            "Click 'Verify Workflow Exists' button",
            "Return to this stage and verify again"
          ]
        : [
            "Go to Project Settings → Connectors → Connect n8n",
            "Ensure your n8n instance has MCP access enabled (Settings → MCP access)"
          ],
      connectionRequired: !mcpConnected,
      dataRequired: mcpConnected && !workflowData
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

## User Flow After Fix

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. User opens n8n Automation Guide                             │
│  2. Goes to Stage 0: n8n Instance Setup                         │
│  3. Clicks "Test Connection" → Confirms MCP is connected        │
│  4. Clicks "Verify Workflow Exists"                             │
│     → System prompts agent to search for workflow via MCP       │
│     → Agent returns workflow data                               │
│     → Data is cached in state + localStorage                    │
│  5. User goes to Stage 1: Lead Prospecting                      │
│  6. Clicks "Verify Against Live Workflow"                       │
│     → System uses cached workflow data                          │
│     → Edge function verifies nodes match requirements           │
│     → Returns PASS/ATTENTION/FAIL status                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Expected Result

After these changes:
- Clicking "Verify Workflow Exists" in Stage 0 will cache the workflow data
- Clicking "Verify Against Live Workflow" will use cached data for verification
- If no cached data exists, a clear message will guide the user to load it first
- The verification will correctly find and validate the workflow nodes
