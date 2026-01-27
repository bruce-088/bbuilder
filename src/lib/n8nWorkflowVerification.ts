// Stage-to-Node mapping for real n8n workflow verification
// This file maps each automation stage to the expected n8n node types

export interface ExpectedNode {
  type: string;
  purpose: string;
  required: boolean;
  configKeys?: string[];
}

export interface StageNodeRequirements {
  name: string;
  requiredNodes: ExpectedNode[];
}

export const stageNodeRequirements: Record<string, StageNodeRequirements> = {
  "n8n-setup": {
    name: "n8n Instance Setup & Access",
    requiredNodes: [
      // No nodes required for setup stage - this is about instance configuration
    ]
  },
  "n8n-prospecting": {
    name: "Lead Prospecting & Discovery",
    requiredNodes: [
      { type: "n8n-nodes-base.scheduleTrigger", purpose: "Daily/weekly lead discovery trigger", required: true },
      { type: "n8n-nodes-base.httpRequest", purpose: "Apollo.io API integration", required: true, configKeys: ["url", "authentication"] },
      { type: "n8n-nodes-base.httpRequest", purpose: "Hunter.io email verification", required: false },
      { type: "n8n-nodes-base.googleSheets", purpose: "Lead storage and tracking", required: true, configKeys: ["spreadsheetId"] },
      { type: "n8n-nodes-base.if", purpose: "ICP criteria filtering", required: true },
      { type: "n8n-nodes-base.set", purpose: "Lead data formatting", required: false }
    ]
  },
  "n8n-outreach": {
    name: "Outreach & Follow-up",
    requiredNodes: [
      { type: "n8n-nodes-base.googleSheetsTrigger", purpose: "New lead trigger", required: false },
      { type: "n8n-nodes-base.gmail", purpose: "Email sending", required: true, configKeys: ["credentials"] },
      { type: "n8n-nodes-base.wait", purpose: "Follow-up delays (3-4 days)", required: true, configKeys: ["amount"] },
      { type: "n8n-nodes-base.if", purpose: "Reply detection logic", required: true },
      { type: "n8n-nodes-base.slack", purpose: "Reply notifications", required: false }
    ]
  },
  "n8n-qualification": {
    name: "Qualification & Discovery",
    requiredNodes: [
      { type: "n8n-nodes-base.webhook", purpose: "Calendly booking webhook", required: true, configKeys: ["path"] },
      { type: "n8n-nodes-base.set", purpose: "Lead scoring calculation", required: true },
      { type: "n8n-nodes-base.if", purpose: "Score routing (high/medium/low)", required: true },
      { type: "n8n-nodes-base.notion", purpose: "Call prep doc creation", required: false },
      { type: "n8n-nodes-base.gmail", purpose: "Confirmation email", required: true }
    ]
  },
  "n8n-proposal": {
    name: "Proposal & Presentation",
    requiredNodes: [
      { type: "n8n-nodes-base.webhook", purpose: "CRM deal stage webhook", required: true },
      { type: "n8n-nodes-base.httpRequest", purpose: "AI API for proposal generation", required: true },
      { type: "n8n-nodes-base.httpRequest", purpose: "PandaDoc API", required: true, configKeys: ["url"] },
      { type: "n8n-nodes-base.googleDrive", purpose: "PDF backup storage", required: false },
      { type: "n8n-nodes-base.gmail", purpose: "Proposal delivery email", required: true },
      { type: "n8n-nodes-base.wait", purpose: "View tracking delay", required: false }
    ]
  },
  "n8n-closing": {
    name: "Closing & Payment",
    requiredNodes: [
      { type: "n8n-nodes-base.webhook", purpose: "PandaDoc signature webhook", required: true },
      { type: "n8n-nodes-base.httpRequest", purpose: "Stripe API integration", required: true, configKeys: ["url", "authentication"] },
      { type: "n8n-nodes-base.gmail", purpose: "Welcome email", required: true },
      { type: "n8n-nodes-base.googleDrive", purpose: "Client folder creation", required: false },
      { type: "n8n-nodes-base.airtable", purpose: "Client record creation", required: false },
      { type: "n8n-nodes-base.slack", purpose: "#closed-won notification", required: false }
    ]
  },
  "n8n-retention": {
    name: "Client Success & Retention",
    requiredNodes: [
      { type: "n8n-nodes-base.scheduleTrigger", purpose: "Health score calculation schedule", required: true },
      { type: "n8n-nodes-base.airtable", purpose: "Client data storage", required: true, configKeys: ["baseId"] },
      { type: "n8n-nodes-base.set", purpose: "Health score formula", required: true },
      { type: "n8n-nodes-base.if", purpose: "Score-based routing (at-risk/healthy/champion)", required: true },
      { type: "n8n-nodes-base.gmail", purpose: "Check-in emails", required: true },
      { type: "n8n-nodes-base.wait", purpose: "Renewal sequence timing", required: false }
    ]
  }
};

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
}

export interface WorkflowDetails {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown>;
  tags?: Array<{ id: string; name: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface NodeVerificationResult {
  type: string;
  purpose: string;
  found: boolean;
  status: 'configured' | 'missing' | 'incomplete';
  matchedNode?: string;
  issues?: string[];
}

export interface StageVerificationResult {
  stageId: string;
  stageName: string;
  overallStatus: 'pass' | 'partial' | 'fail';
  nodeResults: NodeVerificationResult[];
  workflowActive: boolean;
  suggestions: string[];
  lastExecution?: {
    status: string;
    startedAt: string;
    finishedAt?: string;
    error?: string;
  };
}

/**
 * Verify a workflow's nodes against the expected configuration for a stage
 */
export function verifyStageNodes(
  stageId: string,
  workflowNodes: WorkflowNode[]
): { results: NodeVerificationResult[]; passCount: number; totalRequired: number } {
  const requirements = stageNodeRequirements[stageId];
  if (!requirements) {
    return { results: [], passCount: 0, totalRequired: 0 };
  }

  const nodeResults: NodeVerificationResult[] = [];
  let passCount = 0;
  let totalRequired = 0;

  for (const expected of requirements.requiredNodes) {
    if (expected.required) totalRequired++;

    // Find matching node by type
    const matchedNode = workflowNodes.find(node => 
      node.type === expected.type || 
      node.type.startsWith(expected.type)
    );

    if (matchedNode) {
      const issues: string[] = [];
      
      // Check for required config keys if specified
      if (expected.configKeys && matchedNode.parameters) {
        for (const key of expected.configKeys) {
          if (!matchedNode.parameters[key]) {
            issues.push(`Missing configuration: ${key}`);
          }
        }
      }

      // Check for credentials if node typically needs them
      const needsCredentials = ['gmail', 'slack', 'notion', 'googleSheets', 'airtable', 'httpRequest'].some(
        t => expected.type.includes(t)
      );
      if (needsCredentials && !matchedNode.credentials) {
        issues.push('Credentials not configured');
      }

      nodeResults.push({
        type: expected.type,
        purpose: expected.purpose,
        found: true,
        status: issues.length === 0 ? 'configured' : 'incomplete',
        matchedNode: matchedNode.name,
        issues: issues.length > 0 ? issues : undefined
      });

      if (issues.length === 0 && expected.required) passCount++;
    } else {
      nodeResults.push({
        type: expected.type,
        purpose: expected.purpose,
        found: false,
        status: 'missing',
        issues: [expected.required ? 'Required node not found' : 'Optional node not configured']
      });
    }
  }

  return { results: nodeResults, passCount, totalRequired };
}

/**
 * Generate suggestions based on verification results
 */
export function generateVerificationSuggestions(
  nodeResults: NodeVerificationResult[],
  workflowActive: boolean
): string[] {
  const suggestions: string[] = [];

  // Check for missing required nodes
  const missingRequired = nodeResults.filter(r => !r.found && r.status === 'missing');
  if (missingRequired.length > 0) {
    suggestions.push(`Add missing nodes: ${missingRequired.map(r => r.purpose).join(', ')}`);
  }

  // Check for incomplete configurations
  const incomplete = nodeResults.filter(r => r.status === 'incomplete');
  if (incomplete.length > 0) {
    suggestions.push(`Complete configuration for: ${incomplete.map(r => r.matchedNode || r.type).join(', ')}`);
  }

  // Workflow activation
  if (!workflowActive) {
    suggestions.push('Activate the workflow in n8n to enable scheduled execution');
  }

  // Credential reminders
  const needsCredentials = nodeResults.filter(r => 
    r.issues?.some(i => i.includes('Credentials'))
  );
  if (needsCredentials.length > 0) {
    suggestions.push('Configure API credentials in n8n Credentials manager for all external services');
  }

  return suggestions;
}

/**
 * Map workflow name patterns to expected naming conventions
 */
export const expectedWorkflowNamePatterns = [
  "GhostWriter",
  "Authority Engine",
  "Sales Automation",
  "Lead Prospecting",
  "Outreach",
  "Qualification",
  "Proposal",
  "Closing",
  "Client Success",
  "Retention"
];

/**
 * Check if a workflow name matches the expected GhostWriter/Authority Engine pattern
 */
export function isGhostWriterWorkflow(workflowName: string): boolean {
  const lowerName = workflowName.toLowerCase();
  return (
    lowerName.includes('ghostwriter') ||
    lowerName.includes('authority engine') ||
    lowerName.includes('sales automation') ||
    lowerName.includes('complete automation')
  );
}
