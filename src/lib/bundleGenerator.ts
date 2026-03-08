import JSZip from "jszip";
import { generateBusinessPlanPDFBlob } from "./pdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { generateSystemManifest } from "./systemManifestGenerator";
import type { Json } from "@/integrations/supabase/types";

interface BusinessIdea {
  id: string;
  business_name: string;
  niche: string;
  target_audience: string;
  value_proposition: string;
  service_offering: string;
  revenue_math: string;
  validation_path: string;
  ai_automation_strategy: Json;
  created_at: string;
}

interface AutomationStage {
  id: string;
  title: string;
  workflowPrompt: string;
}

interface BundleOptions {
  includeIndividualStages?: boolean;
  includeReadme?: boolean;
  onProgress?: (message: string) => void;
}

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

const generateAutomationStages = (idea: BusinessIdea): AutomationStage[] => {
  return [
    {
      id: "n8n-prospecting",
      title: "Lead Prospecting & Discovery",
      workflowPrompt: `Create an n8n workflow for ${idea.business_name} that:
1. Runs on a daily schedule at 9 AM
2. Calls Apollo.io API to search for ${idea.target_audience} in the ${idea.niche} space
3. Filters leads by company size, industry relevance, and job title
4. Enriches each lead with Hunter.io to verify email addresses
5. Scores leads based on fit with ICP
6. Adds qualified leads to a Google Sheet
7. Sends a Slack notification with daily prospecting summary`
    },
    {
      id: "n8n-outreach",
      title: "Outreach & Follow-up",
      workflowPrompt: `Create an n8n outreach workflow for ${idea.business_name} that:
1. Triggers when a new lead is added
2. Sends personalized cold email introducing ${idea.service_offering}
3. Waits 3 days, then checks for replies
4. Sends follow-up sequence
5. Updates CRM with email status`
    },
    {
      id: "n8n-qualification",
      title: "Qualification & Discovery",
      workflowPrompt: `Create an n8n qualification workflow for ${idea.business_name} that:
1. Triggers when someone books a discovery call
2. Fetches qualification form responses
3. Scores the lead
4. Creates a call prep document
5. Sends personalized confirmation email`
    },
    {
      id: "n8n-proposal",
      title: "Proposal & Presentation",
      workflowPrompt: `Create an n8n proposal workflow for ${idea.business_name} that:
1. Triggers when a call is marked "Qualified"
2. Uses AI to generate a customized proposal
3. Creates the proposal in PandaDoc
4. Sends proposal email with tracking
5. Monitors for proposal views`
    },
    {
      id: "n8n-closing",
      title: "Payment & Invoicing",
      workflowPrompt: `Create an n8n closing workflow for ${idea.business_name} that:
1. Triggers when a proposal is signed
2. Creates a Stripe customer
3. Generates an invoice
4. Sends payment link
5. Updates CRM when paid`
    },
    {
      id: "n8n-client-success",
      title: "Client Success & Retention",
      workflowPrompt: `Create an n8n client success workflow for ${idea.business_name} that:
1. Runs weekly to check on clients
2. Calculates health score
3. Sends proactive check-in emails for at-risk clients
4. Sends NPS surveys at milestones
5. Handles renewal reminders`
    }
  ];
};

const generateReadme = (idea: BusinessIdea, completedSteps: string[], workflowCount: number): string => {
  const quickStartItems = [
    { id: "validate", label: "Validate with 3 customers" },
    { id: "landing", label: "Create landing page" },
    { id: "offer", label: "Define offer & pricing" },
    { id: "outreach", label: "Reach out to 10 prospects" },
    { id: "first_sale", label: "Close first customer" },
  ];

  const checklistMarkdown = quickStartItems
    .map(step => `- [${completedSteps.includes(step.id) ? 'x' : ' '}] ${step.label}`)
    .join('\n');

  return `# ${idea.business_name} - Complete Startup Kit
Generated by MYA (Mission Yield Accelerator)

## What's Included

### 1. Business Plan (PDF)
Your complete business plan including:
- Niche and target audience analysis
- Value proposition and service offering
- Revenue math ($10K/month path)
- Validation strategy
- AI automation blueprint

### 2. n8n Master Workflow (JSON)
A complete automation workflow (${workflowCount} stages) ready to import into n8n:
- Lead prospecting & discovery
- Outreach & follow-up sequences
- Qualification & scheduling
- Proposal generation
- Payment & invoicing
- Client success & retention

### 3. Individual Stage Workflows
Separate JSON files for each automation stage, useful for testing or partial implementation.

---

## Quick Start Guide

1. **Review your business plan** - Open the PDF to understand the strategy
2. **Set up n8n** - Visit https://n8n.io and create an account
3. **Import master workflow** - File → Import from File → select \`n8n-master-workflow.json\`
4. **Configure credentials** - Add API keys for Apollo.io, Gmail, Stripe, etc.
5. **Test each stage** - Start with manual triggers before enabling automation
6. **Activate and launch** - Enable the workflow when ready

---

## Your Progress

${checklistMarkdown}

---

## Business Overview

**Niche:** ${idea.niche}

**Target Audience:** ${idea.target_audience}

**Value Proposition:** ${idea.value_proposition}

**Service Offering:** ${idea.service_offering}

---

## Revenue Math

${idea.revenue_math}

---

## Need Help?

- **n8n Documentation**: https://docs.n8n.io
- **Community Forum**: https://community.n8n.io

---

*Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*
`;
};

export async function generateBusinessPlanBundle(
  idea: BusinessIdea,
  completedSteps: string[],
  options: BundleOptions = {}
): Promise<void> {
  const {
    includeIndividualStages = true,
    includeReadme = true,
    onProgress,
  } = options;

  const zip = new JSZip();
  const stages = generateAutomationStages(idea);
  
  // Generate PDF
  onProgress?.("Generating business plan PDF...");
  const pdfBlob = await generateBusinessPlanPDFBlob(idea, completedSteps);
  const pdfFileName = `${idea.business_name.replace(/[^a-zA-Z0-9]/g, "-")}-Business-Plan.pdf`;
  zip.file(pdfFileName, pdfBlob);

  // Generate all workflows in parallel
  onProgress?.("Generating n8n workflows (this may take up to 60 seconds)...");
  
  const stagePromises = stages.map((stage, index) => 
    supabase.functions.invoke("generate-n8n-workflow-from-prompt", {
      body: { 
        workflowPrompt: stage.workflowPrompt,
        stageName: stage.title,
        businessName: idea.business_name
      },
    }).then(({ data, error }) => {
      if (error) throw error;
      const workflow = extractN8nWorkflowJson(data.content, idea.business_name);
      onProgress?.(`Generated: ${stage.title}`);
      return { stage, index, workflow };
    }).catch(err => {
      console.error(`Error generating workflow for stage ${stage.title}:`, err);
      return { stage, index, workflow: null };
    })
  );

  const results = await Promise.all(stagePromises);
  const successfulWorkflows = results.filter(r => r.workflow !== null);
  
  // Build master workflow
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
    name: `${idea.business_name} - Complete Sales Automation`,
    nodes: allNodes,
    connections: allConnections,
    settings: { executionOrder: "v1" },
    active: false
  };

  // Add master workflow to zip
  zip.file("n8n-master-workflow.json", JSON.stringify(masterWorkflow, null, 2));

  // Add individual stage workflows
  if (includeIndividualStages) {
    const workflowsFolder = zip.folder("workflows");
    successfulWorkflows.forEach(({ stage, index, workflow }) => {
      if (workflow && workflowsFolder) {
        const stageFileName = `${String(index + 1).padStart(2, '0')}-${stage.id.replace('n8n-', '')}.json`;
        workflowsFolder.file(stageFileName, JSON.stringify(workflow, null, 2));
      }
    });
  }

  // Add README
  if (includeReadme) {
    const readme = generateReadme(idea, completedSteps, successfulWorkflows.length);
    zip.file("README.md", readme);
  }

  // Generate and download ZIP
  onProgress?.("Creating bundle...");
  const zipBlob = await zip.generateAsync({ type: "blob" });
  
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${idea.business_name.replace(/[^a-zA-Z0-9]/g, "-")}-Startup-Bundle.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
