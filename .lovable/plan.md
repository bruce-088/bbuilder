
# Plan: Enhance Director.ai Fix Prompt for Computer Use Agents

## Problem Summary
The current "Copy Fix Details" button generates a basic text summary that's not optimized for Director.ai or Claude Computer Use. Users report that when they paste the fix prompt into these automation tools, the AI agents don't have enough context to perform the actual fix actions.

## Root Cause Analysis
The `getFixDetailsText` function in `ExceptionReview.tsx` creates a minimal text format that lacks:
- n8n instance URL and workflow path for navigation
- Business context (name, niche, target audience)
- Structured browser actions with specific UI paths
- Validation criteria to verify fixes worked
- Credentials configuration guidance

## Solution Overview
Create a dedicated `generateDirectorAiFixPrompt` function that produces rich, structured prompts specifically designed for computer use AI agents, similar to the existing `directorAiPromptGenerator.ts` and `diagnose-fix` edge function patterns.

---

## Technical Implementation

### 1. Create New Fix Prompt Generator
**File:** `src/lib/directorAiFixPromptGenerator.ts`

Create a new utility that generates Director.ai-compatible fix prompts with:

```text
# TASK: Fix Automation Issue - [Phase Name]
## MODE: BROWSER AUTOMATION FIX

## ENVIRONMENT CONFIGURATION
- n8n Instance URL: [user's instance URL]
- Workflow Dashboard: [full workflow path]
- MCP Server: [mcp URL]

## BUSINESS CONTEXT
- Business Name: [name]
- Niche: [niche]
- Target Audience: [audience]

## ISSUE DIAGNOSIS
- Phase: [phase]
- Root Cause: [detailed root cause]
- Confidence Level: [high/medium/low]
- Automation Type: [automatable/manual]

## BROWSER ACTIONS REQUIRED
### Step 1: Navigate to n8n Instance
1. Open browser and navigate to: [exact URL]
2. Wait for page to load (look for n8n logo)
3. If login required, enter credentials

### Step 2: [Action Title]
1. [Specific click action with element name]
2. [Specific input action with field name and value]
3. [Wait/verification action]

... (remaining steps)

## VALIDATION CRITERIA
After completing all steps, verify:
- [ ] [Specific check 1]
- [ ] [Specific check 2]
- [ ] [Specific check 3]

## ERROR HANDLING
If you encounter issues:
1. Take a screenshot of the current state
2. Describe the error message or unexpected behavior
3. Try alternative approach: [fallback steps]

## REPORT FORMAT
After completing fix, report:
| Field | Value |
|-------|-------|
| Fix Status | [FIXED / PARTIAL / BLOCKED] |
| Actions Taken | [Summary] |
| Verification Result | [PASS / FAIL] |
```

### 2. Update ExceptionReview Component
**File:** `src/components/AutomationEngine/ExceptionReview.tsx`

Changes:
- Add props for business idea context and n8n configuration
- Create new `getDirectorAiFixPrompt` function that uses the generator
- Update `FixGuidancePopover` to receive the enhanced prompt
- Fetch business idea and n8n settings from state/context

### 3. Update FixGuidancePopover Component
**File:** `src/components/AutomationEngine/FixGuidancePopover.tsx`

Changes:
- Accept separate props for basic `fixDetails` and enhanced `directorAiPrompt`
- Use the enhanced prompt when copying for Director.ai
- Show a preview of what format will be copied

### 4. Update AutomationEngine to Pass Context
**File:** `src/components/AutomationEngine/index.tsx`

Changes:
- Fetch business idea details when component mounts
- Retrieve n8n configuration from user settings or n8n context hook
- Pass business context and n8n options to ExceptionReview

### 5. Create/Update Types
**File:** `src/lib/directorAiPromptGenerator.ts`

Export `DirectorAiOptions` interface for reuse across components.

---

## Key Features of Enhanced Prompt

1. **Specific Navigation URLs** - Uses user's actual n8n instance URL, not defaults
2. **Browser Action Steps** - Detailed click-by-click instructions with element names
3. **Business Personalization** - Includes business name in workflow names, audience in configurations
4. **Validation Checklist** - Concrete success criteria the AI can verify
5. **Error Handling Section** - Fallback instructions if primary approach fails
6. **Report Template** - Structured format for the AI to report results

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/directorAiFixPromptGenerator.ts` | Create | New fix prompt generator utility |
| `src/components/AutomationEngine/ExceptionReview.tsx` | Modify | Add context props, use new generator |
| `src/components/AutomationEngine/FixGuidancePopover.tsx` | Modify | Accept enhanced prompt, improve copy behavior |
| `src/components/AutomationEngine/index.tsx` | Modify | Fetch and pass business/n8n context |

---

## Expected Outcome

When users click "Copy Fix Details" and paste into Director.ai:
- The AI agent will know exactly which URL to navigate to
- It will have step-by-step browser actions with specific UI element names
- It will understand the business context for naming and configuration
- It will have clear validation criteria to confirm the fix worked
- It will know how to handle errors and report results
