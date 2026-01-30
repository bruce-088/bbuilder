
# Update Workflow Name Pattern: Lead Prospecting & Discovery Engine

## Problem Summary
The Live n8n Verification is searching for "GhostWriter AI: The Authority Engine - Complete Sales Automation" but the user's actual workflow is named **"GhostWriter AI: Lead Prospecting & Discovery Engine"**. This causes the verification to fail with "Workflow not found" even though the workflow exists.

## Solution Overview
Update all hardcoded references to the workflow name across the codebase to use the correct pattern: "GhostWriter AI: Lead Prospecting & Discovery Engine"

---

## Changes Required

### 1. Update Frontend Component State

**File:** `src/components/N8nAutomationGuideDialog.tsx`

| Line | Current Value | New Value |
|------|---------------|-----------|
| 768 | `"GhostWriter AI: The Authority Engine - Complete Sales Automation"` | `"GhostWriter AI: Lead Prospecting & Discovery Engine"` |
| 983 | `"Ensure the workflow is named 'GhostWriter AI: The Authority Engine'"` | `"Ensure the workflow is named 'GhostWriter AI: Lead Prospecting & Discovery Engine'"` |
| 2808 | Placeholder: `"GhostWriter AI: The Authority Engine - Complete Sales Automation"` | `"GhostWriter AI: Lead Prospecting & Discovery Engine"` |

### 2. Update Edge Function Messages

**File:** `supabase/functions/verify-n8n-workflow/index.ts`

| Line | Current Value | New Value |
|------|---------------|-----------|
| 248 | `'${workflowNamePattern || 'GhostWriter AI'}: The Authority Engine'` | `'${workflowNamePattern || 'GhostWriter AI: Lead Prospecting & Discovery Engine'}'` |
| 275 | `"GhostWriter AI: The Authority Engine"` | `"GhostWriter AI: Lead Prospecting & Discovery Engine"` |

### 3. Update Workflow Name Pattern Matching

**File:** `src/lib/n8nWorkflowVerification.ts`

Add "lead prospecting" to the `isGhostWriterWorkflow` function:

```typescript
export function isGhostWriterWorkflow(workflowName: string): boolean {
  const lowerName = workflowName.toLowerCase();
  return (
    lowerName.includes('ghostwriter') ||
    lowerName.includes('authority engine') ||
    lowerName.includes('sales automation') ||
    lowerName.includes('complete automation') ||
    lowerName.includes('lead prospecting')  // Add this
  );
}
```

Also add to `expectedWorkflowNamePatterns` array (line 245-256):
```typescript
export const expectedWorkflowNamePatterns = [
  "GhostWriter",
  "Authority Engine",
  "Sales Automation",
  "Lead Prospecting",
  "Lead Prospecting & Discovery Engine",  // Add this
  "Outreach",
  "Qualification",
  "Proposal",
  "Closing",
  "Client Success",
  "Retention"
];
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/N8nAutomationGuideDialog.tsx` | Update default state value, suggestion text, and placeholder |
| `supabase/functions/verify-n8n-workflow/index.ts` | Update suggestion messages referencing workflow name |
| `src/lib/n8nWorkflowVerification.ts` | Add "lead prospecting" pattern to workflow matching |

---

## Expected Result

After these changes:
- The verification will look for "GhostWriter AI: Lead Prospecting & Discovery Engine" by default
- Suggestion messages will reference the correct workflow name
- The pattern matching will recognize workflows with "Lead Prospecting" in the name
- The user's existing workflow will be found during verification
