import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Copy, 
  Check, 
  Target, 
  Users, 
  Presentation, 
  Shield, 
  Handshake, 
  Heart,
  Workflow,
  ExternalLink,
  Zap,
  ArrowRight,
  Cloud,
  Clock,
  Loader2,
  Bot,
  Download,
  Lightbulb,
  ChevronDown,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Wrench,
  RotateCw,
  AlertCircle,
  Link2,
  Radio,
  Server,
  Key,
  Wifi,
  WifiOff,
  Upload,
  Plus
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getVerificationDataForStages, generateStepVerificationPrompt, VerificationData } from "@/lib/verificationPromptGenerator";
import FixDiagnosisDialog from "@/components/FixDiagnosisDialog";
import NodeFixActions from "@/components/NodeFixActions";
import { isGhostWriterWorkflow, type WorkflowDetails } from "@/lib/n8nWorkflowVerification";

interface BusinessIdeaData {
  id: string;
  businessName: string;
  niche?: string;
  targetAudience?: string;
  valueProposition?: string;
  serviceOffering?: string;
  aiAutomationStrategy?: Json;
}

interface N8nAutomationGuideDialogProps {
  trigger?: React.ReactNode;
  businessIdea: BusinessIdeaData;
}

interface SetupStep {
  text: string;
  links?: { label: string; url: string }[];
  proTip?: string;
  verification?: VerificationData;
}

interface AutomationStage {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  estimatedTime: string;
  n8nNodes: string[];
  workflowPrompt: string;
  setupSteps: SetupStep[];
}

type CompletedSteps = Record<string, Set<string>>;

const generateAutomationStages = (businessIdea: BusinessIdeaData): AutomationStage[] => {
  const { businessName, niche, targetAudience, serviceOffering, valueProposition } = businessIdea;

  return [
    {
      id: "n8n-setup",
      title: "n8n Instance Setup & Access",
      icon: <Server className="w-5 h-5" />,
      description: "Configure and verify access to your n8n automation instance",
      estimatedTime: "15-30 min",
      n8nNodes: [
        "No workflow nodes needed - this is instance configuration"
      ],
      workflowPrompt: `This stage is about setting up your n8n instance, not creating a workflow.

For n8n Cloud:
1. Navigate to https://app.n8n.cloud
2. Sign in or create a new account
3. Your instance URL will be: https://your-name.app.n8n.cloud

For Self-Hosted n8n:
1. Access your n8n instance via custom domain or IP:port
2. Authenticate with your admin credentials
3. Enable MCP access in Settings for live verification

Once logged in:
1. Go to Settings → MCP access
2. Toggle "Enable MCP access" ON
3. Copy the MCP Server URL for Lovable connector setup`,
      setupSteps: [
        { 
          text: "Choose your n8n hosting type: n8n Cloud (app.n8n.cloud) for managed hosting, or Self-hosted (Docker, Hostinger, npm) for your own server", 
          links: [{ label: "n8n Cloud", url: "https://app.n8n.cloud" }, { label: "n8n", url: "https://n8n.io" }],
          proTip: "n8n Cloud is recommended for beginners—no server management required. Self-hosted gives you full control and is often required for enterprise compliance. Both support the same features."
        },
        { 
          text: "For n8n Cloud: Sign up at app.n8n.cloud → Create your account → Your instance will be ready in seconds → Note your instance URL (e.g., https://your-name.app.n8n.cloud)", 
          links: [{ label: "n8n Cloud", url: "https://app.n8n.cloud" }],
          proTip: "n8n Cloud offers a free trial. For production use, the Pro plan ($20/mo) includes unlimited workflows and executions. Your instance URL is your unique subdomain on app.n8n.cloud."
        },
        { 
          text: "For Hostinger One-Click: Log into Hostinger dashboard → Navigate to Hosting → Manage → Applications → Find n8n → Click to view your auto-generated credentials (username/password)", 
          links: [{ label: "Hostinger", url: "https://hpanel.hostinger.com" }],
          proTip: "Hostinger displays your n8n credentials directly in the Applications panel. Your instance URL is also shown there. If you can't find credentials, check the email sent when n8n was installed."
        },
        { 
          text: "For Docker: Check your docker-compose.yml or .env file for N8N_BASIC_AUTH_USER and N8N_BASIC_AUTH_PASSWORD → These are your login credentials → Your instance runs at http://localhost:5678 or your configured domain", 
          proTip: "If you didn't set authentication variables, n8n may be running without protection—add N8N_BASIC_AUTH_ACTIVE=true, N8N_BASIC_AUTH_USER, and N8N_BASIC_AUTH_PASSWORD to your docker-compose.yml immediately."
        },
        { 
          text: "For npm/npx: Use the owner account created during first n8n run (npx n8n) → If you forgot credentials: stop n8n, delete ~/.n8n folder, restart to create new owner account", 
          proTip: "The ~/.n8n folder contains all your data including credentials. Before deleting, back up ~/.n8n/database.sqlite if you have existing workflows. On Windows, the folder is at C:\\Users\\[username]\\.n8n"
        },
        { 
          text: "Navigate to your n8n instance URL in your browser → Enter your username and password → Click 'Sign in' → Verify you reach the workflow dashboard", 
          links: [{ label: "n8n", url: "https://n8n.io" }],
          proTip: "If login fails: For Docker, check container logs with 'docker logs [container-id]'. For Hostinger, try the password reset option in the Applications panel. For npm, delete ~/.n8n and restart."
        },
        { 
          text: "Enable MCP Access: Click Settings (gear icon) → Navigate to 'MCP access' section → Toggle 'Enable MCP access' ON → This allows Lovable to verify your workflows live", 
          proTip: "MCP access requires owner or admin permissions. If you don't see this option, you may be logged in as a regular user. Contact your n8n admin to grant permissions or use the owner account."
        },
        { 
          text: "Copy MCP Server URL: In the MCP access settings, copy the displayed MCP Server URL (format: https://[your-instance]/mcp-server/http) → Use this URL when connecting n8n in Lovable's MCP connector", 
          proTip: "Keep your MCP URL secure—it provides API access to your n8n instance. The URL is unique to your instance and enables real-time workflow verification from Lovable."
        }
      ]
    },
    {
      id: "n8n-prospecting",
      title: "Lead Prospecting & Discovery",
      icon: <Target className="w-5 h-5" />,
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
        { 
          text: "Sign up for Apollo.io → Go to Settings > Integrations > API Keys → Click 'Create New Key' → Copy and save the key securely for n8n configuration", 
          links: [{ label: "Apollo.io", url: "https://www.apollo.io" }],
          proTip: "Apollo.io offers 50 free credits/month. For higher volume, consider their 'Professional' plan. Store your API key in n8n's Credentials manager for security, never hardcode it in workflows."
        },
        { 
          text: "Create a Hunter.io account → Navigate to API section in dashboard → Generate your API key → Note: Free plan includes 25 email verifications/month", 
          links: [{ label: "Hunter.io", url: "https://hunter.io" }],
          proTip: "Hunter.io works best for corporate email domains. For Gmail/Yahoo addresses, consider ZeroBounce or NeverBounce as alternatives. Batch your verification requests to stay within free limits."
        },
        { 
          text: "Create a new Google Sheet → Add columns: Name, Email, Company, Title, LinkedIn URL, Lead Score, Date Added, Status → Share the sheet with your n8n service account email", 
          links: [{ label: "Google Sheets", url: "https://sheets.google.com" }],
          proTip: "Add data validation to your Status column (dropdown: New, Contacted, Qualified, Disqualified). Freeze the header row for easier navigation. Consider adding conditional formatting to highlight high-score leads."
        },
        { 
          text: "In n8n, click '+ New Workflow' → Drag 'Schedule Trigger' from the trigger panel → Set to run daily at 9:00 AM → Click the trigger to configure your timezone", 
          links: [{ label: "n8n", url: "https://n8n.io" }],
          proTip: "Avoid running workflows at exactly :00 minutes (high server load times). Instead, use :05 or :15. For prospecting, Tuesday-Thursday mornings typically have better engagement. Always set your local timezone explicitly."
        },
        { 
          text: "Add HTTP Request node → Method: POST → URL: api.apollo.io/v1/mixed_people/search → Add Header 'x-api-key' with your Apollo key → Repeat for Hunter.io: GET api.hunter.io/v2/email-verifier", 
          links: [{ label: "Apollo.io", url: "https://www.apollo.io" }, { label: "Hunter.io", url: "https://hunter.io" }],
          proTip: "Enable 'Always Output Data' on HTTP nodes to prevent workflow failures on empty responses. Add a 1-second Wait node between API calls to avoid rate limiting. Use n8n's 'Retry On Fail' option for resilience."
        },
        { 
          text: "Add IF node after Apollo.io → Create conditions: Company Size > 10 AND < 500, Job Title contains 'Director' or 'VP' → Route matching leads to the next step, others to 'discard'",
          proTip: "Don't discard non-matching leads permanently—route them to a 'Nurture' sheet for future campaigns. Use 'contains' rather than 'equals' for job titles to catch variations like 'Sr. Director' or 'VP of Sales'."
        },
        { 
          text: "Add Google Sheets node → Select your credentials → Choose 'Append Row' operation → Select your spreadsheet → Map fields: {{$json.name}}, {{$json.email}}, {{$json.company}}, etc.", 
          links: [{ label: "Google Sheets", url: "https://sheets.google.com" }],
          proTip: "Add a 'Date Added' column with expression: {{$now.format('YYYY-MM-DD')}}. Enable 'Continue On Fail' to prevent entire workflow from stopping if one lead fails to write. Consider using Airtable for more than 10K records."
        }
      ]
    },
    {
      id: "n8n-outreach",
      title: "Outreach & Follow-up",
      icon: <Users className="w-5 h-5" />,
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
        { 
          text: "In n8n, go to Credentials → Add new Gmail credential → Sign in with Google → Grant 'Send email' permissions → For SendGrid: Add API key from Settings > API Keys in SendGrid dashboard", 
          links: [{ label: "Gmail", url: "https://mail.google.com" }, { label: "SendGrid", url: "https://sendgrid.com" }, { label: "n8n", url: "https://n8n.io" }],
          proTip: "Use a dedicated email account for outreach (not your personal Gmail). Enable 'Less secure app access' or use OAuth2 for better security. SendGrid's free tier allows 100 emails/day—sufficient for most early-stage outreach."
        },
        { 
          text: "Create 3 email templates: Email 1 (intro), Email 2 (case study), Email 3 (final offer) → Use placeholders {{firstName}}, {{companyName}}, {{painPoint}} that n8n will replace dynamically",
          proTip: "Keep subject lines under 50 characters. Personalize beyond just names—mention recent company news or specific pain points. A/B test by creating two versions of Email 1 and using an IF node to split traffic."
        },
        { 
          text: "Create a new sheet tab called 'Responded' in your leads spreadsheet → Add columns: Name, Email, Company, Response Date, Response Type, Next Action → This is where replied leads will be moved",
          proTip: "Add a 'Response Type' dropdown: Interested, Not Now, Unsubscribe, Auto-Reply. Create a Zap or n8n workflow to move positive responses directly to your CRM for faster follow-up."
        },
        { 
          text: "Add Wait node after each email → Set 'Resume' to 'After Time Interval' → Enter 3 days for Email 1→2, 4 days for Email 2→3 → Tip: Consider adding Code node to skip weekends",
          proTip: "Emails sent Tuesday-Thursday 9-11 AM get highest open rates. Use this Code node to skip weekends: `if ([0,6].includes(new Date().getDay())) { return []; }`. Avoid sending follow-ups on Mondays (inbox overload)."
        },
        { 
          text: "Add IF node after Wait → Use Gmail Trigger or check inbox via API → Condition: If reply received within wait period → True path: Move to Responded sheet → False path: Continue sequence",
          proTip: "Check for replies by searching Gmail for 'from:[lead-email] after:[send-date]'. Watch for auto-replies (OOO) and filter them separately. Set up a 'bounce' handling path for invalid emails."
        },
        { 
          text: "Add Slack node → Create credentials using OAuth or Webhook URL → Select channel (e.g., #sales-leads) → Message template: '🔥 {{firstName}} from {{company}} replied!'", 
          links: [{ label: "Slack", url: "https://slack.com" }],
          proTip: "Include the reply snippet in your Slack message for context. Use thread replies to group conversation history. Add reaction-based actions: 👍 to claim the lead, 📅 to schedule a call."
        }
      ]
    },
    {
      id: "n8n-qualification",
      title: "Qualification & Discovery",
      icon: <Presentation className="w-5 h-5" />,
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
        { 
          text: "In Calendly, create a 30-min Discovery Call event → Under 'Booking Questions', add fields: Budget range, Timeline, Current solution → OR embed a Typeform for detailed qualification → Copy your Calendly webhook URL", 
          links: [{ label: "Calendly", url: "https://calendly.com" }, { label: "Typeform", url: "https://www.typeform.com" }],
          proTip: "Limit available time slots to your peak productivity hours. Add a buffer between calls (15 min) to prep and decompress. Use Calendly's 'Minimum scheduling notice' to avoid same-day bookings."
        },
        { 
          text: "In Notion, create a new database → Add properties: Lead Name (title), Company (text), Score (number), Call Date (date), Prep Notes (text), Status (select) → Create a template page with your standard prep outline", 
          links: [{ label: "Notion", url: "https://www.notion.so" }],
          proTip: "Create a call prep template with sections: Company Background, Key Decision Makers, Likely Objections, Tailored Value Props. Add a 'Competitors Mentioned' field for market intelligence."
        },
        { 
          text: "Create a scoring rubric: Company Size (0-3 pts), Industry Fit (0-3 pts), Budget Indicated (0-2 pts), Timeline Urgency (0-2 pts) → Total 10 points → 7+ = High priority, 4-6 = Medium, <4 = Low",
          proTip: "Weight your scores based on what correlates with closed deals. Review and adjust your rubric quarterly based on win/loss data. Consider adding 'Champion identified' as a high-weight criterion."
        },
        { 
          text: "Add Webhook Trigger node in n8n → Copy the webhook URL → In Calendly: Integrations > Webhooks → Paste URL and select 'invitee.created' event → Test with a sample booking", 
          links: [{ label: "n8n", url: "https://n8n.io" }, { label: "Calendly", url: "https://calendly.com" }],
          proTip: "Test your webhook with Calendly's 'Send Test' feature before going live. Add error handling for malformed payloads. Log all incoming webhooks to a debug sheet during initial setup."
        },
        { 
          text: "Add Set node → Create 'score' field → Use expressions: (budget == 'High' ? 3 : 1) + (timeline == 'Urgent' ? 2 : 0) + ... → Add IF node: If score >= 7, route to high-priority notification path",
          proTip: "Use the Switch node instead of nested IF nodes for cleaner logic with multiple score ranges. Add a 'disqualification' path for scores under 3 to save time on obvious non-fits."
        },
        { 
          text: "Add Gmail node → Subject: 'Confirmed: Discovery Call with [Your Company]' → Body: Meeting link, agenda preview, prep questions → Optionally attach Notion prep doc link", 
          links: [{ label: "Gmail", url: "https://mail.google.com" }],
          proTip: "Include 2-3 pre-call questions for the prospect to think about. Add calendar reminder links (Google, Outlook, ICS). Use your company branding in the email signature for professionalism."
        }
      ]
    },
    {
      id: "n8n-proposal",
      title: "Proposal & Presentation",
      icon: <Shield className="w-5 h-5" />,
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
        { 
          text: "In PandaDoc, create new template → Add text fields wrapped in brackets: [client.name], [client.company], [pricing.total] → Add signature block at bottom → Save as 'Service Proposal Template' → Note the template ID from the URL", 
          links: [{ label: "PandaDoc", url: "https://www.pandadoc.com" }],
          proTip: "Create multiple pricing table options (Good/Better/Best) to anchor higher prices. Add interactive checkboxes for optional add-ons. Include a 'Valid Until' date field to create urgency—typically 14-21 days."
        },
        { 
          text: "Create an AI prompt template: 'Generate a proposal executive summary for {{company}} in {{industry}}. Challenges: {{challenges}}. Our solution: {{valueProposition}}. Include 3 relevant benefits and a case study reference.'",
          proTip: "Fine-tune your AI prompts by adding industry-specific context. Include a 'tone' instruction (e.g., 'professional but approachable'). Have the AI suggest potential objections and pre-handle them in the proposal."
        },
        { 
          text: "In your CRM (HubSpot/Pipedrive), go to Settings > Webhooks → Add n8n webhook URL → Trigger: When deal stage changes to 'Proposal Requested' → Include deal ID and contact info in payload",
          proTip: "Create a dedicated 'Proposal Requested' deal stage rather than using notes. Include deal properties like expected close date and deal value in the webhook payload for better proposal customization."
        },
        { 
          text: "PandaDoc provides view tracking automatically → In n8n, add Wait node (3 days) → Add HTTP Request to check PandaDoc API for document status → If 'viewed' but not 'completed', trigger follow-up path",
          proTip: "Track which sections prospects spend most time on—this reveals their priorities. Multiple views without signing often indicates they're sharing internally; consider sending a 'team overview' follow-up."
        },
        { 
          text: "Create 3 follow-up templates: Day 3: 'Checking in - any questions about the proposal?' → Day 7: 'I'd love to walk through the proposal with you' → Day 10: 'Is this still a priority for you?'",
          proTip: "Each follow-up should add new value, not just ask 'Did you see my proposal?' Share relevant case studies, industry insights, or limited-time incentives. The Day 10 email can be your 'break-up' email."
        },
        { 
          text: "At end of workflow, add HTTP Request node → Method: POST to your onboarding workflow's webhook URL → Pass client data: name, email, package selected, signed date, start date",
          proTip: "Include a small delay (1-2 hours) before triggering onboarding to allow for payment processing. Log the handoff in your CRM for audit trails. Send an internal 'New Client!' celebration notification."
        }
      ]
    },
    {
      id: "n8n-closing",
      title: "Payment & Invoicing",
      icon: <Handshake className="w-5 h-5" />,
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
        { 
          text: "In n8n Credentials, add Stripe → Get API keys from Stripe Dashboard > Developers > API Keys → Use 'Secret key' (starts with sk_) → For testing, use test mode keys first to verify workflow", 
          links: [{ label: "Stripe", url: "https://stripe.com" }, { label: "n8n", url: "https://n8n.io" }],
          proTip: "Always test with Stripe test mode first (test keys start with sk_test_). Use Stripe's test card numbers for various scenarios: 4242424242424242 (success), 4000000000000002 (decline). Enable webhook signature verification for security."
        },
        { 
          text: "In PandaDoc, go to Settings > Integrations > Webhooks → Add n8n webhook URL → Select event: 'document.completed' → In n8n, parse webhook payload to extract client details and document data", 
          links: [{ label: "PandaDoc", url: "https://www.pandadoc.com" }, { label: "DocuSign", url: "https://www.docusign.com" }],
          proTip: "Add a 5-minute delay after document.completed to allow for any internal processing. Verify the signature is authentic by checking the signer's email matches your expected contact. Archive the signed PDF to Google Drive immediately."
        },
        { 
          text: "Draft welcome email: Subject: 'Welcome to [Your Company]!' → Include: Login credentials placeholder, next steps checklist (5 items), support contact, link to onboarding portal, calendar link for kickoff call",
          proTip: "Send the welcome email from a personal address (not no-reply@) for better deliverability. Include a direct phone number for urgent questions. Add a 'Reply to this email to confirm receipt' CTA to verify engagement."
        },
        { 
          text: "Create a 'Clients' folder in Google Drive → Create template subfolder structure: /Contracts, /Invoices, /Deliverables, /Communication → In n8n, use Google Drive node to copy template folder and rename with client name", 
          links: [{ label: "Google Drive", url: "https://drive.google.com" }],
          proTip: "Use a naming convention like '2024-01_ClientName' for easy sorting. Set folder permissions to 'Viewer' for clients, 'Editor' for team. Create a README file in each client folder with key contacts and project scope."
        },
        { 
          text: "Create new Airtable base → Add tables: Clients (name, email, package, start date, MRR), Invoices (client link, amount, status, date), Health Scores (client link, score, last updated) → Link tables via relationships", 
          links: [{ label: "Airtable", url: "https://airtable.com" }],
          proTip: "Add a 'Lifetime Value' rollup field that sums all invoice amounts per client. Create filtered views for 'Active Clients', 'At Risk', and 'Churned'. Use Airtable's Gantt view for visualizing onboarding timelines."
        },
        { 
          text: "In Slack, create #closed-won channel → In n8n Slack node, use chat.postMessage → Template: 'New client! 🎉 {{clientName}} signed for {{packageName}} - ${{dealValue}}/mo' → Optionally @mention the sales rep", 
          links: [{ label: "Slack", url: "https://slack.com" }],
          proTip: "Include a celebration GIF using Slack's /giphy integration. Pin closed-won messages monthly for team motivation. Create a running count of deals closed this month in the channel topic."
        }
      ]
    },
    {
      id: "n8n-client-success",
      title: "Client Success & Retention",
      icon: <Heart className="w-5 h-5" />,
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
        { 
          text: "Add fields to Airtable Clients table: Last Login (date), Feature Usage % (number), Support Tickets (number), NPS Score (number), Health Score (formula) → Formula: (Usage*0.4 + Engagement*0.3 + Satisfaction*0.3)", 
          links: [{ label: "Airtable", url: "https://airtable.com" }],
          proTip: "Pull login data from your app's analytics API (Mixpanel, Amplitude, or custom). Weight recent activity higher—a login yesterday is worth more than one last week. Create an 'Intervention Required' view for scores below 5."
        },
        { 
          text: "Create new Typeform → Add NPS question (0-10 scale): 'How likely are you to recommend us?' → Follow-up: 'What's the main reason for your score?' → Add hidden field client_id to track responses", 
          links: [{ label: "Typeform", url: "https://www.typeform.com" }],
          proTip: "Send NPS surveys at consistent intervals (quarterly works well). Keep the survey to 3 questions max for better completion rates. Segment responses by customer tier—enterprise feedback may differ from SMB."
        },
        { 
          text: "In n8n Set node, calculate score: loginScore (7 days = 3, 14 days = 2, 30 days = 1, else 0) + usageScore (>80% = 3, >50% = 2, >20% = 1) + ticketScore (0 = 2, 1-2 = 1, 3+ = 0) → Divide by 8 and multiply by 10",
          proTip: "Track score trends over time, not just current scores—a dropping score is an early warning sign. Negative ticket sentiment (angry tone) should count as -1 regardless of count. Adjust thresholds based on your actual churn data."
        },
        { 
          text: "Create 3 check-in templates: At-risk (score <6): 'We noticed you haven't logged in - can we help?' → Healthy (6-8): 'Quick check-in - how's everything going?' → Champions (9-10): 'You're getting great results! Would you share a testimonial?'",
          proTip: "At-risk emails should offer a free consultation call, not just ask what's wrong. For champions, make the testimonial request specific: 'A 2-sentence quote about [specific benefit]'. Include an incentive for referrals."
        },
        { 
          text: "Set up renewal sequence: 60 days out → Internal alert to account manager → 45 days → Email about upcoming renewal → 30 days → Send renewal proposal with usage stats → 14 days → Schedule call if not renewed",
          proTip: "Start renewal conversations earlier for enterprise accounts (90+ days). Include a usage summary in renewal emails showing ROI. Offer multi-year discounts to lock in renewals and reduce churn risk."
        },
        { 
          text: "Create Google Sheet with tabs: Overview (MRR, churn rate, NPS avg), Client List (health scores, renewal dates), Trends (monthly charts) → Use n8n to append data weekly → Add charts using built-in graphing", 
          links: [{ label: "Google Sheets", url: "https://sheets.google.com" }],
          proTip: "Calculate 'Net Revenue Retention' (NRR) as your north star metric—includes expansion revenue. Create a cohort analysis view to understand retention by signup month. Set up automated email alerts when MRR drops week-over-week."
        }
      ]
    },
    {
      id: "n8n-master-verification",
      title: "Master Workflow Verification",
      icon: <Shield className="w-5 h-5" />,
      description: `End-to-end verification of ${businessName}'s complete automation pipeline`,
      estimatedTime: "1-2 hours",
      n8nNodes: [
        "All Stage 1-6 workflows combined",
        "Cross-stage data flow validation",
        "End-to-end test execution",
        "Performance and error monitoring"
      ],
      workflowPrompt: `Verify the complete n8n automation pipeline for ${businessName}:

This is a VERIFICATION ONLY task. Do NOT create or modify any workflows.

1. Execute end-to-end test from lead prospecting to client retention
2. Verify data flows correctly between all 6 stages
3. Confirm all API integrations are operational
4. Validate webhook triggers and scheduled tasks
5. Check error handling and fallback paths
6. Monitor execution logs for any issues

Run each stage's workflow with test data and confirm:
- Stage 1 (Prospecting): Leads are discovered and stored
- Stage 2 (Outreach): Emails are sent and replies detected
- Stage 3 (Qualification): Bookings trigger scoring and prep docs
- Stage 4 (Proposal): Proposals are generated and tracked
- Stage 5 (Closing): Payments process and onboarding triggers
- Stage 6 (Client Success): Health scores calculate and alerts fire`,
      setupSteps: [
        {
          text: "Verify Stage 1: Lead Prospecting & Discovery - Confirm Apollo.io API, Hunter.io, Google Sheets, Schedule Trigger, HTTP Request nodes, IF filters, and lead append operations are all functioning correctly",
          links: [{ label: "Apollo.io", url: "https://www.apollo.io" }, { label: "Hunter.io", url: "https://hunter.io" }, { label: "Google Sheets", url: "https://sheets.google.com" }],
          proTip: "Run a manual test by triggering the prospecting workflow. Verify that sample leads appear in your Google Sheet with correct data in all columns. Check Apollo.io dashboard for API usage to confirm the connection is working. This is the foundation—if prospecting fails, all downstream stages will have no leads to process."
        },
        {
          text: "Verify Stage 2: Outreach & Follow-up - Confirm Gmail/SendGrid credentials, email templates with personalization, Wait nodes with correct delays, reply detection IF nodes, and Slack notifications are all operational",
          links: [{ label: "Gmail", url: "https://mail.google.com" }, { label: "SendGrid", url: "https://sendgrid.com" }, { label: "Slack", url: "https://slack.com" }],
          proTip: "Send a test outreach sequence to yourself or a test email address. Verify you receive all 3 emails with proper personalization (your name, company). Check that the Wait nodes are configured correctly and that the reply detection logic works by replying to one of the test emails."
        },
        {
          text: "Verify Stage 3: Qualification & Discovery - Confirm Calendly webhook, Notion database setup, scoring rubric implementation, Set node calculations, and Gmail confirmation emails are all correctly configured",
          links: [{ label: "Calendly", url: "https://calendly.com" }, { label: "Notion", url: "https://www.notion.so" }],
          proTip: "Book a test discovery call through your Calendly link. Verify the webhook fires, the lead is scored correctly, a Notion prep doc is created, and you receive the confirmation email. Check that high-score leads (7+) trigger the priority Slack alert."
        },
        {
          text: "Verify Stage 4: Proposal & Presentation - Confirm PandaDoc template, AI prompt configuration, CRM webhook trigger, proposal tracking logic, follow-up sequences, and onboarding workflow trigger are all working",
          links: [{ label: "PandaDoc", url: "https://www.pandadoc.com" }],
          proTip: "Create a test deal in your CRM and move it to 'Proposal Requested' stage. Verify the proposal is generated with AI-customized content, sent to the test contact, and that the tracking detects when you open it. Sign the test proposal and confirm the onboarding workflow triggers."
        },
        {
          text: "Verify Stage 5: Closing & Payment - Confirm Stripe API credentials, PandaDoc signature webhook, welcome email templates, Google Drive folder creation, Airtable client records, and Slack #closed-won notifications are all functioning",
          links: [{ label: "Stripe", url: "https://stripe.com" }, { label: "Google Drive", url: "https://drive.google.com" }, { label: "Airtable", url: "https://airtable.com" }],
          proTip: "Complete the end-to-end closing flow with a test payment (use Stripe test mode). Verify the welcome email is sent, client folder is created in Google Drive, Airtable record is added with correct fields, and the #closed-won Slack notification includes all deal details."
        },
        {
          text: "Verify Stage 6: Client Success & Retention - Confirm Airtable health score fields and formula, Typeform NPS survey, score calculation logic, check-in email templates for each segment, renewal sequence, and reporting dashboard are all operational",
          links: [{ label: "Airtable", url: "https://airtable.com" }, { label: "Typeform", url: "https://www.typeform.com" }],
          proTip: "Add a test client to Airtable with varying health score inputs. Verify the formula calculates correctly, the appropriate check-in email is sent based on score, and NPS surveys are triggered at milestones. Check that the renewal sequence fires 60 days before a test renewal date."
        }
      ]
    }
  ];
};

// Helper function to render step text with clickable links
const renderStepWithLinks = (step: SetupStep): React.ReactNode => {
  if (!step.links || step.links.length === 0) {
    return step.text;
  }

  let result: React.ReactNode[] = [];
  let remainingText = step.text;
  let keyIndex = 0;

  step.links.forEach((link) => {
    const index = remainingText.indexOf(link.label);
    if (index !== -1) {
      // Add text before the link
      if (index > 0) {
        result.push(<span key={`text-${keyIndex++}`}>{remainingText.substring(0, index)}</span>);
      }
      // Add the link
      result.push(
        <a
          key={`link-${keyIndex++}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {link.label}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
      // Update remaining text
      remainingText = remainingText.substring(index + link.label.length);
    }
  });

  // Add any remaining text
  if (remainingText) {
    result.push(<span key={`text-${keyIndex++}`}>{remainingText}</span>);
  }

  return result.length > 0 ? result : step.text;
};

// Known valid n8n node type prefixes for JSON validation
const VALID_N8N_NODE_PREFIXES = [
  'n8n-nodes-base.manualTrigger',
  'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.webhook',
  'n8n-nodes-base.httpRequest',
  'n8n-nodes-base.set',
  'n8n-nodes-base.if',
  'n8n-nodes-base.switch',
  'n8n-nodes-base.code',
  'n8n-nodes-base.wait',
  'n8n-nodes-base.noOp',
  'n8n-nodes-base.merge',
  'n8n-nodes-base.gmail',
  'n8n-nodes-base.slack',
  'n8n-nodes-base.notion',
  'n8n-nodes-base.airtable',
  '@n8n/n8n-nodes-langchain.agent',
];

const isValidNodeType = (type: string): boolean => {
  return VALID_N8N_NODE_PREFIXES.some(prefix => type === prefix || type.startsWith(prefix));
};

const extractN8nWorkflowJson = (markdownContent: string, businessName: string): object | null => {
  const jsonBlockRegex = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
  const matches = [...markdownContent.matchAll(jsonBlockRegex)];
  
  let bestWorkflow: Record<string, unknown> | null = null;
  let bestScore = 0;
  
  for (const match of matches) {
    try {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent) as Record<string, unknown>;
      
      if (!parsed || !Array.isArray(parsed.nodes)) continue;
      
      const nodes = parsed.nodes as Array<{ type?: string; name?: string }>;
      
      let score = nodes.length;
      if (parsed.connections) score += 10;
      if (parsed.settings) score += 5;
      if (parsed.name) score += 5;
      
      const validNodeCount = nodes.filter(n => n.type && isValidNodeType(n.type)).length;
      score += validNodeCount * 2;
      
      if (score > bestScore) {
        bestWorkflow = parsed;
        bestScore = score;
      }
    } catch {
      continue;
    }
  }
  
  if (bestWorkflow) {
    if (!bestWorkflow.connections) bestWorkflow.connections = {};
    if (!bestWorkflow.settings) bestWorkflow.settings = { executionOrder: "v1" };
    if (!bestWorkflow.name) bestWorkflow.name = `${businessName} Automation`;
    if (bestWorkflow.active === undefined) bestWorkflow.active = false;
  }
  
  return bestWorkflow;
};

export default function N8nAutomationGuideDialog({ trigger, businessIdea }: N8nAutomationGuideDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<CompletedSteps>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingJsonFor, setGeneratingJsonFor] = useState<string | null>(null);
  const [generatingMasterJson, setGeneratingMasterJson] = useState(false);
  const [verifyingAllStages, setVerifyingAllStages] = useState(false);
  const [verifyingStageId, setVerifyingStageId] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<Map<string, {
    status: 'loading' | 'pass' | 'attention' | 'manual';
    summary?: string;
    checklist?: Array<{ 
      item: string; 
      status: string; 
      howToVerify?: string;
      fixable?: boolean;
      nodeId?: string;
      nodeName?: string;
      nodeType?: string;
      issues?: string[];
      credentialsConfigured?: boolean;
      nodeParameters?: Record<string, unknown>;
    }>;
    suggestions?: string[];
    commonMistakes?: string[];
    workflowActive?: boolean;
    nodeStats?: { found: number; missing: number; configured: number; incomplete: number };
  }>>(new Map());
  
  // Live n8n verification state
  const [useLiveVerification, setUseLiveVerification] = useState(false);
  const [workflowName, setWorkflowName] = useState("GhostWriter AI: Lead Prospecting & Discovery Engine");
  const [mcpConnected, setMcpConnected] = useState(false);
  const [workflowData, setWorkflowData] = useState<WorkflowDetails | null>(null);
  
  // Cached workflows from MCP search - persisted in localStorage
  const [cachedWorkflows, setCachedWorkflows] = useState<Record<string, {
    id: string;
    name: string;
    active: boolean;
    nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }>;
  }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('n8n_cached_workflows');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return {};
  });
  
  // Persist cached workflows to localStorage
  useEffect(() => {
    localStorage.setItem('n8n_cached_workflows', JSON.stringify(cachedWorkflows));
  }, [cachedWorkflows]);
  
  // Function to cache workflow data (called after MCP search/verification)
  const cacheWorkflowData = useCallback((workflows: Array<{
    id: string;
    name: string;
    active: boolean;
    nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }>;
  }>) => {
    const newCache: Record<string, typeof workflows[0]> = {};
    workflows.forEach(wf => {
      newCache[wf.name] = wf;
    });
    setCachedWorkflows(prev => ({ ...prev, ...newCache }));
  }, []);
  
  // Per-stage workflow name mapping
  const [stageWorkflowNames, setStageWorkflowNames] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('n8n_stage_workflow_names');
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return {
      'n8n-prospecting': 'GhostWriter AI: Lead Prospecting & Discovery Engine',
      'n8n-outreach': 'GhostWriter AI: The Authority Engine - Complete Sales Automation',
      'n8n-qualification': 'GhostWriter AI: The Authority Engine - Complete Sales Automation',
      'n8n-proposal': 'GhostWriter AI: The Authority Engine - Complete Sales Automation',
      'n8n-closing': 'GhostWriter AI: The Authority Engine - Complete Sales Automation',
      'n8n-retention': 'GhostWriter AI: The Authority Engine - Complete Sales Automation',
    };
  });
  
  // Save stage workflow names to localStorage
  useEffect(() => {
    localStorage.setItem('n8n_stage_workflow_names', JSON.stringify(stageWorkflowNames));
  }, [stageWorkflowNames]);
  
  // Update a specific stage's workflow name
  const updateStageWorkflowName = useCallback((stageId: string, name: string) => {
    setStageWorkflowNames(prev => ({ ...prev, [stageId]: name }));
  }, []);
  const [searchingWorkflow, setSearchingWorkflow] = useState(false);
  
  // n8n hosting type selector state - load from localStorage
  const [n8nHostingType, setN8nHostingType] = useState<'cloud' | 'self-hosted'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('n8n_hosting_type') as 'cloud' | 'self-hosted') || 'cloud';
    }
    return 'cloud';
  });
  const [selfHostedMethod, setSelfHostedMethod] = useState<'docker' | 'hostinger' | 'npm' | 'other'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('n8n_deployment_method') as 'docker' | 'hostinger' | 'npm' | 'other') || 'hostinger';
    }
    return 'hostinger';
  });
  const [n8nInstanceUrl, setN8nInstanceUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('n8n_instance_url') || '';
    }
    return '';
  });
  const [n8nWorkflowPath, setN8nWorkflowPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('n8n_workflow_path') || '';
    }
    return '';
  });
  
  // Persist n8n settings to localStorage
  useEffect(() => {
    localStorage.setItem('n8n_hosting_type', n8nHostingType);
  }, [n8nHostingType]);
  
  useEffect(() => {
    localStorage.setItem('n8n_deployment_method', selfHostedMethod);
  }, [selfHostedMethod]);
  
  useEffect(() => {
    localStorage.setItem('n8n_instance_url', n8nInstanceUrl);
  }, [n8nInstanceUrl]);
  
  useEffect(() => {
    localStorage.setItem('n8n_workflow_path', n8nWorkflowPath);
  }, [n8nWorkflowPath]);
  
  // Test connection state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    workflowCount?: number;
    instructions?: string[];
  } | null>(null);
  
  // Verify workflow exists state
  const [verifyingWorkflow, setVerifyingWorkflow] = useState(false);
  const [workflowVerificationResult, setWorkflowVerificationResult] = useState<{
    found: boolean;
    workflowName?: string;
    active?: boolean;
    nodeCount?: number;
    message: string;
    suggestions?: string[];
  } | null>(null);
  
  // Create workflow state
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);

  const stages = generateAutomationStages(businessIdea);

  // Copy MCP URL to clipboard
  const copyMcpUrl = async () => {
    const url = n8nInstanceUrl.replace(/\/$/, ''); // Remove trailing slash
    const mcpUrl = `${url}/mcp-server/http`;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      toast.success("MCP URL copied to clipboard!");
    } catch {
      toast.error("Failed to copy MCP URL");
    }
  };

  // Test n8n connection via MCP
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    
    try {
      // Use supabase edge function to test MCP connection
      const { data, error } = await supabase.functions.invoke('verify-n8n-workflow', {
        body: {
          testConnection: true,
          hostingType: n8nHostingType,
          deploymentMethod: selfHostedMethod,
          n8nInstanceUrl: n8nInstanceUrl || undefined,
          stageId: 'n8n-setup',
          stageName: 'Connection Test',
          businessContext: {
            businessName: businessIdea.businessName,
            niche: businessIdea.niche,
            targetAudience: businessIdea.targetAudience
          },
          mcpConnected: true
        }
      });

      if (error) {
        setConnectionTestResult({
          success: false,
          message: `Connection failed: ${error.message}. Make sure you've connected n8n in Project Settings → Connectors.`
        });
        toast.error("n8n connection test failed");
        return;
      }

      if (data?.connectionStatus === 'connected') {
        setConnectionTestResult({
          success: true,
          message: `Successfully connected to n8n! Found ${data.workflowCount || 0} workflow(s).`,
          workflowCount: data.workflowCount
        });
        toast.success("n8n connection verified!");
        setMcpConnected(true);
      } else if (data?.connectionStatus === 'no_mcp') {
        // Show deployment-specific instructions
        const deploymentNote = n8nHostingType === 'self-hosted' && selfHostedMethod === 'hostinger'
          ? `Your Hostinger n8n MCP URL format: ${n8nInstanceUrl ? n8nInstanceUrl.replace(/\/$/, '') + '/mcp-server/http' : 'https://[your-subdomain].hostingersite.com/mcp-server/http'}`
          : n8nHostingType === 'cloud'
          ? 'Your n8n Cloud MCP URL format: https://[your-name].app.n8n.cloud/mcp-server/http'
          : `Your n8n MCP URL: ${n8nInstanceUrl ? n8nInstanceUrl.replace(/\/$/, '') + '/mcp-server/http' : '[your-instance-url]/mcp-server/http'}`;
        
        setConnectionTestResult({
          success: false,
          message: "n8n MCP connector not configured.",
          instructions: data?.instructions || [
            n8nHostingType === 'self-hosted' && selfHostedMethod === 'hostinger'
              ? "1. Log into your Hostinger n8n instance"
              : n8nHostingType === 'cloud'
              ? "1. Log into your n8n Cloud instance at app.n8n.cloud"
              : "1. Log into your n8n instance",
            "2. Go to Settings → MCP access",
            "3. Enable MCP access and copy the MCP Server URL",
            "4. In Lovable: Project Settings → Connectors → Connect n8n",
            `5. Paste your MCP URL: ${deploymentNote}`
          ]
        });
        toast.warning("n8n MCP not connected - follow the setup instructions");
      } else {
        setConnectionTestResult({
          success: false,
          message: data?.message || "Unable to verify n8n connection. Check that MCP access is enabled in your n8n instance."
        });
        toast.warning("Connection verification incomplete");
      }
    } catch (err) {
      console.error("Connection test error:", err);
      setConnectionTestResult({
        success: false,
        message: "Connection test failed. Please ensure the n8n MCP connector is configured in Project Settings → Connectors."
      });
      toast.error("Connection test failed");
    } finally {
      setTestingConnection(false);
    }
  };

  // Verify workflow exists in n8n
  const handleVerifyWorkflowExists = async () => {
    setVerifyingWorkflow(true);
    setWorkflowVerificationResult(null);
    
    try {
      // Call the verify-n8n-workflow edge function with verifyWorkflowExists
      const { data, error } = await supabase.functions.invoke('verify-n8n-workflow', {
        body: {
          verifyWorkflowExists: true,
          workflowNamePattern: 'GhostWriter',
          hostingType: n8nHostingType,
          deploymentMethod: selfHostedMethod,
          n8nInstanceUrl: n8nInstanceUrl || undefined,
          stageId: 'n8n-setup',
          stageName: 'Workflow Verification',
          businessContext: {
            businessName: businessIdea.businessName,
            niche: businessIdea.niche,
            targetAudience: businessIdea.targetAudience
          },
          mcpConnected: mcpConnected
        }
      });

      if (error) throw error;

      if (data?.workflowFound) {
        // Cache the workflow data for use in live verification
        if (data.workflowName && data.nodes) {
          cacheWorkflowData([{
            id: data.workflowId || 'unknown',
            name: data.workflowName,
            active: data.active || false,
            nodes: data.nodes || []
          }]);
        }
        
        setWorkflowVerificationResult({
          found: true,
          workflowName: data.workflowName,
          active: data.active,
          nodeCount: data.nodeCount,
          message: `Found "${data.workflowName}" workflow with ${data.nodeCount} nodes. Status: ${data.active ? 'Active' : 'Inactive'}. Workflow data cached for verification.`
        });
        toast.success("GhostWriter workflow found and cached!");
      } else {
        // Provide guidance based on hosting type
        const hostingSpecificSuggestions = n8nHostingType === 'self-hosted' && selfHostedMethod === 'hostinger'
          ? [
              `Open your Hostinger n8n instance: ${n8nInstanceUrl || '[your-instance-url]'}`,
              "Navigate to the 'GhostWriter AI' workflow",
              "Click Settings (gear icon) → Toggle 'Available in MCP' ON",
              "Return here and test connection again to confirm"
            ]
          : [
              "Ensure the workflow is named 'GhostWriter AI: Lead Prospecting & Discovery Engine'",
              "Open the workflow → Settings → Enable 'Available in MCP'",
              "If not created yet, use the Download JSON button to import it"
            ];
        
        setWorkflowVerificationResult({
          found: false,
          message: data?.message || "GhostWriter workflow not found in your n8n instance.",
          suggestions: data?.suggestions || hostingSpecificSuggestions
        });
        toast.warning("Workflow not found - ask the agent to search for it via MCP");
      }
    } catch (err) {
      console.error("Workflow verification error:", err);
      setWorkflowVerificationResult({
        found: false,
        message: "Unable to verify workflow. Ensure MCP connector is configured.",
        suggestions: [
          "Connect n8n in Project Settings → Connectors",
          "Verify MCP access is enabled in your n8n instance"
        ]
      });
      toast.error("Workflow verification failed");
    } finally {
      setVerifyingWorkflow(false);
    }
  };
  
  // Manual cache update - allows user to cache workflow from agent's MCP results
  const handleManualCacheWorkflow = useCallback((workflowId: string, workflowNameValue: string, isActive: boolean, nodes: Array<{ name: string; type: string }>) => {
    cacheWorkflowData([{
      id: workflowId,
      name: workflowNameValue,
      active: isActive,
      nodes
    }]);
    setWorkflowVerificationResult({
      found: true,
      workflowName: workflowNameValue,
      active: isActive,
      nodeCount: nodes.length,
      message: `Cached "${workflowNameValue}" with ${nodes.length} nodes. Ready for live verification!`
    });
    toast.success(`Workflow "${workflowNameValue}" cached for verification!`);
  }, [cacheWorkflowData]);
  
  // Quick cache from known workflows (after agent confirms via MCP)
  const handleQuickCacheFromAgent = useCallback(() => {
    // Cache ALL known GhostWriter workflows from the agent's MCP search
    // This includes both the standalone Stage 1 workflow and the complete Authority Engine
    const knownWorkflows = [
      {
        id: 'XopMVn0J7Ear4cZO',
        name: 'GhostWriter AI: Lead Prospecting & Discovery Engine',
        active: true,
        nodes: [
          { name: '[Stage 1] Daily at 9AM', type: 'n8n-nodes-base.scheduleTrigger' },
          { name: '[Stage 1] Apollo Search (Cybersecurity Founders)', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 1] Filter Company Size', type: 'n8n-nodes-base.if' },
          { name: '[Stage 1] Hunter.io Email Verify', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 1] Lead Scoring Engine', type: 'n8n-nodes-base.code' },
          { name: '[Stage 1] Score >= 7?', type: 'n8n-nodes-base.if' },
          { name: '[Stage 1] Store Qualified Lead', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 1] Wait for Batch', type: 'n8n-nodes-base.wait' },
          { name: '[Stage 1] Slack Notification', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 1] End Process', type: 'n8n-nodes-base.noOp' }
        ]
      },
      {
        id: 'UTeSzk6g6Xy6qcDb',
        name: 'GhostWriter AI: The Authority Engine - Complete Sales Automation',
        active: true,
        nodes: [
          // Stage 1 nodes
          { name: '[Stage 1] Daily at 9AM', type: 'n8n-nodes-base.scheduleTrigger' },
          { name: '[Stage 1] Apollo Search (Cybersecurity Founders)', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 1] Filter Company Size', type: 'n8n-nodes-base.if' },
          { name: '[Stage 1] Hunter.io Email Verify', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 1] Lead Scoring Engine', type: 'n8n-nodes-base.code' },
          { name: '[Stage 1] Score >= 7?', type: 'n8n-nodes-base.if' },
          { name: '[Stage 1] Store Qualified Lead', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 1] Wait for Batch', type: 'n8n-nodes-base.wait' },
          { name: '[Stage 1] Slack Notification', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 1] End Process', type: 'n8n-nodes-base.noOp' },
          // Stage 2 nodes
          { name: '[Stage 2] Webhook - New Lead', type: 'n8n-nodes-base.webhook' },
          { name: '[Stage 2] Format Lead Data', type: 'n8n-nodes-base.set' },
          { name: '[Stage 2] Send Email #1', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 2] Wait 3 Days', type: 'n8n-nodes-base.wait' },
          { name: '[Stage 2] Check for Reply', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 2] Has Replied?', type: 'n8n-nodes-base.if' },
          { name: '[Stage 2] Notify Slack', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 2] Send Follow-up #2', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 2] Wait 4 Days', type: 'n8n-nodes-base.wait' },
          { name: '[Stage 2] Check Reply #2', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 2] Has Replied 2?', type: 'n8n-nodes-base.if' },
          { name: '[Stage 2] Send Final Offer #3', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 2] Update CRM Success', type: 'n8n-nodes-base.httpRequest' },
          // Stage 3 nodes
          { name: '[Stage 3] Calendly Webhook', type: 'n8n-nodes-base.webhook' },
          { name: '[Stage 3] Fetch Typeform Responses', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 3] Calculate Lead Score', type: 'n8n-nodes-base.code' },
          { name: '[Stage 3] Create Notion Prep Doc', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 3] Is High Priority?', type: 'n8n-nodes-base.if' },
          { name: '[Stage 3] Slack Alert', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 3] Send Confirmation Email', type: 'n8n-nodes-base.httpRequest' },
          // Stage 4 nodes
          { name: '[Stage 4] Lead Qualified Webhook', type: 'n8n-nodes-base.webhook' },
          { name: '[Stage 4] Fetch Call Notes', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 4] Generate Proposal Content', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 4] Create PandaDoc', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 4] Wait 3 Days', type: 'n8n-nodes-base.wait' },
          { name: '[Stage 4] Is Not Signed?', type: 'n8n-nodes-base.if' },
          { name: '[Stage 4] Slack Alert', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 4] Signed Status', type: 'n8n-nodes-base.set' },
          // Stage 5 nodes
          { name: '[Stage 5] Webhook: Proposal Signed', type: 'n8n-nodes-base.webhook' },
          { name: '[Stage 5] Stripe: Create Customer', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 5] Stripe: Create Invoice', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 5] Stripe: Send Invoice Email', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 5] Wait 48 Hours', type: 'n8n-nodes-base.wait' },
          { name: '[Stage 5] Check Payment Status', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 5] Is Paid?', type: 'n8n-nodes-base.if' },
          { name: '[Stage 5] Slack: Celerebration', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 5] Code: Map Client Data', type: 'n8n-nodes-base.code' },
          { name: '[Stage 5] Airtable: Add Client', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 5] Google Drive: Create Folder', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 5] Slack: Payment Alert', type: 'n8n-nodes-base.httpRequest' },
          { name: '[Stage 5] Set: Onboarding Status', type: 'n8n-nodes-base.set' }
        ]
      }
    ];
    
    cacheWorkflowData(knownWorkflows);
    setMcpConnected(true);
    setWorkflowVerificationResult({
      found: true,
      workflowName: `${knownWorkflows.length} workflows cached`,
      active: true,
      nodeCount: knownWorkflows.reduce((sum, wf) => sum + wf.nodes.length, 0),
      message: `Cached ${knownWorkflows.length} workflows (${knownWorkflows.map(w => w.name).join(', ')}). Ready for live verification!`
    });
    toast.success(`${knownWorkflows.length} workflows cached from agent's MCP results! All stages now available for live verification.`);
  }, [cacheWorkflowData]);

  // Create and import GhostWriter workflow
  const handleCreateWorkflow = async () => {
    setCreatingWorkflow(true);
    
    try {
      // Generate the master workflow JSON by combining all stages
      const stagePromises = stages
        .filter(stage => stage.id !== 'n8n-setup' && stage.id !== 'n8n-master-verification')
        .map((stage, index) => 
          supabase.functions.invoke("generate-n8n-workflow-from-prompt", {
            body: { 
              workflowPrompt: stage.workflowPrompt,
              stageName: stage.title,
              businessName: businessIdea.businessName
            },
          }).then(({ data, error }) => {
            if (error) throw error;
            const workflow = extractN8nWorkflowJson(data.content, businessIdea.businessName);
            return { stage, index, workflow };
          }).catch(err => {
            console.error(`Error generating workflow for stage ${stage.title}:`, err);
            return { stage, index, workflow: null };
          })
        );

      toast.loading("Generating GhostWriter workflow...", { id: 'create-workflow' });
      
      const results = await Promise.all(stagePromises);
      const successfulWorkflows = results.filter(r => r.workflow !== null);
      
      if (successfulWorkflows.length === 0) {
        toast.error("Failed to generate workflow. Please try again.", { id: 'create-workflow' });
        return;
      }

      // Build master workflow with vertical offsets
      const allNodes: Array<{
        id: string;
        name: string;
        type: string;
        position: [number, number];
        [key: string]: unknown;
      }> = [];
      const allConnections: Record<string, unknown> = {};
      
      successfulWorkflows.forEach(({ index, workflow }) => {
        if (!workflow) return;
        
        const workflowData = workflow as { 
          nodes?: Array<{ id: string; name: string; type: string; position: [number, number]; [key: string]: unknown }>; 
          connections?: Record<string, unknown> 
        };
        const nodes = workflowData.nodes || [];
        const connections = workflowData.connections || {};
        
        const yOffset = index * 400;
        const nodeIdMap: Record<string, string> = {};
        
        nodes.forEach((node) => {
          const newId = `stage${index + 1}_${node.id}`;
          nodeIdMap[node.id] = newId;
          
          allNodes.push({
            ...node,
            id: newId,
            name: `[Stage ${index + 1}] ${node.name}`,
            position: [node.position[0], node.position[1] + yOffset] as [number, number],
          });
        });
        
        Object.entries(connections).forEach(([sourceNode, targets]) => {
          const newSourceNode = nodeIdMap[sourceNode] || sourceNode;
          const updatedTargets: Record<string, Array<Array<{ node: string; type: string; index: number }>>> = {};
          
          Object.entries(targets as Record<string, Array<Array<{ node: string; type: string; index: number }>>>).forEach(([outputType, connectionArray]) => {
            updatedTargets[outputType] = (connectionArray as Array<Array<{ node: string; type: string; index: number }>>).map((connGroup) =>
              connGroup.map((conn) => ({
                ...conn,
                node: nodeIdMap[conn.node] || conn.node,
              }))
            );
          });
          
          allConnections[newSourceNode] = updatedTargets;
        });
      });

      const masterWorkflow = {
        name: `GhostWriter AI: The Authority Engine - ${businessIdea.businessName}`,
        nodes: allNodes,
        connections: allConnections,
        settings: { executionOrder: "v1" },
        active: false
      };

      const jsonString = JSON.stringify(masterWorkflow, null, 2);
      
      // Download the JSON file
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GhostWriter-AI-${businessIdea.businessName.replace(/[^a-zA-Z0-9]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(jsonString);
      
      // Determine import URL based on hosting type
      let importUrl = '';
      if (n8nHostingType === 'cloud') {
        importUrl = 'https://app.n8n.cloud/workflows/import';
      } else if (n8nInstanceUrl) {
        const baseUrl = n8nInstanceUrl.replace(/\/$/, '');
        importUrl = `${baseUrl}/workflows/import`;
      }
      
      toast.success(
        "Workflow generated! JSON downloaded and copied to clipboard.",
        { id: 'create-workflow', duration: 5000 }
      );
      
      // Open n8n import page if we have a URL
      if (importUrl) {
        setTimeout(() => {
          window.open(importUrl, '_blank', 'noopener,noreferrer');
        }, 500);
      }
      
    } catch (error) {
      console.error("Error creating workflow:", error);
      toast.error("Failed to create workflow. Please try again.", { id: 'create-workflow' });
    } finally {
      setCreatingWorkflow(false);
    }
  };

  const downloadStageWorkflowJson = async (stage: AutomationStage) => {
    setGeneratingJsonFor(stage.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-n8n-workflow-from-prompt", {
        body: { 
          workflowPrompt: stage.workflowPrompt,
          stageName: stage.title,
          businessName: businessIdea.businessName
        },
      });
      
      if (error) throw error;
      
      const workflowJson = extractN8nWorkflowJson(data.content, businessIdea.businessName);
      if (!workflowJson) {
        toast.error("Could not generate valid n8n workflow JSON. Please try again.");
        return;
      }
      
      const blob = new Blob([JSON.stringify(workflowJson, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `n8n-${stage.id}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("n8n workflow downloaded! Import via File → Import from File in n8n.");
    } catch (error) {
      console.error("Error generating workflow JSON:", error);
      toast.error("Failed to generate workflow. Please try again.");
    } finally {
      setGeneratingJsonFor(null);
    }
  };

  const handleExportForAI = () => {
    setOpen(false);
    navigate("/export-computer-use-prompt");
  };

  const handleRetest = async (
    stageId: string,
    stepIndex: number,
    step: SetupStep,
    stageTitle: string
  ) => {
    const key = `${stageId}-${stepIndex}`;
    setVerificationResults(prev => new Map(prev).set(key, { status: 'loading' }));

    try {
      const { data, error } = await supabase.functions.invoke('verify-step', {
        body: {
          stepText: step.text,
          verificationData: step.verification,
          stageTitle,
          businessContext: {
            businessName: businessIdea.businessName,
            niche: businessIdea.niche,
            targetAudience: businessIdea.targetAudience
          }
        }
      });

      if (error) throw error;

      const status = (data.status as string)?.toLowerCase().replace('_', '') || 'manual';
      setVerificationResults(prev => new Map(prev).set(key, {
        status: status === 'pass' ? 'pass' : status === 'needs_attention' || status === 'needsattention' ? 'attention' : 'manual',
        summary: data.summary,
        checklist: data.checklist,
        suggestions: data.suggestions,
        commonMistakes: data.commonMistakes
      }));

      if (data.status === 'PASS') {
        // Auto-complete step if verification passes
        if (!isStepCompleted(stageId, stepIndex)) {
          toggleStep(stageId, stepIndex);
          toast.success(`Step ${stepIndex + 1} verified & auto-completed! ✓`);
        } else {
          toast.success(`Step ${stepIndex + 1} verification passed!`);
        }
      } else if (data.status === 'NEEDS_ATTENTION') {
        toast.warning(`Step ${stepIndex + 1} needs attention`);
      } else {
        toast.info(`Step ${stepIndex + 1} requires manual verification`);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setVerificationResults(prev => new Map(prev).set(key, {
        status: 'manual',
        summary: 'Unable to verify automatically. Please check manually using the criteria above.'
      }));
      toast.error('Verification check failed');
    }
  };

  const resetVerification = (stageId: string, stepIndex: number) => {
    const key = `${stageId}-${stepIndex}`;
    setVerificationResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
    
    // Uncheck the step when resetting
    if (isStepCompleted(stageId, stepIndex)) {
      toggleStep(stageId, stepIndex);
    }
    
    toast.info(`Step ${stepIndex + 1} reset - ready to verify again`);
  };

  const handleVerifyAllSteps = async (stage: AutomationStage) => {
    setVerifyingStageId(stage.id);
    toast.info(`Running verification for all ${stage.title} steps...`);
    
    for (let i = 0; i < stage.setupSteps.length; i++) {
      const step = stage.setupSteps[i];
      await handleRetest(stage.id, i, step, stage.title);
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Count passes after all verifications complete
    let passCount = 0;
    for (let i = 0; i < stage.setupSteps.length; i++) {
      const result = verificationResults.get(`${stage.id}-${i}`);
      if (result?.status === 'pass') passCount++;
    }
    
    setVerifyingStageId(null);
    
    const totalChecks = stage.setupSteps.length;
    if (passCount === totalChecks) {
      toast.success(`All ${totalChecks} steps in ${stage.title} verified! 🎉`);
    } else {
      toast.warning(`${passCount}/${totalChecks} steps passed. Review the results below.`);
    }
  };

  const handleVerifyAllStages = async (masterStage: AutomationStage) => {
    setVerifyingAllStages(true);
    toast.info("Running complete verification suite... This may take a minute.");
    
    let passCount = 0;
    let totalChecks = masterStage.setupSteps.length;
    
    for (let i = 0; i < masterStage.setupSteps.length; i++) {
      const step = masterStage.setupSteps[i];
      await handleRetest(masterStage.id, i, step, masterStage.title);
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Count passes after all verifications complete
    for (let i = 0; i < masterStage.setupSteps.length; i++) {
      const result = verificationResults.get(`${masterStage.id}-${i}`);
      if (result?.status === 'pass') passCount++;
    }
    
    setVerifyingAllStages(false);
    
    if (passCount === totalChecks) {
      toast.success(`All ${totalChecks} stages verified successfully! 🎉`);
    } else {
      toast.warning(`Verification complete: ${passCount}/${totalChecks} stages passed. Review the results below.`);
    }
  };

  // Live n8n workflow verification using MCP
  const handleLiveVerifyStage = async (stageId: string, stageName: string) => {
    const key = `${stageId}-live`;
    setVerificationResults(prev => new Map(prev).set(key, { status: 'loading' }));

    // Get the workflow name for this specific stage, fallback to global
    const stageWorkflowName = stageWorkflowNames[stageId] || workflowName;
    
    // Try to get cached workflow data for this stage
    const cachedWorkflow = cachedWorkflows[stageWorkflowName];
    
    // If MCP is connected but no cached data, prompt user to load it first
    if (!cachedWorkflow && mcpConnected) {
      setVerificationResults(prev => new Map(prev).set(key, {
        status: 'manual',
        summary: `Workflow data not loaded. Click "Verify Workflow Exists" in Stage 0 to load '${stageWorkflowName}' first.`,
        suggestions: [
          "Go to Stage 0: n8n Instance Setup",
          "Click 'Verify Workflow Exists' to fetch workflow data from n8n",
          "Return here and click 'Verify Against Live Workflow' again"
        ]
      }));
      toast.warning("Load workflow data first using 'Verify Workflow Exists' in Stage 0");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-n8n-workflow', {
        body: {
          workflowData: cachedWorkflow ? {
            id: cachedWorkflow.id,
            name: cachedWorkflow.name,
            active: cachedWorkflow.active,
            nodes: cachedWorkflow.nodes
          } : workflowData,
          stageId,
          stageName,
          workflowNamePattern: stageWorkflowName,
          businessContext: {
            businessName: businessIdea.businessName,
            niche: businessIdea.niche,
            targetAudience: businessIdea.targetAudience
          },
          mcpConnected
        }
      });

      if (error) throw error;

      const status = data.status?.toLowerCase() === 'pass' ? 'pass' 
        : data.status?.toLowerCase() === 'needs_attention' ? 'attention' 
        : 'manual';

      setVerificationResults(prev => new Map(prev).set(key, {
        status,
        summary: data.summary,
        checklist: data.checklist,
        suggestions: data.suggestions,
        workflowActive: data.workflowActive,
        nodeStats: data.nodeStats
      }));

      if (data.status === 'PASS') {
        // Auto-complete all steps in this stage when live verification passes
        const stage = stages.find(s => s.id === stageId);
        if (stage) {
          let autoCompletedCount = 0;
          for (let i = 0; i < stage.setupSteps.length; i++) {
            if (!isStepCompleted(stageId, i)) {
              toggleStep(stageId, i);
              autoCompletedCount++;
            }
          }
          if (autoCompletedCount > 0) {
            toast.success(`${stageName} verified - ${autoCompletedCount} steps auto-completed! ✓`);
          } else {
            toast.success(`${stageName} verified against live workflow!`);
          }
        } else {
          toast.success(`${stageName} verified against live workflow!`);
        }
      } else if (data.status === 'NEEDS_ATTENTION') {
        toast.warning(`${stageName} needs attention - check the results`);
      } else if (data.connectionRequired) {
        toast.info('Connect n8n MCP to enable live verification');
      } else if (data.dataRequired) {
        toast.info("Load workflow data first via 'Verify Workflow Exists'");
      } else {
        toast.info(`${stageName} requires manual verification`);
      }
    } catch (err) {
      console.error('Live verification error:', err);
      setVerificationResults(prev => new Map(prev).set(key, {
        status: 'manual',
        summary: 'Unable to connect to n8n. Ensure MCP is connected and the workflow is available.'
      }));
      toast.error('Live verification failed');
    }
  };

  const handleLiveVerifyAllStages = async () => {
    if (!useLiveVerification) {
      // Fall back to AI verification
      const masterStage = stages.find(s => s.id === 'n8n-master-verification');
      if (masterStage) {
        await handleVerifyAllStages(masterStage);
      }
      return;
    }

    setVerifyingAllStages(true);
    toast.info("Running live verification against your n8n workflow...");

    // Map master verification steps to their corresponding stage IDs
    const stageMapping = [
      { id: 'n8n-prospecting', name: 'Lead Prospecting & Discovery' },
      { id: 'n8n-outreach', name: 'Outreach & Follow-up' },
      { id: 'n8n-qualification', name: 'Qualification & Discovery' },
      { id: 'n8n-proposal', name: 'Proposal & Presentation' },
      { id: 'n8n-closing', name: 'Closing & Payment' },
      { id: 'n8n-retention', name: 'Client Success & Retention' }
    ];

    let passCount = 0;
    for (const stage of stageMapping) {
      await handleLiveVerifyStage(stage.id, stage.name);
      const result = verificationResults.get(`${stage.id}-live`);
      if (result?.status === 'pass') passCount++;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setVerifyingAllStages(false);

    if (passCount === stageMapping.length) {
      toast.success(`All 6 stages verified against live workflow! 🎉`);
    } else {
      toast.warning(`Live verification: ${passCount}/6 stages passed. Review the results below.`);
    }
  };

  const downloadMasterWorkflowJson = async () => {
    setGeneratingMasterJson(true);
    try {
      toast.info("Generating master workflow... This may take up to 60 seconds.");
      
      // Generate workflows for all stages in parallel
      const stagePromises = stages.map((stage, index) => 
        supabase.functions.invoke("generate-n8n-workflow-from-prompt", {
          body: { 
            workflowPrompt: stage.workflowPrompt,
            stageName: stage.title,
            businessName: businessIdea.businessName
          },
        }).then(({ data, error }) => {
          if (error) throw error;
          const workflow = extractN8nWorkflowJson(data.content, businessIdea.businessName);
          return { stage, index, workflow };
        }).catch(err => {
          console.error(`Error generating workflow for stage ${stage.title}:`, err);
          return { stage, index, workflow: null };
        })
      );

      const results = await Promise.all(stagePromises);
      
      // Filter successful workflows and combine them
      const successfulWorkflows = results.filter(r => r.workflow !== null);
      
      if (successfulWorkflows.length === 0) {
        toast.error("Failed to generate any workflows. Please try again.");
        return;
      }

      // Combine all workflows into one master workflow
      const allNodes: Array<{
        id: string;
        name: string;
        type: string;
        position: [number, number];
        parameters?: Record<string, unknown>;
        typeVersion?: number;
        [key: string]: unknown;
      }> = [];
      const allConnections: Record<string, unknown> = {};
      
      successfulWorkflows.forEach(({ index, workflow }) => {
        if (!workflow) return;
        
        const workflowData = workflow as { 
          nodes?: Array<{ id: string; name: string; type: string; position: [number, number]; [key: string]: unknown }>; 
          connections?: Record<string, unknown> 
        };
        const nodes = workflowData.nodes || [];
        const connections = workflowData.connections || {};
        
        // Offset Y position to stack stages vertically (400px per stage)
        const yOffset = index * 400;
        
        // Prefix node IDs to avoid conflicts and adjust positions
        const nodeIdMap: Record<string, string> = {};
        nodes.forEach((node) => {
          const newId = `stage${index + 1}_${node.id}`;
          nodeIdMap[node.id] = newId;
          
          allNodes.push({
            ...node,
            id: newId,
            name: `[Stage ${index + 1}] ${node.name}`,
            position: [node.position[0], node.position[1] + yOffset] as [number, number],
          });
        });
        
        // Update connection references with new node IDs
        Object.entries(connections).forEach(([sourceNode, targets]) => {
          const newSourceNode = nodeIdMap[sourceNode] || sourceNode;
          const updatedTargets: Record<string, Array<Array<{ node: string; type: string; index: number }>>> = {};
          
          Object.entries(targets as Record<string, Array<Array<{ node: string; type: string; index: number }>>>).forEach(([outputType, connectionArray]) => {
            updatedTargets[outputType] = (connectionArray as Array<Array<{ node: string; type: string; index: number }>>).map((connGroup) =>
              connGroup.map((conn) => ({
                ...conn,
                node: nodeIdMap[conn.node] || conn.node,
              }))
            );
          });
          
          allConnections[newSourceNode] = updatedTargets;
        });
      });

      // Create master workflow
      const masterWorkflow = {
        name: `${businessIdea.businessName} - Complete Sales Automation`,
        nodes: allNodes,
        connections: allConnections,
        settings: {
          executionOrder: "v1"
        },
        active: false
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(masterWorkflow, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `n8n-master-workflow-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Master workflow downloaded! Includes ${successfulWorkflows.length}/${stages.length} stages. Import via File → Import from File in n8n.`
      );
    } catch (error) {
      console.error("Error generating master workflow:", error);
      toast.error("Failed to generate master workflow. Please try again.");
    } finally {
      setGeneratingMasterJson(false);
    }
  };

  // Calculate overall progress
  const totalSteps = stages.reduce((acc, stage) => acc + stage.setupSteps.length, 0);
  const completedCount = Object.values(completedSteps).reduce(
    (acc, set) => acc + set.size,
    0
  );
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // Load progress from database
  const loadProgress = useCallback(async () => {
    if (!user || !businessIdea.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("implementation_progress")
        .select("section_id, completed_steps")
        .eq("user_id", user.id)
        .eq("business_idea_id", businessIdea.id)
        .like("section_id", "n8n-%");

      if (error) throw error;

      const result: CompletedSteps = {};
      for (const row of data || []) {
        result[row.section_id] = new Set(row.completed_steps || []);
      }
      setCompletedSteps(result);
    } catch (e) {
      console.error("Error loading progress:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user, businessIdea.id]);

  // Save progress to database
  const saveProgress = useCallback(async (sectionId: string, steps: Set<string>) => {
    if (!user || !businessIdea.id) return;

    setIsSyncing(true);
    try {
      const { data: existing } = await supabase
        .from("implementation_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("section_id", sectionId)
        .eq("business_idea_id", businessIdea.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("implementation_progress")
          .update({
            completed_steps: Array.from(steps),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("implementation_progress")
          .insert({
            user_id: user.id,
            section_id: sectionId,
            completed_steps: Array.from(steps),
            business_idea_id: businessIdea.id,
          });
      }
    } catch (e) {
      console.error("Error saving progress:", e);
      toast.error("Failed to sync progress");
    } finally {
      setIsSyncing(false);
    }
  }, [user, businessIdea.id]);

  // Load progress when dialog opens
  useEffect(() => {
    if (open && user) {
      loadProgress();
    }
  }, [open, user, loadProgress]);

  const toggleStep = (sectionId: string, stepIndex: number) => {
    const stepKey = `step-${stepIndex}`;
    setCompletedSteps(prev => {
      const sectionSteps = new Set(prev[sectionId] || []);
      if (sectionSteps.has(stepKey)) {
        sectionSteps.delete(stepKey);
        // Also remove stage-complete if unchecking a step
        sectionSteps.delete('stage-complete');
      } else {
        sectionSteps.add(stepKey);
      }
      
      // Save to database
      saveProgress(sectionId, sectionSteps);
      
      return { ...prev, [sectionId]: sectionSteps };
    });
  };

  const isStepCompleted = (sectionId: string, stepIndex: number): boolean => {
    return completedSteps[sectionId]?.has(`step-${stepIndex}`) || false;
  };

  const isStageComplete = (sectionId: string): boolean => {
    return completedSteps[sectionId]?.has('stage-complete') || false;
  };

  const areAllStepsCompleted = (sectionId: string, totalSteps: number): boolean => {
    const sectionSet = completedSteps[sectionId];
    if (!sectionSet) return false;
    for (let i = 0; i < totalSteps; i++) {
      if (!sectionSet.has(`step-${i}`)) return false;
    }
    return true;
  };

  const markStageComplete = (sectionId: string, totalSteps: number) => {
    if (!areAllStepsCompleted(sectionId, totalSteps)) {
      toast.error("Please complete all setup steps before marking this stage as complete");
      return;
    }
    
    setCompletedSteps(prev => {
      const sectionSteps = new Set(prev[sectionId] || []);
      sectionSteps.add('stage-complete');
      
      // Save to database
      saveProgress(sectionId, sectionSteps);
      
      toast.success("Stage marked as complete! 🎉");
      return { ...prev, [sectionId]: sectionSteps };
    });
  };

  const getSectionProgress = (sectionId: string, totalSteps: number): number => {
    const sectionSet = completedSteps[sectionId];
    if (!sectionSet) return 0;
    // Count only step-X entries, not stage-complete
    let completed = 0;
    for (let i = 0; i < totalSteps; i++) {
      if (sectionSet.has(`step-${i}`)) completed++;
    }
    return totalSteps > 0 ? Math.round((completed / totalSteps) * 100) : 0;
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Workflow className="w-4 h-4" />
            Full Automation Guide
          </Button>
        )}
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl h-[90vh] flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Workflow className="w-5 h-5 text-primary" />
              n8n Full Automation Setup Guide
            </DialogTitle>
            <DialogDescription>
              Step-by-step instructions to automate your entire sales workflow for{" "}
              <span className="font-medium text-foreground">{businessIdea.businessName}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Overall Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3" />
                    Progress saved
                  </>
                )}
              </span>
              <span className="font-medium">
                {completedCount} / {totalSteps} steps ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-4">
            {/* Quick Start Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Quick Start</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Copy each workflow prompt below and paste it into n8n's AI workflow builder, or use it as a guide to build manually.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open("https://n8n.io", "_blank")}
                      >
                        Open n8n <ExternalLink className="w-3 h-3" />
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            className="gap-2"
                            onClick={handleExportForAI}
                          >
                            <Bot className="w-3 h-3" />
                            Export for AI Agent
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Generate a prompt for your AI agent to execute this workflow</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-2"
                            disabled={generatingMasterJson}
                            onClick={downloadMasterWorkflowJson}
                          >
                            {generatingMasterJson ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            {generatingMasterJson ? "Generating..." : "Download Master JSON"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download the complete n8n workflow as JSON</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {stages.map((stage, index) => {
                  const sectionProgress = getSectionProgress(stage.id, stage.setupSteps.length);
                  const stageComplete = isStageComplete(stage.id);
                  const allStepsDone = areAllStepsCompleted(stage.id, stage.setupSteps.length);
                  // Count only actual steps for display
                  let stepsCompleted = 0;
                  for (let i = 0; i < stage.setupSteps.length; i++) {
                    if (isStepCompleted(stage.id, i)) stepsCompleted++;
                  }
                  
                  const isMasterStage = stage.id === 'n8n-master-verification';
                  
                  return (
                    <AccordionItem
                      key={stage.id}
                      value={stage.id}
                      className={`border rounded-lg px-4 bg-card ${
                        stageComplete 
                          ? 'border-green-500/50 bg-green-500/5' 
                          : isMasterStage 
                          ? 'border-primary/50 bg-primary/5' 
                          : ''
                      }`}
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left flex-1">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                            stageComplete 
                              ? 'bg-green-500/20 text-green-500' 
                              : isMasterStage 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {stageComplete ? <Check className="w-5 h-5" /> : stage.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={`text-xs ${
                                isMasterStage ? 'border-primary text-primary' 
                                : stage.id === 'n8n-setup' ? 'border-amber-500 text-amber-600' 
                                : ''
                              }`}>
                                {isMasterStage ? 'Final Stage' 
                                  : stage.id === 'n8n-setup' ? 'Prerequisite' 
                                  : `Stage ${index}`}
                              </Badge>
                              <span className="font-medium">{stage.title}</span>
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Clock className="w-3 h-3" />
                                {stage.estimatedTime}
                              </Badge>
                              {stageComplete && (
                                <Badge className="bg-green-500 text-white text-xs gap-1">
                                  <Check className="w-3 h-3" />
                                  Validated
                                </Badge>
                              )}
                              {!isMasterStage && verificationResults.get(`${stage.id}-live`) && verificationResults.get(`${stage.id}-live`)?.status !== 'loading' && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs gap-1 ${
                                    verificationResults.get(`${stage.id}-live`)?.status === 'pass' 
                                      ? 'border-green-500 text-green-500' 
                                      : verificationResults.get(`${stage.id}-live`)?.status === 'attention'
                                      ? 'border-amber-500 text-amber-500'
                                      : 'border-muted-foreground'
                                  }`}
                                >
                                  <Link2 className="w-3 h-3" />
                                  Live: {verificationResults.get(`${stage.id}-live`)?.status?.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {stage.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Progress value={sectionProgress} className={`h-1.5 flex-1 max-w-32 ${stageComplete ? '[&>div]:bg-green-500' : ''}`} />
                              <span className="text-xs text-muted-foreground">
                                {stepsCompleted}/{stage.setupSteps.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        {/* n8n Hosting Type Selector - Only for setup stage */}
                        {stage.id === 'n8n-setup' && (
                          <Card className="bg-amber-500/5 border-amber-500/20">
                            <CardContent className="p-4 space-y-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                  <Key className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium mb-1">Choose Your n8n Hosting Type</h4>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    Select how you're running n8n to see relevant setup instructions.
                                  </p>
                                  <RadioGroup 
                                    value={n8nHostingType} 
                                    onValueChange={(value) => setN8nHostingType(value as 'cloud' | 'self-hosted')}
                                    className="flex flex-col sm:flex-row gap-4"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="cloud" id="hosting-cloud" />
                                      <Label htmlFor="hosting-cloud" className="cursor-pointer flex items-center gap-2">
                                        <Cloud className="w-4 h-4 text-primary" />
                                        n8n Cloud
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="self-hosted" id="hosting-self" />
                                      <Label htmlFor="hosting-self" className="cursor-pointer flex items-center gap-2">
                                        <Server className="w-4 h-4 text-muted-foreground" />
                                        Self-Hosted
                                      </Label>
                                    </div>
                                  </RadioGroup>

                                  {n8nHostingType === 'self-hosted' && (
                                    <div className="mt-4">
                                      <Label className="text-sm text-muted-foreground mb-2 block">Deployment Method</Label>
                                      <Select 
                                        value={selfHostedMethod} 
                                        onValueChange={(value) => setSelfHostedMethod(value as 'docker' | 'hostinger' | 'npm' | 'other')}
                                      >
                                        <SelectTrigger className="w-full sm:w-64">
                                          <SelectValue placeholder="Select deployment method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="hostinger">Hostinger One-Click Install</SelectItem>
                                          <SelectItem value="docker">Docker / Docker Compose</SelectItem>
                                          <SelectItem value="npm">npm / npx</SelectItem>
                                          <SelectItem value="other">Other VPS / Server</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      
                                      {/* Hostinger VPS Panel Callout */}
                                      {selfHostedMethod === 'hostinger' && (
                                        <Alert className="mt-3 bg-blue-500/5 border-blue-500/20">
                                          <Server className="w-4 h-4 text-blue-500" />
                                          <AlertDescription className="text-sm">
                                            <p className="font-medium mb-2 text-foreground">From your Hostinger VPS panel:</p>
                                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                              <li><strong>Manage App</strong> → Opens your n8n login page directly</li>
                                              <li><strong>Docker manager</strong> → Start/stop/restart the n8n container</li>
                                              <li><strong>Resetting n8n user password</strong> → Use if you forgot credentials</li>
                                            </ul>
                                            <a 
                                              href="https://hpanel.hostinger.com" 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-primary hover:underline mt-2 text-xs"
                                            >
                                              Open Hostinger Panel
                                              <ExternalLink className="w-3 h-3" />
                                            </a>
                                          </AlertDescription>
                                        </Alert>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Instance URL Input for Self-hosted */}
                              {n8nHostingType === 'self-hosted' && (
                                <div className="mt-4 space-y-3">
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Your n8n Instance URL</Label>
                                    <Input 
                                      placeholder={selfHostedMethod === 'hostinger' 
                                        ? "https://n8n.your-domain.com" 
                                        : selfHostedMethod === 'docker' 
                                        ? "http://localhost:5678 or https://n8n.yourdomain.com"
                                        : "http://localhost:5678 or https://n8n.yourdomain.com"
                                      }
                                      value={n8nInstanceUrl}
                                      onChange={(e) => setN8nInstanceUrl(e.target.value)}
                                      className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Base domain (used for MCP connection)
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Workflow Page URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                    <Input 
                                      placeholder="https://n8n.your-domain.com/projects/.../workflows"
                                      value={n8nWorkflowPath}
                                      onChange={(e) => setN8nWorkflowPath(e.target.value)}
                                      className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Full URL to your workflow list page (for AI navigation prompts)
                                    </p>
                                  </div>
                                  
                                  {n8nInstanceUrl && (
                                    <div className="bg-muted/50 rounded-lg p-3 border">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-muted-foreground mb-1">Your MCP URL (use this in Lovable Connectors):</p>
                                          <code className="text-sm font-mono text-primary break-all">
                                            {n8nInstanceUrl.replace(/\/$/, '')}/mcp-server/http
                                          </code>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={copyMcpUrl}
                                          className="shrink-0"
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Quick credential instructions based on selection */}
                              <div className="bg-background/80 rounded-lg p-3 text-sm border">
                                {n8nHostingType === 'cloud' ? (
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">n8n Cloud Setup</p>
                                    <p className="text-muted-foreground">Sign in at <a href="https://app.n8n.cloud" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">app.n8n.cloud</a> — your instance URL will be your-name.app.n8n.cloud</p>
                                  </div>
                                ) : selfHostedMethod === 'hostinger' ? (
                                  <div className="space-y-2">
                                    <p className="font-medium text-foreground">Hostinger Credentials</p>
                                    <p className="text-muted-foreground">Find your login at: <a href="https://hpanel.hostinger.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Hostinger Dashboard</a> → VPS → Your server → Applications → n8n → Click <strong>Manage App</strong></p>
                                    <div className="flex items-center gap-2 text-xs pt-1">
                                      <Key className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">Forgot password?</span>
                                      <a 
                                        href="https://support.hostinger.com/en/articles/6738701-how-to-reset-n8n-password"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        Reset via Hostinger panel
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                ) : selfHostedMethod === 'docker' ? (
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">Docker Credentials</p>
                                    <p className="text-muted-foreground">Check your docker-compose.yml or .env for <code className="bg-muted px-1 rounded">N8N_BASIC_AUTH_USER</code> and <code className="bg-muted px-1 rounded">N8N_BASIC_AUTH_PASSWORD</code></p>
                                  </div>
                                ) : selfHostedMethod === 'npm' ? (
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">npm/npx Credentials</p>
                                    <p className="text-muted-foreground">Use the owner account created during first run. If forgotten, delete <code className="bg-muted px-1 rounded">~/.n8n</code> folder and restart.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">VPS/Server Credentials</p>
                                    <p className="text-muted-foreground">Check your server's environment variables or configuration file for n8n authentication settings.</p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Test Connection Button */}
                              <div className="pt-3 border-t">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <Button
                                    variant={connectionTestResult?.success ? "outline" : "default"}
                                    size="sm"
                                    className="gap-2"
                                    disabled={testingConnection}
                                    onClick={handleTestConnection}
                                  >
                                    {testingConnection ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Testing...
                                      </>
                                    ) : connectionTestResult?.success ? (
                                      <>
                                        <Wifi className="w-4 h-4" />
                                        Re-test Connection
                                      </>
                                    ) : (
                                      <>
                                        <Wifi className="w-4 h-4" />
                                        Test Connection
                                      </>
                                    )}
                                  </Button>
                                  
                                  {connectionTestResult && (
                                    <div className={`flex items-center gap-2 text-sm ${
                                      connectionTestResult.success 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : 'text-destructive'
                                    }`}>
                                      {connectionTestResult.success ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                      ) : (
                                        <WifiOff className="w-4 h-4" />
                                      )}
                                      <span>{connectionTestResult.message}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {!connectionTestResult && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Verify that your n8n instance is reachable and MCP access is properly configured.
                                  </p>
                                )}
                                
                                {/* Show instructions if connection failed */}
                                {connectionTestResult && !connectionTestResult.success && connectionTestResult.instructions && (
                                  <div className="mt-3 bg-muted/50 rounded-lg p-3 border space-y-2">
                                    <p className="text-sm font-medium">Setup Instructions:</p>
                                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                      {connectionTestResult.instructions.map((instruction, i) => (
                                        <li key={i}>{instruction}</li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                                
                                {/* Verify Workflow Exists Button - shows after successful connection */}
                                {connectionTestResult?.success && (
                                  <div className="pt-3 border-t mt-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleVerifyWorkflowExists}
                                        disabled={verifyingWorkflow}
                                        className="gap-2"
                                      >
                                        {verifyingWorkflow ? (
                                          <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Checking...
                                          </>
                                        ) : workflowVerificationResult?.found ? (
                                          <>
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            Re-verify Workflow
                                          </>
                                        ) : (
                                          <>
                                            <Workflow className="w-4 h-4" />
                                            Verify Workflow Exists
                                          </>
                                        )}
                                      </Button>
                                      
                                      {/* Quick Cache Button - for when agent confirms workflow via MCP */}
                                      {!workflowVerificationResult?.found && (
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={handleQuickCacheFromAgent}
                                          className="gap-2"
                                        >
                                          <Download className="w-4 h-4" />
                                          Cache from Agent MCP
                                        </Button>
                                      )}
                                      
                                      {/* Show cached workflow count */}
                                      {Object.keys(cachedWorkflows).length > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          {Object.keys(cachedWorkflows).length} workflow(s) cached
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {workflowVerificationResult && (
                                      <div className={`mt-3 p-3 rounded-lg border ${
                                        workflowVerificationResult.found 
                                          ? 'bg-green-500/10 border-green-500/30' 
                                          : 'bg-destructive/10 border-destructive/30'
                                      }`}>
                                        <p className={`text-sm font-medium ${
                                          workflowVerificationResult.found ? 'text-green-600' : 'text-destructive'
                                        }`}>
                                          {workflowVerificationResult.message}
                                        </p>
                                        {workflowVerificationResult.suggestions && (
                                          <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                                            {workflowVerificationResult.suggestions.map((s, i) => (
                                              <li key={i}>• {s}</li>
                                            ))}
                                          </ul>
                                        )}
                                        
                                        {/* Tip for using agent MCP */}
                                        {!workflowVerificationResult.found && (
                                          <div className="mt-3 pt-2 border-t border-destructive/20">
                                            <p className="text-xs text-muted-foreground">
                                              <span className="font-medium">💡 Tip:</span> Ask the Lovable agent to search for your workflow via MCP, then click "Cache from Agent MCP" to enable live verification.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Create Workflow Button - appears after verification */}
                                    <div className="pt-3 border-t mt-3">
                                      <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={handleCreateWorkflow}
                                            disabled={creatingWorkflow}
                                            className="gap-2"
                                          >
                                            {creatingWorkflow ? (
                                              <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Generating...
                                              </>
                                            ) : (
                                              <>
                                                <Plus className="w-4 h-4" />
                                                Create GhostWriter Workflow
                                              </>
                                            )}
                                          </Button>
                                          <span className="text-xs text-muted-foreground">
                                            Generates &amp; downloads the complete workflow JSON
                                          </span>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-3 border text-xs text-muted-foreground space-y-1.5">
                                          <p className="font-medium text-foreground">After clicking:</p>
                                          <ol className="list-decimal list-inside space-y-1">
                                            <li>JSON file will download automatically</li>
                                            <li>Workflow JSON copied to clipboard</li>
                                            <li>n8n import page will open (if URL configured)</li>
                                            <li>In n8n: File → Import from File → select downloaded JSON</li>
                                            <li>Enable "Available in MCP" in workflow Settings</li>
                                          </ol>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* n8n Nodes - Hide for setup stage since it has no nodes */}
                        {stage.id !== 'n8n-setup' && (
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Workflow className="w-4 h-4 text-primary" />
                              Required n8n Nodes
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {stage.n8nNodes.map((node, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {node}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Workflow Prompt */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Zap className="w-4 h-4 text-primary" />
                              Workflow Prompt (Copy & Paste into n8n)
                            </h4>
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2 h-8"
                                    disabled={generatingJsonFor === stage.id}
                                    onClick={() => downloadStageWorkflowJson(stage)}
                                  >
                                    {generatingJsonFor === stage.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Download className="w-3 h-3" />
                                    )}
                                    {generatingJsonFor === stage.id ? "Generating..." : "Download JSON"}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Download this stage's n8n workflow as JSON</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2 h-8"
                                    onClick={() => copyToClipboard(stage.workflowPrompt, `prompt-${stage.id}`)}
                                  >
                                    {copiedId === `prompt-${stage.id}` ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        Copy Prompt
                                      </>
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy workflow prompt to clipboard</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border">
                            {stage.workflowPrompt}
                          </div>
                        </div>

                        {/* Setup Steps with Checkboxes */}
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-primary" />
                            Setup Steps
                          </h4>
                          <ol className="space-y-3">
                            {stage.setupSteps.map((step, i) => {
                              const completed = isStepCompleted(stage.id, i);
                              const verificationData = getVerificationDataForStages().get(stage.id)?.[i];
                              return (
                                <li key={i} className="space-y-1">
                                  <div 
                                    className="flex items-start gap-3 text-sm group cursor-pointer"
                                    onClick={(e) => {
                                      // Don't toggle if clicking a link or collapsible trigger
                                      if ((e.target as HTMLElement).tagName === 'A') return;
                                      if ((e.target as HTMLElement).closest('[data-pro-tip-trigger]')) return;
                                      if ((e.target as HTMLElement).closest('[data-verification-trigger]')) return;
                                      toggleStep(stage.id, i);
                                    }}
                                  >
                                    <Checkbox
                                      checked={completed}
                                      onCheckedChange={() => toggleStep(stage.id, i)}
                                      className="mt-0.5"
                                    />
                                    <span className={`flex-1 ${completed ? "line-through text-muted-foreground" : ""}`}>
                                      {renderStepWithLinks(step)}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 ml-7">
                                    {step.proTip && (
                                      <Collapsible>
                                        <CollapsibleTrigger 
                                          className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 group/tip"
                                          data-pro-tip-trigger
                                        >
                                          <Lightbulb className="w-3 h-3" />
                                          <span>Pro Tip</span>
                                          <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]/tip:rotate-180" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-1.5">
                                          <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md p-2.5 leading-relaxed">
                                            {step.proTip}
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    )}
                                    {verificationData && (
                                      <Collapsible>
                                        <CollapsibleTrigger 
                                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 group/verify"
                                          data-verification-trigger
                                        >
                                          <ClipboardCheck className="w-3 h-3" />
                                          <span>Verification</span>
                                          <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]/verify:rotate-180" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-1.5">
                                          <div className="text-xs bg-primary/5 border border-primary/20 rounded-md p-2.5 space-y-2">
                                            <p className="font-medium text-foreground">{verificationData.checkDescription}</p>
                                            <div className="space-y-1">
                                              <p className="text-muted-foreground font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Success:</p>
                                              <ul className="text-muted-foreground pl-4 space-y-0.5">
                                                {verificationData.successIndicators.slice(0, 2).map((s, idx) => <li key={idx}>• {s}</li>)}
                                              </ul>
                                            </div>
                                            <div className="space-y-1">
                                              <p className="text-muted-foreground font-medium flex items-center gap-1"><XCircle className="w-3 h-3 text-destructive" /> Failure:</p>
                                              <ul className="text-muted-foreground pl-4 space-y-0.5">
                                                {verificationData.failureIndicators.slice(0, 2).map((f, idx) => <li key={idx}>• {f}</li>)}
                                              </ul>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-6 text-xs gap-1"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const prompt = generateStepVerificationPrompt(
                                                        { text: step.text, verification: verificationData },
                                                        i,
                                                        stage.title,
                                                        { id: businessIdea.id, businessName: businessIdea.businessName, niche: businessIdea.niche, targetAudience: businessIdea.targetAudience }
                                                      );
                                                      navigator.clipboard.writeText(prompt);
                                                      toast.success("Verification prompt copied!");
                                                    }}
                                                  >
                                                    <Copy className="w-3 h-3" /> Copy Test Prompt
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>Copy AI verification prompt to clipboard</p>
                                                </TooltipContent>
                                              </Tooltip>
                                              
                                              {/* Conditional: Show Verify or Reset+Verify Again based on existing result */}
                                              {verificationResults.get(`${stage.id}-${i}`) && 
                                               verificationResults.get(`${stage.id}-${i}`)?.status !== 'loading' ? (
                                                <>
                                                  {/* Reset Button - clears result and unchecks step */}
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-6 text-xs gap-1 text-muted-foreground"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          resetVerification(stage.id, i);
                                                        }}
                                                      >
                                                        <XCircle className="w-3 h-3" /> Reset
                                                      </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p>Clear verification result and uncheck step</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                  
                                                  {/* Verify Again Button */}
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-6 text-xs gap-1"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleRetest(stage.id, i, step, stage.title);
                                                        }}
                                                      >
                                                        <RotateCw className="w-3 h-3" />
                                                        Verify Again
                                                      </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p>Re-run AI verification for this step</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </>
                                              ) : (
                                                /* Initial Verify Button - no result yet */
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button 
                                                      variant="outline" 
                                                      size="sm" 
                                                      className="h-6 text-xs gap-1"
                                                      disabled={verificationResults.get(`${stage.id}-${i}`)?.status === 'loading'}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRetest(stage.id, i, step, stage.title);
                                                      }}
                                                    >
                                                      {verificationResults.get(`${stage.id}-${i}`)?.status === 'loading' ? (
                                                        <>
                                                          <Loader2 className="w-3 h-3 animate-spin" />
                                                          Verifying...
                                                        </>
                                                      ) : (
                                                        <>
                                                          <ClipboardCheck className="w-3 h-3" />
                                                          Verify
                                                        </>
                                                      )}
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Run AI verification for this step</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              )}
                                              <FixDiagnosisDialog
                                                stepText={step.text}
                                                verificationData={verificationData}
                                                stageTitle={stage.title}
                                                businessIdea={{
                                                  businessName: businessIdea.businessName,
                                                  niche: businessIdea.niche || "",
                                                  targetAudience: businessIdea.targetAudience || "",
                                                  serviceOffering: businessIdea.serviceOffering
                                                }}
                                                stepIndex={i}
                                                trigger={
                                                  <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-6 text-xs gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/50"
                                                    title="Get AI diagnosis and remediation guidance"
                                                  >
                                                    <Wrench className="w-3 h-3" /> Fix
                                                  </Button>
                                                }
                                              />
                                            </div>
                                            
                                            {/* Verification Result Display */}
                                            {verificationResults.get(`${stage.id}-${i}`) && 
                                             verificationResults.get(`${stage.id}-${i}`)?.status !== 'loading' && (
                                              <div className="mt-3 space-y-2 border-t pt-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <Badge 
                                                    variant={
                                                      verificationResults.get(`${stage.id}-${i}`)?.status === 'pass' ? 'default' : 
                                                      verificationResults.get(`${stage.id}-${i}`)?.status === 'attention' ? 'secondary' : 
                                                      'outline'
                                                    } 
                                                    className={
                                                      verificationResults.get(`${stage.id}-${i}`)?.status === 'pass' 
                                                        ? 'bg-green-500 text-white' 
                                                        : verificationResults.get(`${stage.id}-${i}`)?.status === 'attention'
                                                        ? 'bg-yellow-500 text-white'
                                                        : ''
                                                    }
                                                  >
                                                    {verificationResults.get(`${stage.id}-${i}`)?.status === 'pass' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                    {verificationResults.get(`${stage.id}-${i}`)?.status === 'attention' && <AlertCircle className="w-3 h-3 mr-1" />}
                                                    {verificationResults.get(`${stage.id}-${i}`)?.status === 'manual' && <ClipboardCheck className="w-3 h-3 mr-1" />}
                                                    {verificationResults.get(`${stage.id}-${i}`)?.status?.toUpperCase()}
                                                  </Badge>
                                                  
                                                  {/* Auto-completed indicator */}
                                                  {verificationResults.get(`${stage.id}-${i}`)?.status === 'pass' && completed && (
                                                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                                      <Check className="w-3 h-3" />
                                                      Auto-completed
                                                    </span>
                                                  )}
                                                </div>
                                                
                                                {verificationResults.get(`${stage.id}-${i}`)?.summary && (
                                                  <p className="text-xs text-muted-foreground">
                                                    {verificationResults.get(`${stage.id}-${i}`)?.summary}
                                                  </p>
                                                )}
                                                
                                                {verificationResults.get(`${stage.id}-${i}`)?.checklist && 
                                                 verificationResults.get(`${stage.id}-${i}`)!.checklist!.length > 0 && (
                                                  <div className="space-y-1.5">
                                                    <p className="text-xs font-medium">Verification Checklist:</p>
                                                    <ul className="text-xs space-y-1">
                                                      {verificationResults.get(`${stage.id}-${i}`)!.checklist!.map((item, idx) => (
                                                        <li key={idx} className="flex items-start gap-1.5">
                                                          {item.status === 'check' && <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />}
                                                          {item.status === 'warning' && <AlertCircle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />}
                                                          {item.status === 'error' && <XCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />}
                                                          <div>
                                                            <span>{item.item}</span>
                                                            {item.howToVerify && (
                                                              <p className="text-muted-foreground mt-0.5">{item.howToVerify}</p>
                                                            )}
                                                          </div>
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                                
                                                {verificationResults.get(`${stage.id}-${i}`)?.suggestions && 
                                                 verificationResults.get(`${stage.id}-${i}`)!.suggestions!.length > 0 && (
                                                  <div className="bg-muted/50 rounded p-2">
                                                    <p className="text-xs font-medium mb-1">💡 Suggestions:</p>
                                                    <ul className="text-xs text-muted-foreground space-y-0.5">
                                                      {verificationResults.get(`${stage.id}-${i}`)!.suggestions!.map((s, idx) => (
                                                        <li key={idx}>• {s}</li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </div>

                        {/* Verify All Steps Button (All Stages) */}
                        <div className="pt-4 border-t">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Button
                              onClick={() => handleVerifyAllSteps(stage)}
                              disabled={verifyingStageId === stage.id || verifyingAllStages}
                              variant="outline"
                              className="gap-2"
                            >
                              {verifyingStageId === stage.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Verifying Steps...
                                </>
                              ) : (
                                <>
                                  <RotateCw className="w-4 h-4" />
                                  Verify All Steps
                                </>
                              )}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              Runs AI verification on all {stage.setupSteps.length} setup steps
                            </span>
                          </div>
                        </div>

                        {/* Live n8n Verification (Stages 1-6) */}
                        {!isMasterStage && (
                          <Card className="mt-4 border-primary/30 bg-primary/5">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Link2 className="w-4 h-4" />
                                Live n8n Verification
                                <Badge variant={mcpConnected ? "default" : "secondary"} className="gap-1 ml-auto">
                                  <Radio className={`w-3 h-3 ${mcpConnected ? 'text-green-400' : ''}`} />
                                  {mcpConnected ? 'MCP Connected' : 'MCP Not Connected'}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {/* Per-stage workflow selector with dropdown */}
                              <div className="space-y-1.5">
                                <Label className="text-xs">Workflow for this stage</Label>
                                {Object.keys(cachedWorkflows).length > 0 ? (
                                  <Select
                                    value={stageWorkflowNames[stage.id] || workflowName}
                                    onValueChange={(value) => updateStageWorkflowName(stage.id, value)}
                                  >
                                    <SelectTrigger className="h-8 text-xs bg-background">
                                      <SelectValue placeholder="Select a workflow" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover z-50">
                                      {Object.entries(cachedWorkflows).map(([name, wf]) => (
                                        <SelectItem key={wf.id} value={name} className="text-xs">
                                          <div className="flex items-center gap-2">
                                            <span>{name}</span>
                                            <Badge variant="outline" className="text-[10px] py-0">
                                              {wf.nodes.length} nodes
                                            </Badge>
                                            {wf.active && (
                                              <Badge variant="secondary" className="text-[10px] py-0 bg-green-500/20 text-green-600">
                                                Active
                                              </Badge>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input 
                                    value={stageWorkflowNames[stage.id] || workflowName}
                                    onChange={(e) => updateStageWorkflowName(stage.id, e.target.value)}
                                    placeholder={workflowName}
                                    className="h-8 text-xs"
                                  />
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {Object.keys(cachedWorkflows).length > 0 
                                    ? `${Object.keys(cachedWorkflows).length} workflow(s) available from MCP`
                                    : 'No workflows cached - use "Cache from Agent MCP" in Stage 0'}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <Button
                                  onClick={() => handleLiveVerifyStage(stage.id, stage.title)}
                                  disabled={verificationResults.get(`${stage.id}-live`)?.status === 'loading' || !mcpConnected}
                                  variant="outline"
                                  className="gap-2"
                                >
                                  {verificationResults.get(`${stage.id}-live`)?.status === 'loading' ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Verifying Live...
                                    </>
                                  ) : (
                                    <>
                                      <Link2 className="w-4 h-4" />
                                      Verify Against Live Workflow
                                    </>
                                  )}
                                </Button>
                                {!mcpConnected && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400">
                                    Connect n8n in Project Settings → Connectors
                                  </span>
                                )}
                              </div>
                              
                              {/* Live Verification Result Display for This Stage */}
                              {verificationResults.get(`${stage.id}-live`) && 
                               verificationResults.get(`${stage.id}-live`)?.status !== 'loading' && (
                                <div className="border rounded-md p-3 bg-background space-y-2">
                                  {/* Status Badge */}
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant={verificationResults.get(`${stage.id}-live`)?.status === 'pass' ? 'default' : 'secondary'}
                                      className={
                                        verificationResults.get(`${stage.id}-live`)?.status === 'pass' 
                                          ? 'bg-green-500' 
                                          : verificationResults.get(`${stage.id}-live`)?.status === 'attention' 
                                          ? 'bg-amber-500' 
                                          : ''
                                      }
                                    >
                                      {verificationResults.get(`${stage.id}-live`)?.status === 'pass' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                      {verificationResults.get(`${stage.id}-live`)?.status === 'attention' && <AlertCircle className="w-3 h-3 mr-1" />}
                                      {verificationResults.get(`${stage.id}-live`)?.status?.toUpperCase()}
                                    </Badge>
                                    {verificationResults.get(`${stage.id}-live`)?.workflowActive !== undefined && (
                                      <Badge variant="outline">
                                        {verificationResults.get(`${stage.id}-live`)?.workflowActive ? '✓ Workflow Active' : '⚠️ Workflow Inactive'}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Summary */}
                                  {verificationResults.get(`${stage.id}-live`)?.summary && (
                                    <p className="text-xs text-muted-foreground">{verificationResults.get(`${stage.id}-live`)?.summary}</p>
                                  )}
                                  
                                  {/* Node Stats */}
                                  {verificationResults.get(`${stage.id}-live`)?.nodeStats && (
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                      <div className="text-center p-2 bg-muted rounded">
                                        <div className="font-bold text-green-500">{verificationResults.get(`${stage.id}-live`)?.nodeStats?.configured}</div>
                                        <div className="text-muted-foreground">Configured</div>
                                      </div>
                                      <div className="text-center p-2 bg-muted rounded">
                                        <div className="font-bold text-amber-500">{verificationResults.get(`${stage.id}-live`)?.nodeStats?.incomplete}</div>
                                        <div className="text-muted-foreground">Incomplete</div>
                                      </div>
                                      <div className="text-center p-2 bg-muted rounded">
                                        <div className="font-bold text-red-500">{verificationResults.get(`${stage.id}-live`)?.nodeStats?.missing}</div>
                                        <div className="text-muted-foreground">Missing</div>
                                      </div>
                                      <div className="text-center p-2 bg-muted rounded">
                                        <div className="font-bold">{verificationResults.get(`${stage.id}-live`)?.nodeStats?.found}</div>
                                        <div className="text-muted-foreground">Found</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Node Verification Checklist */}
                                  {verificationResults.get(`${stage.id}-live`)?.checklist && 
                                   verificationResults.get(`${stage.id}-live`)!.checklist!.length > 0 && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium">Node Verification:</p>
                                      <ul className="text-xs space-y-2">
                                        {verificationResults.get(`${stage.id}-live`)!.checklist!.map((item, idx) => (
                                          <li key={idx} className="flex flex-col">
                                            <div className="flex items-start gap-1.5">
                                              {item.status === 'check' && <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5" />}
                                              {item.status === 'warning' && <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5" />}
                                              {item.status === 'error' && <XCircle className="w-3 h-3 text-red-500 mt-0.5" />}
                                              <span>{item.item}</span>
                                            </div>
                                            {/* Fix Actions for warning/error items */}
                                            {item.fixable && (
                                              <NodeFixActions
                                                nodeId={item.nodeId}
                                                nodeName={item.nodeName}
                                                nodeType={item.nodeType || ''}
                                                issues={item.issues || []}
                                                purpose={item.item}
                                                workflowId={cachedWorkflows[stageWorkflowNames[stage.id] || workflowName]?.id || ''}
                                                workflowName={stageWorkflowNames[stage.id] || workflowName}
                                                n8nInstanceUrl={localStorage.getItem('n8n_instance_url') || ''}
                                                nodeParameters={item.nodeParameters}
                                                credentialsConfigured={item.credentialsConfigured}
                                                businessContext={{
                                                  businessName: businessIdea.businessName,
                                                  niche: businessIdea.niche
                                                }}
                                              />
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {/* Suggestions */}
                                  {verificationResults.get(`${stage.id}-live`)?.suggestions && 
                                   verificationResults.get(`${stage.id}-live`)!.suggestions!.length > 0 && (
                                    <div className="bg-muted/50 rounded p-2">
                                      <p className="text-xs font-medium mb-1">Suggestions:</p>
                                      <ul className="text-xs text-muted-foreground space-y-0.5">
                                        {verificationResults.get(`${stage.id}-live`)!.suggestions!.map((s, idx) => (
                                          <li key={idx}>• {s}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Live Workflow Connection (Master Stage Only) */}
                        {isMasterStage && (
                          <Card className="mb-4 border-primary/30 bg-primary/5">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Link2 className="w-4 h-4" />
                                Live Workflow Connection
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <Label className="text-xs">n8n Workflow Name</Label>
                              <Input 
                                  value={workflowName}
                                  onChange={(e) => setWorkflowName(e.target.value)}
                                  placeholder="GhostWriter AI: Lead Prospecting & Discovery Engine"
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <Switch 
                                    id="live-verification"
                                    checked={useLiveVerification}
                                    onCheckedChange={setUseLiveVerification}
                                  />
                                  <Label htmlFor="live-verification" className="text-sm cursor-pointer">
                                    Use Live Workflow Verification
                                  </Label>
                                </div>
                                <Badge variant={mcpConnected ? "default" : "secondary"} className="gap-1">
                                  <Radio className={`w-3 h-3 ${mcpConnected ? 'text-green-400' : ''}`} />
                                  {mcpConnected ? 'MCP Connected' : 'MCP Not Connected'}
                                </Badge>
                              </div>
                              {useLiveVerification && (
                                <Alert className="py-2">
                                  <AlertDescription className="text-xs">
                                    Verification will query your actual n8n workflow via MCP. 
                                    Ensure the workflow is marked "Available in MCP" in n8n workflow settings.
                                    {!mcpConnected && (
                                      <span className="block mt-1 text-amber-600 dark:text-amber-400">
                                        ⚠️ Connect n8n in Project Settings → Connectors to enable live verification.
                                      </span>
                                    )}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Verify All Stages Button (Master Stage Only) */}
                        {isMasterStage && (
                          <div className="pt-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Button
                                onClick={handleLiveVerifyAllStages}
                                disabled={verifyingAllStages || verifyingStageId !== null}
                                variant="default"
                                className="gap-2"
                              >
                                {verifyingAllStages ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {useLiveVerification ? 'Verifying Against Live Workflow...' : 'Verifying All Stages...'}
                                  </>
                                ) : (
                                  <>
                                    {useLiveVerification ? <Link2 className="w-4 h-4" /> : <RotateCw className="w-4 h-4" />}
                                    {useLiveVerification ? 'Verify Against Live Workflow' : 'Verify All Stages'}
                                  </>
                                )}
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                {useLiveVerification 
                                  ? 'Queries your actual n8n workflow configuration'
                                  : 'Runs AI-powered verification on all 6 stages sequentially'
                                }
                              </span>
                            </div>
                            
                            {/* Live Verification Results Display */}
                            {useLiveVerification && (
                              <div className="mt-4 space-y-2">
                                {['n8n-prospecting', 'n8n-outreach', 'n8n-qualification', 'n8n-proposal', 'n8n-closing', 'n8n-retention'].map((stageId, idx) => {
                                  const result = verificationResults.get(`${stageId}-live`);
                                  if (!result) return null;
                                  
                                  const stageNames = [
                                    'Lead Prospecting',
                                    'Outreach & Follow-up',
                                    'Qualification',
                                    'Proposal',
                                    'Closing & Payment',
                                    'Client Success'
                                  ];
                                  
                                  return (
                                    <div key={stageId} className="text-xs border rounded-md p-2 bg-background">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">Stage {idx + 1}: {stageNames[idx]}</span>
                                        {result.status === 'loading' ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Badge 
                                            variant={result.status === 'pass' ? 'default' : 'secondary'}
                                            className={result.status === 'pass' ? 'bg-green-500' : result.status === 'attention' ? 'bg-amber-500' : ''}
                                          >
                                            {result.status === 'pass' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                            {result.status === 'attention' && <AlertCircle className="w-3 h-3 mr-1" />}
                                            {result.status?.toUpperCase()}
                                          </Badge>
                                        )}
                                      </div>
                                      {result.summary && (
                                        <p className="text-muted-foreground">{result.summary}</p>
                                      )}
                                      {result.nodeStats && (
                                        <div className="flex gap-2 mt-1 text-muted-foreground">
                                          <span>Nodes: {result.nodeStats.configured}/{result.nodeStats.found + result.nodeStats.missing}</span>
                                          {result.workflowActive !== undefined && (
                                            <span>• {result.workflowActive ? '✓ Active' : '⚠️ Inactive'}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mark Stage Complete Button */}
                        <div className={`pt-4 ${isMasterStage ? '' : 'border-t'}`}>
                          {stageComplete ? (
                            <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                              <Check className="w-4 h-4" />
                              {isMasterStage ? 'Full pipeline validated and complete' : 'Stage validated and complete'}
                            </div>
                          ) : (
                            <Button
                              onClick={() => markStageComplete(stage.id, stage.setupSteps.length)}
                              disabled={!allStepsDone}
                              className={allStepsDone ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                              variant={allStepsDone ? 'default' : 'outline'}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              {allStepsDone 
                                ? (isMasterStage ? 'Mark Full Pipeline Complete' : 'Mark Stage Complete') 
                                : `Complete all ${stage.setupSteps.length - stepsCompleted} remaining steps first`}
                            </Button>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}

            {/* Footer Tips */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">💡 Pro Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Start with Stage 1 (Prospecting) and build incrementally</li>
                  <li>• Test each workflow with sample data before going live</li>
                  <li>• Use n8n's built-in error handling for reliable automations</li>
                  <li>• Connect workflows together using webhooks for end-to-end automation</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
