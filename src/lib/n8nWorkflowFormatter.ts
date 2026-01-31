/**
 * Utility functions for formatting workflows for n8n import
 */

interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  [key: string]: unknown;
}

interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  settings: { executionOrder: string };
  active: boolean;
}

interface WorkflowValidationResult {
  valid: boolean;
  nodeCount: number;
  hasConnections: boolean;
  stageCount: number;
  message: string;
  credentialWarnings: CredentialWarning[];
}

interface CredentialWarning {
  nodeName: string;
  nodeType: string;
  missingCredential: string;
}

// Node types that typically require credentials
const NODES_REQUIRING_CREDENTIALS: Record<string, string> = {
  'n8n-nodes-base.slack': 'Slack API',
  'n8n-nodes-base.slackTrigger': 'Slack API',
  'n8n-nodes-base.gmail': 'Gmail OAuth2',
  'n8n-nodes-base.gmailTrigger': 'Gmail OAuth2',
  'n8n-nodes-base.googleSheets': 'Google Sheets OAuth2',
  'n8n-nodes-base.googleSheetsTrigger': 'Google Sheets OAuth2',
  'n8n-nodes-base.googleDrive': 'Google Drive OAuth2',
  'n8n-nodes-base.stripe': 'Stripe API',
  'n8n-nodes-base.stripeTrigger': 'Stripe API',
  'n8n-nodes-base.hubspot': 'HubSpot API',
  'n8n-nodes-base.hubspotTrigger': 'HubSpot API',
  'n8n-nodes-base.airtable': 'Airtable API',
  'n8n-nodes-base.airtableTrigger': 'Airtable API',
  'n8n-nodes-base.notion': 'Notion API',
  'n8n-nodes-base.notionTrigger': 'Notion API',
  'n8n-nodes-base.openAi': 'OpenAI API',
  'n8n-nodes-base.anthropic': 'Anthropic API',
  'n8n-nodes-base.postgres': 'PostgreSQL',
  'n8n-nodes-base.mysql': 'MySQL',
  'n8n-nodes-base.mongodb': 'MongoDB',
  'n8n-nodes-base.redis': 'Redis',
  'n8n-nodes-base.sendGrid': 'SendGrid API',
  'n8n-nodes-base.mailchimp': 'Mailchimp API',
  'n8n-nodes-base.twilio': 'Twilio API',
  'n8n-nodes-base.telegram': 'Telegram API',
  'n8n-nodes-base.telegramTrigger': 'Telegram API',
  'n8n-nodes-base.discord': 'Discord Webhook/Bot',
  'n8n-nodes-base.discordTrigger': 'Discord Webhook/Bot',
  'n8n-nodes-base.jira': 'Jira API',
  'n8n-nodes-base.asana': 'Asana API',
  'n8n-nodes-base.trello': 'Trello API',
  'n8n-nodes-base.github': 'GitHub API',
  'n8n-nodes-base.githubTrigger': 'GitHub API',
  'n8n-nodes-base.gitlab': 'GitLab API',
  'n8n-nodes-base.awsS3': 'AWS S3',
  'n8n-nodes-base.awsSes': 'AWS SES',
  'n8n-nodes-base.awsLambda': 'AWS Lambda',
  'n8n-nodes-base.microsoftOutlook': 'Microsoft OAuth2',
  'n8n-nodes-base.microsoftTeams': 'Microsoft OAuth2',
  'n8n-nodes-base.zoom': 'Zoom API',
  'n8n-nodes-base.calendly': 'Calendly API',
  'n8n-nodes-base.shopify': 'Shopify API',
  'n8n-nodes-base.wooCommerce': 'WooCommerce API',
  '@n8n/n8n-nodes-langchain.agent': 'AI Model Credentials',
  '@n8n/n8n-nodes-langchain.chainLlm': 'AI Model Credentials',
};

/**
 * Check if an object looks like a valid n8n workflow
 */
function isValidN8nWorkflow(obj: unknown): obj is { nodes: N8nNode[]; connections?: unknown; settings?: unknown; name?: string } {
  if (!obj || typeof obj !== 'object') return false;
  const workflow = obj as Record<string, unknown>;
  return Array.isArray(workflow.nodes) && workflow.nodes.length > 0;
}

/**
 * Check if an object looks like a stage containing a workflow
 */
function isStageWithWorkflow(obj: unknown): obj is { nodes: N8nNode[]; connections?: unknown } {
  if (!obj || typeof obj !== 'object') return false;
  const stage = obj as Record<string, unknown>;
  return Array.isArray(stage.nodes);
}

/**
 * Format a single workflow stage for n8n import
 */
export function formatSingleStage(
  stage: unknown,
  stageKey: string,
  businessName: string
): N8nWorkflow | null {
  if (!isStageWithWorkflow(stage)) return null;

  const stageNumber = stageKey.replace(/\D/g, '') || '1';
  
  return {
    name: `${businessName} - Stage ${stageNumber}`,
    nodes: stage.nodes.map(node => ({
      ...node,
      id: node.id || crypto.randomUUID(),
      position: node.position || [250, 300],
    })),
    connections: (stage.connections as Record<string, unknown>) || {},
    settings: { executionOrder: "v1" },
    active: false
  };
}

/**
 * Remap connections when merging stages
 * Updates node references to use prefixed IDs
 */
function remapConnections(
  connections: Record<string, unknown>,
  stagePrefix: string,
  nodeIdMap: Map<string, string>
): Record<string, unknown> {
  const remapped: Record<string, unknown> = {};
  
  for (const [sourceNode, targets] of Object.entries(connections)) {
    const newSourceKey = nodeIdMap.get(sourceNode) || `${stagePrefix}_${sourceNode}`;
    
    if (targets && typeof targets === 'object') {
      const remappedTargets: Record<string, unknown> = {};
      
      for (const [outputType, outputConnections] of Object.entries(targets as Record<string, unknown>)) {
        if (Array.isArray(outputConnections)) {
          remappedTargets[outputType] = outputConnections.map(connArray => {
            if (Array.isArray(connArray)) {
              return connArray.map(conn => {
                if (conn && typeof conn === 'object' && 'node' in conn) {
                  return {
                    ...conn,
                    node: nodeIdMap.get(conn.node as string) || `${stagePrefix}_${conn.node}`
                  };
                }
                return conn;
              });
            }
            return connArray;
          });
        } else {
          remappedTargets[outputType] = outputConnections;
        }
      }
      
      remapped[newSourceKey] = remappedTargets;
    }
  }
  
  return remapped;
}

/**
 * Transform raw workflow data into proper n8n import format
 * Handles both single workflows and multi-stage formats
 */
export function formatForN8nImport(
  workflows: Record<string, unknown>,
  businessName: string
): N8nWorkflow | null {
  // Case 1: Already a valid n8n workflow at the top level
  if (isValidN8nWorkflow(workflows)) {
    return {
      name: (workflows.name as string) || `${businessName} Automation`,
      nodes: workflows.nodes.map(node => ({
        ...node,
        id: node.id || crypto.randomUUID(),
        position: node.position || [250, 300],
      })),
      connections: (workflows.connections as Record<string, unknown>) || {},
      settings: { executionOrder: "v1" },
      active: false
    };
  }

  // Case 2: Multi-stage format {stage1: {...}, stage2: {...}} or similar
  const stageKeys = Object.keys(workflows).filter(k => {
    const value = workflows[k];
    // Match keys like "stage1", "stage_1", "Stage 1", or any key with a nodes array
    return (
      /stage/i.test(k) ||
      isStageWithWorkflow(value)
    );
  }).sort((a, b) => {
    // Sort stages numerically
    const numA = parseInt(a.replace(/\D/g, '') || '0');
    const numB = parseInt(b.replace(/\D/g, '') || '0');
    return numA - numB;
  });

  if (stageKeys.length === 0) {
    // Case 3: Try to find any nested object that looks like a workflow
    for (const value of Object.values(workflows)) {
      if (isValidN8nWorkflow(value)) {
        return formatForN8nImport(value as Record<string, unknown>, businessName);
      }
    }
    return null;
  }

  // Merge all stages into a master workflow
  const allNodes: N8nNode[] = [];
  let allConnections: Record<string, unknown> = {};

  stageKeys.forEach((key, index) => {
    const stage = workflows[key];
    if (!isStageWithWorkflow(stage)) return;

    const yOffset = index * 400;
    const stagePrefix = `stage${index + 1}`;
    const nodeIdMap = new Map<string, string>();

    // Add nodes with position offset and unique IDs
    stage.nodes.forEach(node => {
      const originalId = node.id || node.name || crypto.randomUUID();
      const newId = `${stagePrefix}_${originalId}`;
      nodeIdMap.set(originalId, newId);
      nodeIdMap.set(node.name, newId); // Also map by name for connection remapping

      allNodes.push({
        ...node,
        id: newId,
        name: `[Stage ${index + 1}] ${node.name}`,
        position: [
          node.position?.[0] || 250,
          (node.position?.[1] || 300) + yOffset
        ] as [number, number],
      });
    });

    // Remap and merge connections
    if (stage.connections && typeof stage.connections === 'object') {
      const remappedConnections = remapConnections(
        stage.connections as Record<string, unknown>,
        stagePrefix,
        nodeIdMap
      );
      allConnections = { ...allConnections, ...remappedConnections };
    }
  });

  if (allNodes.length === 0) {
    return null;
  }

  return {
    name: `${businessName} - Complete Automation`,
    nodes: allNodes,
    connections: allConnections,
    settings: { executionOrder: "v1" },
    active: false
  };
}

/**
 * Check nodes for missing credentials
 */
function detectMissingCredentials(nodes: N8nNode[]): CredentialWarning[] {
  const warnings: CredentialWarning[] = [];

  for (const node of nodes) {
    const requiredCredential = NODES_REQUIRING_CREDENTIALS[node.type];
    
    if (requiredCredential) {
      // Check if credentials are configured
      const hasCredentials = node.credentials && Object.keys(node.credentials).length > 0;
      
      if (!hasCredentials) {
        warnings.push({
          nodeName: node.name,
          nodeType: node.type,
          missingCredential: requiredCredential
        });
      }
    }

    // Also check HTTP Request nodes with authentication
    if (node.type === 'n8n-nodes-base.httpRequest') {
      const params = node.parameters as Record<string, unknown> | undefined;
      const authType = params?.authentication as string;
      
      if (authType && authType !== 'none' && authType !== 'predefinedCredentialType') {
        const hasCredentials = node.credentials && Object.keys(node.credentials).length > 0;
        
        if (!hasCredentials) {
          warnings.push({
            nodeName: node.name,
            nodeType: node.type,
            missingCredential: `HTTP ${authType} credentials`
          });
        }
      }
    }
  }

  return warnings;
}

/**
 * Validate workflow data and return status information
 */
export function validateWorkflowForExport(
  workflows: Record<string, unknown> | undefined,
  businessName: string
): WorkflowValidationResult {
  if (!workflows) {
    return {
      valid: false,
      nodeCount: 0,
      hasConnections: false,
      stageCount: 0,
      message: "No workflow data available",
      credentialWarnings: []
    };
  }

  const formatted = formatForN8nImport(workflows, businessName);
  
  if (!formatted) {
    return {
      valid: false,
      nodeCount: 0,
      hasConnections: false,
      stageCount: 0,
      message: "Invalid workflow format - try regenerating",
      credentialWarnings: []
    };
  }

  const nodeCount = formatted.nodes.length;
  const hasConnections = Object.keys(formatted.connections).length > 0;
  
  // Count unique stages from node names
  const stages = new Set(
    formatted.nodes
      .map(n => n.name.match(/\[Stage (\d+)\]/)?.[1])
      .filter(Boolean)
  );
  const stageCount = stages.size || 1;

  // Detect missing credentials
  const credentialWarnings = detectMissingCredentials(formatted.nodes);

  return {
    valid: nodeCount > 0,
    nodeCount,
    hasConnections,
    stageCount,
    message: nodeCount > 0
      ? `${nodeCount} nodes across ${stageCount} stage${stageCount > 1 ? 's' : ''} ready for import`
      : "No valid nodes found",
    credentialWarnings
  };
}

/**
 * Get available stages from workflow data for individual downloads
 */
export function getAvailableStages(
  workflows: Record<string, unknown> | undefined
): string[] {
  if (!workflows) return [];

  // If it's a single workflow, return empty (no individual stages)
  if (isValidN8nWorkflow(workflows)) {
    return [];
  }

  return Object.keys(workflows).filter(k => {
    const value = workflows[k];
    return /stage/i.test(k) || isStageWithWorkflow(value);
  }).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '') || '0');
    const numB = parseInt(b.replace(/\D/g, '') || '0');
    return numA - numB;
  });
}
