import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpectedNode {
  type: string;
  purpose: string;
  required: boolean;
}

interface StageRequirements {
  name: string;
  requiredNodes: ExpectedNode[];
}

// Stage-to-node mapping (mirrors the frontend lib)
const stageNodeRequirements: Record<string, StageRequirements> = {
  "n8n-prospecting": {
    name: "Lead Prospecting & Discovery",
    requiredNodes: [
      { type: "n8n-nodes-base.scheduleTrigger", purpose: "Daily trigger", required: true },
      { type: "n8n-nodes-base.httpRequest", purpose: "API calls", required: true },
      { type: "n8n-nodes-base.googleSheets", purpose: "Lead storage", required: true },
      { type: "n8n-nodes-base.if", purpose: "ICP filtering", required: true }
    ]
  },
  "n8n-outreach": {
    name: "Outreach & Follow-up",
    requiredNodes: [
      { type: "n8n-nodes-base.gmail", purpose: "Email sending", required: true },
      { type: "n8n-nodes-base.wait", purpose: "Follow-up delays", required: true },
      { type: "n8n-nodes-base.if", purpose: "Reply detection", required: true }
    ]
  },
  "n8n-qualification": {
    name: "Qualification & Discovery",
    requiredNodes: [
      { type: "n8n-nodes-base.webhook", purpose: "Calendly webhook", required: true },
      { type: "n8n-nodes-base.set", purpose: "Lead scoring", required: true },
      { type: "n8n-nodes-base.gmail", purpose: "Confirmation email", required: true }
    ]
  },
  "n8n-proposal": {
    name: "Proposal & Presentation",
    requiredNodes: [
      { type: "n8n-nodes-base.webhook", purpose: "CRM webhook", required: true },
      { type: "n8n-nodes-base.httpRequest", purpose: "AI/PandaDoc API", required: true },
      { type: "n8n-nodes-base.gmail", purpose: "Proposal delivery", required: true }
    ]
  },
  "n8n-closing": {
    name: "Closing & Payment",
    requiredNodes: [
      { type: "n8n-nodes-base.webhook", purpose: "Signature webhook", required: true },
      { type: "n8n-nodes-base.httpRequest", purpose: "Stripe API", required: true },
      { type: "n8n-nodes-base.gmail", purpose: "Welcome email", required: true }
    ]
  },
  "n8n-retention": {
    name: "Client Success & Retention",
    requiredNodes: [
      { type: "n8n-nodes-base.scheduleTrigger", purpose: "Health score schedule", required: true },
      { type: "n8n-nodes-base.airtable", purpose: "Client data", required: true },
      { type: "n8n-nodes-base.set", purpose: "Health score formula", required: true },
      { type: "n8n-nodes-base.if", purpose: "Score routing", required: true }
    ]
  }
};

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
}

interface WorkflowData {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections?: Record<string, unknown>;
}

interface VerificationRequest {
  workflowData?: WorkflowData | null;
  stageId: string;
  stageName: string;
  businessContext: {
    businessName: string;
    niche?: string;
    targetAudience?: string;
  };
  mcpConnected: boolean;
  testConnection?: boolean;
  verifyWorkflowExists?: boolean;
  workflowNamePattern?: string;
  hostingType?: 'cloud' | 'self-hosted';
  deploymentMethod?: 'docker' | 'hostinger' | 'npm' | 'other';
  n8nInstanceUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const {
      workflowData,
      stageId,
      stageName,
      businessContext,
      mcpConnected,
      testConnection,
      verifyWorkflowExists,
      workflowNamePattern,
      hostingType,
      deploymentMethod,
      n8nInstanceUrl
    } = requestBody as VerificationRequest;

    // Handle connection test request
    if (testConnection) {
      // Since we can't directly call MCP from edge functions,
      // we check if the request indicates MCP is connected
      // The frontend will have already attempted to use MCP tools
      // This endpoint confirms the connection status
      
      if (mcpConnected) {
        // MCP is connected - return success
        // In a real implementation, you could verify by making a test call
        return new Response(
          JSON.stringify({
            connectionStatus: "connected",
            message: "n8n MCP connector is configured. You can now use live workflow verification.",
            workflowCount: 0, // Would come from actual MCP call
            timestamp: new Date().toISOString()
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Generate deployment-specific instructions
        let instructions: string[];
        let mcpUrlNote: string;
        
        if (hostingType === 'self-hosted' && deploymentMethod === 'hostinger') {
          mcpUrlNote = n8nInstanceUrl 
            ? `${n8nInstanceUrl.replace(/\/$/, '')}/mcp-server/http`
            : 'https://n8n.[your-server].hstgr.cloud/mcp-server/http';
          instructions = [
            "1. Open Hostinger hPanel → VPS → Your server name (e.g., srv1230972.hstgr.cloud)",
            "2. Find n8n in the Applications section",
            "3. Click 'Manage App' to open your n8n instance",
            "4. If login fails, use 'Resetting n8n user password' link in the panel",
            "5. Once logged in: Settings → MCP access → Toggle ON",
            "6. Copy the MCP Server URL shown",
            "7. In Lovable: Project Settings → Connectors → Connect n8n",
            `8. Paste your Hostinger MCP URL: ${mcpUrlNote}`
          ];
        } else if (hostingType === 'self-hosted' && deploymentMethod === 'docker') {
          mcpUrlNote = n8nInstanceUrl 
            ? `${n8nInstanceUrl.replace(/\/$/, '')}/mcp-server/http`
            : 'http://[your-server-ip]:5678/mcp-server/http';
          instructions = [
            "1. Access your Docker n8n instance",
            "2. Go to Settings → MCP access",
            "3. Toggle 'Enable MCP access' ON",
            "4. Copy the MCP Server URL shown",
            "5. In Lovable: Project Settings → Connectors → Connect n8n",
            `6. Paste your Docker MCP URL: ${mcpUrlNote}`,
            "Note: Ensure your n8n Docker container is accessible from the internet for MCP to work"
          ];
        } else if (hostingType === 'cloud') {
          instructions = [
            "1. Log into your n8n Cloud instance at app.n8n.cloud",
            "2. Go to Settings → MCP access",
            "3. Toggle 'Enable MCP access' ON",
            "4. Copy the MCP Server URL (format: https://[your-name].app.n8n.cloud/mcp-server/http)",
            "5. In Lovable: Project Settings → Connectors → Connect n8n",
            "6. Paste your n8n Cloud MCP URL"
          ];
        } else {
          mcpUrlNote = n8nInstanceUrl 
            ? `${n8nInstanceUrl.replace(/\/$/, '')}/mcp-server/http`
            : '[your-instance-url]/mcp-server/http';
          instructions = [
            "1. Log into your n8n instance",
            "2. Go to Settings → MCP access",
            "3. Toggle 'Enable MCP access' ON (requires owner/admin permissions)",
            "4. Copy the MCP Server URL shown",
            "5. In Lovable: Project Settings → Connectors → Connect n8n",
            `6. Paste your MCP URL: ${mcpUrlNote}`
          ];
        }
        
        return new Response(
          JSON.stringify({
            connectionStatus: "no_mcp",
            message: "n8n MCP connector is not configured. Please connect n8n in Project Settings → Connectors.",
            instructions,
            hostingType,
            deploymentMethod
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle workflow exists verification request
    if (verifyWorkflowExists) {
      // Since edge functions cannot call MCP tools directly,
      // we return instructions for the frontend to display
      const instanceUrl = n8nInstanceUrl?.replace(/\/$/, '') || '[your-instance-url]';
      
      if (!mcpConnected) {
        return new Response(
          JSON.stringify({
            workflowFound: false,
            message: "n8n MCP connector not configured. Connect your n8n instance first.",
            suggestions: [
              "Go to Project Settings → Connectors → Connect n8n",
              `Enter your MCP URL: ${instanceUrl}/mcp-server/http`,
              "Ensure MCP access is enabled in n8n Settings"
            ]
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // MCP is connected - provide manual verification instructions
      const hostingerSuggestions = [
        "1. Open Hostinger hPanel → VPS → Your server → Applications → n8n",
        "2. Click 'Manage App' to open your n8n instance",
        "3. If you can't log in, use 'Resetting n8n user password' link in the panel",
        `4. Navigate to the '${workflowNamePattern || 'GhostWriter AI'}' workflow`,
        "5. Click Settings (gear icon) → Toggle 'Available in MCP' ON",
        "6. Return here and verify the workflow again"
      ];
      
      const defaultSuggestions = [
        "Open your n8n instance workflow list",
        `Find the '${workflowNamePattern || 'GhostWriter AI'}: The Authority Engine' workflow`,
        "Open Settings → Enable 'Available in MCP'",
        "Save and return here to verify"
      ];
      
      return new Response(
        JSON.stringify({
          workflowFound: false,
          requiresManualCheck: true,
          message: `MCP is connected. To verify '${workflowNamePattern || 'GhostWriter AI'}' workflow exists, ensure it's named correctly and marked 'Available in MCP'.`,
          hostingType,
          deploymentMethod,
          suggestions: hostingType === 'self-hosted' && deploymentMethod === 'hostinger' 
            ? hostingerSuggestions 
            : defaultSuggestions
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If MCP is not connected or no workflow data, return guidance
    if (!mcpConnected || !workflowData) {
      return new Response(
        JSON.stringify({
          status: "MCP_NOT_CONNECTED",
          confidence: "low",
          summary: mcpConnected 
            ? "Workflow not found. Ensure 'GhostWriter AI: The Authority Engine' is marked as 'Available in MCP' in n8n workflow settings."
            : "n8n MCP not connected. Connect your n8n instance in Project Settings → Connectors to enable live verification.",
          workflowActive: false,
          nodeVerification: [],
          suggestions: [
            mcpConnected 
              ? "Open your n8n workflow → Settings → Toggle 'Available in MCP' → Save"
              : "Go to Project Settings → Connectors → Connect n8n",
            "Ensure your n8n instance has MCP access enabled (Settings → MCP access)"
          ],
          connectionRequired: !mcpConnected
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get stage requirements
    const requirements = stageNodeRequirements[stageId];
    if (!requirements) {
      return new Response(
        JSON.stringify({
          status: "UNKNOWN_STAGE",
          confidence: "low",
          summary: `Unknown stage: ${stageId}`,
          workflowActive: workflowData.active,
          nodeVerification: [],
          suggestions: ["Verify the stage ID is correct"]
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify nodes against requirements
    const nodeVerification: Array<{
      type: string;
      purpose: string;
      found: boolean;
      status: "configured" | "missing" | "incomplete";
      matchedNode?: string;
      issues?: string[];
    }> = [];

    let passCount = 0;
    let requiredCount = 0;

    for (const expected of requirements.requiredNodes) {
      if (expected.required) requiredCount++;

      // Find matching node by type
      const matchedNode = workflowData.nodes.find(node =>
        node.type === expected.type ||
        node.type.startsWith(expected.type.split('.')[0])
      );

      if (matchedNode) {
        const issues: string[] = [];

        // Check for credentials on nodes that typically need them
        const needsCredentials = ['gmail', 'slack', 'notion', 'googleSheets', 'airtable']
          .some(t => expected.type.includes(t));
        
        if (needsCredentials && !matchedNode.credentials) {
          issues.push('Credentials may not be configured');
        }

        nodeVerification.push({
          type: expected.type,
          purpose: expected.purpose,
          found: true,
          status: issues.length === 0 ? 'configured' : 'incomplete',
          matchedNode: matchedNode.name,
          issues: issues.length > 0 ? issues : undefined
        });

        if (issues.length === 0 && expected.required) passCount++;
      } else {
        nodeVerification.push({
          type: expected.type,
          purpose: expected.purpose,
          found: false,
          status: 'missing',
          issues: [expected.required ? 'Required node not found in workflow' : 'Optional node not configured']
        });
      }
    }

    // Generate suggestions
    const suggestions: string[] = [];

    const missingRequired = nodeVerification.filter(r => !r.found && r.issues?.some(i => i.includes('Required')));
    if (missingRequired.length > 0) {
      suggestions.push(`Add missing nodes: ${missingRequired.map(r => r.purpose).join(', ')}`);
    }

    const incomplete = nodeVerification.filter(r => r.status === 'incomplete');
    if (incomplete.length > 0) {
      suggestions.push(`Complete configuration for: ${incomplete.map(r => r.matchedNode || r.type.split('.').pop()).join(', ')}`);
    }

    if (!workflowData.active) {
      suggestions.push('Activate the workflow in n8n to enable scheduled execution');
    }

    // Determine overall status
    let status: 'PASS' | 'NEEDS_ATTENTION' | 'FAIL';
    if (passCount === requiredCount && workflowData.active) {
      status = 'PASS';
    } else if (passCount >= requiredCount * 0.5) {
      status = 'NEEDS_ATTENTION';
    } else {
      status = 'FAIL';
    }

    // Generate summary
    let summary: string;
    if (status === 'PASS') {
      summary = `Stage "${stageName}" is fully configured with all ${requiredCount} required nodes. Workflow is ${workflowData.active ? 'active' : 'inactive'}.`;
    } else if (status === 'NEEDS_ATTENTION') {
      summary = `Stage "${stageName}" has ${passCount}/${requiredCount} required nodes configured. Review the missing or incomplete items below.`;
    } else {
      summary = `Stage "${stageName}" needs setup. Only ${passCount}/${requiredCount} required nodes found. Add the missing nodes to complete this stage.`;
    }

    return new Response(
      JSON.stringify({
        status,
        confidence: 'high',
        summary,
        workflowName: workflowData.name,
        workflowActive: workflowData.active,
        nodeVerification,
        nodeStats: {
          found: nodeVerification.filter(n => n.found).length,
          missing: nodeVerification.filter(n => !n.found).length,
          configured: nodeVerification.filter(n => n.status === 'configured').length,
          incomplete: nodeVerification.filter(n => n.status === 'incomplete').length
        },
        suggestions,
        checklist: nodeVerification.map(n => ({
          item: `${n.purpose} (${n.type.split('.').pop()})`,
          status: n.found ? (n.status === 'configured' ? 'check' : 'warning') : 'error',
          howToVerify: n.found 
            ? `Node "${n.matchedNode}" found. ${n.issues?.join('. ') || 'Configuration looks good.'}`
            : `Add a ${n.type.split('.').pop()} node for: ${n.purpose}`
        }))
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-n8n-workflow error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        status: "ERROR"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
