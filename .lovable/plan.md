
# Plan: One-Click AI Automation Engine with External Chat API Integration

## Executive Summary

Transform the current multi-step, manual workflow into a **single-click automation engine** that leverages external AI chat APIs (ChatGPT Pro, Claude, Grok, Perplexity, Gemini) to execute agentic actions. The system will analyze the business plan, generate n8n workflows, verify configurations, and fix issues - all automatically.

---

## Current State Analysis

### Identified Redundancies & Unnecessary Complexity

| Feature | Location | Issue |
|---------|----------|-------|
| **Duplicate n8n workflow generation** | `generate-n8n-workflow/` + `generate-n8n-workflow-from-prompt/` | Two edge functions doing similar things |
| **Multiple export formats** | `ExportPrompt.tsx` + `ExportComputerUsePrompt.tsx` | User must manually copy prompts to external AI |
| **Scattered verification logic** | `VerifyFixButton`, `FixDiagnosisDialog`, `NodeFixActions` | User manually triggers each verification step |
| **Redundant implementation guides** | `ImplementationGuideDialog` + `N8nAutomationGuideDialog` | Overlapping setup checklists |
| **Manual workflow context refresh** | `WorkflowContextPanel` requires manual "Refresh Context" | Not automated |
| **Copy/paste to external AI** | Current flow requires exporting prompts and pasting | Breaks automation flow |

### Current User Journey (Too Many Steps)
```text
1. Generate business idea → 2. Save it → 3. Open automation guide → 
4. Copy setup prompt → 5. Paste to external AI → 6. Manually execute steps → 
7. Return to verify → 8. If failed, copy fix prompt → 9. Paste to AI again → 10. Repeat...
```

---

## Proposed Solution: Unified Automation Engine

### New User Journey (One Click)
```text
1. Click "🚀 Automate Everything" → 2. Watch progress → 3. Done (or review exceptions)
```

### Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ONE-CLICK AUTOMATION ENGINE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐    ┌──────────────────┐                  │
│   │   AI Providers   │    │   n8n MCP        │                  │
│   │                  │    │                  │                  │
│   │  - Perplexity    │    │  - Create        │                  │
│   │  - Claude API    │    │  - Verify        │                  │
│   │  - OpenAI        │    │  - Update        │                  │
│   │  - Gemini        │    │                  │                  │
│   └────────┬─────────┘    └────────┬─────────┘                  │
│            │                       │                             │
│            └───────────┬───────────┘                             │
│                        ▼                                         │
│   ┌────────────────────────────────────────────────────────┐    │
│   │              AUTOMATION ORCHESTRATOR                    │    │
│   │                                                        │    │
│   │  Phase 1: Analyze business plan                        │    │
│   │  Phase 2: Generate workflow JSON for all 6 stages      │    │
│   │  Phase 3: Deploy to n8n via MCP                        │    │
│   │  Phase 4: Verify each node                             │    │
│   │  Phase 5: AI-powered auto-fix for issues               │    │
│   │  Phase 6: Final validation                             │    │
│   └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create AI Provider Integration Layer

**New Edge Function: `supabase/functions/ai-orchestrator/index.ts`**

This unified edge function will:
- Accept a business idea ID and automation task
- Route requests to the appropriate AI provider (Perplexity, OpenAI, Claude, or Gemini)
- Handle streaming responses and tool calling
- Return structured agentic actions

Supported AI providers:
- **Perplexity** (requires connector): For web research and current information
- **Lovable AI Gateway** (default): For workflow generation and troubleshooting
- **Claude/OpenAI API Keys** (user-provided): For advanced agentic capabilities

### Phase 2: Build One-Click Automation Component

**New Component: `src/components/AutomationEngine.tsx`**

Features:
- Single "Automate Everything" button
- Real-time progress visualization (6 phases)
- Live n8n MCP integration for workflow deployment
- Automatic retry with AI-powered diagnosis for failures
- Results summary with actionable exceptions

UI Elements:
- Phase progress stepper (Analyze → Generate → Deploy → Verify → Fix → Validate)
- Live log stream showing AI agent actions
- Success/warning/error badges per stage
- "Review Exceptions" button for items needing human input

### Phase 3: Consolidate Edge Functions

**Merge into single intelligent endpoint:**

| Old Functions | New Unified Function |
|---------------|---------------------|
| `generate-n8n-workflow/` | → `ai-orchestrator/` with `action: "generate"` |
| `generate-n8n-workflow-from-prompt/` | → `ai-orchestrator/` with `action: "generate-stage"` |
| `verify-n8n-workflow/` | → `ai-orchestrator/` with `action: "verify"` |
| `verify-step/` | → `ai-orchestrator/` with `action: "verify-step"` |
| `diagnose-fix/` | → `ai-orchestrator/` with `action: "diagnose"` |

This reduces API surface and enables orchestrated multi-step workflows.

### Phase 4: Add External AI API Support

**New Settings Page Section or Connector Support:**

Add support for user-provided API keys:
1. **ChatGPT Pro / OpenAI API** - For GPT-4/5 agentic capabilities
2. **Claude API** - For Anthropic's computer use features  
3. **Perplexity API** - Via connector (already available)
4. **Gemini API** - Via Lovable AI gateway (already integrated)

Each provider enables different capabilities:
- Perplexity: Real-time research for lead sources, pricing validation
- Claude: Complex multi-step reasoning for workflow design
- GPT-4/5: Tool calling for structured outputs
- Gemini: Default fallback with Lovable AI gateway

### Phase 5: Remove Redundant UI

**Components to Simplify/Consolidate:**

1. **Merge `ImplementationGuideDialog` + `N8nAutomationGuideDialog`** into single unified guide
2. **Remove `ExportPrompt.tsx`** - No longer needed; AI executes directly
3. **Remove `ExportComputerUsePrompt.tsx`** - Replaced by direct AI integration
4. **Simplify `BusinessIdeaDialog`** - Add single "Automate" button instead of multiple export options

### Phase 6: Enhance MCP Integration

**Upgrade n8n MCP workflow:**

1. Auto-detect when MCP is connected
2. If connected: Deploy workflows directly via MCP
3. If not connected: Fall back to JSON download with one-click import instructions
4. Add "Enable Automation" setup wizard for first-time users

---

## Technical Details

### New Database Schema

```sql
-- Track automation runs
CREATE TABLE automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_idea_id UUID NOT NULL REFERENCES business_ideas(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  current_phase TEXT,
  phases_completed JSONB DEFAULT '[]',
  errors JSONB DEFAULT '[]',
  ai_provider TEXT, -- 'lovable', 'openai', 'claude', 'perplexity'
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Store AI provider credentials (encrypted in secrets, reference here)
-- Note: Actual keys stored in Supabase secrets, not this table
CREATE TABLE user_ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  preferred_provider TEXT DEFAULT 'lovable',
  openai_configured BOOLEAN DEFAULT false,
  claude_configured BOOLEAN DEFAULT false,
  perplexity_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New Component Structure

```text
src/components/
├── AutomationEngine/
│   ├── index.tsx              # Main one-click button
│   ├── AutomationProgress.tsx # Phase stepper with live updates
│   ├── PhaseCard.tsx          # Individual phase status
│   ├── LiveLogStream.tsx      # Real-time AI action log
│   ├── ExceptionReview.tsx    # Items needing human input
│   └── ProviderSelector.tsx   # AI provider preference
├── BusinessIdeaDialog.tsx     # Simplified with "Automate" button
└── (consolidated guides)
```

### API Flow

```text
User clicks "Automate Everything"
         │
         ▼
┌─────────────────────────────────────┐
│  POST /functions/v1/ai-orchestrator │
│  {                                  │
│    businessIdeaId: "...",           │
│    action: "full-automation",       │
│    aiProvider: "lovable"            │
│  }                                  │
└─────────────────────────────────────┘
         │
         ▼
   ┌─────────────────┐
   │ Phase 1: Analyze│ → Extract ICP, services, automation needs
   └────────┬────────┘
            ▼
   ┌─────────────────┐
   │ Phase 2: Generate│ → Create n8n JSON for 6 stages (parallel)
   └────────┬────────┘
            ▼
   ┌─────────────────┐
   │ Phase 3: Deploy │ → If MCP: create workflows via API
   └────────┬────────┘      Else: prepare download bundle
            ▼
   ┌─────────────────┐
   │ Phase 4: Verify │ → Check each node configuration
   └────────┬────────┘
            ▼
   ┌─────────────────┐
   │ Phase 5: Fix    │ → AI diagnoses and suggests fixes
   └────────┬────────┘
            ▼
   ┌─────────────────┐
   │ Phase 6: Validate│ → Final end-to-end test
   └────────┬────────┘
            ▼
       Return summary
```

---

## Files to Create

1. `supabase/functions/ai-orchestrator/index.ts` - Unified AI orchestration endpoint
2. `src/components/AutomationEngine/index.tsx` - Main one-click component
3. `src/components/AutomationEngine/AutomationProgress.tsx` - Progress visualization
4. `src/components/AutomationEngine/LiveLogStream.tsx` - Real-time log display
5. `src/components/AutomationEngine/ExceptionReview.tsx` - Human review panel
6. `src/hooks/useAutomationRun.ts` - Hook for managing automation state

## Files to Modify

1. `src/components/BusinessIdeaDialog.tsx` - Add "Automate Everything" button
2. `src/pages/Dashboard.tsx` - Add automation status indicators
3. `supabase/config.toml` - Register new edge function

## Files to Remove (After Migration)

1. `src/pages/ExportPrompt.tsx` - Replaced by direct automation
2. `src/pages/ExportComputerUsePrompt.tsx` - Replaced by direct automation
3. Potentially consolidate `generate-n8n-workflow/` and `generate-n8n-workflow-from-prompt/`

---

## User Experience

### Before (Current)
- 15+ clicks to set up automation
- Manual copy/paste between apps
- No visibility into what AI is doing
- Errors require manual diagnosis

### After (Proposed)
- 1 click to start full automation
- AI handles everything automatically
- Live progress stream shows each step
- Automatic error recovery with human review only when needed

---

## Success Metrics

- **Time to first automated workflow**: From ~2 hours → ~5 minutes
- **User clicks required**: From 15+ → 1
- **Manual interventions**: From always → only for exceptions
- **Setup abandonment rate**: Expected 70% reduction

---

## Connector Requirements

To enable external AI providers:
1. **Perplexity** - Already available as connector
2. **OpenAI/Claude** - Consider adding as connectors or use secret management

The plan prioritizes using the existing Lovable AI gateway while enabling power users to bring their own API keys for enhanced capabilities.
