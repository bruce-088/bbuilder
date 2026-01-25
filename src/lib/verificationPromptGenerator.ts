import { BusinessIdeaData } from "@/lib/computerUsePromptGenerator";

export interface VerificationData {
  checkDescription: string;
  automatedActions: string[];
  successIndicators: string[];
  failureIndicators: string[];
}

export interface VerifiableStep {
  text: string;
  verification: VerificationData;
}

export interface VerifiableStage {
  id: string;
  title: string;
  steps: VerifiableStep[];
}

export function generateStepVerificationPrompt(
  step: VerifiableStep,
  stepIndex: number,
  stageTitle: string,
  businessIdea: BusinessIdeaData
): string {
  const v = step.verification;
  
  return `# Single Step Verification: ${stageTitle} - Step ${stepIndex + 1}

## Business Context
- **Business Name:** ${businessIdea.businessName}
- **Niche:** ${businessIdea.niche || "Not specified"}
- **Target Audience:** ${businessIdea.targetAudience || "Not specified"}

## Verification Mode
⚠️ This is a TESTING task. Do NOT create or modify anything. Only READ and VERIFY.

---

## Step to Verify
**Setup Instruction:** ${step.text}

### What to Check
${v.checkDescription}

### Verification Actions
${v.automatedActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

### Success Indicators
${v.successIndicators.map(s => `✅ ${s}`).join('\n')}

### Failure Indicators
${v.failureIndicators.map(f => `❌ ${f}`).join('\n')}

---

## Report Format
After verification, report:
\`\`\`
Step: ${stepIndex + 1}
Status: [PASS / FAIL / NEEDS_ATTENTION]
Notes: [Any issues found or observations]
\`\`\`
`;
}

export function generateStageVerificationPrompt(
  stage: VerifiableStage,
  stageIndex: number,
  businessIdea: BusinessIdeaData
): string {
  const contextBlock = JSON.stringify({
    businessName: businessIdea.businessName,
    niche: businessIdea.niche,
    targetAudience: businessIdea.targetAudience,
    valueProposition: businessIdea.valueProposition,
    serviceOffering: businessIdea.serviceOffering
  }, null, 2);

  const stepVerifications = stage.steps.map((step, i) => {
    const v = step.verification;
    return `### Step ${i + 1}: ${step.text.substring(0, 80)}${step.text.length > 80 ? '...' : ''}

**What to Check:** ${v.checkDescription}

**Verification Actions:**
${v.automatedActions.map((action, j) => `${j + 1}. ${action}`).join('\n')}

**Success Indicators:**
${v.successIndicators.map(s => `- ✅ ${s}`).join('\n')}

**Failure Indicators:**
${v.failureIndicators.map(f => `- ❌ ${f}`).join('\n')}

**Result:** [PASS / FAIL / NEEDS_ATTENTION]
**Notes:** [Document any issues]

---`;
  }).join('\n\n');

  return `# Task: Verify N8N Automation Setup - Stage ${stageIndex + 1}: ${stage.title}

## Objective
Systematically verify that all setup steps for **${stage.title}** have been correctly completed for ${businessIdea.businessName}.

## Verification Mode
⚠️ **CRITICAL:** This is a TESTING task. Do NOT create or modify anything. Only READ and VERIFY existing configurations.

## Business Context
\`\`\`json
${contextBlock}
\`\`\`

---

# Verification Steps

${stepVerifications}

---

## Verification Summary

After completing all checks, provide a summary table:

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
${stage.steps.map((step, i) => `| ${i + 1} | ${step.text.substring(0, 40)}... | PASS/FAIL | ... |`).join('\n')}

## Overall Stage Status
- **Stage:** ${stage.title}
- **Status:** [PASS / PARTIAL / FAIL]
- **Steps Passing:** [X/${stage.steps.length}]

## Remediation Instructions
For any FAIL items, provide specific remediation steps:

1. [Step number]: [Specific action to fix the issue]
2. ...

## Next Steps
- If all steps PASS: Proceed to verify the next stage
- If any steps FAIL: Complete remediation before continuing
`;
}

export function generateFullVerificationPrompt(
  stages: VerifiableStage[],
  businessIdea: BusinessIdeaData
): string {
  const contextBlock = JSON.stringify({
    businessName: businessIdea.businessName,
    niche: businessIdea.niche,
    targetAudience: businessIdea.targetAudience,
    valueProposition: businessIdea.valueProposition,
    serviceOffering: businessIdea.serviceOffering
  }, null, 2);

  const totalSteps = stages.reduce((acc, stage) => acc + stage.steps.length, 0);

  const stageVerifications = stages.map((stage, stageIndex) => {
    const stepVerifications = stage.steps.map((step, stepIndex) => {
      const v = step.verification;
      return `#### Step ${stageIndex + 1}.${stepIndex + 1}: Verify ${v.checkDescription}

**Verification Actions:**
${v.automatedActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

**Success Indicators:**
${v.successIndicators.map(s => `- ✅ ${s}`).join('\n')}

**Failure Indicators:**
${v.failureIndicators.map(f => `- ❌ ${f}`).join('\n')}

**Result:** [PASS/FAIL] | **Notes:** ___

---`;
    }).join('\n\n');

    return `## Stage ${stageIndex + 1}: ${stage.title}

${stepVerifications}`;
  }).join('\n\n---\n\n');

  return `# Complete Verification Suite: ${businessIdea.businessName} Sales Automation

## Mission Overview
Systematically verify that the complete N8N sales automation pipeline has been correctly configured. This verification covers all ${stages.length} stages and ${totalSteps} setup steps.

## Verification Mode
⚠️ **CRITICAL INSTRUCTION:** This is a VERIFICATION ONLY task.
- Do NOT create, modify, or delete anything
- Only READ and VERIFY existing configurations
- Document all findings accurately
- Flag any discrepancies or issues

## Business Context
\`\`\`json
${contextBlock}
\`\`\`

## Prerequisites for Verification
Before starting, ensure you have access to:
- n8n instance dashboard
- Apollo.io account
- Google Workspace (Gmail, Sheets, Docs, Calendar)
- OpenAI API dashboard
- Notion or Airtable workspace
- Slack workspace
- Stripe dashboard
- PandaDoc/DocuSign account

---

# Verification Stages

${stageVerifications}

---

# Final Verification Report

## Summary Table

| Stage | Title | Steps Verified | Status |
|-------|-------|----------------|--------|
${stages.map((stage, i) => `| ${i + 1} | ${stage.title} | 0/${stage.steps.length} | ⏳ Pending |`).join('\n')}

## Overall Status
- **Total Stages:** ${stages.length}
- **Total Steps:** ${totalSteps}
- **Passing Steps:** [X/${totalSteps}]
- **Overall Status:** [PASS / PARTIAL / FAIL]

## Critical Issues Found
List any critical issues that must be resolved before going live:

1. [Issue description and affected stage/step]
2. ...

## Recommended Actions
Based on verification results:

### Immediate Actions (Must Fix)
- [Action items for FAIL status items]

### Suggested Improvements (Nice to Have)
- [Optional enhancements noticed during verification]

## Verification Completed
- **Date:** [Current date]
- **Duration:** [Time taken]
- **Verified by:** Director.ai

---

## Post-Verification Next Steps
1. Address all critical issues
2. Re-run verification for failed steps
3. Once all steps pass, activate workflows in production
4. Monitor for first 48 hours for any issues
`;
}

// Export function to get verification data for all stages
export function getVerificationDataForStages(): Map<string, VerificationData[]> {
  return new Map([
    ["n8n-prospecting", [
      {
        checkDescription: "Verify Apollo.io API key is valid and has sufficient credits",
        automatedActions: [
          "Navigate to https://app.apollo.io/settings/integrations/api-keys",
          "Check if at least one API key is listed in the table",
          "Copy the API key value",
          "Make a test API call: POST https://api.apollo.io/v1/auth/health with header x-api-key",
          "Verify response status is 200"
        ],
        successIndicators: [
          "API key appears in Apollo.io dashboard",
          "Test API call returns 200 OK",
          "Response includes 'credits_remaining' > 0"
        ],
        failureIndicators: [
          "No API keys listed in dashboard",
          "API returns 401 Unauthorized",
          "Credits remaining is 0"
        ]
      },
      {
        checkDescription: "Verify Hunter.io account is configured with valid API key",
        automatedActions: [
          "Navigate to https://hunter.io/api-keys",
          "Check if API key exists",
          "Make test call: GET https://api.hunter.io/v2/account?api_key=[KEY]",
          "Verify response contains account information"
        ],
        successIndicators: [
          "API key visible in Hunter.io dashboard",
          "Account endpoint returns 200 with quota info",
          "Available searches > 0"
        ],
        failureIndicators: [
          "No API key found",
          "API returns authentication error",
          "Search quota is 0"
        ]
      },
      {
        checkDescription: "Verify Google Sheet is created with correct columns",
        automatedActions: [
          "Navigate to Google Sheets",
          "Search for the leads tracking spreadsheet",
          "Verify columns exist: Name, Email, Company, Title, LinkedIn URL, Lead Score, Date Added, Status",
          "Check sheet is shared with n8n service account"
        ],
        successIndicators: [
          "Spreadsheet exists and is accessible",
          "All required columns are present",
          "Service account has edit permissions"
        ],
        failureIndicators: [
          "Spreadsheet not found",
          "Missing required columns",
          "Insufficient sharing permissions"
        ]
      },
      {
        checkDescription: "Verify n8n prospecting workflow exists and is configured",
        automatedActions: [
          "Navigate to n8n dashboard",
          "Search for workflow containing 'Prospecting' or 'Lead'",
          "Open workflow and check for Schedule Trigger node",
          "Verify trigger is set to daily at 9:00 AM"
        ],
        successIndicators: [
          "Workflow exists in n8n dashboard",
          "Schedule Trigger is configured correctly",
          "Workflow is active (green status)"
        ],
        failureIndicators: [
          "No matching workflow found",
          "Trigger not configured",
          "Workflow is inactive or has errors"
        ]
      },
      {
        checkDescription: "Verify HTTP Request nodes are configured for Apollo.io and Hunter.io APIs",
        automatedActions: [
          "Open prospecting workflow in n8n",
          "Locate HTTP Request nodes",
          "Check Apollo.io node: POST method, correct URL, x-api-key header",
          "Check Hunter.io node: GET method, correct URL, api_key parameter"
        ],
        successIndicators: [
          "Both HTTP Request nodes exist",
          "API URLs are correct",
          "Authentication headers/params are configured"
        ],
        failureIndicators: [
          "Missing HTTP Request nodes",
          "Incorrect API endpoints",
          "Missing authentication configuration"
        ]
      },
      {
        checkDescription: "Verify IF node filters leads by ICP criteria",
        automatedActions: [
          "Locate IF node in prospecting workflow",
          "Check conditions include: Company Size > 10 AND < 500",
          "Check conditions include: Job Title contains 'Director' or 'VP'",
          "Verify both True and False outputs are connected"
        ],
        successIndicators: [
          "IF node exists with correct conditions",
          "Company size filter is configured",
          "Job title filter is configured",
          "Both output paths are connected"
        ],
        failureIndicators: [
          "IF node missing",
          "Incorrect filter conditions",
          "Output paths not connected"
        ]
      },
      {
        checkDescription: "Verify Google Sheets node appends leads correctly",
        automatedActions: [
          "Locate Google Sheets node in workflow",
          "Verify 'Append Row' operation is selected",
          "Check field mappings: name → Name column, email → Email column, etc.",
          "Test with sample data if possible"
        ],
        successIndicators: [
          "Google Sheets node connected to correct spreadsheet",
          "Append Row operation selected",
          "All fields properly mapped"
        ],
        failureIndicators: [
          "Wrong spreadsheet selected",
          "Incorrect operation (Update instead of Append)",
          "Missing field mappings"
        ]
      }
    ]],
    ["n8n-outreach", [
      {
        checkDescription: "Verify Gmail/SendGrid credentials are configured in n8n",
        automatedActions: [
          "Navigate to n8n Credentials page",
          "Search for Gmail or SendGrid credential",
          "Click credential to verify it's connected",
          "Send a test email to verify functionality"
        ],
        successIndicators: [
          "Gmail/SendGrid credential exists",
          "Credential shows 'Connected' status",
          "Test email sends successfully"
        ],
        failureIndicators: [
          "No email credentials found",
          "Credential shows error or disconnected",
          "Test email fails to send"
        ]
      },
      {
        checkDescription: "Verify email templates exist with correct placeholders",
        automatedActions: [
          "Open outreach workflow in n8n",
          "Locate Gmail/SendGrid nodes",
          "Check Email 1 contains {{firstName}}, {{companyName}} placeholders",
          "Verify Email 2 and Email 3 templates are configured"
        ],
        successIndicators: [
          "3 email templates configured",
          "Personalization placeholders present",
          "Subject lines are properly formatted"
        ],
        failureIndicators: [
          "Missing email templates",
          "Hardcoded names instead of placeholders",
          "Empty or incomplete email content"
        ]
      },
      {
        checkDescription: "Verify 'Responded' sheet tab exists in leads spreadsheet",
        automatedActions: [
          "Navigate to leads Google Sheet",
          "Check for 'Responded' tab at bottom",
          "Verify columns: Name, Email, Company, Response Date, Response Type, Next Action",
          "Ensure sheet is accessible by n8n"
        ],
        successIndicators: [
          "'Responded' tab exists",
          "All required columns present",
          "Sheet is writable by n8n service account"
        ],
        failureIndicators: [
          "Tab doesn't exist",
          "Missing required columns",
          "Permission issues"
        ]
      },
      {
        checkDescription: "Verify Wait nodes are configured with correct delays",
        automatedActions: [
          "Open outreach workflow",
          "Locate Wait nodes between email steps",
          "Verify Wait 1: 3 days between Email 1 and Email 2",
          "Verify Wait 2: 4 days between Email 2 and Email 3"
        ],
        successIndicators: [
          "Wait nodes exist between emails",
          "First wait is 3 days",
          "Second wait is 4 days"
        ],
        failureIndicators: [
          "Missing Wait nodes",
          "Incorrect delay values",
          "Wait nodes not connected properly"
        ]
      },
      {
        checkDescription: "Verify IF node checks for email replies",
        automatedActions: [
          "Locate IF node after Wait nodes",
          "Check condition logic for reply detection",
          "Verify True path leads to 'Responded' sheet",
          "Verify False path continues email sequence"
        ],
        successIndicators: [
          "IF node configured for reply detection",
          "True path moves lead to Responded sheet",
          "False path continues sequence"
        ],
        failureIndicators: [
          "No reply detection logic",
          "Incorrect routing on True/False paths",
          "Missing connections"
        ]
      },
      {
        checkDescription: "Verify Slack notifications for responses",
        automatedActions: [
          "Check for Slack node in workflow",
          "Verify channel is set (e.g., #sales-leads)",
          "Check message template includes lead info",
          "Test notification with sample data"
        ],
        successIndicators: [
          "Slack node exists and is connected",
          "Correct channel selected",
          "Message template is personalized"
        ],
        failureIndicators: [
          "No Slack node found",
          "Wrong channel configured",
          "Missing or empty message template"
        ]
      }
    ]],
    ["n8n-qualification", [
      {
        checkDescription: "Verify Calendly discovery call event is configured",
        automatedActions: [
          "Navigate to Calendly dashboard",
          "Find 30-min Discovery Call event",
          "Check booking questions exist (Budget, Timeline, Current solution)",
          "Verify webhook is connected to n8n"
        ],
        successIndicators: [
          "Discovery Call event exists",
          "Qualification questions configured",
          "Webhook URL is set"
        ],
        failureIndicators: [
          "No discovery call event",
          "Missing qualification questions",
          "Webhook not configured"
        ]
      },
      {
        checkDescription: "Verify Notion database is set up for call prep",
        automatedActions: [
          "Navigate to Notion workspace",
          "Find call prep database",
          "Check properties: Lead Name, Company, Score, Call Date, Prep Notes, Status",
          "Verify template page exists"
        ],
        successIndicators: [
          "Database exists with correct properties",
          "Template page is configured",
          "Database is connected to n8n"
        ],
        failureIndicators: [
          "Database not found",
          "Missing required properties",
          "No integration with n8n"
        ]
      },
      {
        checkDescription: "Verify scoring rubric is implemented in workflow",
        automatedActions: [
          "Open qualification workflow in n8n",
          "Locate Set node with scoring logic",
          "Verify scoring formula: Company Size (0-3), Industry Fit (0-3), Budget (0-2), Timeline (0-2)",
          "Check thresholds: 7+ = High priority, 4-6 = Medium, <4 = Low"
        ],
        successIndicators: [
          "Scoring logic exists in Set node",
          "All criteria are weighted correctly",
          "Priority routing based on score works"
        ],
        failureIndicators: [
          "No scoring logic found",
          "Incorrect point values",
          "Missing routing based on score"
        ]
      },
      {
        checkDescription: "Verify Webhook Trigger receives Calendly bookings",
        automatedActions: [
          "Open qualification workflow",
          "Check Webhook Trigger node configuration",
          "Verify webhook URL matches Calendly configuration",
          "Test with a sample booking"
        ],
        successIndicators: [
          "Webhook Trigger is configured",
          "URL matches Calendly webhook",
          "Test booking triggers workflow"
        ],
        failureIndicators: [
          "Webhook not configured",
          "URL mismatch",
          "Bookings don't trigger workflow"
        ]
      },
      {
        checkDescription: "Verify Set node calculates score correctly",
        automatedActions: [
          "Locate Set node with 'score' field",
          "Check expression logic for each criterion",
          "Verify score calculation: loginScore + usageScore + ticketScore",
          "Test with sample data"
        ],
        successIndicators: [
          "Set node creates 'score' field",
          "Each criterion is properly evaluated",
          "Final score is calculated correctly"
        ],
        failureIndicators: [
          "Missing score field",
          "Incorrect expressions",
          "Calculation errors"
        ]
      },
      {
        checkDescription: "Verify confirmation email is sent with agenda",
        automatedActions: [
          "Locate Gmail node for confirmation",
          "Check subject line and body content",
          "Verify personalization placeholders",
          "Check for meeting link and prep questions"
        ],
        successIndicators: [
          "Confirmation email node exists",
          "Contains meeting details and agenda",
          "Personalization works correctly"
        ],
        failureIndicators: [
          "No confirmation email",
          "Missing meeting information",
          "Hardcoded content instead of dynamic"
        ]
      }
    ]],
    ["n8n-proposal", [
      {
        checkDescription: "Verify PandaDoc template is created with variable fields",
        automatedActions: [
          "Navigate to PandaDoc dashboard",
          "Find 'Service Proposal Template'",
          "Check for fields: [client.name], [client.company], [pricing.total]",
          "Verify signature block exists"
        ],
        successIndicators: [
          "Template exists in PandaDoc",
          "Variable fields are properly formatted",
          "Signature block is configured"
        ],
        failureIndicators: [
          "Template not found",
          "Incorrect variable syntax",
          "Missing signature block"
        ]
      },
      {
        checkDescription: "Verify AI prompt template for proposal generation",
        automatedActions: [
          "Open proposal workflow in n8n",
          "Locate HTTP Request node for AI API",
          "Check prompt includes business context placeholders",
          "Verify output format instructions"
        ],
        successIndicators: [
          "AI API node is configured",
          "Prompt template is comprehensive",
          "Business context is injected"
        ],
        failureIndicators: [
          "No AI API integration",
          "Generic/incomplete prompt",
          "Missing business context"
        ]
      },
      {
        checkDescription: "Verify CRM webhook triggers proposal workflow",
        automatedActions: [
          "Check CRM (HubSpot/Pipedrive) webhook configuration",
          "Verify trigger: deal stage = 'Proposal Requested'",
          "Confirm webhook URL matches n8n endpoint",
          "Test with a sample deal stage change"
        ],
        successIndicators: [
          "Webhook is configured in CRM",
          "Correct trigger stage selected",
          "n8n receives webhook events"
        ],
        failureIndicators: [
          "No webhook configured",
          "Wrong trigger stage",
          "Events not received by n8n"
        ]
      },
      {
        checkDescription: "Verify proposal view tracking with follow-up logic",
        automatedActions: [
          "Locate Wait node (3 days) after proposal send",
          "Check HTTP Request to PandaDoc API for status",
          "Verify IF node: viewed but not signed → follow-up",
          "Confirm follow-up email templates exist"
        ],
        successIndicators: [
          "Wait node configured for 3 days",
          "PandaDoc status check implemented",
          "Follow-up path is configured"
        ],
        failureIndicators: [
          "No tracking logic",
          "Missing status check",
          "No follow-up automation"
        ]
      },
      {
        checkDescription: "Verify follow-up email templates are configured",
        automatedActions: [
          "Check for Day 3, Day 7, Day 10 follow-up templates",
          "Verify each adds value (not just 'checking in')",
          "Confirm personalization placeholders work",
          "Check email scheduling logic"
        ],
        successIndicators: [
          "3 follow-up templates exist",
          "Each template adds unique value",
          "Proper timing between follow-ups"
        ],
        failureIndicators: [
          "Missing follow-up templates",
          "Generic/repetitive content",
          "Incorrect timing logic"
        ]
      },
      {
        checkDescription: "Verify onboarding workflow trigger on signature",
        automatedActions: [
          "Locate HTTP Request at end of proposal workflow",
          "Check POST to onboarding workflow webhook URL",
          "Verify client data is passed: name, email, package, dates",
          "Test end-to-end with mock signature"
        ],
        successIndicators: [
          "Onboarding trigger exists",
          "Correct data is passed",
          "Onboarding workflow receives event"
        ],
        failureIndicators: [
          "No onboarding trigger",
          "Missing client data",
          "Onboarding workflow not triggered"
        ]
      }
    ]],
    ["n8n-closing", [
      {
        checkDescription: "Verify Stripe API credentials are configured",
        automatedActions: [
          "Navigate to n8n Credentials",
          "Check for Stripe credential",
          "Verify using correct API key (live vs test)",
          "Test connection with simple API call"
        ],
        successIndicators: [
          "Stripe credential exists",
          "Connection test passes",
          "Correct mode (test/live) is used"
        ],
        failureIndicators: [
          "No Stripe credential",
          "Invalid API key",
          "Wrong mode for environment"
        ]
      },
      {
        checkDescription: "Verify PandaDoc webhook for document.completed",
        automatedActions: [
          "Check PandaDoc webhook settings",
          "Verify 'document.completed' event is selected",
          "Confirm webhook URL points to n8n",
          "Test with sample document completion"
        ],
        successIndicators: [
          "Webhook configured in PandaDoc",
          "Correct event type selected",
          "n8n receives completion events"
        ],
        failureIndicators: [
          "No webhook configured",
          "Wrong event type",
          "Events not reaching n8n"
        ]
      },
      {
        checkDescription: "Verify welcome email template is configured",
        automatedActions: [
          "Locate welcome email in closing workflow",
          "Check includes: login placeholder, next steps, support contact",
          "Verify calendar link for kickoff call",
          "Confirm email is personalized"
        ],
        successIndicators: [
          "Welcome email template complete",
          "All required information present",
          "Personalization works"
        ],
        failureIndicators: [
          "Missing welcome email",
          "Incomplete information",
          "Hardcoded content"
        ]
      },
      {
        checkDescription: "Verify Google Drive client folder structure",
        automatedActions: [
          "Navigate to Google Drive",
          "Find 'Clients' folder",
          "Check template subfolder structure: /Contracts, /Invoices, /Deliverables",
          "Verify n8n can create copies"
        ],
        successIndicators: [
          "Clients folder exists",
          "Template structure is complete",
          "n8n has copy permissions"
        ],
        failureIndicators: [
          "Folder structure missing",
          "Incomplete template",
          "Permission issues"
        ]
      },
      {
        checkDescription: "Verify Airtable base with client tables",
        automatedActions: [
          "Navigate to Airtable",
          "Find Clients base",
          "Check tables: Clients, Invoices, Health Scores",
          "Verify linked relationships between tables"
        ],
        successIndicators: [
          "Base exists with all tables",
          "Required fields present",
          "Tables are properly linked"
        ],
        failureIndicators: [
          "Base or tables missing",
          "Missing required fields",
          "Tables not linked"
        ]
      },
      {
        checkDescription: "Verify Slack #closed-won channel notifications",
        automatedActions: [
          "Check Slack for #closed-won channel",
          "Verify n8n Slack node targets this channel",
          "Check message template includes: client, package, deal value",
          "Test notification with sample data"
        ],
        successIndicators: [
          "Channel exists",
          "Slack node configured correctly",
          "Messages include all details"
        ],
        failureIndicators: [
          "Channel doesn't exist",
          "Wrong channel in n8n",
          "Incomplete message template"
        ]
      }
    ]],
    ["n8n-client-success", [
      {
        checkDescription: "Verify Airtable health score fields and formula",
        automatedActions: [
          "Open Clients table in Airtable",
          "Check fields: Last Login, Feature Usage %, Support Tickets, NPS Score, Health Score",
          "Verify Health Score formula: (Usage*0.4 + Engagement*0.3 + Satisfaction*0.3)",
          "Test formula with sample data"
        ],
        successIndicators: [
          "All required fields exist",
          "Formula is correctly configured",
          "Scores calculate properly"
        ],
        failureIndicators: [
          "Missing fields",
          "Incorrect formula",
          "Calculation errors"
        ]
      },
      {
        checkDescription: "Verify Typeform NPS survey is configured",
        automatedActions: [
          "Navigate to Typeform",
          "Find NPS survey",
          "Check for 0-10 scale question",
          "Verify hidden client_id field exists"
        ],
        successIndicators: [
          "NPS survey exists",
          "0-10 rating question present",
          "Hidden field for tracking configured"
        ],
        failureIndicators: [
          "Survey not found",
          "Wrong question format",
          "Missing tracking field"
        ]
      },
      {
        checkDescription: "Verify score calculation logic in n8n",
        automatedActions: [
          "Open client success workflow",
          "Locate Set node with score calculation",
          "Verify: loginScore + usageScore + ticketScore formula",
          "Check normalization: divide by 8 and multiply by 10"
        ],
        successIndicators: [
          "Score calculation exists",
          "All components included",
          "Proper normalization"
        ],
        failureIndicators: [
          "No score logic",
          "Missing score components",
          "Wrong normalization"
        ]
      },
      {
        checkDescription: "Verify check-in email templates for each segment",
        automatedActions: [
          "Locate email templates in workflow",
          "Check At-risk template (score <6)",
          "Check Healthy template (6-8)",
          "Check Champions template (9-10)"
        ],
        successIndicators: [
          "3 templates for different scores",
          "Appropriate messaging for each segment",
          "Templates are personalized"
        ],
        failureIndicators: [
          "Missing templates",
          "Same message for all segments",
          "Generic content"
        ]
      },
      {
        checkDescription: "Verify renewal reminder sequence",
        automatedActions: [
          "Check for 60-day renewal workflow trigger",
          "Verify email sequence: 60, 45, 30, 14 days",
          "Check QBR call scheduling at 30 days",
          "Verify renewal proposal generation"
        ],
        successIndicators: [
          "Renewal sequence exists",
          "All touchpoints configured",
          "QBR and proposal automation works"
        ],
        failureIndicators: [
          "No renewal automation",
          "Missing touchpoints",
          "Manual steps required"
        ]
      },
      {
        checkDescription: "Verify Google Sheet reporting dashboard",
        automatedActions: [
          "Navigate to Google Sheets",
          "Find reporting spreadsheet",
          "Check tabs: Overview (MRR, churn), Client List, Trends",
          "Verify data is being appended weekly"
        ],
        successIndicators: [
          "Reporting sheet exists",
          "All tabs present",
          "Data is being updated automatically"
        ],
        failureIndicators: [
          "Sheet not found",
          "Missing tabs",
          "Stale/no data"
        ]
      }
    ]]
  ]);
}
