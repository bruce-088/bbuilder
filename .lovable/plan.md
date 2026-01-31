

## Plan: Automate Manual AI Fixes & Clarify Copy Fix Details Usage

### Overview

This plan enhances the Exception Review system to allow AI to not just recommend fixes, but also **execute automatable fixes** and clearly guide users on where to use the copied fix details.

---

### Part 1: Categorize Fixes into Automatable vs Manual

Currently, all fixes are marked as `requiresManualAction: true`. We'll enhance the AI response to distinguish between:

**Automatable Fixes** (can be executed by AI):
- Updating node parameters via n8n API
- Generating corrected workflow JSON for re-import
- Creating credentials configuration templates
- Triggering re-validation after changes

**Manual Fixes** (require user intervention):
- OAuth authentication flows (user must click "Authorize")
- API key retrieval from external services
- Billing/payment issues
- Third-party dashboard configurations

### Part 2: Add "Execute Fix" Button for Automatable Items

**New UI Elements in `ExceptionReview.tsx`:**
```text
┌─────────────────────────────────────────────────────────┐
│ 💡 AI Fix Recommendations                    2 fixes   │
├─────────────────────────────────────────────────────────┤
│ ▼ Verify Phase Fix - Configure HubSpot credentials     │
│   ├── 🔴 Manual Action Required                        │
│   │   ┌─────────────────────────────────────────────┐  │
│   │   │ [Copy Fix Details] [Open in Mya Chat]       │  │
│   │   └─────────────────────────────────────────────┘  │
│   │                                                    │
│ ▼ Generate Phase Fix - Update webhook URL              │
│   ├── 🟢 Can be Automated                              │
│   │   ┌─────────────────────────────────────────────┐  │
│   │   │ [Execute Fix] [Copy Fix Details]            │  │
│   │   └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Part 3: Implement Fix Execution Flow

**New Action in `ai-orchestrator`:**
- Add `execute-fix` action that can:
  1. Generate corrected n8n workflow JSON
  2. Save updated workflow snapshot
  3. Provide direct import instructions

**New Hook Method in `useAutomationRun`:**
```typescript
executeAIFix: (businessIdeaId: string, fix: AIFix) => Promise<{
  success: boolean;
  message: string;
  updatedWorkflowJson?: object;
  importUrl?: string;
}>
```

### Part 4: Add "Use This Prompt" Guidance Panel

When users click **"Copy Fix Details"**, show a tooltip/popover explaining where to paste:

```text
┌─────────────────────────────────────────────────────────┐
│ 📋 Fix Details Copied!                                  │
│                                                         │
│ Paste this prompt in:                                   │
│                                                         │
│ • 💬 Mya Chat - Get step-by-step walkthrough           │
│   [Open Chat with Fix Context →]                        │
│                                                         │
│ • 🤖 Director.ai / Claude Computer Use                  │
│   For automated browser-based fixes                     │
│                                                         │
│ • 📝 n8n Workflow Editor                                │
│   Reference while manually configuring nodes            │
└─────────────────────────────────────────────────────────┘
```

### Part 5: "Chat with Mya" Quick Action

Add a button that opens the Chat page with the fix context pre-loaded:

**Implementation:**
- Add "Chat with Mya" button next to "Copy Fix Details"
- Use React Router's `navigate()` with state to pass fix context
- Mya will receive the fix details and provide interactive guidance

---

### Technical Changes

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/components/AutomationEngine/ExceptionReview.tsx` | Add fix categorization UI, execute button, guidance popover, chat navigation |
| `src/hooks/useAutomationRun.ts` | Add `executeAIFix` method |
| `supabase/functions/ai-orchestrator/index.ts` | Add `execute-fix` action, enhance `apply-fixes` to categorize automatable vs manual |

**Files to Create:**

| File | Purpose |
|------|---------|
| `src/components/AutomationEngine/FixGuidancePopover.tsx` | Popover explaining where to use copied fix details |

---

### Enhanced AI Prompt for Fix Categorization

Update the `apply-fixes` prompt to include:

```json
{
  "fixes": [
    {
      "phase": "string",
      "rootCause": "string",
      "solution": "string",
      "steps": ["step1", "step2"],
      "prevention": "string",
      "confidence": "high" | "medium" | "low",
      "automatable": boolean,
      "automationMethod": "workflow_json" | "api_call" | "none",
      "workflowPatch": { /* optional corrected node config */ },
      "requiredUserAction": "string (if not automatable)"
    }
  ]
}
```

---

### User Flow After Implementation

1. User runs automation → sees exceptions
2. User clicks "Apply Fixes" → AI analyzes and categorizes
3. For **automatable fixes**: User clicks "Execute Fix" → AI applies changes
4. For **manual fixes**: User clicks "Copy Fix Details" → sees guidance popover
5. User can click "Chat with Mya" to get interactive help with the fix context

---

### Answer to Your Questions

**Q: Can manual action fixes be automated with AI?**
A: Yes! Many fixes CAN be automated by:
- Generating corrected workflow JSON
- Providing import-ready configurations
- Auto-updating snapshots via the data proxy

The key is categorizing which fixes need OAuth/human auth vs which are just configuration updates.

**Q: Where to put the copied fix details prompt?**
A: The prompt works best in:
1. **Mya Chat** (built-in) - For interactive, step-by-step guidance
2. **Director.ai / Claude Computer Use** - For browser automation
3. **n8n Editor** - As reference while manually editing

