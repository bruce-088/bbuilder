
# Mya as an n8n Troubleshooting Agent: Full Integration Plan

## Vision
Transform Mya from a chat-based assistant into an **agentic AI** that can directly access, analyze, and provide precise remediation for n8n workflow issues—eliminating guesswork and enabling autonomous troubleshooting.

## Current Architecture Analysis

### What Exists Today
1. **Chat with Mya** (`/chat`) - Basic AI chat using Lovable AI Gateway (Gemini)
2. **n8n Context Injection** - The chat function already accepts `n8nContext` with workflow metadata
3. **MCP Connector** - n8n tools (`search_workflows`, `get_workflow_details`, `execute_workflow`) are available to the Lovable agent
4. **"Chat with Mya" Button** - From `NodeFixActions`, users can start a conversation with pre-filled context
5. **Workflow Caching** - `localStorage` stores workflow data from MCP for verification

### The Gap
**The MCP tools are only available to the Lovable agent (me), not to Mya's runtime.** Mya currently receives static context passed at the start of a conversation, but cannot:
- Fetch live workflow data during a conversation
- Check if a fix was successful
- Execute workflows to test configurations
- Access the latest node state after user makes changes

---

## Proposed Solution: Three-Tier Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE (Chat Page)                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ "My Google Sheets node isn't working. Can you help me fix it?"          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     TIER 1: Enhanced Chat Edge Function                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ • Detects n8n troubleshooting intent                                    │   │
│  │ • Generates structured tool_call requests for workflow data             │   │
│  │ • Formats responses with actionable fix steps                           │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│               TIER 2: n8n Data Proxy (New Edge Function)                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ • Exposes workflow data from user's cached MCP results                  │   │
│  │ • Provides /get-workflow, /get-node, /list-workflows endpoints          │   │
│  │ • Returns live node configurations, credentials status                  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│             TIER 3: Conversation State & Workflow Memory                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ • Database table: n8n_workflow_snapshots (stores workflow JSON)         │   │
│  │ • Conversation-linked: each chat session knows its target workflow      │   │
│  │ • Versioned: track changes over time for "before/after" comparisons     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Enhanced Context Injection (Quick Win)
**Goal**: Make Mya smarter with the context she already receives

**Changes**:
1. **Enhance `streamChat` to auto-fetch workflow context**
   - When a conversation is linked to a business plan, automatically fetch cached workflow data
   - Pass full node configurations (parameters, credentials status) to the AI

2. **Add "Refresh Context" button in Chat UI**
   - User clicks to re-fetch the latest workflow data from MCP cache
   - Updates the conversation's n8n context with fresh data

3. **Structured Output for Fix Instructions**
   - Use AI tool calling to return structured remediation steps:
     - `node_name`, `action` (add/edit/connect), `parameters`, `credentials_needed`
   - Display as interactive checklist in the chat

### Phase 2: Real-Time Workflow Data Access
**Goal**: Give Mya live access to workflow state during conversations

**New Edge Function: `n8n-data-proxy/index.ts`**
```typescript
// Endpoints:
// POST /get-workflow - Fetches workflow JSON from user's n8n cache
// POST /get-node - Returns specific node configuration
// POST /analyze-issue - Diagnoses problems with node configurations
```

**Frontend Integration**:
- Chat page maintains `currentWorkflowData` state
- Before sending message, frontend fetches latest workflow data
- Attaches workflow snapshot to each AI request

**Database Schema**:
```sql
CREATE TABLE n8n_workflow_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  conversation_id UUID REFERENCES conversations(id),
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  nodes JSONB NOT NULL,
  connections JSONB,
  captured_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'mcp_cache' -- 'mcp_cache' | 'manual_import' | 'api'
);
```

### Phase 3: Agentic Loop with Verification
**Goal**: Mya can verify fixes and iterate until resolved

**Flow**:
1. User describes issue → Mya analyzes current node state
2. Mya provides fix instructions with specific parameters
3. User makes changes in n8n
4. User clicks "I made the changes" button
5. Mya triggers verification (re-fetches workflow, compares before/after)
6. If issue persists → Mya provides refined guidance
7. If fixed → Celebrates and suggests next steps

**New Chat Features**:
- **"Verify My Fix" Button**: Triggers workflow re-fetch and comparison
- **Before/After Diff View**: Shows what changed between snapshots
- **Success Celebration**: Confetti when verification passes

### Phase 4: Director.ai Integration (Advanced)
**Goal**: Generate precise Director.ai prompts for autonomous fixes

**Enhancements**:
- When Mya identifies a fix, she generates a Director.ai-compatible prompt
- Prompt includes exact URLs (using user's n8n instance), click paths, field values
- User can copy prompt → paste into Director.ai → fix is applied automatically

---

## Technical Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/n8n-data-proxy/index.ts` | Serve workflow data to chat context |
| `src/hooks/useN8nWorkflowContext.ts` | Manage workflow data state in chat |
| `src/components/Chat/VerifyFixButton.tsx` | Trigger post-fix verification |
| `src/components/Chat/WorkflowContextPanel.tsx` | Display current workflow context |
| `src/components/Chat/FixChecklist.tsx` | Interactive fix step checklist |

### Modified Files
| File | Changes |
|------|---------|
| `supabase/functions/chat/index.ts` | Accept workflow snapshot, enhanced system prompt for troubleshooting |
| `src/pages/Chat.tsx` | Integrate workflow context hooks, add verification flow |
| `src/lib/ai.ts` | Add `refreshWorkflowContext` function |
| `src/components/NodeFixActions.tsx` | Pass full workflow snapshot to Chat with Mya |

### Database Migrations
```sql
-- Store workflow snapshots for conversation context
CREATE TABLE public.n8n_workflow_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  nodes JSONB NOT NULL,
  connections JSONB,
  captured_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'mcp_cache'
);

ALTER TABLE public.n8n_workflow_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots" 
  ON public.n8n_workflow_snapshots FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots" 
  ON public.n8n_workflow_snapshots FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
```

---

## User Experience Flow

### Scenario: User's Google Sheets node isn't saving leads

**Before (Current)**:
1. User clicks "Chat with Mya" on the node
2. Mya receives static context from that moment
3. User asks "Why isn't it working?"
4. Mya gives generic Google Sheets troubleshooting
5. User tries fixes, comes back, Mya has no memory

**After (Enhanced)**:
1. User clicks "Chat with Mya" on the node
2. **System captures full workflow snapshot** (all nodes, connections, params)
3. User asks "Why isn't it working?"
4. **Mya analyzes live config**: "I see your Google Sheets node is configured but missing the `spreadsheetId` parameter. The URL field shows `/v4/spreadsheets/SPREADSHEET_ID/values/...` - you need to replace `SPREADSHEET_ID` with your actual sheet ID."
5. User makes the fix
6. **User clicks "Verify My Fix"**
7. **System re-fetches workflow, Mya compares**: "Great! The spreadsheetId is now set. However, I notice credentials aren't connected. Click the node → Credentials → Create New → Google OAuth2"
8. User connects credentials
9. **User clicks "Verify My Fix" again**
10. **Mya confirms**: "Perfect! Your Google Sheets node is fully configured. The workflow should now save leads correctly."

---

## Dependencies & Requirements

1. **MCP Connection**: User must have n8n connected via MCP connector
2. **Workflow Caching**: Workflows must be cached via "Cache from Agent MCP" or manual import
3. **Active Session**: User must be logged in for RLS policies

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Stale data | Add "Refresh Context" button + timestamp display |
| Large workflow JSON | Truncate to relevant nodes based on conversation topic |
| API rate limits | Cache snapshots in database, refresh only when requested |
| User confusion | Clear UI showing "Last synced: X minutes ago" |

---

## Success Metrics

1. **Fix Resolution Rate**: % of issues resolved in a single conversation
2. **Verification Usage**: How often users click "Verify My Fix"
3. **Time to Resolution**: Average time from issue report to verified fix
4. **User Satisfaction**: Rating at end of troubleshooting session
