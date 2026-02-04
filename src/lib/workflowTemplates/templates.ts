/**
 * Industry-specific n8n workflow templates
 */

import { WorkflowTemplate } from './types';

export const workflowTemplates: WorkflowTemplate[] = [
  // E-Commerce Templates
  {
    id: 'ecom-abandoned-cart',
    name: 'Abandoned Cart Recovery',
    description: 'Automatically send recovery emails when customers abandon their cart. Includes 3-email sequence with escalating discounts.',
    industry: 'ecommerce',
    automationCategory: 'email-marketing',
    complexity: 'intermediate',
    estimatedSetupTime: '30 min',
    requiredCredentials: ['Shopify/WooCommerce', 'SendGrid/Mailchimp'],
    tags: ['cart recovery', 'email sequence', 'discounts'],
    featured: true,
    nodes: [
      {
        id: 'webhook-trigger',
        name: 'Cart Abandoned Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          httpMethod: 'POST',
          path: 'abandoned-cart'
        }
      },
      {
        id: 'wait-1hr',
        name: 'Wait 1 Hour',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1,
        position: [450, 300],
        parameters: { amount: 1, unit: 'hours' }
      },
      {
        id: 'check-purchased',
        name: 'Check if Purchased',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [650, 300],
        parameters: {}
      },
      {
        id: 'send-email-1',
        name: 'Send Reminder Email',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [850, 200],
        parameters: {
          resource: 'email',
          operation: 'send'
        }
      },
      {
        id: 'wait-24hr',
        name: 'Wait 24 Hours',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1,
        position: [1050, 200],
        parameters: { amount: 24, unit: 'hours' }
      },
      {
        id: 'send-email-2',
        name: 'Send 10% Discount',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [1250, 200],
        parameters: {
          resource: 'email',
          operation: 'send'
        }
      }
    ],
    connections: {
      'Cart Abandoned Webhook': { main: [[{ node: 'Wait 1 Hour', type: 'main', index: 0 }]] },
      'Wait 1 Hour': { main: [[{ node: 'Check if Purchased', type: 'main', index: 0 }]] },
      'Check if Purchased': { main: [[{ node: 'Send Reminder Email', type: 'main', index: 0 }]] },
      'Send Reminder Email': { main: [[{ node: 'Wait 24 Hours', type: 'main', index: 0 }]] },
      'Wait 24 Hours': { main: [[{ node: 'Send 10% Discount', type: 'main', index: 0 }]] }
    }
  },
  {
    id: 'ecom-order-sync',
    name: 'Order to Airtable Sync',
    description: 'Sync all new orders to Airtable for inventory tracking and fulfillment management.',
    industry: 'ecommerce',
    automationCategory: 'data-sync',
    complexity: 'beginner',
    estimatedSetupTime: '15 min',
    requiredCredentials: ['Shopify/WooCommerce', 'Airtable'],
    tags: ['orders', 'sync', 'airtable'],
    nodes: [
      {
        id: 'order-trigger',
        name: 'New Order Trigger',
        type: 'n8n-nodes-base.shopifyTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: { topic: 'orders/create' }
      },
      {
        id: 'format-data',
        name: 'Format Order Data',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [450, 300],
        parameters: {}
      },
      {
        id: 'airtable-create',
        name: 'Create Airtable Record',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 1,
        position: [650, 300],
        parameters: {
          operation: 'append'
        }
      }
    ],
    connections: {
      'New Order Trigger': { main: [[{ node: 'Format Order Data', type: 'main', index: 0 }]] },
      'Format Order Data': { main: [[{ node: 'Create Airtable Record', type: 'main', index: 0 }]] }
    }
  },

  // SaaS Templates
  {
    id: 'saas-trial-nurture',
    name: 'Trial User Nurture Sequence',
    description: 'Onboard trial users with a 7-day email sequence featuring tips, case studies, and upgrade prompts.',
    industry: 'saas',
    automationCategory: 'customer-onboarding',
    complexity: 'intermediate',
    estimatedSetupTime: '45 min',
    requiredCredentials: ['Database/CRM', 'Email Provider'],
    tags: ['trial', 'onboarding', 'conversion'],
    featured: true,
    nodes: [
      {
        id: 'webhook-signup',
        name: 'Trial Signup Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: { httpMethod: 'POST', path: 'trial-signup' }
      },
      {
        id: 'send-welcome',
        name: 'Send Welcome Email',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [450, 300],
        parameters: {}
      },
      {
        id: 'wait-day2',
        name: 'Wait Day 2',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1,
        position: [650, 300],
        parameters: { amount: 2, unit: 'days' }
      },
      {
        id: 'send-tips',
        name: 'Send Tips Email',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [850, 300],
        parameters: {}
      },
      {
        id: 'wait-day5',
        name: 'Wait Day 5',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1,
        position: [1050, 300],
        parameters: { amount: 3, unit: 'days' }
      },
      {
        id: 'send-casestudy',
        name: 'Send Case Study',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [1250, 300],
        parameters: {}
      }
    ],
    connections: {
      'Trial Signup Webhook': { main: [[{ node: 'Send Welcome Email', type: 'main', index: 0 }]] },
      'Send Welcome Email': { main: [[{ node: 'Wait Day 2', type: 'main', index: 0 }]] },
      'Wait Day 2': { main: [[{ node: 'Send Tips Email', type: 'main', index: 0 }]] },
      'Send Tips Email': { main: [[{ node: 'Wait Day 5', type: 'main', index: 0 }]] },
      'Wait Day 5': { main: [[{ node: 'Send Case Study', type: 'main', index: 0 }]] }
    }
  },
  {
    id: 'saas-churn-alert',
    name: 'Churn Risk Alert System',
    description: 'Monitor user activity and alert sales team when engagement drops below threshold.',
    industry: 'saas',
    automationCategory: 'customer-support',
    complexity: 'advanced',
    estimatedSetupTime: '60 min',
    requiredCredentials: ['Database', 'Slack'],
    tags: ['churn', 'alerts', 'retention'],
    nodes: [
      {
        id: 'schedule-trigger',
        name: 'Daily Check',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: { rule: { interval: [{ field: 'days', daysInterval: 1 }] } }
      },
      {
        id: 'query-users',
        name: 'Query Inactive Users',
        type: 'n8n-nodes-base.postgres',
        typeVersion: 1,
        position: [450, 300],
        parameters: { operation: 'executeQuery' }
      },
      {
        id: 'filter-risk',
        name: 'Filter High Risk',
        type: 'n8n-nodes-base.filter',
        typeVersion: 1,
        position: [650, 300],
        parameters: {}
      },
      {
        id: 'slack-alert',
        name: 'Slack Alert',
        type: 'n8n-nodes-base.slack',
        typeVersion: 1,
        position: [850, 300],
        parameters: { channel: '#churn-alerts' }
      }
    ],
    connections: {
      'Daily Check': { main: [[{ node: 'Query Inactive Users', type: 'main', index: 0 }]] },
      'Query Inactive Users': { main: [[{ node: 'Filter High Risk', type: 'main', index: 0 }]] },
      'Filter High Risk': { main: [[{ node: 'Slack Alert', type: 'main', index: 0 }]] }
    }
  },

  // Agency Templates
  {
    id: 'agency-lead-intake',
    name: 'Lead Intake & Qualification',
    description: 'Capture leads from your website, score them, and route to the right team member based on budget and service type.',
    industry: 'agency',
    automationCategory: 'lead-generation',
    complexity: 'intermediate',
    estimatedSetupTime: '40 min',
    requiredCredentials: ['CRM', 'Slack', 'Email'],
    tags: ['leads', 'qualification', 'routing'],
    featured: true,
    nodes: [
      {
        id: 'form-webhook',
        name: 'Form Submission',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: { httpMethod: 'POST', path: 'lead-intake' }
      },
      {
        id: 'score-lead',
        name: 'Score Lead',
        type: 'n8n-nodes-base.code',
        typeVersion: 1,
        position: [450, 300],
        parameters: {
          jsCode: `// Score based on budget and company size
const budget = $input.first().json.budget || 0;
const employees = $input.first().json.employees || 0;
let score = 0;
if (budget > 10000) score += 50;
else if (budget > 5000) score += 30;
if (employees > 50) score += 30;
return [{ json: { ...$input.first().json, score } }];`
        }
      },
      {
        id: 'route-switch',
        name: 'Route by Score',
        type: 'n8n-nodes-base.switch',
        typeVersion: 1,
        position: [650, 300],
        parameters: {}
      },
      {
        id: 'notify-sales',
        name: 'Notify Sales Team',
        type: 'n8n-nodes-base.slack',
        typeVersion: 1,
        position: [850, 200],
        parameters: { channel: '#sales-leads' }
      },
      {
        id: 'add-crm',
        name: 'Add to CRM',
        type: 'n8n-nodes-base.hubspot',
        typeVersion: 1,
        position: [850, 400],
        parameters: { resource: 'contact', operation: 'create' }
      }
    ],
    connections: {
      'Form Submission': { main: [[{ node: 'Score Lead', type: 'main', index: 0 }]] },
      'Score Lead': { main: [[{ node: 'Route by Score', type: 'main', index: 0 }]] },
      'Route by Score': { main: [
        [{ node: 'Notify Sales Team', type: 'main', index: 0 }],
        [{ node: 'Add to CRM', type: 'main', index: 0 }]
      ]}
    }
  },
  {
    id: 'agency-report-gen',
    name: 'Weekly Client Report Generator',
    description: 'Automatically generate and send weekly performance reports to clients from Google Analytics and ad platforms.',
    industry: 'agency',
    automationCategory: 'reporting',
    complexity: 'advanced',
    estimatedSetupTime: '90 min',
    requiredCredentials: ['Google Analytics', 'Google Ads', 'Email'],
    tags: ['reports', 'analytics', 'clients'],
    nodes: [
      {
        id: 'weekly-trigger',
        name: 'Weekly Monday 9am',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: { rule: { interval: [{ field: 'weeks', weeksInterval: 1 }] } }
      },
      {
        id: 'get-analytics',
        name: 'Get GA4 Data',
        type: 'n8n-nodes-base.googleAnalytics',
        typeVersion: 1,
        position: [450, 300],
        parameters: {}
      },
      {
        id: 'format-report',
        name: 'Format Report',
        type: 'n8n-nodes-base.code',
        typeVersion: 1,
        position: [650, 300],
        parameters: {}
      },
      {
        id: 'send-report',
        name: 'Email Report',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [850, 300],
        parameters: {}
      }
    ],
    connections: {
      'Weekly Monday 9am': { main: [[{ node: 'Get GA4 Data', type: 'main', index: 0 }]] },
      'Get GA4 Data': { main: [[{ node: 'Format Report', type: 'main', index: 0 }]] },
      'Format Report': { main: [[{ node: 'Email Report', type: 'main', index: 0 }]] }
    }
  },

  // Consulting Templates
  {
    id: 'consulting-booking',
    name: 'Consultation Booking Flow',
    description: 'Handle consultation bookings with automatic calendar invites, reminder emails, and pre-call questionnaire.',
    industry: 'consulting',
    automationCategory: 'customer-onboarding',
    complexity: 'beginner',
    estimatedSetupTime: '25 min',
    requiredCredentials: ['Calendly/Cal.com', 'Email', 'Google Calendar'],
    tags: ['booking', 'calendar', 'reminders'],
    nodes: [
      {
        id: 'booking-webhook',
        name: 'Booking Created',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: { httpMethod: 'POST', path: 'booking' }
      },
      {
        id: 'send-confirm',
        name: 'Send Confirmation',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [450, 300],
        parameters: {}
      },
      {
        id: 'add-calendar',
        name: 'Add to Calendar',
        type: 'n8n-nodes-base.googleCalendar',
        typeVersion: 1,
        position: [650, 300],
        parameters: { operation: 'create' }
      },
      {
        id: 'wait-reminder',
        name: 'Wait for Reminder',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1,
        position: [850, 300],
        parameters: { amount: 24, unit: 'hours' }
      },
      {
        id: 'send-reminder',
        name: 'Send Reminder',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [1050, 300],
        parameters: {}
      }
    ],
    connections: {
      'Booking Created': { main: [[{ node: 'Send Confirmation', type: 'main', index: 0 }]] },
      'Send Confirmation': { main: [[{ node: 'Add to Calendar', type: 'main', index: 0 }]] },
      'Add to Calendar': { main: [[{ node: 'Wait for Reminder', type: 'main', index: 0 }]] },
      'Wait for Reminder': { main: [[{ node: 'Send Reminder', type: 'main', index: 0 }]] }
    }
  },

  // Coaching Templates
  {
    id: 'coaching-session-followup',
    name: 'Session Follow-up Automation',
    description: 'Send session notes, action items, and resource links automatically after each coaching session.',
    industry: 'coaching',
    automationCategory: 'customer-onboarding',
    complexity: 'beginner',
    estimatedSetupTime: '20 min',
    requiredCredentials: ['Notion/Google Docs', 'Email'],
    tags: ['follow-up', 'notes', 'action items'],
    nodes: [
      {
        id: 'session-complete',
        name: 'Session Complete Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: { httpMethod: 'POST', path: 'session-complete' }
      },
      {
        id: 'get-notes',
        name: 'Get Session Notes',
        type: 'n8n-nodes-base.notion',
        typeVersion: 1,
        position: [450, 300],
        parameters: { resource: 'page', operation: 'get' }
      },
      {
        id: 'format-email',
        name: 'Format Email Content',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [650, 300],
        parameters: {}
      },
      {
        id: 'send-followup',
        name: 'Send Follow-up Email',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [850, 300],
        parameters: {}
      }
    ],
    connections: {
      'Session Complete Trigger': { main: [[{ node: 'Get Session Notes', type: 'main', index: 0 }]] },
      'Get Session Notes': { main: [[{ node: 'Format Email Content', type: 'main', index: 0 }]] },
      'Format Email Content': { main: [[{ node: 'Send Follow-up Email', type: 'main', index: 0 }]] }
    }
  },

  // Marketing Templates
  {
    id: 'marketing-social-scheduler',
    name: 'Social Media Content Scheduler',
    description: 'Schedule and post content across multiple social platforms from a single Airtable/Notion content calendar.',
    industry: 'marketing',
    automationCategory: 'content-scheduling',
    complexity: 'intermediate',
    estimatedSetupTime: '45 min',
    requiredCredentials: ['Airtable/Notion', 'Twitter', 'LinkedIn'],
    tags: ['social media', 'scheduling', 'content'],
    featured: true,
    nodes: [
      {
        id: 'schedule-check',
        name: 'Check Every Hour',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } }
      },
      {
        id: 'get-posts',
        name: 'Get Scheduled Posts',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 1,
        position: [450, 300],
        parameters: { operation: 'list' }
      },
      {
        id: 'filter-ready',
        name: 'Filter Ready Posts',
        type: 'n8n-nodes-base.filter',
        typeVersion: 1,
        position: [650, 300],
        parameters: {}
      },
      {
        id: 'post-twitter',
        name: 'Post to Twitter',
        type: 'n8n-nodes-base.twitter',
        typeVersion: 1,
        position: [850, 200],
        parameters: { operation: 'create' }
      },
      {
        id: 'post-linkedin',
        name: 'Post to LinkedIn',
        type: 'n8n-nodes-base.linkedIn',
        typeVersion: 1,
        position: [850, 400],
        parameters: {}
      },
      {
        id: 'update-status',
        name: 'Mark as Published',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 1,
        position: [1050, 300],
        parameters: { operation: 'update' }
      }
    ],
    connections: {
      'Check Every Hour': { main: [[{ node: 'Get Scheduled Posts', type: 'main', index: 0 }]] },
      'Get Scheduled Posts': { main: [[{ node: 'Filter Ready Posts', type: 'main', index: 0 }]] },
      'Filter Ready Posts': { main: [[
        { node: 'Post to Twitter', type: 'main', index: 0 },
        { node: 'Post to LinkedIn', type: 'main', index: 0 }
      ]]},
      'Post to Twitter': { main: [[{ node: 'Mark as Published', type: 'main', index: 0 }]] },
      'Post to LinkedIn': { main: [[{ node: 'Mark as Published', type: 'main', index: 0 }]] }
    }
  },

  // Content Creation Templates
  {
    id: 'content-newsletter',
    name: 'AI Newsletter Generator',
    description: 'Generate weekly newsletter content using AI from curated RSS feeds and industry news.',
    industry: 'content-creation',
    automationCategory: 'content-scheduling',
    complexity: 'advanced',
    estimatedSetupTime: '60 min',
    requiredCredentials: ['OpenAI', 'RSS Feeds', 'Email Provider'],
    tags: ['AI', 'newsletter', 'content generation'],
    nodes: [
      {
        id: 'weekly-trigger',
        name: 'Weekly Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: { rule: { interval: [{ field: 'weeks', weeksInterval: 1 }] } }
      },
      {
        id: 'fetch-rss',
        name: 'Fetch RSS Feeds',
        type: 'n8n-nodes-base.rssFeedRead',
        typeVersion: 1,
        position: [450, 300],
        parameters: {}
      },
      {
        id: 'summarize-ai',
        name: 'AI Summarize',
        type: 'n8n-nodes-base.openAi',
        typeVersion: 1,
        position: [650, 300],
        parameters: { resource: 'chat', operation: 'message' }
      },
      {
        id: 'format-newsletter',
        name: 'Format Newsletter',
        type: 'n8n-nodes-base.code',
        typeVersion: 1,
        position: [850, 300],
        parameters: {}
      },
      {
        id: 'send-newsletter',
        name: 'Send Newsletter',
        type: 'n8n-nodes-base.mailchimp',
        typeVersion: 1,
        position: [1050, 300],
        parameters: {}
      }
    ],
    connections: {
      'Weekly Trigger': { main: [[{ node: 'Fetch RSS Feeds', type: 'main', index: 0 }]] },
      'Fetch RSS Feeds': { main: [[{ node: 'AI Summarize', type: 'main', index: 0 }]] },
      'AI Summarize': { main: [[{ node: 'Format Newsletter', type: 'main', index: 0 }]] },
      'Format Newsletter': { main: [[{ node: 'Send Newsletter', type: 'main', index: 0 }]] }
    }
  },

  // Finance Templates
  {
    id: 'finance-invoice-reminder',
    name: 'Invoice Payment Reminders',
    description: 'Automatically send payment reminders for overdue invoices with escalating urgency.',
    industry: 'finance',
    automationCategory: 'invoicing',
    complexity: 'beginner',
    estimatedSetupTime: '20 min',
    requiredCredentials: ['Stripe/QuickBooks', 'Email'],
    tags: ['invoices', 'payments', 'reminders'],
    nodes: [
      {
        id: 'daily-check',
        name: 'Daily Check',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [250, 300],
        parameters: { rule: { interval: [{ field: 'days', daysInterval: 1 }] } }
      },
      {
        id: 'get-overdue',
        name: 'Get Overdue Invoices',
        type: 'n8n-nodes-base.stripe',
        typeVersion: 1,
        position: [450, 300],
        parameters: { resource: 'invoice', operation: 'getAll' }
      },
      {
        id: 'filter-overdue',
        name: 'Filter Overdue',
        type: 'n8n-nodes-base.filter',
        typeVersion: 1,
        position: [650, 300],
        parameters: {}
      },
      {
        id: 'send-reminder',
        name: 'Send Reminder',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [850, 300],
        parameters: {}
      }
    ],
    connections: {
      'Daily Check': { main: [[{ node: 'Get Overdue Invoices', type: 'main', index: 0 }]] },
      'Get Overdue Invoices': { main: [[{ node: 'Filter Overdue', type: 'main', index: 0 }]] },
      'Filter Overdue': { main: [[{ node: 'Send Reminder', type: 'main', index: 0 }]] }
    }
  },

  // Real Estate Templates
  {
    id: 'realestate-listing-alert',
    name: 'New Listing Alert System',
    description: 'Notify clients instantly when new listings match their criteria via SMS and email.',
    industry: 'real-estate',
    automationCategory: 'lead-generation',
    complexity: 'intermediate',
    estimatedSetupTime: '35 min',
    requiredCredentials: ['MLS/Zillow API', 'Twilio', 'Email'],
    tags: ['listings', 'alerts', 'clients'],
    nodes: [
      {
        id: 'listing-webhook',
        name: 'New Listing Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: { httpMethod: 'POST', path: 'new-listing' }
      },
      {
        id: 'match-criteria',
        name: 'Match Client Criteria',
        type: 'n8n-nodes-base.code',
        typeVersion: 1,
        position: [450, 300],
        parameters: {}
      },
      {
        id: 'send-sms',
        name: 'Send SMS Alert',
        type: 'n8n-nodes-base.twilio',
        typeVersion: 1,
        position: [650, 200],
        parameters: { operation: 'send' }
      },
      {
        id: 'send-email',
        name: 'Send Email Alert',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [650, 400],
        parameters: {}
      }
    ],
    connections: {
      'New Listing Webhook': { main: [[{ node: 'Match Client Criteria', type: 'main', index: 0 }]] },
      'Match Client Criteria': { main: [[
        { node: 'Send SMS Alert', type: 'main', index: 0 },
        { node: 'Send Email Alert', type: 'main', index: 0 }
      ]]}
    }
  }
];

export function getTemplatesByIndustry(industry: string): WorkflowTemplate[] {
  if (industry === 'all') return workflowTemplates;
  return workflowTemplates.filter(t => t.industry === industry);
}

export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  if (category === 'all') return workflowTemplates;
  return workflowTemplates.filter(t => t.automationCategory === category);
}

export function getFeaturedTemplates(): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.featured);
}

export function searchTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return workflowTemplates.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
