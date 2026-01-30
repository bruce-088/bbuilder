

# Plan: Connect OpenAI, Perplexity, and Claude AI Providers

## Overview

Enable users to connect their own API keys for OpenAI, Perplexity, and Claude to unlock advanced AI capabilities in the Automation Engine. This builds on the existing `user_ai_preferences` table and provider architecture.

---

## What Each Provider Brings

| Provider | Strength | Use Case in Your App |
|----------|----------|---------------------|
| OpenAI GPT-5 | Advanced reasoning, code generation | Complex workflow analysis, detailed business plans |
| Claude (Anthropic) | Multi-step reasoning, long context | Deep automation strategy, comprehensive troubleshooting |
| Perplexity | Real-time web search | Market research, competitor analysis, current trends |

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     User Interface                              │
├─────────────────────────────────────────────────────────────────┤
│  ProviderSelector        │  AISettingsDialog (NEW)             │
│  - Lovable AI ✓          │  - Add OpenAI API Key               │
│  - OpenAI GPT-5 [+]      │  - Add Claude API Key               │
│  - Claude [+]            │  - Connect Perplexity               │
│  - Perplexity [+]        │  - Test connections                 │
└────────────┬─────────────┴────────────────────────────────────-─┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Database Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  user_ai_preferences           │  user_api_keys (NEW)          │
│  - preferred_provider          │  - provider (openai/claude)   │
│  - openai_configured           │  - encrypted_key              │
│  - claude_configured           │  - user_id                    │
│  - perplexity_configured       │  - created_at                 │
└────────────────────────────────┴────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│               ai-orchestrator Edge Function                     │
├─────────────────────────────────────────────────────────────────┤
│  Route based on aiProvider parameter:                           │
│  - "lovable"    → Lovable AI Gateway (default)                  │
│  - "openai"     → OpenAI API with user's key                   │
│  - "claude"     → Anthropic API with user's key                │
│  - "perplexity" → Perplexity API via connector                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Database: Store User API Keys Securely

Create a `user_api_keys` table to store encrypted API keys:

**Table Structure:**
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `provider` (text: 'openai' | 'claude')
- `encrypted_key` (text, encrypted API key)
- `created_at`, `updated_at` (timestamps)

**RLS Policies:**
- Users can only read/write their own keys
- Keys are stored encrypted and decrypted only in edge functions

**Note:** Perplexity uses the connector system instead of direct API keys.

### 2. New Component: AISettingsDialog

A settings dialog for managing AI provider connections:

**Features:**
- Tab for each provider (OpenAI, Claude, Perplexity)
- Secure API key input fields (masked)
- "Test Connection" button to verify keys work
- Connection status indicators
- Instructions for getting API keys from each provider

**UI Preview:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  AI Provider Settings                                     [X]  │
├─────────────────────────────────────────────────────────────────┤
│  [OpenAI]  [Claude]  [Perplexity]                              │
│                                                                 │
│  OpenAI GPT-5                                    🟢 Connected  │
│  ─────────────────────────────────────────────────────────────  │
│  API Key: ••••••••••••••••sk-proj-xxxx          [Test] [Remove]│
│                                                                 │
│  💡 Get your API key from platform.openai.com/api-keys         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Advanced reasoning and code generation capabilities     │   │
│  │  Best for: Complex workflow analysis, detailed plans     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                            [Save Preferences]   │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Hook: useAIProviders

Create a hook to manage AI provider state and operations:

**Capabilities:**
- Load user's configured providers from database
- Save/update API keys securely
- Test API key validity
- Track provider availability status
- Connect Perplexity via connector system

### 4. Update ProviderSelector Component

Enhance the existing component:

**Changes:**
- Show gear icon to open settings for unconfigured providers
- Display green checkmark for configured providers
- Remove "Soon" badge when provider is available
- Add click handler to open AISettingsDialog

### 5. Update ai-orchestrator Edge Function

Add routing logic for different AI providers:

**OpenAI Integration:**
```typescript
async function callOpenAI(messages, userApiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${userApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages
    })
  });
  return response;
}
```

**Claude Integration:**
```typescript
async function callClaude(messages, userApiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": userApiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      messages
    })
  });
  return response;
}
```

**Perplexity Integration:**
```typescript
async function callPerplexity(messages) {
  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
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

### 6. Edge Function: validate-api-key

Create a function to test API key validity:

**Endpoints tested:**
- OpenAI: `GET /v1/models` (lightweight check)
- Claude: `POST /v1/messages` with minimal prompt
- Returns success/error status for UI feedback

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/AISettingsDialog.tsx` | Settings UI for managing AI providers |
| `src/hooks/useAIProviders.ts` | State management for AI provider configs |
| `supabase/functions/validate-api-key/index.ts` | API key validation endpoint |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AutomationEngine/ProviderSelector.tsx` | Add settings trigger, show configured status |
| `supabase/functions/ai-orchestrator/index.ts` | Add OpenAI, Claude, Perplexity routing |
| `src/components/AutomationEngine/index.tsx` | Integrate AISettingsDialog |

## Database Changes

| Change | Description |
|--------|-------------|
| Create `user_api_keys` table | Store encrypted API keys per user |
| Add RLS policies | Secure user-owned key access |

---

## Perplexity Connector Integration

Perplexity is available as a connector, which is the recommended approach:

1. User clicks "Connect Perplexity" in AISettingsDialog
2. System uses the `connect` tool with `connector_id: perplexity`
3. Once connected, `PERPLEXITY_API_KEY` is available in edge functions
4. Update `user_ai_preferences.perplexity_configured = true`

---

## Security Considerations

1. **API keys stored encrypted** - Never stored in plain text
2. **Keys decrypted only in edge functions** - Never exposed to frontend
3. **RLS policies** - Users can only access their own keys
4. **No key logging** - API keys excluded from logs
5. **Validation before storage** - Keys tested before saving

---

## User Flow

```text
User opens Automation Engine
        │
        ▼
Clicks gear icon on "OpenAI GPT-5"
        │
        ▼
AISettingsDialog opens
        │
        ▼
User enters API key → Click "Test"
        │
        ├── Success → "Save" button enabled
        │               │
        │               ▼
        │          Key encrypted and stored
        │               │
        │               ▼
        │          Provider now available in selector
        │
        └── Failure → Show error message
                     "Invalid API key" or "Connection failed"
```

---

## Technical Notes

### API Key Encryption

Use Supabase's built-in encryption via pgcrypto:
```sql
-- Encrypt on insert
INSERT INTO user_api_keys (user_id, provider, encrypted_key)
VALUES (user_id, 'openai', pgp_sym_encrypt(api_key, secret_key));

-- Decrypt in edge function
SELECT pgp_sym_decrypt(encrypted_key::bytea, secret_key) FROM user_api_keys;
```

### Rate Limit Handling

Each provider has different rate limits:
- OpenAI: Handle 429 errors with exponential backoff
- Claude: Respect rate limits in response headers
- Perplexity: Follow their rate limit guidelines

---

## Success Criteria

- Users can add OpenAI and Claude API keys via the settings dialog
- Users can connect Perplexity via the connector system
- API keys are validated before saving
- Provider selector shows which providers are available
- Automation Engine routes requests to the selected provider
- All API keys are stored securely with encryption

