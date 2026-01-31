
# Plan: Align Enhanced Director.ai Fix Prompts with N8N Automation Guide Format

## Problem Analysis
The enhanced Director.ai fix prompts in `ExceptionReview` use a different format than the prompts generated in the N8N Full Automation Setup Guide (`FixDiagnosisDialog` and `verificationPromptGenerator.ts`). The automation guide prompts include:

- VerificationData with specific check descriptions, automated actions, success/failure indicators
- JSON business context blocks
- Clear mode declarations ("REMEDIATION" vs "VERIFICATION")
- Structured report format tables

The current fix prompts in ExceptionReview generate generic browser actions based on phase name matching rather than using the actual verification data.

---

## Solution: Refactor to Match Guide Format

Update `directorAiFixPromptGenerator.ts` to produce prompts that exactly match the structure and style used in `fixPromptGenerator.ts` and `verificationPromptGenerator.ts`.

---

## Technical Changes

### 1. Update `src/lib/directorAiFixPromptGenerator.ts`

Restructure the prompt format to match the N8N guide style:

**New Format Structure:**
```text
# Task: Fix Automation Issue - [Phase] Phase
## Mode: BROWSER AUTOMATION REMEDIATION

⚠️ This is a FIX task. Perform the actions needed to resolve the failed verification.

## Business Context
```json
{
  "business_name": "[name]",
  "niche": "[niche]",
  "target_audience": "[audience]",
  "service_offering": "[offering]"
}
```

## N8N Environment
| Setting | Value |
|---------|-------|
| Instance URL | [url] |
| Workflow Dashboard | [url] |
| Hosting Type | [type] |

## Issue Details
**Phase:** [phase name]
**Root Cause:** [root cause]
**Confidence:** [HIGH/MEDIUM/LOW]

## What Was Being Verified
[check description from verification data]

## Why It Failed (Diagnosis)
[root cause + solution summary]

## Fix Actions
Execute the following browser actions to resolve this issue:

1. Navigate to [n8n URL]
2. [specific action from verification data]
3. [specific action]
...

## Post-Fix Verification
After completing the fix, verify success by checking:

✅ [success indicator 1]
✅ [success indicator 2]
...

## Failure Indicators (What to Avoid)
❌ [failure indicator 1]
❌ [failure indicator 2]
...

## Report Format
After fixing, provide a status report:

| Field | Value |
|-------|-------|
| Fix Status | [FIXED / PARTIAL / BLOCKED] |
| Phase | [phase] |
| Actions Taken | [Summary of what was done] |
| Verification Result | [PASS / FAIL] |
| Notes | [Any additional observations] |

## Error Handling
If you encounter blockers:
1. Document the specific error or issue
2. Note which step failed
3. Take a screenshot of the current state
4. Suggest alternative approaches if available

## Prevention
[prevention tip]
```

**Key Changes:**
- Use JSON code block for business context (matches guide format)
- Include verification data (checkDescription, automatedActions, successIndicators, failureIndicators)
- Add mode declaration with warning icon
- Use success/failure indicator format with checkmarks/X marks
- Simplify environment config to essential fields
- Match the exact report format table structure

### 2. Update Interface to Accept VerificationData

Add `verificationData` to the `FixPromptContext` interface:

```typescript
import { VerificationData } from "./verificationPromptGenerator";

export interface FixPromptContext {
  issue: FixIssue;
  businessContext?: BusinessContext;
  n8nOptions?: DirectorAiOptions;
  workflowNodes?: N8nNodeContext[];
  verificationData?: VerificationData; // NEW: Match guide format
}
```

### 3. Update `ExceptionReview.tsx` to Pass VerificationData

When calling `generateDirectorAiFixPrompt`, include verification data derived from the AIFix context:

```typescript
const getDirectorAiPrompt = (fix: AIFix): string => {
  // ... existing code ...
  
  // Create verification data from fix context
  const verificationData: VerificationData = {
    checkDescription: fix.description,
    automatedActions: fixIssue.steps,
    successIndicators: [
      "Workflow executes without errors",
      "Expected output data appears",
      `${fix.phase} phase shows as complete`
    ],
    failureIndicators: [
      "Error indicators on nodes",
      "Workflow fails to execute",
      "Missing credentials or configuration"
    ]
  };
  
  return generateDirectorAiFixPrompt({
    issue: fixIssue,
    businessContext: businessContext || undefined,
    n8nOptions: n8nOptions || undefined,
    verificationData
  });
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/directorAiFixPromptGenerator.ts` | Restructure prompt format to match guide style, add VerificationData interface |
| `src/components/AutomationEngine/ExceptionReview.tsx` | Pass verificationData when generating prompts |

---

## Expected Output Example

When a user clicks "Copy Fix Details" for a Prospecting phase issue, the prompt will look like:

```text
# Task: Fix Automation Issue - Lead Prospecting Phase
## Mode: BROWSER AUTOMATION REMEDIATION

⚠️ This is a FIX task. Perform the actions needed to resolve the failed verification.

## Business Context
```json
{
  "business_name": "Acme Consulting",
  "niche": "B2B SaaS",
  "target_audience": "VP of Sales at mid-market companies",
  "service_offering": "Sales automation consulting"
}
```

## N8N Environment
| Setting | Value |
|---------|-------|
| Instance URL | https://n8n.srv1230972.hstgr.cloud |
| Workflow Dashboard | https://n8n.srv1230972.hstgr.cloud/projects/abc/workflows |
| Hosting Type | Hostinger VPS |

## Issue Details
**Phase:** Lead Prospecting
**Root Cause:** Apollo.io API credentials not configured
**Confidence:** HIGH

## What Was Being Verified
Verify Apollo.io API key is valid and has sufficient credits

## Why It Failed (Diagnosis)
The HTTP Request node for Apollo.io is missing the x-api-key header configuration.

## Fix Actions
Execute the following browser actions to resolve this issue:

1. Navigate to https://n8n.srv1230972.hstgr.cloud/projects/abc/workflows
2. Click on the workflow named 'Lead Prospecting'
3. Double-click the HTTP Request node for Apollo.io
4. In the Headers section, add: x-api-key = [Your Apollo API Key]
5. Click 'Save' button
6. Click 'Test workflow' to verify

## Post-Fix Verification
After completing the fix, verify success by checking:

✅ Apollo.io node shows successful test execution
✅ Response contains lead data
✅ No error indicators on any nodes

## Failure Indicators (What to Avoid)
❌ 401 Unauthorized response
❌ Empty or error response from API
❌ Red error indicator on node

## Report Format
After fixing, provide a status report:

| Field | Value |
|-------|-------|
| Fix Status | [FIXED / PARTIAL / BLOCKED] |
| Phase | Lead Prospecting |
| Actions Taken | [Summary of what was done] |
| Verification Result | [PASS / FAIL] |
| Notes | [Any additional observations] |

## Error Handling
If you encounter blockers:
1. Document the specific error or issue
2. Note which step failed
3. Take a screenshot of the current state
4. Suggest alternative approaches if available

## Prevention
Store API keys in n8n Credentials manager, not hardcoded in nodes.
```

This format exactly matches the style used in the N8N Automation Guide's "Director.ai Full Prompt" button.
