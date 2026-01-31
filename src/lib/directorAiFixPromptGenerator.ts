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
  knowledgeBaseHits?: number;
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

/**
 * Extract node names from fix steps using pattern matching
 * Focuses on extracting clean node names like "Claude", "Beehiiv", "Email", etc.
 */
function extractNodeNamesFromSteps(steps: string[]): string[] {
  const nodeNames = new Set<string>();
  
  // Common n8n node name patterns - look for capitalized words followed by "node"
  const nodePattern = /(?:the\s+)?["']?([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)["']?\s+node/gi;
  
  // Also look for action + node name patterns
  const actionPattern = /(?:Update|Configure|Fix|Open|Connect)\s+(?:the\s+)?["']?([A-Z][a-zA-Z0-9]+)["']?/gi;
  
  // Specific well-known n8n nodes to look for
  const knownNodes = [
    'Claude', 'OpenAI', 'GPT', 'Anthropic',
    'Gmail', 'Email', 'SMTP', 'Outlook',
    'Slack', 'Discord', 'Telegram', 'WhatsApp',
    'HTTP Request', 'Webhook', 'API',
    'Google Sheets', 'Airtable', 'Notion', 'Excel',
    'Beehiiv', 'Mailchimp', 'ConvertKit', 'SendGrid',
    'Stripe', 'PayPal', 'Square',
    'Supabase', 'Postgres', 'MySQL', 'MongoDB',
    'HTML', 'Code', 'Function', 'Set', 'Merge', 'Filter',
    'Schedule', 'Cron', 'Trigger', 'Manual',
  ];
  
  const excludeWords = ['the', 'this', 'that', 'any', 'each', 'all', 'your', 'node', 'with', 'and', 'for'];
  
  steps.forEach(step => {
    // Check for known nodes first
    knownNodes.forEach(nodeName => {
      if (step.toLowerCase().includes(nodeName.toLowerCase())) {
        nodeNames.add(nodeName);
      }
    });
    
    // Then try regex patterns
    [nodePattern, actionPattern].forEach(pattern => {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(step)) !== null) {
        const name = match[1].trim();
        // Only add if it's a clean short name (likely a node type)
        if (name.length >= 3 && name.length <= 25 && !excludeWords.includes(name.toLowerCase())) {
          nodeNames.add(name);
        }
      }
    });
  });
  
  return Array.from(nodeNames);
}

/**
 * Enhance a fix step with explicit UI action instructions
 */
function enhanceStepWithUIActions(step: string): string {
  // If step mentions a node, add explicit click instructions
  const nodeMatch = step.match(/["']?([A-Z][a-zA-Z0-9\s]+)["']?\s+node/i);
  if (nodeMatch) {
    const nodeName = nodeMatch[1];
    return `**Double-click** on the "${nodeName}" node to open its configuration panel. ${step}`;
  }
  
  // If step mentions credentials, add navigation context
  if (step.toLowerCase().includes('credential')) {
    return `${step}. Look for the "Credential" dropdown field in the node's configuration panel.`;
  }
  
  // If step mentions API key, add field location context
  if (step.toLowerCase().includes('api key') || step.toLowerCase().includes('apikey')) {
    return `${step}. The API key field is typically in the "Authentication" or "Credentials" section of the node panel.`;
  }
  
  return step;
}

/**
 * Generate explicit n8n canvas navigation instructions for browser automation
 */
function generateCanvasNavigationInstructions(nodeNames: string[]): string {
  if (nodeNames.length === 0) {
    return '';
  }

  return `
## n8n Canvas Navigation Guide

### How to Find Nodes on the Canvas
1. **Zoom Out First**: Press \`Ctrl/Cmd + -\` or use scroll wheel while holding Ctrl to zoom out and see all nodes
2. **Use Node Search**: Press \`Ctrl/Cmd + K\` to open the command palette, type the node name to jump to it
3. **Pan the Canvas**: Click and drag on empty canvas space to pan around
4. **Fit All Nodes**: Press \`Ctrl/Cmd + 0\` to fit all nodes in view

### How to Open a Node's Configuration Panel
1. **Single Click** on any node to select it (node gets highlighted with blue border)
2. **Double Click** on the node to open its configuration panel (slides in from the right)
3. Alternatively: Right-click the node and select "Open" from the context menu

### Visual Node Identification
${nodeNames.map(name => `- **${name}**: Look for a rectangular node with "${name}" label at the top`).join('\n')}

### Nodes That Need Fixing
${nodeNames.map((name, i) => `${i + 1}. Locate the **"${name}"** node on the canvas
   - Double-click to open its configuration panel
   - The panel will slide in from the right side of the screen`).join('\n')}

### Troubleshooting Canvas Navigation
- If nodes appear too small: Zoom in with \`Ctrl/Cmd + +\`
- If canvas is panning unexpectedly: Click on empty space to deselect any nodes
- If node panel won't open: Try clicking elsewhere first, then double-click the target node

`;
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
  const { issue, businessContext, n8nOptions, verificationData: providedVerificationData, knowledgeBaseHits } = context;
  const urlInfo = getN8nUrlInfo(n8nOptions);
  
  // Use provided verification data or generate defaults
  const verificationData = providedVerificationData || generateDefaultVerificationData(issue);
  
  // Build the prompt matching the N8N guide format
  let prompt = `# Task: Fix Automation Issue - ${issue.phase} Phase
## Mode: BROWSER AUTOMATION REMEDIATION

⚠️ This is a FIX task. Perform the actions needed to resolve the failed verification.
${knowledgeBaseHits && knowledgeBaseHits > 0 ? `\n📚 **Knowledge Base Enhanced:** This prompt includes insights from ${knowledgeBaseHits} previously successful fix${knowledgeBaseHits > 1 ? 'es' : ''}.` : ''}

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

  // Extract node names and add canvas navigation section
  const nodeNamesToFix = extractNodeNamesFromSteps(issue.steps);
  prompt += generateCanvasNavigationInstructions(nodeNamesToFix);

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

  // Fix actions from verification data with enhanced UI instructions
  prompt += `## Fix Actions
Execute the following browser actions to resolve this issue:

`;
  
  // Add navigation and setup steps first
  prompt += `1. Navigate to ${urlInfo.workflowUrl}\n`;
  prompt += `2. Wait for the workflow canvas to fully load (nodes should be visible)\n`;
  prompt += `3. Press \`Ctrl/Cmd + 0\` to fit all nodes in view\n`;
  
  // Add remaining actions from verification data with UI enhancements
  verificationData.automatedActions.forEach((action, i) => {
    const enhancedAction = enhanceStepWithUIActions(action);
    prompt += `${i + 4}. ${enhancedAction}\n`;
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
