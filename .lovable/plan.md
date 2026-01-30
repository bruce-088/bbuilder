
# Live Fix Actions for n8n Node Issues

## Overview

Add actionable "Fix" buttons to incomplete/missing node verification results that use live workflow data from the MCP connection to provide context-aware remediation steps and direct integration actions.

## Current State

When verification shows issues like "Google Sheets - Credentials may not be configured", users see:
- A warning icon and status badge
- Text suggestions like "Complete configuration for: Add to Google Sheet"
- No direct action buttons

## Proposed Solution

Add three types of fix actions for each node issue:

| Action | Description | Implementation |
|--------|-------------|----------------|
| **Quick Fix Guide** | Opens a dialog with specific instructions using live node data | Uses cached workflow to show exact node name, current parameters, and step-by-step fix |
| **Open in n8n** | Direct link to the specific node in the user's n8n instance | Constructs URL from n8n instance + workflow ID + node ID |
| **Ask AI to Fix** | Sends a structured prompt to the chat asking the agent to help | Agent can use MCP to validate the fix was applied |

---

## User Flow

```text
User clicks "Verify Against Live Workflow"
    ↓
Verification returns ATTENTION status
    ↓
Checklist shows:
  ✅ Daily trigger (scheduleTrigger) - configured
  ⚠️ Lead storage (googleSheets) - Credentials may not be configured
      [Quick Fix] [Open in n8n] [Ask AI to Fix]
  ❌ ICP filtering (if) - Required node not found
      [Quick Fix] [Open in n8n] [Ask AI to Fix]
```

---

## Technical Implementation

### 1. Enhance Edge Function Response

**File:** `supabase/functions/verify-n8n-workflow/index.ts`

Add detailed node information to the checklist items:

```typescript
checklist: nodeVerification.map(n => ({
  item: `${n.purpose} (${n.type.split('.').pop()})`,
  status: n.found ? (n.status === 'configured' ? 'check' : 'warning') : 'error',
  nodeId: n.matchedNode?.id,       // NEW: For direct link
  nodeName: n.matchedNode?.name,   // NEW: For display
  nodeType: n.type,                // NEW: Full type
  issues: n.issues,                // NEW: Specific issues
  fixable: n.status !== 'configured', // NEW: Show fix buttons
  howToVerify: n.found 
    ? `Node "${n.matchedNode}" found. ${n.issues?.join('. ') || 'Configuration looks good.'}`
    : `Add a ${n.type.split('.').pop()} node for: ${n.purpose}`
}))
```

Update the node matching to capture the full node object:

```typescript
const matchedNode = workflowData.nodes.find(node =>
  node.type === expected.type ||
  node.type.startsWith(expected.type.split('.')[0])
);

// Store full node info for fix actions
if (matchedNode) {
  nodeVerification.push({
    ...existing,
    matchedNodeId: matchedNode.id,
    matchedNodeData: {
      id: matchedNode.id,
      name: matchedNode.name,
      type: matchedNode.type,
      parameters: matchedNode.parameters,
      credentials: matchedNode.credentials
    }
  });
}
```

### 2. Create NodeFixActions Component

**File:** `src/components/NodeFixActions.tsx` (new file)

```typescript
interface NodeFixActionsProps {
  nodeId?: string;
  nodeName?: string;
  nodeType: string;
  issues: string[];
  purpose: string;
  workflowId: string;
  workflowName: string;
  n8nInstanceUrl: string;
  businessContext: {
    businessName: string;
    niche?: string;
  };
  onAskAI: (prompt: string) => void;
}

export default function NodeFixActions({
  nodeId,
  nodeName,
  nodeType,
  issues,
  purpose,
  workflowId,
  workflowName,
  n8nInstanceUrl,
  businessContext,
  onAskAI
}: NodeFixActionsProps) {
  const [showFixGuide, setShowFixGuide] = useState(false);
  
  // Construct direct link to node in n8n
  const nodeLink = nodeId && n8nInstanceUrl
    ? `${n8nInstanceUrl}/workflow/${workflowId}?nodeId=${nodeId}`
    : null;
  
  // Generate AI prompt for fixing
  const generateAIPrompt = () => {
    const issueText = issues.join(', ');
    return `Help me fix the "${nodeName || nodeType}" node in my n8n workflow "${workflowName}".

**Issue:** ${issueText}
**Node Purpose:** ${purpose}
**Business:** ${businessContext.businessName} (${businessContext.niche})

Please:
1. Check the current node configuration via MCP
2. Tell me exactly what needs to be configured
3. Provide step-by-step instructions for ${nodeType}
4. Verify the fix was applied correctly`;
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Quick Fix Guide Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs gap-1"
        onClick={() => setShowFixGuide(true)}
      >
        <Lightbulb className="w-3 h-3" />
        Quick Fix
      </Button>
      
      {/* Open in n8n Button */}
      {nodeLink && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1"
          asChild
        >
          <a href={nodeLink} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3" />
            Open in n8n
          </a>
        </Button>
      )}
      
      {/* Ask AI to Fix Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs gap-1 text-primary"
        onClick={() => onAskAI(generateAIPrompt())}
      >
        <Sparkles className="w-3 h-3" />
        Ask AI
      </Button>
      
      {/* Quick Fix Dialog */}
      <NodeFixGuideDialog
        open={showFixGuide}
        onOpenChange={setShowFixGuide}
        nodeType={nodeType}
        nodeName={nodeName}
        issues={issues}
        purpose={purpose}
        n8nInstanceUrl={n8nInstanceUrl}
      />
    </div>
  );
}
```

### 3. Create NodeFixGuideDialog Component

**File:** `src/components/NodeFixGuideDialog.tsx` (new file)

This dialog shows specific fix instructions based on the node type and issue:

```typescript
const FIX_GUIDES: Record<string, Record<string, { steps: string[]; tips: string[] }>> = {
  'googleSheets': {
    'Credentials not configured': {
      steps: [
        '1. Open your n8n instance and navigate to the workflow',
        '2. Click on the Google Sheets node',
        '3. Click "Credential to connect with" dropdown',
        '4. Select existing Google credential or click "+ Create New Credential"',
        '5. If creating new: Click "Sign in with Google" and authorize',
        '6. Select your spreadsheet and sheet name',
        '7. Save the node and test the workflow'
      ],
      tips: [
        'Make sure you have a Google Cloud project with Sheets API enabled',
        'The service account or OAuth app needs access to the target spreadsheet',
        'Share the spreadsheet with the service account email if using service account auth'
      ]
    }
  },
  'gmail': {
    'Credentials not configured': {
      steps: [
        '1. Open the Gmail node in your workflow',
        '2. Click "Credential to connect with"',
        '3. Create a new Google/Gmail OAuth credential',
        '4. Authorize with your Google account',
        '5. Configure email template and recipients',
        '6. Test by sending a test email'
      ],
      tips: [
        'Use a dedicated automation email account',
        'Enable "Less secure app access" or use App Password if needed'
      ]
    }
  },
  // ... more node types
};
```

### 4. Update Checklist Rendering

**File:** `src/components/N8nAutomationGuideDialog.tsx`

Update the checklist item rendering to include fix action buttons:

```typescript
{verificationResults.get(`${stage.id}-live`)!.checklist!.map((item, idx) => (
  <li key={idx} className="flex flex-col gap-1">
    <div className="flex items-start gap-1.5">
      {item.status === 'check' && <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5" />}
      {item.status === 'warning' && <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5" />}
      {item.status === 'error' && <XCircle className="w-3 h-3 text-red-500 mt-0.5" />}
      <span>{item.item}</span>
    </div>
    
    {/* Fix Actions for warning/error items */}
    {item.fixable && (
      <NodeFixActions
        nodeId={item.nodeId}
        nodeName={item.nodeName}
        nodeType={item.nodeType}
        issues={item.issues || []}
        purpose={item.item}
        workflowId={cachedWorkflows[stageWorkflowNames[stage.id] || workflowName]?.id || ''}
        workflowName={stageWorkflowNames[stage.id] || workflowName}
        n8nInstanceUrl={localStorage.getItem('n8n_instance_url') || ''}
        businessContext={{
          businessName: businessIdea.businessName,
          niche: businessIdea.niche
        }}
        onAskAI={(prompt) => {
          // Close dialog and send prompt to chat
          navigator.clipboard.writeText(prompt);
          toast.success("Fix prompt copied! Paste it in the chat to get AI help.");
        }}
      />
    )}
  </li>
))}
```

### 5. Enhanced Edge Function Node Data

**File:** `supabase/functions/verify-n8n-workflow/index.ts`

Return richer node information in the response:

```typescript
// In the nodeVerification section, capture full node data
nodeVerification.push({
  type: expected.type,
  purpose: expected.purpose,
  found: true,
  status: issues.length === 0 ? 'configured' : 'incomplete',
  matchedNode: matchedNode.name,
  matchedNodeId: matchedNode.id,           // NEW
  matchedNodeParams: matchedNode.parameters, // NEW - for context
  credentialsConfigured: !!matchedNode.credentials, // NEW
  issues: issues.length > 0 ? issues : undefined
});

// Update checklist generation
checklist: nodeVerification.map(n => ({
  item: `${n.purpose} (${n.type.split('.').pop()})`,
  status: n.found ? (n.status === 'configured' ? 'check' : 'warning') : 'error',
  fixable: n.status !== 'configured',
  nodeId: n.matchedNodeId,
  nodeName: n.matchedNode,
  nodeType: n.type,
  issues: n.issues,
  credentialsConfigured: n.credentialsConfigured,
  howToVerify: n.found 
    ? `Node "${n.matchedNode}" found. ${n.issues?.join('. ') || 'Configuration looks good.'}`
    : `Add a ${n.type.split('.').pop()} node for: ${n.purpose}`
}))
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/NodeFixActions.tsx` | Create | Fix action buttons component |
| `src/components/NodeFixGuideDialog.tsx` | Create | Quick fix guide dialog with step-by-step instructions |
| `src/components/N8nAutomationGuideDialog.tsx` | Modify | Add fix buttons to checklist items |
| `supabase/functions/verify-n8n-workflow/index.ts` | Modify | Return richer node data for fix context |

---

## Fix Button Behaviors

### Quick Fix Button
- Opens a dialog with node-type-specific fix instructions
- Shows the current node configuration from cached workflow
- Provides step-by-step instructions with screenshots/tips
- Includes a "Re-verify" button at the end

### Open in n8n Button
- Constructs URL: `{n8nInstanceUrl}/workflow/{workflowId}?nodeId={nodeId}`
- Opens in new tab directly to the problematic node
- Falls back to workflow page if node ID unavailable

### Ask AI to Fix Button
- Copies a structured prompt to clipboard
- Prompt includes:
  - Node name and type
  - Specific issues detected
  - Business context
  - Request for MCP-based verification after fix
- Toast notification guides user to paste in chat

---

## Expected Result

After implementation:
- Each incomplete/missing node shows three fix action buttons
- "Quick Fix" provides offline instructions specific to the node type
- "Open in n8n" takes user directly to the node in their instance
- "Ask AI" generates a prompt that the agent can use with MCP to validate fixes
- After fixing, user can click "Verify Against Live Workflow" to confirm
