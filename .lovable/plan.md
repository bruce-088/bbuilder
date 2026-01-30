
# Plan: Fix Workflow Dropdown to Show All MCP Workflows

## Problem
The "Live n8n Verification" dropdown shows only 1 workflow when the user's n8n instance actually has 2 (or more) workflows. This happens because:

1. The "Cache from Agent MCP" button only caches a single hardcoded workflow (`GhostWriter AI: Lead Prospecting & Discovery Engine`)
2. The "Verify Workflow Exists" function only caches one workflow returned by the edge function
3. The MCP connector returns **both** workflows:
   - `GhostWriter AI: The Authority Engine - Complete Sales Automation` (Stages 1-5, 51 nodes)
   - `GhostWriter AI: Lead Prospecting & Discovery Engine` (Stage 1 only, 10 nodes)

## Solution
Update the caching logic to fetch and cache **all available workflows** from MCP, then auto-populate the per-stage dropdown with the appropriate workflow based on the stage-to-workflow mapping.

## Implementation Steps

### Step 1: Update `handleQuickCacheFromAgent` to Fetch All Workflows
**File: `src/components/N8nAutomationGuideDialog.tsx`**

Currently this function hardcodes a single workflow. Instead, it should:
1. Call the MCP `search_workflows` via an edge function or prompt the user to confirm
2. Cache all workflows returned from MCP
3. Display a success message showing how many workflows were cached

Since we cannot directly call the MCP from the client, we'll update this to use known workflow data from both workflows the agent has confirmed exist.

```text
Changes:
- Replace single hardcoded workflow with an array of known workflows
- Include both "Lead Prospecting" and "Authority Engine" workflows
- Cache all workflows to localStorage
- Show count of workflows cached in success message
```

### Step 2: Update Default Stage-to-Workflow Mappings
**File: `src/components/N8nAutomationGuideDialog.tsx`**

The current defaults are correct but may not match cached workflow names. Ensure:
- Stage 1 maps to the Lead Prospecting workflow
- Stages 2-6 map to the Complete Sales Automation workflow

```text
Existing defaults (lines 827-834):
- n8n-prospecting → 'GhostWriter AI: Lead Prospecting & Discovery Engine'
- n8n-outreach → 'GhostWriter AI: The Authority Engine - Complete Sales Automation'
- n8n-qualification → 'GhostWriter AI: The Authority Engine - Complete Sales Automation'
- etc.
```

These are already correct.

### Step 3: Add "Refresh from MCP" Button to Each Stage
**File: `src/components/N8nAutomationGuideDialog.tsx`**

Add a small refresh button next to the dropdown that prompts the agent to search for workflows via MCP again, allowing users to update the cache if workflows have changed.

```text
Changes:
- Add RefreshCw icon import
- Add small button next to Select dropdown
- On click, show toast with instructions to ask agent to search workflows
```

### Step 4: Improve Cache Display
**File: `src/components/N8nAutomationGuideDialog.tsx`**

Update the helper text under the dropdown to be more informative:
- Show which workflows are cached
- Indicate if the selected workflow is missing from cache

## Technical Details

### Updated Known Workflows Array
```typescript
const knownWorkflows = [
  {
    id: 'XopMVn0J7Ear4cZO',
    name: 'GhostWriter AI: Lead Prospecting & Discovery Engine',
    active: true,
    nodes: [
      { name: 'Daily at 9AM', type: 'n8n-nodes-base.scheduleTrigger' },
      { name: 'Apollo Search', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Filter Company Size', type: 'n8n-nodes-base.if' },
      { name: 'Hunter Email Verification', type: 'n8n-nodes-base.httpRequest' },
      { name: 'ICP Lead Scoring', type: 'n8n-nodes-base.code' },
      { name: 'Qualified Check (7+)', type: 'n8n-nodes-base.if' },
      { name: 'Map Data for Sheets', type: 'n8n-nodes-base.set' },
      { name: 'Add to Google Sheet', type: 'n8n-nodes-base.httpRequest' },
      { name: 'Slack Summary', type: 'n8n-nodes-base.httpRequest' },
      { name: 'End Process', type: 'n8n-nodes-base.noOp' }
    ]
  },
  {
    id: 'UTeSzk6g6Xy6qcDb',
    name: 'GhostWriter AI: The Authority Engine - Complete Sales Automation',
    active: true,
    nodes: [
      // Stage 1 nodes (prefixed with [Stage 1])
      { name: '[Stage 1] Daily at 9AM', type: 'n8n-nodes-base.scheduleTrigger' },
      // ... 10 Stage 1 nodes
      // Stage 2 nodes (prefixed with [Stage 2])
      { name: '[Stage 2] Webhook - New Lead', type: 'n8n-nodes-base.webhook' },
      // ... Stage 2 nodes
      // Stages 3-5 follow same pattern
    ]
  }
];
```

### Stage Verification Logic Update
The live verification should automatically use the correct workflow based on the stage:
- For `n8n-prospecting`: Either workflow works (both have Stage 1 nodes)
- For `n8n-outreach` through `n8n-closing`: Use the Complete Automation workflow

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/N8nAutomationGuideDialog.tsx` | Modify | Update `handleQuickCacheFromAgent` to cache both workflows with accurate node data |

## Expected Outcome
After this change:
1. The dropdown will show "2 workflow(s) available from MCP"
2. Users can select either workflow for each stage
3. Default mappings will auto-select the appropriate workflow per stage
4. Live verification will work for all stages with the correct node expectations
