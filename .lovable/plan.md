
# Plan: Browserbase Settings Section

## Overview

Add a dedicated settings section for managing Browserbase credentials and viewing/clearing stored auth contexts for all n8n instances. This will be integrated into the existing `AISettingsDialog` component as a new tab.

## Current State Analysis

- **Browserbase credentials** (`BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`) are already stored as Supabase secrets
- **Auth contexts** are stored in `localStorage` with keys like `browserbase_context_[normalized_url]`
- The `useBrowserbaseAutomation` hook already has a `clearStoredContext` function
- The `AISettingsDialog` component uses a tabbed interface for managing AI provider keys

## Implementation Approach

### Phase 1: Create Browserbase Settings Tab

Add a new "Browserbase" tab to `AISettingsDialog.tsx` that displays:

1. **Credentials Status Section**
   - Show whether `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` are configured
   - Provide a link to Browserbase dashboard for getting credentials
   - Show "Connected" or "Not Connected" badge

2. **Stored Auth Contexts Section**
   - Scan localStorage for all keys matching `browserbase_context_*`
   - Display a list of n8n instances with saved auth sessions
   - Show the normalized URL for each context
   - Provide "Clear" button for each individual context
   - Provide "Clear All" button to remove all saved contexts

### Phase 2: Create Helper Hook

Create a new hook `useBrowserbaseSettings.ts` that provides:

- Function to list all stored contexts from localStorage
- Function to verify if credentials are configured (via edge function)
- Function to clear individual or all contexts
- State for credential configuration status

### Phase 3: UI Components

The new tab will include:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Browserbase (Browser Automation)                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Credentials                        [Connected ✓]    │   │
│  │                                                         │   │
│  │ Your Browserbase API key and Project ID are configured  │   │
│  │ in the backend.                                         │   │
│  │                                   [Get Credentials →]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Saved Login Sessions                                    │   │
│  │                                                         │   │
│  │ These sessions allow the AI agent to stay logged in     │   │
│  │ to your n8n instances between automation runs.          │   │
│  │                                                         │   │
│  │ ┌───────────────────────────────────────────────────┐   │   │
│  │ │ 🔐 n8n.mycompany.com                    [Clear]   │   │   │
│  │ │    Context ID: ctx_abc123...                      │   │   │
│  │ └───────────────────────────────────────────────────┘   │   │
│  │ ┌───────────────────────────────────────────────────┐   │   │
│  │ │ 🔐 123.45.67.89:5678                    [Clear]   │   │   │
│  │ │    Context ID: ctx_def456...                      │   │   │
│  │ └───────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │                              [Clear All Sessions]       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Best for:                                                      │
│  • Automated n8n workflow fixes                                 │
│  • AI-driven browser testing                                    │
│  • Persistent login across sessions                             │
└─────────────────────────────────────────────────────────────────┘
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useBrowserbaseSettings.ts` | Hook for managing Browserbase settings and contexts |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AISettingsDialog.tsx` | Add new "Browserbase" tab with credentials status and context management |

## Technical Details

### Context Discovery Logic

```typescript
function getAllStoredContexts(): { url: string; contextId: string }[] {
  const contexts: { url: string; contextId: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('browserbase_context_')) {
      const url = key.replace('browserbase_context_', '');
      const contextId = localStorage.getItem(key);
      if (contextId) {
        contexts.push({ url, contextId });
      }
    }
  }
  return contexts;
}
```

### Credential Verification

The existing `browserbase-automation` edge function already returns `credentialsConfigured: false` when credentials are missing. We can leverage this for status checking.

### Tab Integration

The `AISettingsDialog` currently has 4 tabs (OpenAI, Claude, Gemini, Perplexity). We'll add a 5th tab for Browserbase with a different icon (Globe or Bot).

## Edge Cases

1. **No stored contexts** - Show empty state with explanation
2. **Context verification** - Optionally verify contexts are still valid before displaying
3. **Credential check failure** - Show appropriate error message
4. **localStorage unavailable** - Handle gracefully with error message

## Implementation Steps

1. Create `useBrowserbaseSettings.ts` hook with context management functions
2. Add Browserbase tab to `AISettingsDialog.tsx` TabsList
3. Implement TabsContent for Browserbase with:
   - Credential status display
   - Context list with clear buttons
   - Clear all button
4. Add icon import (Globe or Bot from lucide-react)
5. Test context clearing functionality

## Secrets Management Note

Since `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` are backend secrets, users cannot add/modify them through this UI directly. The UI will show status only. To add/update credentials, users need to use the secrets management tools or ask Lovable to configure them.
