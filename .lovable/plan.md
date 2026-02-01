

# Automation Engine: Updated Investment Roadmap

Based on my analysis of the current codebase, here's what's been implemented and the best remaining opportunities to invest in the Automation Engine.

---

## Already Implemented

| Feature | Status | Location |
|---------|--------|----------|
| Progressive Disclosure | Done | `SimpleProgressBar.tsx` - collapsed by default, auto-expands on errors |
| One-Click Retry | Done | `useAutomationRun.ts` - `retryFromPhase()` preserves prior results |
| Browserbase Execution Panel | Done | Detailed action timeline with screenshots, selectors, timing |
| Live Session Viewer (partial) | Done | "Watch Live" link to external Browserbase debug URL |
| N8n Live Status Panel | Done | Real-time workflow health, webhook checks, Supabase Realtime |
| Exception Review + AI Fixes | Done | Categorized fixes (Automatable vs Manual), Knowledge Base enhanced |
| Deployment Panel | Done | JSON export, credential warnings, by-stage downloads |

---

## Remaining High-Impact Investments

### Priority 1: Smart Credential Pre-fill (2 days)
**Current gap**: Users see a warning about missing credentials AFTER export, but must configure them manually in n8n.

**Investment**: 
1. Detect required credentials during the "generate" phase
2. Show a modal prompting users to enter API keys (Apollo, Slack, Google Sheets, etc.)
3. Store in `user_api_keys` table (already exists for AI providers)
4. Inject actual credential IDs into the generated workflow JSON

```text
User Flow:
┌────────────────────────────────────────────────────────────┐
│  Credentials Required                                       │
│  ───────────────────────────────────────────────────────── │
│  This workflow needs 3 services:                            │
│                                                             │
│  [x] Slack Bot Token: xoxb-*****                ✓ Saved    │
│  [ ] Apollo API Key:  [________________]        Enter now   │
│  [ ] Google Sheets:   [Connect OAuth →]         Manual      │
│                                                             │
│                              [Skip for Now] [Save & Export] │
└────────────────────────────────────────────────────────────┘
```

**Technical changes**:
- New component: `CredentialPreFillModal.tsx`
- Extend `user_api_keys` table to support n8n service credentials (not just AI providers)
- Modify `DeploymentPanel.tsx` to show modal before download
- Update `n8nWorkflowFormatter.ts` to inject credential placeholders

---

### Priority 2: Workflow Template Library (3-4 days)
**Current gap**: AI generates workflows from scratch each time, leading to inconsistent quality.

**Investment**:
1. Create a database table `n8n_workflow_templates` with curated, tested JSON
2. Store 6-8 common patterns (Apollo prospecting, Slack notifications, Google Sheets CRM, Email outreach)
3. During "generate" phase, AI selects and customizes templates instead of inventing
4. Allow users to save successful workflows as personal templates

```text
Template Selection Flow:
┌────────────────────────────────────────────────────────────┐
│  Recommended Templates                                      │
│  ───────────────────────────────────────────────────────── │
│                                                             │
│  [★] GhostWriter Lead Engine         12 nodes    Proven    │
│      Apollo → Score → Google Sheets → Slack                │
│                                                             │
│  [ ] Email Outreach Sequence         8 nodes     Popular   │
│      Trigger → Draft → Send → Track                        │
│                                                             │
│  [ ] Custom Generation               AI-built    Flexible  │
│      Let AI design a unique workflow                       │
│                                                             │
│                                       [Use Selected →]      │
└────────────────────────────────────────────────────────────┘
```

**Technical changes**:
- New database table: `n8n_workflow_templates`
- New component: `TemplateSelector.tsx`
- Modify `ai-orchestrator` generate action to use templates when available
- Add "Save as Template" button to successful workflow completions

---

### Priority 3: Embedded Live Session Viewer (2-3 days)
**Current gap**: The "Watch Live" link opens an external tab. Users lose context.

**Investment**:
1. Embed Browserbase debug URL in an iframe directly in the `BrowserbaseExecutionPanel`
2. Add fullscreen toggle for focused viewing
3. Show current action overlay on the iframe (e.g., "Action 3/7: Clicking Save")

```text
┌─────────────────────────────────────────────────────────────┐
│  🔴 Live Session                               [Fullscreen] │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │      [n8n Editor - Browserbase Debug Stream]         │  │
│  │                                                       │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│  Action 3/7: Configuring Slack credentials...               │
│  ███████████░░░░░░░░░░░░░░░ 43%                             │
└─────────────────────────────────────────────────────────────┘
```

**Technical changes**:
- Modify `BrowserbaseExecutionPanel.tsx` to add iframe mode
- Add `LiveSessionViewer.tsx` component with fullscreen dialog
- Ensure Browserbase debug URLs allow iframe embedding (X-Frame-Options)

---

### Priority 4: Webhook Test Triggers (1-2 days)
**Current gap**: `N8nLiveStatusPanel` shows webhook health but doesn't let users trigger test runs.

**Investment**:
1. Add "Test" button next to each detected webhook
2. Send a sample payload via `n8n-webhook-health` edge function
3. Display response status and body in a popover
4. Green/red badge based on 200 OK vs error

**Technical changes**:
- Extend `n8n-webhook-health` edge function to support POST with sample payloads
- Add `WebhookTestButton` component
- Update `N8nLiveStatusPanel.tsx` to include test buttons

---

### Priority 5: MCP Direct Deployment (1 week)
**Current gap**: Workflows are exported as JSON for manual import.

**Investment**:
1. Detect if user has n8n MCP connected (via `mcp_01kg0zqwjceb9t7q486ydv2m02`)
2. Add "Deploy Directly" button that creates/updates workflows via MCP
3. Handle version conflicts (existing workflow with same name)
4. Show deployment confirmation with workflow link

**Technical changes**:
- Integrate with `execute_workflow` MCP tool for n8n create/update operations
- Add conflict resolution UI (overwrite vs create new)
- Modify `DeploymentPanel.tsx` to show direct deploy option when MCP available

---

## Recommended Implementation Order

| Order | Feature | Effort | Impact | Why First |
|-------|---------|--------|--------|-----------|
| 1 | Credential Pre-fill | 2 days | High | Biggest friction reducer |
| 2 | Webhook Test Triggers | 1-2 days | Medium | Quick win, high visibility |
| 3 | Embedded Live Session | 2-3 days | High | "Wow" factor for demos |
| 4 | Workflow Templates | 3-4 days | High | More reliable output |
| 5 | MCP Direct Deploy | 1 week | Very High | Ultimate automation goal |

---

## Database Changes Required

### For Credential Pre-fill
```sql
-- Extend user_api_keys to support n8n service credentials
ALTER TABLE user_api_keys 
  ADD COLUMN service_type TEXT DEFAULT 'ai_provider',
  ADD COLUMN n8n_credential_id TEXT;

-- Add constraint for service types
-- service_type: 'ai_provider' | 'n8n_service' | 'webhook'
```

### For Workflow Templates
```sql
CREATE TABLE n8n_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'prospecting', 'outreach', 'crm', 'notifications'
  node_count INTEGER NOT NULL,
  workflow_json JSONB NOT NULL,
  required_credentials TEXT[] NOT NULL, -- ['slack', 'apollo', 'googleSheets']
  is_curated BOOLEAN DEFAULT false, -- true for system templates
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2), -- percentage of successful runs
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast category lookups
CREATE INDEX idx_templates_category ON n8n_workflow_templates(category);
CREATE INDEX idx_templates_curated ON n8n_workflow_templates(is_curated) WHERE is_curated = true;
```

---

## Next Steps

Choose which investment to start with. I recommend beginning with **Credential Pre-fill** as it:
1. Directly reduces the #1 friction point (manual credential configuration)
2. Builds on existing `user_api_keys` infrastructure
3. Has clear UI/UX patterns to follow
4. Can be completed in 2 days

Would you like me to implement Credential Pre-fill first, or would you prefer to start with a different investment?

