import { BusinessIdeaData } from "@/lib/computerUsePromptGenerator";

interface AutomationStage {
  id: string;
  title: string;
  objective: string;
  actions: string[];
  validationCriteria: string[];
  credentialKeys: string[];
}

export interface DirectorAiOptions {
  hostingType?: 'cloud' | 'self-hosted';
  deploymentMethod?: 'hostinger' | 'docker' | 'npm' | 'other';
  n8nInstanceUrl?: string;
}

function generateDirectorAiStages(idea: BusinessIdeaData, options?: DirectorAiOptions): AutomationStage[] {
  const n8nUrl = options?.n8nInstanceUrl?.replace(/\/$/, '') || '[YOUR_N8N_INSTANCE_URL]';
  const isHostinger = options?.hostingType === 'self-hosted' && options?.deploymentMethod === 'hostinger';
  const isCloud = options?.hostingType === 'cloud';
  const isDocker = options?.hostingType === 'self-hosted' && options?.deploymentMethod === 'docker';
  // Generate dynamic n8n setup actions based on hosting type
  const n8nSetupActions = isHostinger ? [
    `Navigate to your Hostinger n8n instance at ${n8nUrl}`,
    "Log into Hostinger dashboard at hpanel.hostinger.com → Navigate to Hosting → Manage → Applications → Find n8n",
    "Click on n8n to view your auto-generated credentials (username and password)",
    "Copy your n8n instance URL from the 'Access URL' field in the Hostinger panel",
    `Open your n8n instance in browser: ${n8nUrl}`,
    "Enter your Hostinger-provided username and password to authenticate",
    "Verify you reach the n8n workflow dashboard",
    "Go to Settings (gear icon) → Navigate to 'MCP access' section",
    "Toggle 'Enable MCP access' ON (requires owner/admin permissions)",
    `Copy the MCP Server URL: ${n8nUrl}/mcp-server/http`,
    "In Lovable: Go to Project Settings → Connectors → Connect n8n → Paste your MCP URL"
  ] : isCloud ? [
    "Navigate to https://app.n8n.cloud and sign in or create an account",
    "Note your instance URL (format: https://your-name.app.n8n.cloud)",
    "Go to Settings → MCP access → Toggle 'Enable MCP access' ON",
    "Copy the MCP Server URL (format: https://your-name.app.n8n.cloud/mcp-server/http)",
    "In Lovable: Go to Project Settings → Connectors → Connect n8n → Paste your MCP URL"
  ] : isDocker ? [
    "Check your docker-compose.yml or .env file for N8N_BASIC_AUTH_USER and N8N_BASIC_AUTH_PASSWORD",
    `Navigate to your n8n instance at ${n8nUrl}`,
    "Authenticate with your Docker environment credentials",
    "Go to Settings → MCP access → Toggle 'Enable MCP access' ON",
    `Copy the MCP Server URL: ${n8nUrl}/mcp-server/http`,
    "Ensure your Docker container is accessible from the internet for MCP to work",
    "In Lovable: Go to Project Settings → Connectors → Connect n8n → Paste your MCP URL"
  ] : [
    "Identify your n8n hosting type (Cloud or Self-hosted)",
    `Navigate to your n8n instance at ${n8nUrl}`,
    "Authenticate with your credentials and verify dashboard loads",
    "Go to Settings → MCP access → Toggle 'Enable MCP access' ON",
    `Copy the MCP Server URL: ${n8nUrl}/mcp-server/http`,
    "In Lovable: Go to Project Settings → Connectors → Connect n8n → Paste your MCP URL"
  ];

  return [
    {
      id: "n8n-setup",
      title: "n8n Instance Setup & Access",
      objective: `Configure and verify access to your ${isHostinger ? 'Hostinger-hosted' : isCloud ? 'n8n Cloud' : 'self-hosted'} n8n automation instance`,
      actions: n8nSetupActions,
      validationCriteria: [
        `n8n login page loads at ${n8nUrl}`,
        "Credentials authenticate successfully",
        "Dashboard displays with workflow list",
        "MCP access toggle is enabled in Settings",
        `MCP Server URL (${n8nUrl}/mcp-server/http) is visible and copied`
      ],
      credentialKeys: ["n8n_instance_url", "n8n_username", "n8n_password", "n8n_mcp_url"]
    },
    {
      id: "prospecting",
      title: "Lead Prospecting Automation",
      objective: `Automatically identify and collect leads matching ${idea.targetAudience} in the ${idea.niche} space`,
      actions: [
        `Navigate to Apollo.io dashboard`,
        `Create new saved search with filters: Industry = "${idea.niche}", Company Size = "10-500"`,
        `Search for contacts matching: "${idea.targetAudience}"`,
        `Export top 100 results to CSV`,
        `Navigate to n8n instance`,
        `Create new workflow named "${idea.businessName} - Lead Prospecting"`,
        `Add Schedule Trigger node - configure for daily at 9:00 AM`,
        `Add HTTP Request node - configure Apollo.io API endpoint`,
        `Add Google Sheets node - append new leads to tracking spreadsheet`,
        `Add IF node - filter for leads with valid email`,
        `Connect all nodes in sequence`,
        `Activate workflow`
      ],
      validationCriteria: [
        "Workflow appears in n8n dashboard as active",
        "Test execution completes without errors",
        "Sample leads appear in Google Sheet"
      ],
      credentialKeys: ["apollo_api_key", "google_sheets_oauth", "n8n_instance_url"]
    },
    {
      id: "outreach",
      title: "Automated Outreach Sequences",
      objective: `Send personalized outreach to prospects about ${idea.valueProposition}`,
      actions: [
        `Navigate to n8n instance`,
        `Create new workflow named "${idea.businessName} - Outreach Automation"`,
        `Add Google Sheets Trigger node - watch for new rows`,
        `Add OpenAI node - generate personalized email using lead data`,
        `Configure prompt: "Write a brief, personalized outreach email for {lead_name} at {company} about ${idea.valueProposition}"`,
        `Add Gmail/SMTP node - send personalized email`,
        `Add Wait node - configure 3-day follow-up delay`,
        `Add IF node - check if reply received`,
        `Add second email node for follow-up sequence`,
        `Connect all nodes in sequence`,
        `Activate workflow`
      ],
      validationCriteria: [
        "Workflow triggers on new spreadsheet rows",
        "AI generates unique email content per lead",
        "Test email sends successfully"
      ],
      credentialKeys: ["openai_api_key", "gmail_oauth", "google_sheets_oauth"]
    },
    {
      id: "qualification",
      title: "Lead Qualification Pipeline",
      objective: `Automatically score and qualify leads interested in ${idea.serviceOffering}`,
      actions: [
        `Navigate to n8n instance`,
        `Create new workflow named "${idea.businessName} - Lead Qualification"`,
        `Add Webhook node - receive form submissions or replies`,
        `Add OpenAI node - analyze response sentiment and intent`,
        `Configure scoring prompt: "Score this lead 1-100 based on fit for ${idea.serviceOffering}"`,
        `Add IF node - route based on score threshold (>70 = qualified)`,
        `Add Notion/Airtable node - update lead status in CRM`,
        `Add Slack node - notify team of hot leads`,
        `Add Calendar node - auto-book discovery calls for qualified leads`,
        `Connect all nodes with conditional branches`,
        `Activate workflow`
      ],
      validationCriteria: [
        "Webhook receives test submission",
        "Lead scoring produces numeric result",
        "High-score leads trigger Slack notification"
      ],
      credentialKeys: ["openai_api_key", "notion_api_key", "slack_webhook", "calendly_api_key"]
    },
    {
      id: "proposal",
      title: "Proposal Generation System",
      objective: `Auto-generate customized proposals for ${idea.serviceOffering}`,
      actions: [
        `Navigate to n8n instance`,
        `Create new workflow named "${idea.businessName} - Proposal Generator"`,
        `Add Webhook node - trigger on "generate proposal" request`,
        `Add HTTP Request node - fetch lead data from CRM`,
        `Add OpenAI node - generate proposal content`,
        `Configure prompt: "Create a proposal for {company} offering ${idea.serviceOffering} with value proposition: ${idea.valueProposition}"`,
        `Add Google Docs node - create proposal from template`,
        `Add PDF generation node - convert to PDF`,
        `Add Gmail node - send proposal with tracking`,
        `Add Notion node - log proposal in pipeline`,
        `Connect all nodes in sequence`,
        `Activate workflow`
      ],
      validationCriteria: [
        "Proposal generates from template",
        "PDF output is properly formatted",
        "Email sends with attachment"
      ],
      credentialKeys: ["openai_api_key", "google_docs_oauth", "gmail_oauth"]
    },
    {
      id: "closing",
      title: "Deal Closing Automation",
      objective: `Streamline contract signing and payment collection for ${idea.businessName}`,
      actions: [
        `Navigate to n8n instance`,
        `Create new workflow named "${idea.businessName} - Deal Closing"`,
        `Add Webhook node - trigger on proposal acceptance`,
        `Add DocuSign/PandaDoc node - generate contract`,
        `Add email node - send contract for signature`,
        `Add Wait node - monitor for signature completion`,
        `Add Stripe node - create payment link or invoice`,
        `Add Gmail node - send payment request`,
        `Add Notion/CRM node - update deal status to "Won"`,
        `Add Slack node - celebrate closed deal with team`,
        `Connect all nodes in sequence`,
        `Activate workflow`
      ],
      validationCriteria: [
        "Contract generates with correct terms",
        "Signature request sends successfully",
        "Payment link is valid and works"
      ],
      credentialKeys: ["docusign_api_key", "stripe_api_key", "gmail_oauth", "slack_webhook"]
    },
    {
      id: "client-success",
      title: "Client Onboarding & Success",
      objective: `Deliver exceptional onboarding for new ${idea.businessName} clients`,
      actions: [
        `Navigate to n8n instance`,
        `Create new workflow named "${idea.businessName} - Client Onboarding"`,
        `Add Webhook node - trigger on payment confirmed`,
        `Add Notion node - create client workspace from template`,
        `Add Gmail node - send welcome email with next steps`,
        `Add Calendar node - schedule kickoff call`,
        `Add Slack node - create private channel for client`,
        `Add Wait node - 7-day check-in delay`,
        `Add Gmail node - send satisfaction survey`,
        `Add IF node - route based on feedback score`,
        `Add Notion node - update client health score`,
        `Connect all nodes in sequence`,
        `Activate workflow`
      ],
      validationCriteria: [
        "Client workspace creates correctly",
        "Welcome email contains personalized content",
        "Kickoff call appears on calendar"
      ],
      credentialKeys: ["notion_api_key", "gmail_oauth", "calendly_api_key", "slack_oauth"]
    }
  ];
}

export function generateDirectorAiPrompt(idea: BusinessIdeaData, stageId?: string, options?: DirectorAiOptions): string {
  const stages = generateDirectorAiStages(idea, options);
  const selectedStages = stageId && stageId !== "all" 
    ? stages.filter(s => s.id === stageId) 
    : stages;
  
  const n8nUrl = options?.n8nInstanceUrl?.replace(/\/$/, '') || '[YOUR_N8N_INSTANCE_URL]';
  const hostingDescription = options?.hostingType === 'cloud' 
    ? 'n8n Cloud' 
    : options?.deploymentMethod === 'hostinger' 
    ? 'Hostinger-hosted n8n' 
    : 'self-hosted n8n';

  const contextBlock = JSON.stringify({
    businessName: idea.businessName,
    niche: idea.niche,
    targetAudience: idea.targetAudience,
    valueProposition: idea.valueProposition,
    serviceOffering: idea.serviceOffering
  }, null, 2);

  const stageInstructions = selectedStages.map((stage, index) => `
## Stage ${index + 1}: ${stage.title}

### Objective
${stage.objective}

### Actions
${stage.actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

### Validation Criteria
${stage.validationCriteria.map(v => `- ${v}`).join('\n')}

### Required Credentials
${stage.credentialKeys.map(k => `- \`${k}\` (configure in 1Password)`).join('\n')}
`).join('\n---\n');

  return `# Task: Build Complete Sales Automation System for ${idea.businessName}

## Overview
Build an end-to-end automated sales pipeline using n8n workflows. This automation will handle lead prospecting, outreach, qualification, proposals, closing, and client success for a ${idea.niche} business targeting ${idea.targetAudience}.

## Business Context
\`\`\`json
${contextBlock}
\`\`\`

## Prerequisites
Before starting, ensure you have access to:
- ${hostingDescription} instance at ${n8nUrl}
- Apollo.io account for prospecting
- Google Workspace (Gmail, Sheets, Docs, Calendar)
- OpenAI API access
- Notion or Airtable for CRM
- Slack workspace
- Stripe account for payments
- DocuSign or PandaDoc for contracts

## Credential Setup
Configure these credentials in 1Password before running:
- \`n8n_instance_url\`: ${n8nUrl}
- \`n8n_mcp_url\`: ${n8nUrl}/mcp-server/http
- \`apollo_api_key\`: Apollo.io API key
- \`openai_api_key\`: OpenAI API key
- \`google_oauth\`: Google OAuth credentials
- \`notion_api_key\`: Notion integration token
- \`slack_webhook\`: Slack incoming webhook URL
- \`stripe_api_key\`: Stripe secret key
- \`docusign_api_key\`: DocuSign API credentials

---

# Automation Stages
${stageInstructions}

---

## Execution Notes

1. **Sequential Build**: Complete each stage before moving to the next
2. **Test Each Workflow**: Run manual test after activation
3. **Error Handling**: Add error notification nodes to each workflow
4. **Documentation**: Name nodes descriptively for future maintenance

## Success Criteria
- All ${selectedStages.length} workflows are active in n8n
- Each workflow has been tested with sample data
- Workflows are connected (output of one feeds into triggers of next)
- Team receives Slack notifications for key events
- CRM/Notion is updated automatically throughout pipeline

## Troubleshooting
- If authentication fails, verify credentials in 1Password
- If nodes show errors, check API rate limits
- If data doesn't flow, verify field mappings between nodes
- Test webhooks using webhook.site before connecting
`;
}

export function generateDirectorAiStagePrompt(idea: BusinessIdeaData, stageId: string, options?: DirectorAiOptions): string {
  return generateDirectorAiPrompt(idea, stageId, options);
}

export { generateDirectorAiStages };
