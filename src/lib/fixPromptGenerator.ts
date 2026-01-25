import { VerificationData } from "./verificationPromptGenerator";

export interface BusinessIdeaData {
  businessName: string;
  niche: string;
  targetAudience: string;
  serviceOffering?: string;
}

export function generateFixPrompt(
  stepText: string,
  verificationData: VerificationData,
  stageTitle: string,
  businessIdea: BusinessIdeaData,
  diagnosis: string
): string {
  return `# Task: Fix Failed Verification Step - ${stageTitle}

## Mode: REMEDIATION
This is a FIX task. Perform the actions needed to resolve the failed verification.

## Business Context
\`\`\`json
{
  "business_name": "${businessIdea.businessName}",
  "niche": "${businessIdea.niche}",
  "target_audience": "${businessIdea.targetAudience}"
}
\`\`\`

## Failed Step Details
**Stage:** ${stageTitle}
**Original Instruction:** ${stepText}

## What Was Being Verified
${verificationData.checkDescription}

## Why It Failed (Diagnosis)
${diagnosis}

## Fix Actions
Execute the following actions to resolve this issue:

${verificationData.automatedActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

## Post-Fix Verification
After completing the fix, verify success by checking:

${verificationData.successIndicators.map(indicator => `✅ ${indicator}`).join('\n')}

## Report Format
After fixing, provide a status report:

| Field | Value |
|-------|-------|
| Fix Status | [FIXED / PARTIAL / BLOCKED] |
| Actions Taken | [Summary of what was done] |
| Verification Result | [PASS / FAIL] |
| Notes | [Any additional observations] |

## Error Handling
If you encounter blockers:
1. Document the specific error or issue
2. Note which step failed
3. Suggest alternative approaches if available
`;
}

export function generateQuickFixPrompt(
  stepText: string,
  verificationData: VerificationData,
  stageTitle: string
): string {
  return `# Quick Fix: ${stageTitle}

## Issue
Failed to verify: ${verificationData.checkDescription}

## Original Step
${stepText}

## Failure Indicators Detected
${verificationData.failureIndicators.map(f => `❌ ${f}`).join('\n')}

## Fix Actions Required
${verificationData.automatedActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

## Success Criteria
${verificationData.successIndicators.map(s => `✅ ${s}`).join('\n')}

Execute these fix actions and report status: FIXED | PARTIAL | BLOCKED
`;
}
