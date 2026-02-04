/**
 * Types for the Workflow Template Library
 */

export type IndustryCategory = 
  | 'ecommerce'
  | 'saas'
  | 'agency'
  | 'consulting'
  | 'coaching'
  | 'real-estate'
  | 'healthcare'
  | 'finance'
  | 'marketing'
  | 'content-creation';

export type WorkflowComplexity = 'beginner' | 'intermediate' | 'advanced';

export type AutomationCategory = 
  | 'lead-generation'
  | 'sales-automation'
  | 'customer-onboarding'
  | 'email-marketing'
  | 'social-media'
  | 'data-sync'
  | 'reporting'
  | 'customer-support'
  | 'invoicing'
  | 'content-scheduling';

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

export interface WorkflowConnection {
  node: string;
  type: string;
  index: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  industry: IndustryCategory;
  automationCategory: AutomationCategory;
  complexity: WorkflowComplexity;
  estimatedSetupTime: string;
  requiredCredentials: string[];
  tags: string[];
  nodes: WorkflowNode[];
  connections: Record<string, { main: WorkflowConnection[][] }>;
  featured?: boolean;
  previewImage?: string;
}

export interface TemplateFilter {
  industry?: IndustryCategory | 'all';
  automationCategory?: AutomationCategory | 'all';
  complexity?: WorkflowComplexity | 'all';
  searchQuery?: string;
}

export const INDUSTRY_LABELS: Record<IndustryCategory, string> = {
  'ecommerce': 'E-Commerce',
  'saas': 'SaaS',
  'agency': 'Agency',
  'consulting': 'Consulting',
  'coaching': 'Coaching',
  'real-estate': 'Real Estate',
  'healthcare': 'Healthcare',
  'finance': 'Finance',
  'marketing': 'Marketing',
  'content-creation': 'Content Creation'
};

export const AUTOMATION_LABELS: Record<AutomationCategory, string> = {
  'lead-generation': 'Lead Generation',
  'sales-automation': 'Sales Automation',
  'customer-onboarding': 'Customer Onboarding',
  'email-marketing': 'Email Marketing',
  'social-media': 'Social Media',
  'data-sync': 'Data Sync',
  'reporting': 'Reporting',
  'customer-support': 'Customer Support',
  'invoicing': 'Invoicing',
  'content-scheduling': 'Content Scheduling'
};

export const COMPLEXITY_CONFIG: Record<WorkflowComplexity, { label: string; color: string }> = {
  'beginner': { label: 'Beginner', color: 'bg-green-500/20 text-green-400' },
  'intermediate': { label: 'Intermediate', color: 'bg-yellow-500/20 text-yellow-400' },
  'advanced': { label: 'Advanced', color: 'bg-red-500/20 text-red-400' }
};
