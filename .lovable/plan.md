

# Plan: Add Direct API Key Entry for Perplexity

## Overview

Update Perplexity to use direct API key entry, matching the OpenAI and Claude workflow. This provides a consistent experience across all three AI providers.

---

## Changes Required

### 1. Database: Allow 'perplexity' in user_api_keys

The current `user_api_keys` table has a constraint that only allows 'openai' and 'claude' providers. We need to add 'perplexity' to the allowed values.

**Migration:**
```sql
ALTER TABLE user_api_keys 
DROP CONSTRAINT user_api_keys_provider_check;

ALTER TABLE user_api_keys 
ADD CONSTRAINT user_api_keys_provider_check 
CHECK (provider IN ('openai', 'claude', 'perplexity'));
```

---

### 2. Update AISettingsDialog.tsx

Replace the connector-based Perplexity tab with a direct API key input field:

**Current (connector-based):**
- Shows "Connect Perplexity" button
- Triggers callback to connector system

**New (direct entry):**
- Shows API key input field (masked)
- "Save & Connect" button
- "Remove" button when configured
- Link to get Perplexity API key

---

### 3. Update useAIProviders.ts

Extend the `saveApiKey` and `removeApiKey` functions to handle 'perplexity':

- Update type definitions to include `"perplexity"` 
- Add Perplexity handling in save/remove logic
- Update the `testApiKey` function to validate Perplexity keys

---

### 4. Update validate-api-key Edge Function

Add Perplexity API key validation:

```typescript
if (provider === "perplexity") {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1
    })
  });
  
  if (!response.ok) {
    return { valid: false, error: "Invalid Perplexity API key" };
  }
  return { valid: true };
}
```

---

### 5. Update ai-orchestrator Edge Function

Modify `callPerplexity` to fetch the user's API key from the database instead of using an environment variable:

```typescript
async function callPerplexity(messages: Message[], userId: string) {
  // Fetch user's Perplexity API key from database
  const { data: keyData } = await supabaseAdmin
    .from("user_api_keys")
    .select("encrypted_key")
    .eq("user_id", userId)
    .eq("provider", "perplexity")
    .single();

  if (!keyData) {
    throw new Error("Perplexity API key not configured");
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${keyData.encrypted_key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar",
      messages
    })
  });
  
  return response;
}
```

---

### 6. Cleanup: Remove Connector Callback

Remove the `onPerplexityConnect` prop and placeholder handler since Perplexity now works like other providers.

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add 'perplexity' to provider constraint |
| `src/components/AISettingsDialog.tsx` | Add API key input for Perplexity tab |
| `src/hooks/useAIProviders.ts` | Extend to handle 'perplexity' provider |
| `supabase/functions/validate-api-key/index.ts` | Add Perplexity key validation |
| `supabase/functions/ai-orchestrator/index.ts` | Fetch Perplexity key from DB |
| `src/components/AutomationEngine/index.tsx` | Remove placeholder handler |

---

## User Experience After Fix

All three providers will work identically:

```text
┌─────────────────────────────────────────────────────────────────┐
│  AI Provider Settings                                     [X]  │
├─────────────────────────────────────────────────────────────────┤
│  [OpenAI]  [Claude]  [Perplexity]                              │
│                                                                 │
│  Perplexity                                                    │
│  Real-time web search and research                             │
│                                                                 │
│  API Key: [pplx-••••••••••••••••]         [👁] [Save & Connect]│
│                                                                 │
│  💡 Get your API key from perplexity.ai/settings/api           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Best for:                                               │   │
│  │  • Market research with citations                        │   │
│  │  • Competitor analysis                                   │   │
│  │  • Current trends and news                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security

- Perplexity API keys stored in `user_api_keys` table with RLS protection
- Keys only accessible by the owning user
- Validation before storage ensures keys are valid

