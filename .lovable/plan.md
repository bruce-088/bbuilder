

# Fix: Browserbase Auth Persistence - Context Parameter Location

## Summary

Testing revealed a bug in the Browserbase integration: session creation fails when attempting to use persistent contexts because `contextId` is being passed at the wrong level in the API request body.

## Bug Details

**Current Behavior:**
- Creating a session with `contextId` returns: `400 Bad Request - Unrecognized key(s) in object: 'contextId'`
- Auth persistence between automation runs does not work

**Root Cause:**
The `createSession` function in `browserbase-automation/index.ts` passes `contextId` as a top-level parameter, but the Browserbase API expects it inside `browserSettings.context`.

## Fix Required

### File: `supabase/functions/browserbase-automation/index.ts`

**Line 815-831 - Change `createSession` function:**

```text
BEFORE:
body: JSON.stringify({
  projectId,
  browserSettings: {
    viewport: { width: 1920, height: 1080 },
  },
  keepAlive: true,
  timeout: 300,
  ...(contextId && { contextId }),  // Wrong location
})

AFTER:
body: JSON.stringify({
  projectId,
  browserSettings: {
    viewport: { width: 1920, height: 1080 },
    ...(contextId && {
      context: {
        id: contextId,
        persist: true,
      },
    }),
  },
  keepAlive: true,
  timeout: 300,
})
```

## Testing Verification Results

| Feature | Status | Notes |
|---------|--------|-------|
| Session Creation | Passed | Returns sessionId, debugUrl, connectUrl |
| Action Parsing | Passed | Parses fix prompts into 4 actions |
| Context Creation | Passed | Returns valid contextId |
| Context Verification | Passed | get-context confirms existence |
| Session with Context | Failed | 400 Bad Request due to parameter location |
| CDP Execution | Not Tested | Blocked by context issue |

## Implementation Steps

1. Update the `createSession` function to nest context inside `browserSettings`
2. Redeploy the edge function
3. Test session creation with context again
4. Verify a second session reuses cookies/login state

## Technical Reference

From Browserbase Documentation:
```javascript
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID,
  browserSettings: {
    context: {
      id: contextId,
      persist: true,  // Required to save auth state
    },
  },
});
```

