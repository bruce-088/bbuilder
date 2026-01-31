import { DirectorAiOptions } from "./directorAiPromptGenerator";

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
}

function getN8nUrlInfo(options?: DirectorAiOptions): { instanceUrl: string; workflowUrl: string; mcpUrl: string } {
  const instanceUrl = options?.n8nInstanceUrl?.replace(/\/$/, "") || "[YOUR_N8N_INSTANCE_URL]";
  const workflowUrl = options?.n8nWorkflowPath?.replace(/\/$/, "") || instanceUrl;
  const mcpUrl = `${instanceUrl}/mcp-server/http`;
  
  return { instanceUrl, workflowUrl, mcpUrl };
}

function getHostingDescription(options?: DirectorAiOptions): string {
  if (options?.hostingType === "cloud") return "n8n Cloud";
  if (options?.deploymentMethod === "hostinger") return "Hostinger VPS";
  if (options?.deploymentMethod === "docker") return "Docker";
  return "Self-hosted";
}

function generateNavigationSteps(urlInfo: ReturnType<typeof getN8nUrlInfo>, options?: DirectorAiOptions): string[] {
  const steps: string[] = [
    `Open browser and navigate to: ${urlInfo.workflowUrl}`,
    "Wait for page to load completely (look for n8n logo in header)",
  ];
  
  if (options?.hostingType === "self-hosted") {
    steps.push("If login page appears, enter your n8n credentials");
    if (options?.deploymentMethod === "hostinger") {
      steps.push("Hostinger credentials can be found in: hpanel.hostinger.com → Hosting → Manage → Applications → n8n");
    }
  } else if (options?.hostingType === "cloud") {
    steps.push("Sign in with your n8n Cloud account if prompted");
  }
  
  steps.push("Verify you can see the workflow canvas or workflow list");
  
  return steps;
}

function generateBrowserActionsForPhase(issue: FixIssue, urlInfo: ReturnType<typeof getN8nUrlInfo>): string[] {
  const actions: string[] = [];
  const phase = issue.phase.toLowerCase();
  
  // Common n8n UI actions based on phase
  if (phase.includes("prospect") || phase.includes("lead")) {
    actions.push(
      "Click on the workflow named with 'Prospecting' or 'Lead' in the title",
      "Look for nodes with warning indicators (yellow triangle)",
      "Double-click on the problematic node to open its settings panel",
      "Check the 'Credentials' dropdown - select or create the required credential",
      "For API Key fields, click the field and enter your API key",
      "Click 'Save' button in the top-right corner",
      "Click 'Test workflow' or 'Execute' to verify the fix"
    );
  } else if (phase.includes("outreach") || phase.includes("email")) {
    actions.push(
      "Click on the workflow named with 'Outreach' in the title",
      "Locate the Gmail/SMTP node (usually shows email icon)",
      "Double-click to open settings",
      "In 'Credentials' section, click 'Select Credential'",
      "If no credential exists, click 'Create New Credential'",
      "Follow OAuth flow: Click 'Sign in with Google' → Select account → Grant permissions",
      "Return to n8n and verify 'Connected' status shows",
      "Click 'Save' and test the workflow"
    );
  } else if (phase.includes("qualif")) {
    actions.push(
      "Click on the workflow named with 'Qualification' in the title",
      "Find the Webhook node (first node in workflow)",
      "Copy the Webhook URL from node settings",
      "Verify OpenAI node has API key configured",
      "Check IF node conditions are set correctly",
      "Test with sample webhook payload"
    );
  } else if (phase.includes("deploy") || phase.includes("setup")) {
    actions.push(
      "Navigate to Settings (gear icon in bottom-left)",
      "Go to 'MCP access' section",
      "Toggle 'Enable MCP access' to ON",
      `Verify MCP URL shows: ${urlInfo.mcpUrl}`,
      "Copy this URL for Lovable connector setup"
    );
  } else {
    // Generic workflow fix actions
    actions.push(
      "Click on the relevant workflow from the list",
      "Identify nodes with error indicators (red icon) or warnings (yellow icon)",
      "Double-click the problematic node to open settings",
      "Check 'Credentials' section - ensure a valid credential is selected",
      "Verify all required fields are filled (marked with *)",
      "Click 'Save' to apply changes",
      "Click 'Test workflow' to verify the fix works"
    );
  }
  
  return actions;
}

function generateValidationCriteria(issue: FixIssue): string[] {
  const criteria: string[] = [];
  const phase = issue.phase.toLowerCase();
  
  // Base validation
  criteria.push("No error indicators (red icons) visible on any node");
  criteria.push("Workflow status shows as 'Active' (green toggle)");
  
  // Phase-specific validation
  if (phase.includes("prospect") || phase.includes("lead")) {
    criteria.push("Apollo.io/data source node shows 'Connected' status");
    criteria.push("Test execution returns sample lead data");
    criteria.push("Google Sheets shows new row added");
  } else if (phase.includes("outreach") || phase.includes("email")) {
    criteria.push("Gmail node shows 'Connected' with green checkmark");
    criteria.push("Test email sends successfully (check sent folder)");
    criteria.push("OpenAI node generates personalized content");
  } else if (phase.includes("qualif")) {
    criteria.push("Webhook URL is accessible externally");
    criteria.push("Lead score calculation returns numeric value");
    criteria.push("Slack notification triggers for test lead");
  } else if (phase.includes("proposal")) {
    criteria.push("Document generates from template correctly");
    criteria.push("PDF output is properly formatted");
    criteria.push("Email sends with attachment");
  } else if (phase.includes("closing") || phase.includes("deal")) {
    criteria.push("Contract document generates correctly");
    criteria.push("Payment link is valid and accessible");
    criteria.push("CRM status updates automatically");
  } else {
    criteria.push("Test execution completes without errors");
    criteria.push("Expected output data appears in target system");
  }
  
  return criteria;
}

function generateErrorHandling(issue: FixIssue): string[] {
  return [
    "If authentication fails:",
    "  - Clear browser cookies for n8n domain",
    "  - Try incognito/private browser window",
    "  - Verify credentials haven't expired",
    "",
    "If node still shows error after fix:",
    "  - Take a screenshot of the current state",
    "  - Check the 'Executions' tab for detailed error logs",
    "  - Try deleting and re-adding the problematic node",
    "",
    "If workflow won't save:",
    "  - Check for unsaved changes in other nodes",
    "  - Refresh page and re-apply changes",
    "  - Check browser console for JavaScript errors",
    "",
    "Fallback approach:",
    "  - Export workflow as JSON",
    "  - Delete problematic node",
    "  - Re-import and manually recreate the node",
  ];
}

export function generateDirectorAiFixPrompt(context: FixPromptContext): string {
  const { issue, businessContext, n8nOptions, workflowNodes } = context;
  const urlInfo = getN8nUrlInfo(n8nOptions);
  const hostingDesc = getHostingDescription(n8nOptions);
  
  const navigationSteps = generateNavigationSteps(urlInfo, n8nOptions);
  const browserActions = generateBrowserActionsForPhase(issue, urlInfo);
  const validationCriteria = generateValidationCriteria(issue);
  const errorHandling = generateErrorHandling(issue);
  
  // Build the comprehensive prompt
  let prompt = `# TASK: Fix Automation Issue - ${issue.phase} Phase
## MODE: BROWSER AUTOMATION FIX

---

## ENVIRONMENT CONFIGURATION
| Setting | Value |
|---------|-------|
| n8n Instance URL | ${urlInfo.instanceUrl} |
| Workflow Dashboard | ${urlInfo.workflowUrl} |
| MCP Server | ${urlInfo.mcpUrl} |
| Hosting Type | ${hostingDesc} |

`;

  // Add business context if available
  if (businessContext) {
    prompt += `## BUSINESS CONTEXT
| Field | Value |
|-------|-------|
| Business Name | ${businessContext.businessName} |
| Niche | ${businessContext.niche} |
| Target Audience | ${businessContext.targetAudience} |
${businessContext.serviceOffering ? `| Service Offering | ${businessContext.serviceOffering} |` : ""}
${businessContext.valueProposition ? `| Value Proposition | ${businessContext.valueProposition} |` : ""}

`;
  }

  // Issue diagnosis
  prompt += `## ISSUE DIAGNOSIS
| Field | Value |
|-------|-------|
| Phase | ${issue.phase} |
| Root Cause | ${issue.rootCause} |
| Confidence Level | ${issue.confidence.toUpperCase()} |
| Automation Type | ${issue.automatable ? "⚡ Automatable" : "✋ Manual Required"} |
${issue.automationMethod ? `| Automation Method | ${issue.automationMethod.replace("_", " ")} |` : ""}
${issue.requiredUserAction ? `| Required User Action | ${issue.requiredUserAction} |` : ""}

### Proposed Solution
${issue.solution}

### Solution Steps (from AI analysis)
${issue.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

---

`;

  // Workflow nodes context if available
  if (workflowNodes && workflowNodes.length > 0) {
    prompt += `## CURRENT WORKFLOW STATE
| Node Name | Type | Status | Issues |
|-----------|------|--------|--------|
${workflowNodes.map(node => 
  `| ${node.name} | ${node.type} | ${node.status === "configured" ? "✅" : node.status === "incomplete" ? "⚠️" : "❌"} ${node.status} | ${node.missingFields?.join(", ") || "None"} |`
).join("\n")}

`;
  }

  // Browser actions
  prompt += `## BROWSER ACTIONS REQUIRED

### Step 1: Navigate to n8n Instance
${navigationSteps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

### Step 2: Locate and Fix the Issue
${browserActions.map((action, i) => `${i + 1}. ${action}`).join("\n")}

### Step 3: Apply the Specific Fix
Based on the root cause "${issue.rootCause}", perform these actions:

${issue.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

---

## VALIDATION CRITERIA
After completing all steps, verify each of these conditions:

${validationCriteria.map((criterion, i) => `- [ ] ${criterion}`).join("\n")}

---

## ERROR HANDLING
${errorHandling.join("\n")}

---

## REPORT FORMAT
After completing fix, report using this format:

\`\`\`
| Field | Value |
|-------|-------|
| Fix Status | [FIXED / PARTIAL / BLOCKED] |
| Phase | ${issue.phase} |
| Actions Taken | [Brief summary of what you did] |
| Verification Result | [PASS / FAIL] |
| Notes | [Any additional observations] |
\`\`\`

---

## PREVENTION
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
