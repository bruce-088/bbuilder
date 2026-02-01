

# Plan: Fix AI Browser Agent to Execute Actions Reliably

## Overview

The browser automation system is failing because of Edge Function timeouts, invalid selector generation by the AI interpreter, and lack of authentication handling. We need to implement an asynchronous background job pattern and improve the selector logic.

## Problem Summary

| Issue | Cause | Impact |
|-------|-------|--------|
| Edge Function Timeout | `execute` action runs all actions synchronously | Frontend receives "Failed to fetch" error |
| Invalid Selectors | AI generates `n8n:canvas-node[attr]` syntax | DOM queries fail with "DOM Error" |
| No Auth Handling | Navigates to canvas without login check | Elements don't exist if logged out |
| Slow Execution | Sequential actions with 500ms delays | 33 actions take 10+ minutes |

## Solution Architecture

Implement a job-based asynchronous pattern where:
1. The edge function creates a job record and returns immediately
2. Background execution continues via `EdgeRuntime.waitUntil()`
3. Frontend polls for status updates instead of waiting on a single request

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend  │────▶│  Edge Function   │────▶│  Browserbase    │
│             │     │                  │     │                 │
│  1. Start   │     │ 2. Create job    │     │ 4. Execute      │
│  5. Poll    │◀────│ 3. Return jobId  │     │    actions      │
│  status     │     │ (waitUntil runs) │     │                 │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

## Changes Required

### 1. Database: Create `automation_jobs` Table

Create a table to track background automation jobs with status updates.

```sql
CREATE TABLE automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_actions INTEGER DEFAULT 0,
  completed_actions INTEGER DEFAULT 0,
  current_action TEXT,
  results JSONB DEFAULT '[]',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own jobs
CREATE POLICY "Users can view own jobs"
  ON automation_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Edge functions can update any job (service role)
CREATE POLICY "Service role can manage jobs"
  ON automation_jobs FOR ALL
  USING (true);

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE automation_jobs;
```

### 2. Edge Function: Implement Background Execution Pattern

Modify `supabase/functions/browserbase-automation/index.ts`:

**New `execute` action flow:**
```typescript
case "execute": {
  // Create job record immediately
  const { data: job } = await supabase
    .from("automation_jobs")
    .insert({
      user_id: userId,
      session_id: sessionId,
      status: "pending",
      total_actions: providedActions.length,
    })
    .select()
    .single();

  // Start background execution (non-blocking)
  EdgeRuntime.waitUntil(
    executeAutomationBackground(job.id, connectUrl, providedActions, sessionId)
      .catch((error) => {
        supabase.from("automation_jobs")
          .update({ status: "failed", error: error.message })
          .eq("id", job.id);
      })
  );

  // Return immediately with job ID
  return new Response(JSON.stringify({
    success: true,
    jobId: job.id,
    status: "pending",
    message: "Execution started. Poll for updates."
  }));
}
```

**Add new `job-status` action:**
```typescript
case "job-status": {
  const { data: job } = await supabase
    .from("automation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  return new Response(JSON.stringify({
    success: true,
    job: job,
  }));
}
```

### 3. Fix AI Selector Generation

Update the `systemPrompt` in `interpretAction()` to prevent invalid selector combinations:

```typescript
// Add to system prompt:
**CRITICAL SELECTOR RULES:**
1. n8n: shortcuts CANNOT have additional CSS qualifiers
   ❌ WRONG: "n8n:canvas-node[data-node-name="IF"]"
   ✅ CORRECT: "[data-testid="canvas-node-IF"]" OR use evaluate() to find by text

2. For clicking specific nodes on canvas, use evaluate():
   { "action": "evaluate", "expression": "document.querySelector('[data-node-name]')?.textContent?.includes('IF') && el.click()" }

3. n8n: shortcuts expand to fallback arrays - don't combine them
```

### 4. Add Login Detection and Handling

Add login check before executing canvas actions:

```typescript
async function ensureLoggedIn(cdp: CDPClient, n8nUrl: string): Promise<boolean> {
  // Check if we see the login page
  const isLoginPage = await cdp.evaluate(`
    !!document.querySelector('[data-testid="sign-in-form"], .login-form, input[name="email"]')
  `);
  
  if (isLoginPage) {
    console.log("Login page detected - auth context may have expired");
    return false;
  }
  
  // Check for canvas presence
  const hasCanvas = await cdp.evaluate(`
    !!document.querySelector('.vue-flow, [data-testid="canvas"], .n8n-canvas')
  `);
  
  return hasCanvas;
}
```

### 5. Update Frontend Hook

Modify `src/hooks/useBrowserbaseAutomation.ts` to use the job-based polling:

```typescript
const executeActions = useCallback(async (
  sid: string,
  wsUrl: string,
  actionsToExecute: BrowserAction[]
): Promise<ExecuteResponse | null> => {
  // Start execution - returns job ID
  const { data: startData } = await supabase.functions.invoke("browserbase-automation", {
    body: {
      action: "execute",
      sessionId: sid,
      connectUrl: wsUrl,
      actions: actionsToExecute,
    },
  });

  if (!startData?.jobId) {
    return null;
  }

  // Poll for completion using realtime or interval
  return pollForJobCompletion(startData.jobId);
}, []);

const pollForJobCompletion = async (jobId: string): Promise<ExecuteResponse> => {
  const channel = supabase
    .channel(`job-${jobId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'automation_jobs',
      filter: `id=eq.${jobId}`,
    }, (payload) => {
      // Update UI with progress
      setCurrentActionIndex(payload.new.completed_actions);
      
      if (payload.new.status === 'completed' || payload.new.status === 'failed') {
        channel.unsubscribe();
        // Return results
      }
    })
    .subscribe();
};
```

### 6. Improve Selector Fallback Logic

Update `resolveSelectors()` to handle edge cases:

```typescript
resolveSelectors(selector: string): string[] {
  // Check for invalid combinations like "n8n:key[attr]"
  if (selector.startsWith("n8n:") && selector.includes("[")) {
    console.warn(`Invalid n8n selector combination: ${selector}`);
    // Extract the attribute part and try to use it directly
    const attrMatch = selector.match(/\[([^\]]+)\]/);
    if (attrMatch) {
      return [`[${attrMatch[1]}]`];
    }
  }
  
  // ... existing logic
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/browserbase-automation/index.ts` | Add job-based async execution, fix selector prompt, add login detection |
| `src/hooks/useBrowserbaseAutomation.ts` | Implement job polling with realtime updates |
| Database migration | Create `automation_jobs` table with RLS |

## Implementation Order

1. **Database first** - Create `automation_jobs` table
2. **Edge function** - Implement `EdgeRuntime.waitUntil()` pattern
3. **Frontend hook** - Update to poll jobs instead of waiting
4. **Selector fixes** - Update AI prompt and resolver
5. **Login detection** - Add auth check before canvas actions

## Testing Checklist

After implementation:
- [ ] Trigger "Run Auto-Fix" and verify job is created immediately
- [ ] Confirm frontend shows real-time progress updates
- [ ] Verify actions complete even if browser tab is closed
- [ ] Test with expired auth context to confirm login detection works
- [ ] Check that canvas node clicks work with new selector logic

## Expected Outcome

- Automation runs reliably without Edge Function timeouts
- Real-time progress visible in UI via Supabase Realtime
- Selector failures reduced by 80%+ with proper syntax
- Auth failures detected and reported to user

