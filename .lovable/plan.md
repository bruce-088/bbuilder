
# Plan: Browserbase Edge Function Integration for Automated n8n Fixes

## Overview

Create an edge function that integrates with the Browserbase API to programmatically execute browser automations for n8n workflow fixes. This will allow users to click a single "Run Fix" button instead of manually copying prompts to Director.ai or Claude Computer Use.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         User Interface                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────┐ │
│  │ Execute Fix    │  │ Run Browserbase│  │ View Live Session          │ │
│  │ (existing)     │  │ Automation     │  │ (debug URL)                │ │
│  └───────┬────────┘  └───────┬────────┘  └────────────────────────────┘ │
└──────────┼───────────────────┼──────────────────────────────────────────┘
           │                   │
           ▼                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Edge Function: browserbase-automation                  │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐                 │
│  │ Create       │  │ Execute       │  │ Poll Status    │                 │
│  │ Session      │──│ Actions via   │──│ & Return       │                 │
│  │              │  │ Stagehand     │  │ Results        │                 │
│  └──────────────┘  └───────────────┘  └────────────────┘                 │
└──────────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        Browserbase Cloud                                  │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐                 │
│  │ Cloud Browser│  │ Session       │  │ Debug/Live     │                 │
│  │ Instance     │  │ Management    │  │ View URLs      │                 │
│  └──────────────┘  └───────────────┘  └────────────────┘                 │
└──────────────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Edge Function Creation

**Create `supabase/functions/browserbase-automation/index.ts`**

This edge function will:
1. Accept fix prompt and n8n configuration
2. Create a Browserbase session via REST API
3. Execute browser actions using the Stagehand-compatible format
4. Return session ID and debug URLs for monitoring
5. Poll for completion and return results

Key endpoints:
- `POST /v1/sessions` - Create browser session
- Session connects via `connectUrl` for automation
- Debug URLs allow users to watch the automation live

### Phase 2: Hook and State Management

**Create `src/hooks/useBrowserbaseAutomation.ts`**

This hook will:
- Manage automation state (idle, running, completed, failed)
- Call the edge function with fix context
- Provide live session URL for debugging
- Handle polling for automation completion
- Return structured results

### Phase 3: UI Integration

**Modify `src/components/AutomationEngine/FixGuidancePopover.tsx`**

Add a new "Run Browserbase Automation" button that:
- Triggers the automation flow
- Shows loading state with live session link
- Displays success/failure results
- Falls back to copy-paste flow if automation fails

**Modify `src/components/AutomationEngine/ExceptionReview.tsx`**

Add "Auto-Fix with Browserbase" button to fix cards that:
- Replaces/augments the "Execute Fix" button for compatible fixes
- Shows real-time automation progress
- Links to live session for debugging

### Phase 4: Secrets Configuration

**Required Secrets:**
- `BROWSERBASE_API_KEY` - API key from Browserbase dashboard
- `BROWSERBASE_PROJECT_ID` - Project ID for session creation

Users will need to add these secrets before using the feature.

---

## Technical Details

### Edge Function: `browserbase-automation/index.ts`

```typescript
// Core structure
interface AutomationRequest {
  action: "start" | "status" | "stop";
  fixPrompt: string;
  n8nInstanceUrl: string;
  workflowId: string;
  sessionId?: string; // For status/stop actions
}

interface AutomationResponse {
  success: boolean;
  sessionId: string;
  debugUrl: string;     // Live view URL for user monitoring
  connectUrl: string;   // WebSocket URL for Stagehand
  status: "running" | "completed" | "failed";
  result?: {
    actionsTaken: string[];
    screenshots: string[];
    errors: string[];
  };
}
```

### Browser Actions Flow

The edge function will translate the Director.ai prompt into Stagehand actions:

```typescript
// Example action sequence
const actions = [
  { type: "navigate", url: n8nWorkflowUrl },
  { type: "wait", selector: ".n8n-canvas" },
  { type: "act", instruction: "Press Ctrl+0 to fit all nodes in view" },
  { type: "act", instruction: "Double-click on the Claude node to open configuration" },
  { type: "act", instruction: "Click on the Credentials dropdown" },
  // ... extracted from fix prompt
];
```

### Hook: `useBrowserbaseAutomation.ts`

```typescript
interface UseBrowserbaseAutomation {
  startAutomation: (params: AutomationParams) => Promise<void>;
  stopAutomation: () => Promise<void>;
  status: "idle" | "starting" | "running" | "completed" | "failed";
  debugUrl: string | null;
  result: AutomationResult | null;
  error: string | null;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/browserbase-automation/index.ts` | Edge function for Browserbase API integration |
| `src/hooks/useBrowserbaseAutomation.ts` | React hook for managing automation state |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add `[functions.browserbase-automation]` with `verify_jwt = false` |
| `src/components/AutomationEngine/FixGuidancePopover.tsx` | Add "Run Browserbase" button with live session link |
| `src/components/AutomationEngine/ExceptionReview.tsx` | Add auto-fix button to fix recommendation cards |

---

## Edge Function Code Structure

```typescript
// supabase/functions/browserbase-automation/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ...",
};

const BROWSERBASE_API_URL = "https://api.browserbase.com";

interface AutomationRequest {
  action: "start" | "status" | "stop";
  fixPrompt: string;
  n8nInstanceUrl: string;
  workflowId: string;
  workflowName?: string;
  sessionId?: string;
}

async function createSession(projectId: string, apiKey: string) {
  const response = await fetch(`${BROWSERBASE_API_URL}/v1/sessions`, {
    method: "POST",
    headers: {
      "X-BB-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId,
      browserSettings: {
        viewport: { width: 1920, height: 1080 },
      },
    }),
  });
  return response.json();
}

async function executeAutomation(sessionId: string, connectUrl: string, actions: string[]) {
  // Use Browserbase connect URL to execute Stagehand actions
  // This would integrate with Stagehand SDK for natural language actions
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY");
  const BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID");

  if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
    return new Response(
      JSON.stringify({ 
        error: "Browserbase credentials not configured. Add BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID secrets." 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: AutomationRequest = await req.json();
    
    if (body.action === "start") {
      // 1. Create Browserbase session
      const session = await createSession(BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY);
      
      // 2. Return session info for client to monitor
      return new Response(
        JSON.stringify({
          success: true,
          sessionId: session.id,
          debugUrl: `https://www.browserbase.com/sessions/${session.id}`,
          connectUrl: session.connectUrl,
          status: "running",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // ... handle status and stop actions
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## UI Components Update

### FixGuidancePopover - New Button

```tsx
{/* Run Browserbase Automation */}
<button
  onClick={handleRunBrowserbase}
  disabled={isRunningAutomation || !hasBrowserbaseCredentials}
  className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
>
  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
    {isRunningAutomation ? (
      <Loader2 className="h-4 w-4 text-primary animate-spin" />
    ) : (
      <Bot className="h-4 w-4 text-primary" />
    )}
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium">
      {isRunningAutomation ? "Running automation..." : "Run Browserbase Automation"}
    </p>
    <p className="text-xs text-muted-foreground">
      AI browser agent executes the fix for you
    </p>
  </div>
  {automationDebugUrl && (
    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  )}
</button>

{/* Live Session Link */}
{automationDebugUrl && (
  <a 
    href={automationDebugUrl} 
    target="_blank" 
    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
  >
    <Eye className="h-3 w-3" /> Watch live session
  </a>
)}
```

---

## User Flow

1. User sees a fix recommendation in Exception Review
2. User clicks "Run Browserbase Automation" button
3. Edge function creates a Browserbase session
4. User gets a "Watch live session" link to monitor in real-time
5. Browser automation navigates to n8n, opens the node, applies fixes
6. Automation completes and returns success/failure status
7. User can verify the fix was applied correctly

---

## Secrets Required

Before using this feature, users must configure:

| Secret | Description |
|--------|-------------|
| `BROWSERBASE_API_KEY` | API key from https://browserbase.com/settings |
| `BROWSERBASE_PROJECT_ID` | Project ID from Browserbase dashboard |

The edge function will return a helpful error message if these are not configured.

---

## Limitations and Considerations

1. **Session Duration**: Browserbase sessions have timeouts (configurable up to 6 hours)
2. **Cost**: Browserbase has usage-based pricing for browser minutes
3. **n8n Authentication**: User may need to be logged into n8n in the browser context
4. **Complexity**: Some fixes may require OAuth flows that can't be fully automated

---

## Future Enhancements

1. **Context Persistence**: Save browser context to maintain n8n login across sessions
2. **Screenshot Capture**: Take before/after screenshots for verification
3. **Rollback Support**: Capture workflow state before changes for undo capability
4. **Batch Fixes**: Execute multiple fixes in a single session to reduce costs
