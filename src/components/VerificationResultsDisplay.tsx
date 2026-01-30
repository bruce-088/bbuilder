import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Wrench,
  ExternalLink,
  Settings,
  Key,
  Zap,
} from "lucide-react";
import NodeFixActions from "./NodeFixActions";

interface ChecklistItem {
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
}

interface NodeStats {
  found: number;
  missing: number;
  configured: number;
  incomplete: number;
}

interface VerificationResult {
  status: 'loading' | 'pass' | 'attention' | 'manual';
  summary?: string;
  checklist?: ChecklistItem[];
  suggestions?: string[];
  commonMistakes?: string[];
  workflowActive?: boolean;
  nodeStats?: NodeStats;
}

interface VerificationResultsDisplayProps {
  result: VerificationResult;
  stageId: string;
  workflowId: string;
  workflowName: string;
  n8nInstanceUrl: string;
  businessContext: {
    businessName: string;
    niche?: string;
  };
}

// Get a fix suggestion based on the issue type
const getFixSuggestion = (nodeType: string, issues: string[]): string => {
  const shortType = nodeType.split('.').pop()?.toLowerCase() || '';
  
  if (issues.some(i => i.toLowerCase().includes('credentials') || i.toLowerCase().includes('not configured'))) {
    switch (shortType) {
      case 'gmail':
        return 'Click the node → Credentials dropdown → "Create New" → Sign in with Google';
      case 'googlesheets':
        return 'Click the node → Credentials dropdown → "Create New" → Authorize Google access';
      case 'slack':
        return 'Click the node → Credentials dropdown → "Create New" → Connect to Slack';
      case 'airtable':
        return 'Click the node → Credentials dropdown → Paste your Airtable Personal Access Token';
      case 'notion':
        return 'Click the node → Credentials dropdown → Create Internal Integration at notion.so/my-integrations';
      case 'httprequest':
        return 'Add authentication header or create credential for the API service';
      default:
        return 'Open the node and configure credentials in the Credentials dropdown';
    }
  }
  
  if (issues.some(i => i.toLowerCase().includes('missing configuration') || i.toLowerCase().includes('parameter'))) {
    switch (shortType) {
      case 'scheduletrigger':
        return 'Set schedule type (Cron or Interval), configure timing, and set timezone';
      case 'webhook':
        return 'Copy the Production URL and register it with your external service';
      case 'if':
        return 'Add conditions with field, operator, and value to filter your data';
      case 'set':
        return 'Click "Add Value" and map your data fields';
      case 'wait':
        return 'Set the delay amount and time unit (hours, days, etc.)';
      default:
        return 'Open the node and fill in all required parameters (marked with *)';
    }
  }

  if (issues.some(i => i.toLowerCase().includes('not found') || i.toLowerCase().includes('required node'))) {
    return `Add a ${shortType} node to your workflow and configure it for this stage`;
  }
  
  return 'Open the node in n8n and review the configuration';
};

// Get icon for issue type
const getIssueIcon = (issues: string[]): React.ReactNode => {
  const issueText = issues.join(' ').toLowerCase();
  if (issueText.includes('credentials')) {
    return <Key className="w-3 h-3 text-amber-500" />;
  }
  if (issueText.includes('missing') || issueText.includes('not found')) {
    return <XCircle className="w-3 h-3 text-red-500" />;
  }
  return <Settings className="w-3 h-3 text-amber-500" />;
};

export default function VerificationResultsDisplay({
  result,
  stageId,
  workflowId,
  workflowName,
  n8nInstanceUrl,
  businessContext,
}: VerificationResultsDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    configured: false,
    incomplete: true, // Auto-expand incomplete section
    missing: true,    // Auto-expand missing section
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Group checklist items by status
  const groupedItems = {
    configured: result.checklist?.filter(item => item.status === 'check') || [],
    incomplete: result.checklist?.filter(item => item.status === 'warning') || [],
    missing: result.checklist?.filter(item => item.status === 'error') || [],
  };

  const hasIssues = groupedItems.incomplete.length > 0 || groupedItems.missing.length > 0;

  return (
    <div className="space-y-4">
      {/* Status Badge and Summary */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant={result.status === 'pass' ? 'default' : 'secondary'}
          className={
            result.status === 'pass' 
              ? 'bg-green-500 hover:bg-green-600' 
              : result.status === 'attention' 
              ? 'bg-amber-500 hover:bg-amber-600' 
              : ''
          }
        >
          {result.status === 'pass' && <CheckCircle2 className="w-3 h-3 mr-1" />}
          {result.status === 'attention' && <AlertCircle className="w-3 h-3 mr-1" />}
          {result.status?.toUpperCase()}
        </Badge>
        {result.workflowActive !== undefined && (
          <Badge variant="outline" className={result.workflowActive ? 'border-green-500 text-green-600' : 'border-amber-500 text-amber-600'}>
            {result.workflowActive ? (
              <>
                <Zap className="w-3 h-3 mr-1" />
                Workflow Active
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1" />
                Workflow Inactive
              </>
            )}
          </Badge>
        )}
      </div>
      
      {/* Summary */}
      {result.summary && (
        <p className="text-sm text-muted-foreground">{result.summary}</p>
      )}
      
      {/* Node Stats Overview */}
      {result.nodeStats && (
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="font-bold text-lg text-green-600">{result.nodeStats.configured}</div>
            <div className="text-green-600/80">Configured</div>
          </div>
          <div className="text-center p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="font-bold text-lg text-amber-600">{result.nodeStats.incomplete}</div>
            <div className="text-amber-600/80">Incomplete</div>
          </div>
          <div className="text-center p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="font-bold text-lg text-red-600">{result.nodeStats.missing}</div>
            <div className="text-red-600/80">Missing</div>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <div className="font-bold text-lg">{result.nodeStats.found}</div>
            <div className="text-muted-foreground">Total Found</div>
          </div>
        </div>
      )}

      {/* Node Groups - Collapsible Sections */}
      {result.checklist && result.checklist.length > 0 && (
        <div className="space-y-2">
          {/* Missing Nodes Section */}
          {groupedItems.missing.length > 0 && (
            <Collapsible
              open={expandedSections.missing}
              onOpenChange={() => toggleSection('missing')}
            >
              <Card className="border-red-500/30 bg-red-500/5">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        Missing Nodes ({groupedItems.missing.length})
                      </div>
                      {expandedSections.missing ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-3 px-3 space-y-3">
                    {groupedItems.missing.map((item, idx) => (
                      <div key={idx} className="space-y-2 p-2 bg-background/50 rounded-lg border border-red-500/20">
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.nodeName || item.item}</p>
                            {item.nodeType && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {item.nodeType.split('.').pop()}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Issues */}
                        {item.issues && item.issues.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {item.issues.map((issue, i) => (
                              <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                                {getIssueIcon([issue])}
                                {issue}
                              </p>
                            ))}
                          </div>
                        )}
                        
                        {/* Fix Suggestion */}
                        <div className="ml-6 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                          <p className="text-xs flex items-start gap-1.5">
                            <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-amber-700 dark:text-amber-400">
                              {getFixSuggestion(item.nodeType || '', item.issues || [])}
                            </span>
                          </p>
                        </div>

                        {/* Fix Actions */}
                        {item.fixable && (
                          <NodeFixActions
                            nodeId={item.nodeId}
                            nodeName={item.nodeName}
                            nodeType={item.nodeType || ''}
                            issues={item.issues || []}
                            purpose={item.item}
                            workflowId={workflowId}
                            workflowName={workflowName}
                            n8nInstanceUrl={n8nInstanceUrl}
                            nodeParameters={item.nodeParameters}
                            credentialsConfigured={item.credentialsConfigured}
                            businessContext={businessContext}
                          />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Incomplete Nodes Section */}
          {groupedItems.incomplete.length > 0 && (
            <Collapsible
              open={expandedSections.incomplete}
              onOpenChange={() => toggleSection('incomplete')}
            >
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        Incomplete Nodes ({groupedItems.incomplete.length})
                      </div>
                      {expandedSections.incomplete ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-3 px-3 space-y-3">
                    {groupedItems.incomplete.map((item, idx) => (
                      <div key={idx} className="space-y-2 p-2 bg-background/50 rounded-lg border border-amber-500/20">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.nodeName || item.item}</p>
                            {item.nodeType && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {item.nodeType.split('.').pop()}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Issues */}
                        {item.issues && item.issues.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {item.issues.map((issue, i) => (
                              <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
                                {getIssueIcon([issue])}
                                {issue}
                              </p>
                            ))}
                          </div>
                        )}
                        
                        {/* Credentials Status */}
                        {item.credentialsConfigured !== undefined && (
                          <div className="ml-6">
                            <Badge 
                              variant="outline" 
                              className={item.credentialsConfigured 
                                ? 'border-green-500 text-green-600 text-xs' 
                                : 'border-red-500 text-red-600 text-xs'
                              }
                            >
                              <Key className="w-3 h-3 mr-1" />
                              {item.credentialsConfigured ? 'Credentials Connected' : 'Credentials Missing'}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Fix Suggestion */}
                        <div className="ml-6 p-2 bg-primary/5 rounded border border-primary/20">
                          <p className="text-xs flex items-start gap-1.5">
                            <Wrench className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-primary">
                              {getFixSuggestion(item.nodeType || '', item.issues || [])}
                            </span>
                          </p>
                        </div>

                        {/* Fix Actions */}
                        {item.fixable && (
                          <NodeFixActions
                            nodeId={item.nodeId}
                            nodeName={item.nodeName}
                            nodeType={item.nodeType || ''}
                            issues={item.issues || []}
                            purpose={item.item}
                            workflowId={workflowId}
                            workflowName={workflowName}
                            n8nInstanceUrl={n8nInstanceUrl}
                            nodeParameters={item.nodeParameters}
                            credentialsConfigured={item.credentialsConfigured}
                            businessContext={businessContext}
                          />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Configured Nodes Section */}
          {groupedItems.configured.length > 0 && (
            <Collapsible
              open={expandedSections.configured}
              onOpenChange={() => toggleSection('configured')}
            >
              <Card className="border-green-500/30 bg-green-500/5">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Configured Nodes ({groupedItems.configured.length})
                      </div>
                      {expandedSections.configured ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-3 px-3">
                    <ul className="space-y-1.5">
                      {groupedItems.configured.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm p-1.5 bg-background/50 rounded">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="flex-1">{item.nodeName || item.item}</span>
                          {item.nodeType && (
                            <Badge variant="outline" className="text-xs">
                              {item.nodeType.split('.').pop()}
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
      )}
      
      {/* Suggestions */}
      {result.suggestions && result.suggestions.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <Lightbulb className="w-4 h-4" />
              Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-3">
            <ul className="space-y-1.5">
              {result.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">→</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Quick Action if there are issues */}
      {hasIssues && n8nInstanceUrl && workflowId && (
        <Button 
          variant="outline" 
          className="w-full gap-2"
          asChild
        >
          <a 
            href={`${n8nInstanceUrl.replace(/\/$/, '')}/workflow/${workflowId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4" />
            Open Workflow in n8n to Fix Issues
          </a>
        </Button>
      )}
    </div>
  );
}
