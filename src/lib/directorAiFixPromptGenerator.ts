import { DirectorAiOptions } from "./directorAiPromptGenerator";
import { VerificationData } from "./verificationPromptGenerator";

export interface BusinessContext {
  businessName: string;
  niche: string;
  targetAudience: string;
  serviceOffering?: string;
  valueProposition?: string;
}

export interface FixIssue {
  phase: string;
  rootCause: string;
  solution: string;
  steps: string[];
  prevention: string;
  confidence: "high" | "medium" | "low";
  automatable: boolean;
  automationMethod?: "workflow_json" | "api_call" | "none";
  requiredUserAction?: string;
  workflowPatch?: Record<string, unknown>;
}

interface N8nNodeContext {
  name: string;
  type: string;
  status: "configured" | "incomplete" | "missing";
  missingFields?: string[];
}

export interface FixPromptContext {
  issue: FixIssue;
  businessContext?: BusinessContext;
  n8nOptions?: DirectorAiOptions;
  workflowNodes?: N8nNodeContext[];
  verificationData?: VerificationData;
}

function getN8nUrlInfo(options?: DirectorAiOptions): { instanceUrl: string; workflowUrl: string; hostingType: string } {
  const instanceUrl = options?.n8nInstanceUrl?.replace(/\/$/, "") || "[YOUR_N8N_INSTANCE_URL]";
  const workflowUrl = options?.n8nWorkflowPath?.replace(/\/$/, "") || instanceUrl;
  
  let hostingType = "Self-hosted";
  if (options?.hostingType === "cloud") hostingType = "n8n Cloud";
  else if (options?.deploymentMethod === "hostinger") hostingType = "Hostinger VPS";
  else if (options?.deploymentMethod === "docker") hostingType = "Docker";
  
  return { instanceUrl, workflowUrl, hostingType };
}

function generateDefaultVerificationData(issue: FixIssue): VerificationData {
  const phase = issue.phase.toLowerCase();
  
  // Generate context-aware verification data based on phase
  const successIndicators: string[] = [
    "Workflow executes without errors",
    "Expected output data appears",
    `${issue.phase} phase shows as complete`
  ];
  
  const failureIndicators: string[] = [
    "Error indicators on nodes",
    "Workflow fails to execute",
    "Missing credentials or configuration"
  ];
  
  // Add phase-specific indicators
  if (phase.includes("prospect") || phase.includes("lead")) {
    successIndicators.push("Apollo.io/data source node shows 'Connected' status");
    successIndicators.push("Test execution returns sample lead data");
    failureIndicators.push("401 Unauthorized response from API");
  } else if (phase.includes("outreach") || phase.includes("email")) {
    successIndicators.push("Gmail node shows 'Connected' with green checkmark");
    successIndicators.push("Test email sends successfully");
    failureIndicators.push("OAuth authentication expired");
  } else if (phase.includes("qualif")) {
    successIndicators.push("Webhook URL is accessible externally");
    successIndicators.push("Lead score calculation returns numeric value");
    failureIndicators.push("OpenAI API key missing or invalid");
  }
  
  return {
    checkDescription: issue.solution,
    automatedActions: issue.steps,
    successIndicators,
    failureIndicators
  };
}

export function generateDirectorAiFixPrompt(context: FixPromptContext): string {
  const { issue, businessContext, n8nOptions, verificationData: providedVerificationData } = context;
  const urlInfo = getN8nUrlInfo(n8nOptions);
  
  // Use provided verification data or generate defaults
  const verificationData = providedVerificationData || generateDefaultVerificationData(issue);
  
  // Build the prompt matching the N8N guide format
  let prompt = `# Task: Fix Automation Issue - ${issue.phase} Phase
## Mode: BROWSER AUTOMATION REMEDIATION

⚠️ This is a FIX task. Perform the actions needed to resolve the failed verification.

`;

  // Business context as JSON block (matches guide format)
  if (businessContext) {
    const contextJson = JSON.stringify({
      business_name: businessContext.businessName,
      niche: businessContext.niche,
      target_audience: businessContext.targetAudience,
      service_offering: businessContext.serviceOffering || "Not specified"
    }, null, 2);
    
    prompt += `## Business Context
\`\`\`json
${contextJson}
\`\`\`

`;
  }

  // N8N Environment table (simplified to match guide format)
  prompt += `## N8N Environment
| Setting | Value |
|---------|-------|
| Instance URL | ${urlInfo.instanceUrl} |
| Workflow Dashboard | ${urlInfo.workflowUrl} |
| Hosting Type | ${urlInfo.hostingType} |

`;

  // Issue details
  prompt += `## Issue Details
**Phase:** ${issue.phase}
**Root Cause:** ${issue.rootCause}
**Confidence:** ${issue.confidence.toUpperCase()}

`;

  // What was being verified (from verification data)
  prompt += `## What Was Being Verified
${verificationData.checkDescription}

`;

  // Why it failed (diagnosis)
  prompt += `## Why It Failed (Diagnosis)
${issue.rootCause}${issue.solution ? `\n\n**Solution:** ${issue.solution}` : ""}

`;

  // Fix actions from verification data
  prompt += `## Fix Actions
Execute the following browser actions to resolve this issue:

`;
  
  // Add navigation step first
  prompt += `1. Navigate to ${urlInfo.workflowUrl}\n`;
  
  // Add remaining actions from verification data
  verificationData.automatedActions.forEach((action, i) => {
    prompt += `${i + 2}. ${action}\n`;
  });

  prompt += `
## Post-Fix Verification
After completing the fix, verify success by checking:

`;
  
  verificationData.successIndicators.forEach(indicator => {
    prompt += `✅ ${indicator}\n`;
  });

  prompt += `
## Failure Indicators (What to Avoid)
`;
  
  verificationData.failureIndicators.forEach(indicator => {
    prompt += `❌ ${indicator}\n`;
  });

  prompt += `
## Report Format
After fixing, provide a status report:

| Field | Value |
|-------|-------|
| Fix Status | [FIXED / PARTIAL / BLOCKED] |
| Phase | ${issue.phase} |
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
${issue.prevention}
`;

  return prompt;
}

/**
 * Generate a simplified fix prompt for quick copy
 */
export function generateQuickFixPrompt(issue: FixIssue, n8nOptions?: DirectorAiOptions): string {
  const urlInfo = getN8nUrlInfo(n8nOptions);
  
  return `Fix "${issue.phase}" phase issue in n8n:

URL: ${urlInfo.workflowUrl}
Problem: ${issue.rootCause}
Solution: ${issue.solution}

Steps:
${issue.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

After fixing, verify the workflow executes without errors.`;
}
