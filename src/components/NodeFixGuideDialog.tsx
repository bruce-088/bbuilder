import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, CheckCircle2, Lightbulb, AlertTriangle } from "lucide-react";

interface NodeFixGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeType: string;
  nodeName?: string;
  issues: string[];
  purpose: string;
  n8nInstanceUrl: string;
  workflowId: string;
}

interface FixGuide {
  steps: string[];
  tips: string[];
  docUrl?: string;
}

// Node type to fix guide mapping
const FIX_GUIDES: Record<string, Record<string, FixGuide>> = {
  'googleSheets': {
    'default': {
      steps: [
        'Open your n8n workflow and click on the Google Sheets node',
        'Click "Credential to connect with" dropdown',
        'Select existing Google credential or click "+ Create New Credential"',
        'If creating new: Choose OAuth2 or Service Account',
        'For OAuth2: Click "Sign in with Google" and authorize access',
        'For Service Account: Upload your JSON key file from Google Cloud Console',
        'Select your target spreadsheet from the dropdown',
        'Choose the specific sheet/tab to write to',
        'Map your data fields to spreadsheet columns',
        'Save the node and test with sample data'
      ],
      tips: [
        'Ensure Google Sheets API is enabled in your Google Cloud project',
        'For service accounts, share the spreadsheet with the service account email',
        'Use "Append Row" operation for adding new leads, "Update Row" for modifications',
        'Add error handling to catch API quota limits'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/'
    },
    'Credentials may not be configured': {
      steps: [
        'Click on the Google Sheets node in your workflow',
        'Look for the "Credential to connect with" field at the top',
        'Click the dropdown and select "+ Create New Credential"',
        'Choose "Google Sheets OAuth2 API" (recommended for most users)',
        'Click "Sign in with Google" button',
        'Authorize n8n to access your Google Sheets',
        'Once connected, select your spreadsheet from the list',
        'Test the connection by running the workflow manually'
      ],
      tips: [
        'Use a Google Workspace account for better reliability',
        'The OAuth token auto-refreshes, so you won\'t need to re-authorize',
        'If you see "Access denied", check that Google Sheets API is enabled in Cloud Console'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/google/'
    }
  },
  'gmail': {
    'default': {
      steps: [
        'Open the Gmail node in your n8n workflow',
        'Click "Credential to connect with" dropdown',
        'Click "+ Create New Credential" → Select "Gmail OAuth2 API"',
        'Click "Sign in with Google" and authorize email sending',
        'Configure the email fields: To, Subject, and Message',
        'Use expressions like {{$json.email}} for dynamic recipients',
        'Set up the message body with personalization tokens',
        'Test by sending to yourself first'
      ],
      tips: [
        'Use a dedicated email account for automation, not personal Gmail',
        'Gmail has daily sending limits: 500/day for free, 2000/day for Workspace',
        'Add unsubscribe links to avoid spam reports',
        'Consider using SendGrid or Mailgun for higher volume'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail/'
    },
    'Credentials may not be configured': {
      steps: [
        'Click on the Gmail node to open its settings',
        'Click "Credential to connect with" → "+ Create New Credential"',
        'Select "Gmail OAuth2 API"',
        'Click "Sign in with Google"',
        'Choose the Gmail account you want to send from',
        'Grant permission to send emails on your behalf',
        'Return to n8n - the credential should now be connected',
        'Configure To, Subject, and Message fields'
      ],
      tips: [
        'The OAuth process requires the Gmail account to have API access enabled',
        'If sign-in fails, check that your Google Workspace admin allows third-party apps'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/credentials/google/'
    }
  },
  'slack': {
    'default': {
      steps: [
        'Open the Slack node in your workflow',
        'Click "Credential to connect with" → "+ Create New Credential"',
        'Choose "Slack OAuth2 API" for full access',
        'Click "Connect to Slack" button',
        'Select your Slack workspace and authorize',
        'Choose the channel to post to from the dropdown',
        'Configure your message template with variables',
        'Test by sending a test message to the channel'
      ],
      tips: [
        'Create a dedicated Slack app for cleaner notification branding',
        'Use the #channel-name format or channel ID for targeting',
        'Add emoji reactions support for interactive workflows',
        'Consider thread replies for conversation grouping'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/'
    }
  },
  'airtable': {
    'default': {
      steps: [
        'Open the Airtable node in your workflow',
        'Click "Credential to connect with" → "+ Create New Credential"',
        'Go to airtable.com/create/tokens to generate a Personal Access Token',
        'Create a token with appropriate scopes (data.records:read, data.records:write)',
        'Copy the token and paste it in n8n credential form',
        'Select your Base from the dropdown',
        'Choose the Table to interact with',
        'Map your fields to Airtable columns'
      ],
      tips: [
        'Use Personal Access Tokens (PAT) instead of legacy API keys',
        'Token scopes should match your workflow needs - read, write, or both',
        'Airtable has rate limits of 5 requests per second per base'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.airtable/'
    }
  },
  'httpRequest': {
    'default': {
      steps: [
        'Open the HTTP Request node in your workflow',
        'Set the Method (GET, POST, PUT, DELETE) based on the API',
        'Enter the full API URL in the URL field',
        'For authenticated APIs, click "Add Header" for API key or Bearer token',
        'Configure the request body for POST/PUT requests',
        'Use JSON format for most modern APIs',
        'Test the request and check the response in the output panel',
        'Handle errors with an IF node checking for error responses'
      ],
      tips: [
        'Store API keys in n8n Credentials, not hardcoded in the URL',
        'Enable "Retry On Fail" for resilience against temporary failures',
        'Add a Wait node between requests to avoid rate limiting',
        'Use "Ignore SSL Issues" only for development, never production'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/'
    }
  },
  'if': {
    'default': {
      steps: [
        'Open the IF node in your workflow',
        'Click "Add Condition" to define your filtering logic',
        'Select the data field to evaluate (e.g., {{$json.leadScore}})',
        'Choose the comparison operator (equals, greater than, contains, etc.)',
        'Enter the comparison value',
        'Add multiple conditions with AND/OR logic as needed',
        'Connect the "true" output to the next step for matching items',
        'Connect the "false" output to alternative handling or end'
      ],
      tips: [
        'Test with sample data to verify conditions work correctly',
        'Use "contains" for flexible text matching instead of exact "equals"',
        'Chain multiple IF nodes for complex multi-path routing',
        'The "true" path goes to the top output, "false" to the bottom'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.if/'
    }
  },
  'scheduleTrigger': {
    'default': {
      steps: [
        'Open the Schedule Trigger node (should be the first node)',
        'Choose "Cron" for specific times or "Interval" for regular frequency',
        'For Cron: Set the schedule (e.g., "0 9 * * *" for 9 AM daily)',
        'For Interval: Set the time unit and frequency',
        'Configure your timezone in the Trigger Settings',
        'Save the workflow to enable the schedule',
        'Toggle the workflow to "Active" to start scheduled runs',
        'Check the Executions tab to verify it\'s running on schedule'
      ],
      tips: [
        'Avoid running at exactly :00 minutes - use :05 or :15 for less server load',
        'Set timezone explicitly to avoid confusion with UTC',
        'Use the execution history to debug timing issues',
        'Remember: workflow must be Active for schedule to work'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/'
    }
  },
  'webhook': {
    'default': {
      steps: [
        'Open the Webhook node (should be the first node for webhook-triggered workflows)',
        'Copy the "Test URL" for development testing',
        'Copy the "Production URL" once workflow is activated',
        'Set the HTTP Method to match what the external service sends',
        'Configure Response settings if the sender expects a reply',
        'Register the Production URL with the external service (Calendly, Stripe, etc.)',
        'Test by triggering the webhook from the external service',
        'Check the "Executions" tab to see incoming webhook data'
      ],
      tips: [
        'Test URL only works in the editor; Production URL works when workflow is active',
        'Add authentication (Header Auth or Basic Auth) for security',
        'Respond immediately to prevent timeout - use async processing for long tasks'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/'
    }
  },
  'set': {
    'default': {
      steps: [
        'Open the Set node in your workflow',
        'Click "Add Value" to create a new data field',
        'Enter the field name (e.g., "leadScore")',
        'Set the value using a fixed value or expression',
        'For calculations, use expressions: {{$json.value1 + $json.value2}}',
        'Add multiple fields as needed',
        'Enable "Keep Only Set" to remove unwanted fields from output',
        'Connect to the next node to pass the transformed data'
      ],
      tips: [
        'Use Set node to clean up data before saving to databases',
        'Combine values with string templates: "Hello {{$json.firstName}}"',
        'Calculate scores using JavaScript expressions in the value field'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.set/'
    }
  },
  'wait': {
    'default': {
      steps: [
        'Open the Wait node in your workflow',
        'Select "After Time Interval" for simple delays',
        'Set the amount and unit (e.g., 3 days)',
        'For specific times, use "At Specified Time"',
        'Connect the output to the next step in your sequence',
        'The workflow execution will pause and resume after the wait period',
        'Monitor the "Waiting" executions in the Executions tab',
        'Test with shorter intervals first (e.g., 1 minute) before using days'
      ],
      tips: [
        'Wait nodes create persistent executions that resume even after server restarts',
        'Use webhook-based resume for dynamic wait periods based on events',
        'Combine with IF nodes to skip waits if conditions change'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/'
    }
  }
};

// Get short node type name
const getShortNodeType = (nodeType: string): string => {
  return nodeType.split('.').pop() || nodeType;
};

// Get the appropriate fix guide for a node type and issue
const getFixGuide = (nodeType: string, issues: string[]): FixGuide => {
  const shortType = getShortNodeType(nodeType);
  const nodeGuides = FIX_GUIDES[shortType];
  
  if (!nodeGuides) {
    // Return generic guide for unknown node types
    return {
      steps: [
        'Open the node in your n8n workflow by clicking on it',
        'Review the configuration panel on the right side',
        'Check if credentials are connected (look for the credential dropdown)',
        'Configure all required parameters (marked with *)',
        'Test the node using the "Execute Node" button',
        'Check the output panel for errors or successful data',
        'Save your changes and test the full workflow'
      ],
      tips: [
        'Check the n8n documentation for this specific node type',
        'Look at the error messages in the output panel for clues',
        'Ensure all required fields have valid values'
      ],
      docUrl: 'https://docs.n8n.io/integrations/builtin/app-nodes/'
    };
  }

  // Try to find a specific guide matching the issue
  for (const issue of issues) {
    if (nodeGuides[issue]) {
      return nodeGuides[issue];
    }
    // Try partial matching
    for (const guideKey of Object.keys(nodeGuides)) {
      if (issue.toLowerCase().includes(guideKey.toLowerCase()) || 
          guideKey.toLowerCase().includes(issue.toLowerCase())) {
        return nodeGuides[guideKey];
      }
    }
  }

  // Fall back to default guide for this node type
  return nodeGuides['default'] || {
    steps: ['Open the node and review its configuration', 'Check credentials and required parameters'],
    tips: ['Refer to n8n documentation for specific guidance']
  };
};

export default function NodeFixGuideDialog({
  open,
  onOpenChange,
  nodeType,
  nodeName,
  issues,
  purpose,
  n8nInstanceUrl,
  workflowId
}: NodeFixGuideDialogProps) {
  const shortNodeType = getShortNodeType(nodeType);
  const guide = getFixGuide(nodeType, issues);

  const nodeLink = n8nInstanceUrl && workflowId
    ? `${n8nInstanceUrl.replace(/\/$/, '')}/workflow/${workflowId}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Fix: {nodeName || shortNodeType}
          </DialogTitle>
          <DialogDescription>
            Step-by-step guide to fix the {shortNodeType} node
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Issue Summary */}
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription>
                <p className="font-medium mb-1">Issue Detected</p>
                <p className="text-sm text-muted-foreground">
                  {issues.length > 0 ? issues.join(' • ') : 'Configuration needed'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Purpose: {purpose}
                </p>
              </AlertDescription>
            </Alert>

            {/* Node Type Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline">{shortNodeType}</Badge>
              {guide.docUrl && (
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" asChild>
                  <a href={guide.docUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" />
                    Documentation
                  </a>
                </Button>
              )}
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Steps to Fix</h4>
              <ol className="space-y-2">
                {guide.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            {guide.tips.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Pro Tips
                </h4>
                <ul className="space-y-1">
                  {guide.tips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Open in n8n Button */}
            {nodeLink && (
              <div className="pt-2">
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href={nodeLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Open Workflow in n8n
                  </a>
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
