import { Json } from "@/integrations/supabase/types";

export interface BusinessIdeaData {
  id: string;
  businessName: string;
  niche?: string;
  targetAudience?: string;
  valueProposition?: string;
  serviceOffering?: string;
  aiAutomationStrategy?: Json;
}

export interface AutomationStage {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  n8nNodes: string[];
  workflowPrompt: string;
  setupSteps: string[];
}

const generateAutomationStages = (businessIdea: BusinessIdeaData): AutomationStage[] => {
  const { businessName, niche, targetAudience, serviceOffering, valueProposition } = businessIdea;

  return [
    {
      id: "n8n-prospecting",
      title: "Lead Prospecting & Discovery",
      description: `Automate finding and enriching leads for ${businessName}`,
      estimatedTime: "2-3 hours",
      n8nNodes: [
        "Schedule Trigger (daily/weekly)",
        "HTTP Request → Apollo.io API",
        "HTTP Request → Hunter.io for email verification",
        "Google Sheets / Airtable → Store leads",
        "IF Node → Filter by ICP criteria",
        "Set Node → Format lead data"
      ],
      workflowPrompt: `Create an n8n workflow for ${businessName} that:
1. Runs on a daily schedule at 9 AM
2. Calls Apollo.io API to search for ${targetAudience} in the ${niche} space
3. Filters leads by company size (10-500 employees), industry relevance, and job title
4. Enriches each lead with Hunter.io to verify email addresses
5. Scores leads 1-10 based on fit with ICP: ${targetAudience}
6. Adds qualified leads (score >= 7) to a Google Sheet with columns: Name, Email, Company, Title, Score, LinkedIn URL
7. Sends a Slack notification with daily prospecting summary

Trigger: Schedule Trigger
Key Nodes: HTTP Request, IF, Set, Google Sheets, Slack`,
      setupSteps: [
        "Sign up for Apollo.io and get your API key",
        "Create a Hunter.io account for email verification",
        "Set up a Google Sheet with lead columns",
        "In n8n, create a new workflow and add Schedule Trigger",
        "Add HTTP Request nodes for Apollo.io and Hunter.io",
        "Use IF nodes to filter by your ICP criteria",
        "Connect to Google Sheets to store qualified leads"
      ]
    },
    {
      id: "n8n-outreach",
      title: "Outreach & Follow-up",
      description: `Automated email sequences for ${targetAudience}`,
      estimatedTime: "3-4 hours",
      n8nNodes: [
        "Google Sheets Trigger (new row)",
        "Wait Node (delays between emails)",
        "Gmail / SendGrid Node",
        "IF Node → Check for replies",
        "HTTP Request → CRM update",
        "Merge Node → Handle responses"
      ],
      workflowPrompt: `Create an n8n outreach workflow for ${businessName} that:
1. Triggers when a new lead is added to the prospecting sheet
2. Sends personalized cold email #1 introducing ${serviceOffering}
3. Waits 3 days, then checks for replies
4. If no reply: Sends follow-up email #2 with a case study
5. Waits 4 days, then checks again
6. If no reply: Sends final email #3 with a specific offer
7. If reply detected: Moves lead to "Responded" sheet and notifies via Slack
8. Updates CRM with email status after each step

Email personalization should include:
- First name and company name
- Reference to their role as ${targetAudience}
- Value proposition: ${valueProposition}

Trigger: Google Sheets (new row)
Key Nodes: Gmail, Wait, IF, Set, Slack`,
      setupSteps: [
        "Connect your Gmail or SendGrid account to n8n",
        "Create email templates with {{firstName}}, {{company}} variables",
        "Set up a 'Responded' sheet for engaged leads",
        "Configure Wait nodes with appropriate delays (3-4 days)",
        "Add IF nodes to check for email replies",
        "Connect Slack for real-time notifications"
      ]
    },
    {
      id: "n8n-qualification",
      title: "Qualification & Discovery",
      description: `Qualify and schedule calls with ${targetAudience}`,
      estimatedTime: "2-3 hours",
      n8nNodes: [
        "Webhook Trigger (Calendly/Typeform)",
        "HTTP Request → Calendly API",
        "Set Node → Score lead",
        "IF Node → Route by score",
        "Notion / Google Docs → Create prep doc",
        "Gmail → Send confirmation"
      ],
      workflowPrompt: `Create an n8n qualification workflow for ${businessName} that:
1. Triggers when someone books a discovery call via Calendly
2. Fetches the qualification form responses from Typeform
3. Scores the lead based on:
   - Company size and fit with ${niche}
   - Budget indicators
   - Timeline urgency
   - Alignment with ${serviceOffering}
4. Creates a call prep document in Notion with:
   - Lead info and company research
   - Qualification score and reasoning
   - Suggested talking points for ${valueProposition}
5. Sends personalized confirmation email with agenda
6. If high score (8+): Alerts sales team via Slack with priority flag
7. Adds meeting to team calendar with prep doc link

Trigger: Webhook (Calendly booking)
Key Nodes: HTTP Request, Set, Notion, Gmail, Slack`,
      setupSteps: [
        "Set up Calendly with embedded Typeform for qualification",
        "Create a Notion database for call prep documents",
        "Define scoring criteria based on your ICP",
        "Configure webhook in n8n to receive Calendly events",
        "Build the scoring logic with Set and IF nodes",
        "Connect Gmail for automated confirmations"
      ]
    },
    {
      id: "n8n-proposal",
      title: "Proposal & Presentation",
      description: `Auto-generate proposals for ${serviceOffering}`,
      estimatedTime: "3-4 hours",
      n8nNodes: [
        "Webhook / Form Trigger",
        "HTTP Request → AI API (proposal generation)",
        "PandaDoc API → Create proposal",
        "Google Drive → Store proposal",
        "Gmail → Send proposal link",
        "Wait + IF → Track opens"
      ],
      workflowPrompt: `Create an n8n proposal automation workflow for ${businessName} that:
1. Triggers when a discovery call is marked "Qualified" in CRM
2. Fetches call notes and lead data from Notion/CRM
3. Uses AI (OpenAI/Claude) to generate a customized proposal including:
   - Executive summary tailored to their ${niche} challenges
   - How ${serviceOffering} solves their specific problems
   - ${valueProposition} with relevant case studies
   - Pricing options and timeline
4. Creates the proposal in PandaDoc with auto-filled fields
5. Stores PDF backup in Google Drive
6. Sends proposal email with tracking link
7. Monitors for proposal views - if opened but not signed after 3 days:
   - Sends follow-up email
   - Alerts sales rep via Slack
8. When signed: Triggers onboarding workflow

Trigger: CRM Webhook (deal stage change)
Key Nodes: HTTP Request, AI, PandaDoc API, Gmail, Wait, IF`,
      setupSteps: [
        "Create a PandaDoc template with variable fields",
        "Set up AI prompt for proposal content generation",
        "Configure CRM webhook for deal stage changes",
        "Add tracking to monitor proposal engagement",
        "Create follow-up email templates",
        "Link to your onboarding workflow trigger"
      ]
    },
    {
      id: "n8n-closing",
      title: "Payment & Invoicing",
      description: `Automate contracts and payments for ${businessName}`,
      estimatedTime: "2-3 hours",
      n8nNodes: [
        "Webhook Trigger (PandaDoc signed)",
        "HTTP Request → Stripe API",
        "DocuSign / PandaDoc → Contract",
        "Airtable → Update deal status",
        "Gmail → Send receipt",
        "Slack → Notify team"
      ],
      workflowPrompt: `Create an n8n closing automation workflow for ${businessName} that:
1. Triggers when a proposal is signed in PandaDoc/DocuSign
2. Creates a Stripe customer with client details
3. Generates an invoice based on proposal pricing for ${serviceOffering}
4. Sends payment link via email
5. Monitors payment status - if not paid within 48 hours:
   - Sends payment reminder
   - Alerts account manager
6. When payment received:
   - Updates CRM deal to "Closed Won"
   - Sends payment receipt and welcome email
   - Creates client folder in Google Drive
   - Adds to client database in Airtable
   - Notifies team via Slack with celebration 🎉
   - Triggers client onboarding workflow
7. Generates monthly revenue report

Trigger: Webhook (document signed)
Key Nodes: Stripe, Gmail, Google Drive, Airtable, Slack`,
      setupSteps: [
        "Connect Stripe account to n8n",
        "Set up PandaDoc/DocuSign webhook for signatures",
        "Create welcome email template",
        "Configure client folder structure in Google Drive",
        "Set up Airtable base for client management",
        "Create Slack channel for closed deals"
      ]
    },
    {
      id: "n8n-client-success",
      title: "Client Success & Retention",
      description: `Nurture ${targetAudience} for renewals and referrals`,
      estimatedTime: "2-3 hours",
      n8nNodes: [
        "Schedule Trigger (weekly/monthly)",
        "Airtable → Get active clients",
        "HTTP Request → Usage/health data",
        "IF Node → Churn risk check",
        "Gmail → Check-in emails",
        "Typeform → NPS surveys"
      ],
      workflowPrompt: `Create an n8n client success workflow for ${businessName} that:
1. Runs weekly to check on all active ${serviceOffering} clients
2. Fetches client health metrics:
   - Last login/engagement date
   - Feature usage stats
   - Support ticket history
3. Calculates health score (1-10) based on engagement
4. For at-risk clients (score < 6):
   - Sends proactive check-in email
   - Alerts account manager via Slack
   - Creates task in project management tool
5. At 30/60/90 day milestones:
   - Sends NPS survey via Typeform
   - Requests testimonial if NPS >= 8
   - Asks for referrals if NPS >= 9
6. 60 days before renewal:
   - Sends renewal reminder sequence
   - Schedules QBR call
   - Prepares renewal proposal with usage stats
7. Tracks and reports on:
   - Monthly retention rate
   - NPS trends
   - Referral conversions

Trigger: Schedule Trigger (weekly)
Key Nodes: Airtable, HTTP Request, IF, Gmail, Typeform, Slack`,
      setupSteps: [
        "Set up client tracking in Airtable with health metrics",
        "Create NPS survey in Typeform",
        "Define health score calculation logic",
        "Write check-in email templates for different scenarios",
        "Configure renewal reminder sequence",
        "Set up reporting dashboard in Google Sheets"
      ]
    }
  ];
};

export function generateComputerUsePrompt(businessIdea: BusinessIdeaData, stageId?: string): string {
  const stages = generateAutomationStages(businessIdea);
  const selectedStages = stageId ? stages.filter(s => s.id === stageId) : stages;
  
  const totalTime = selectedStages.reduce((acc, stage) => {
    const hours = parseInt(stage.estimatedTime.split('-')[1]) || 3;
    return acc + hours;
  }, 0);

  const prerequisiteTools = [
    "Apollo.io account with API key",
    "Hunter.io account for email verification",
    "Gmail or SendGrid for email sending",
    "Google Sheets access",
    "Calendly account (with Typeform integration)",
    "Notion workspace",
    "PandaDoc account",
    "Stripe account",
    "Airtable workspace",
    "Slack workspace with webhook access",
    "Typeform for surveys"
  ];

  let prompt = `# N8N FULL AUTOMATION SETUP - COMPUTER USE AI AGENT GUIDE
## Business: ${businessIdea.businessName}
## Generated: ${new Date().toISOString().split('T')[0]}

---

## AGENT INSTRUCTIONS

You are an AI assistant with computer use capabilities. Your task is to build ${selectedStages.length} n8n automation workflow${selectedStages.length > 1 ? 's' : ''} for "${businessIdea.businessName}".

**Work through each stage sequentially, completing ALL steps before moving to the next.**

### Execution Guidelines:
- Take your time - precision is more important than speed
- After each action, wait 2-3 seconds for the UI to update
- If an error occurs, capture a screenshot and attempt to resolve it
- Verify each node is properly connected before proceeding
- Test each workflow with sample data before marking complete

---

## BUSINESS CONTEXT

**Business Name:** ${businessIdea.businessName}
**Niche:** ${businessIdea.niche || 'Not specified'}
**Target Audience:** ${businessIdea.targetAudience || 'Not specified'}
**Service Offering:** ${businessIdea.serviceOffering || 'Not specified'}
**Value Proposition:** ${businessIdea.valueProposition || 'Not specified'}

---

## N8N INSTANCE ACCESS (PREREQUISITE)

### Option A: n8n Cloud
1. Navigate to https://app.n8n.cloud
2. Sign in or create an account
3. Note your instance URL (e.g., https://your-name.app.n8n.cloud)
4. Proceed to "Enable MCP Access" section below

### Option B: Self-Hosted n8n
Your n8n instance URL will be one of:
- Custom domain: https://n8n.yourdomain.com
- Direct IP: http://your-server-ip:5678

**Finding Your Credentials by Deployment Method:**

**Docker / Docker Compose:**
1. Locate your docker-compose.yml or .env file
2. Look for these environment variables:
   - N8N_BASIC_AUTH_USER (your username)
   - N8N_BASIC_AUTH_PASSWORD (your password)
3. If using Docker CLI, run: docker inspect [container-id]
4. Credentials will be in the environment section

**Hostinger One-Click Install:**
1. Log into Hostinger dashboard at hpanel.hostinger.com
2. Navigate to Hosting → Manage → Applications
3. Find n8n in the installed applications list
4. Click on n8n to expand details
5. Credentials (username/password) are displayed in the panel
6. Copy your instance URL from the "Access URL" field

**npm/npx Installation:**
1. Use the owner account you created during first n8n run
2. If forgotten: Stop n8n, delete ~/.n8n folder, restart n8n
3. This will prompt you to create new owner credentials

**Verifying Access:**
1. Navigate to your n8n instance URL in browser
2. Enter your username and password
3. Click "Sign in"
4. Confirm you reach the workflow dashboard

### Enable MCP Access (Required for Live Verification)
1. In n8n, click your profile icon → Settings
2. Navigate to "MCP access" section
3. Toggle "Enable MCP access" to ON
4. Copy the MCP Server URL (format: https://[instance]/mcp-server/http)
5. Use this URL when connecting n8n to Lovable's MCP connector

**Note:** MCP access requires owner or admin permissions. If you don't see this option, contact your n8n instance administrator.

---

## PREREQUISITES

Before starting, verify you have access to:

${prerequisiteTools.map((tool, i) => `${i + 1}. ${tool}`).join('\n')}

**n8n Instance URL:** [Your n8n instance URL - cloud or self-hosted]

**Estimated Total Time:** ${totalTime} hours

---

## AUTOMATION STAGES

`;

  selectedStages.forEach((stage, stageIndex) => {
    prompt += `
### STAGE ${stageIndex + 1}: ${stage.title}
**Estimated Time:** ${stage.estimatedTime}

#### What This Workflow Accomplishes:
${stage.description}

#### Required n8n Nodes:
${stage.n8nNodes.map((node, i) => `${i + 1}. ${node}`).join('\n')}

#### Workflow Specification:
\`\`\`
${stage.workflowPrompt}
\`\`\`

#### Step-by-Step Browser Actions:

**PHASE 1: Create the Workflow**
1. Navigate to your n8n instance dashboard
2. Click the "+ Create Workflow" button (or "Add Workflow")
3. Click on the workflow name at the top and rename it to: "${businessIdea.businessName} - ${stage.title}"
4. Press Enter to save the name

**PHASE 2: Add and Configure Nodes**
`;

    stage.setupSteps.forEach((step, stepIndex) => {
      prompt += `
**Step ${stepIndex + 1}:** ${step}
- Locate the relevant node in the nodes panel (press Tab or click +)
- Search for the node type mentioned
- Click to add it to the canvas
- Double-click to open configuration
- Fill in the required fields based on the workflow specification above
- Click "Execute" to test this node individually
- Verify the output is as expected
- Close the node configuration panel
`;
    });

    prompt += `
**PHASE 3: Connect Nodes**
1. Click and drag from the output connector of each node
2. Connect to the input connector of the next node in sequence
3. Verify all connections show a solid line (not dashed)

**PHASE 4: Test the Workflow**
1. Click "Execute Workflow" in the top right
2. Watch for any error indicators (red nodes)
3. If errors occur:
   - Click the error node to see details
   - Read the error message carefully
   - Adjust configuration as needed
   - Re-test until successful
4. Once successful, save the workflow (Ctrl/Cmd + S)

**PHASE 5: Activate the Workflow**
1. Toggle the "Active" switch in the top right (if using triggers)
2. Verify the workflow status shows "Active"
3. For scheduled workflows: confirm the next execution time is correct

#### Validation Checklist for Stage ${stageIndex + 1}:
- [ ] Workflow is named correctly
- [ ] All ${stage.n8nNodes.length} nodes are added
- [ ] All nodes are properly connected
- [ ] Credentials are configured for external services
- [ ] Test execution completed successfully
- [ ] Workflow is activated (if applicable)

---
`;
  });

  prompt += `
## COMPLETION VERIFICATION

After completing all stages, verify:

1. **Total Workflows Created:** ${selectedStages.length}
2. **All Workflows Active:** Check the n8n dashboard for green "Active" indicators
3. **Integration Test:** 
   - Add a test lead to the prospecting sheet
   - Verify it flows through subsequent workflows
   - Check Slack notifications are received
   - Confirm data appears in Airtable/Google Sheets

## TROUBLESHOOTING GUIDE

**Common Issues:**

1. **"Credentials missing" error**
   - Go to n8n Settings → Credentials
   - Add the required credentials for the service
   - Return to the workflow and re-select the credential

2. **"Connection refused" error**
   - Verify the API endpoint URL is correct
   - Check if the service requires authentication
   - Ensure API keys are valid and have proper permissions

3. **"Rate limit exceeded" error**
   - Add Wait nodes between API calls (1-2 second delays)
   - Consider batching requests

4. **"Invalid JSON" error**
   - Check the Set node configuration
   - Ensure all field names match exactly
   - Verify data types are correct

## NOTES FOR AI AGENT

- If you encounter a UI element you cannot interact with, try scrolling or waiting
- Use keyboard shortcuts when possible (Tab to search nodes, Ctrl+S to save)
- If stuck, take a screenshot and describe what you see
- Document any deviations from this guide for later review

---

*This prompt was generated by IdeaForge AI for use with computer-use AI agents like Claude Cowork or Gemini 2.5 Computer Use.*
`;

  return prompt;
}

export function generateStagePrompt(businessIdea: BusinessIdeaData, stageId: string): string {
  return generateComputerUsePrompt(businessIdea, stageId);
}

export { generateAutomationStages };
