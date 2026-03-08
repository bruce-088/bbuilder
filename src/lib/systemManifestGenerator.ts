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

interface SystemManifest {
  manifest_version: string;
  generated_at: string;
  business: {
    name: string;
    niche: string;
    target_audience: string;
  };
  data_schema: DataSchema;
  content_pillars: ContentPillar[];
  api_triggers: ApiTrigger[];
}

interface DataSchema {
  description: string;
  tables: SchemaTable[];
}

interface SchemaTable {
  name: string;
  purpose: string;
  columns: SchemaColumn[];
  rls_policy: string;
}

interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  description: string;
}

interface ContentPillar {
  pillar: string;
  keywords: string[];
  content_angles: string[];
  target_intent: string;
}

interface ApiTrigger {
  trigger_id: string;
  name: string;
  description: string;
  source_system: string;
  target_system: string;
  event: string;
  webhook_path: string;
  payload_schema: Record<string, string>;
}

const generateDataSchema = (idea: BusinessIdea): DataSchema => ({
  description: `Database schema for ${idea.business_name} — designed for NexusAI provisioning`,
  tables: [
    {
      name: "leads",
      purpose: "Track all inbound and outbound prospects",
      columns: [
        { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "Primary key" },
        { name: "user_id", type: "uuid", nullable: false, description: "Owner (FK to auth.users)" },
        { name: "name", type: "text", nullable: false, description: "Contact full name" },
        { name: "email", type: "text", nullable: true, description: "Verified email address" },
        { name: "company", type: "text", nullable: true, description: "Company or org name" },
        { name: "stage", type: "text", nullable: false, default: "'captured'", description: "Pipeline stage: captured | qualified | proposal | negotiation | won | lost" },
        { name: "source", type: "text", nullable: false, default: "'manual'", description: "Acquisition channel" },
        { name: "score", type: "integer", nullable: false, default: "0", description: "ICP fit score 0-100" },
        { name: "estimated_value", type: "numeric", nullable: true, description: "Projected deal value" },
        { name: "tags", type: "text[]", nullable: true, default: "'{}'", description: "Freeform tags for segmentation" },
        { name: "metadata", type: "jsonb", nullable: true, default: "'{}'", description: "Extensible key-value data" },
        { name: "last_contact_at", type: "timestamptz", nullable: true, description: "Most recent touchpoint" },
        { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "Row creation time" },
      ],
      rls_policy: "auth.uid() = user_id",
    },
    {
      name: "outreach_sequences",
      purpose: "Multi-step email/message campaigns",
      columns: [
        { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "Primary key" },
        { name: "user_id", type: "uuid", nullable: false, description: "Owner" },
        { name: "lead_id", type: "uuid", nullable: false, description: "FK to leads" },
        { name: "step_number", type: "integer", nullable: false, default: "1", description: "Current step in sequence" },
        { name: "channel", type: "text", nullable: false, default: "'email'", description: "email | linkedin | sms" },
        { name: "status", type: "text", nullable: false, default: "'pending'", description: "pending | sent | replied | bounced" },
        { name: "scheduled_at", type: "timestamptz", nullable: true, description: "When to send" },
        { name: "sent_at", type: "timestamptz", nullable: true, description: "Actual send time" },
        { name: "content_template_id", type: "text", nullable: true, description: "Template reference" },
        { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "Row creation time" },
      ],
      rls_policy: "auth.uid() = user_id",
    },
    {
      name: "content_posts",
      purpose: "Scheduled and published marketing content",
      columns: [
        { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "Primary key" },
        { name: "user_id", type: "uuid", nullable: false, description: "Owner" },
        { name: "pillar", type: "text", nullable: false, description: "Content pillar category" },
        { name: "title", type: "text", nullable: false, description: "Post headline" },
        { name: "body", type: "text", nullable: true, description: "Full post content" },
        { name: "platform", type: "text", nullable: false, default: "'linkedin'", description: "linkedin | twitter | blog" },
        { name: "status", type: "text", nullable: false, default: "'draft'", description: "draft | scheduled | published" },
        { name: "publish_at", type: "timestamptz", nullable: true, description: "Scheduled publish time" },
        { name: "engagement_data", type: "jsonb", nullable: true, default: "'{}'", description: "Likes, shares, comments" },
        { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "Row creation time" },
      ],
      rls_policy: "auth.uid() = user_id",
    },
    {
      name: "revenue_events",
      purpose: "Track all monetary transactions and MRR",
      columns: [
        { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()", description: "Primary key" },
        { name: "user_id", type: "uuid", nullable: false, description: "Owner" },
        { name: "lead_id", type: "uuid", nullable: true, description: "FK to leads (if attributable)" },
        { name: "amount", type: "numeric", nullable: false, default: "0", description: "Transaction amount" },
        { name: "currency", type: "text", nullable: false, default: "'USD'", description: "ISO 4217 code" },
        { name: "type", type: "text", nullable: false, default: "'one_time'", description: "one_time | recurring | refund" },
        { name: "source", type: "text", nullable: false, default: "'stripe'", description: "Payment processor" },
        { name: "event_date", type: "date", nullable: false, default: "CURRENT_DATE", description: "Transaction date" },
        { name: "created_at", type: "timestamptz", nullable: false, default: "now()", description: "Row creation time" },
      ],
      rls_policy: "auth.uid() = user_id",
    },
  ],
});

const generateContentPillars = (idea: BusinessIdea): ContentPillar[] => {
  const nicheKeywords = idea.niche.toLowerCase().split(/[\s,]+/).filter(w => w.length > 3);
  const audienceKeywords = idea.target_audience.toLowerCase().split(/[\s,]+/).filter(w => w.length > 3);

  return [
    {
      pillar: "Authority & Expertise",
      keywords: [
        ...nicheKeywords.slice(0, 3),
        `${idea.niche} best practices`,
        `${idea.niche} tips`,
        `how to ${idea.niche.toLowerCase()}`,
      ],
      content_angles: [
        "Deep-dive tutorials showing expertise",
        "Industry trend analysis and hot takes",
        "Common mistakes and how to avoid them",
        `Case study: How ${idea.service_offering} delivers results`,
      ],
      target_intent: "informational",
    },
    {
      pillar: "Pain Point Agitation",
      keywords: [
        ...audienceKeywords.slice(0, 3),
        `${idea.target_audience} challenges`,
        `${idea.target_audience} problems`,
        `why ${idea.niche.toLowerCase()} fails`,
      ],
      content_angles: [
        "The hidden cost of NOT solving this problem",
        "Stories from the trenches — real examples",
        `Why ${idea.target_audience} struggle with this`,
        "Before/after transformation narratives",
      ],
      target_intent: "problem-aware",
    },
    {
      pillar: "Solution Showcase",
      keywords: [
        `${idea.business_name}`,
        idea.service_offering.split(" ").slice(0, 3).join(" "),
        `${idea.niche} solution`,
        `${idea.niche} service`,
      ],
      content_angles: [
        "How our process works (step-by-step)",
        "Client results and testimonials",
        "Behind the scenes of delivery",
        `What makes ${idea.business_name} different`,
      ],
      target_intent: "solution-aware",
    },
    {
      pillar: "Social Proof & Community",
      keywords: [
        `${idea.niche} community`,
        `${idea.target_audience} network`,
        "client success",
        "testimonial",
      ],
      content_angles: [
        "Client spotlight interviews",
        "Community Q&A and engagement posts",
        "Milestone celebrations",
        "Collaborative content with partners",
      ],
      target_intent: "decision",
    },
  ];
};

const generateApiTriggers = (idea: BusinessIdea): ApiTrigger[] => [
  {
    trigger_id: "trg_lead_captured",
    name: "Lead Captured",
    description: "Fires when a new lead enters the pipeline from any source",
    source_system: "WeatherPost / Landing Page / Webhook",
    target_system: "NexusAI DB → n8n Outreach Workflow",
    event: "INSERT on leads",
    webhook_path: "/api/triggers/lead-captured",
    payload_schema: {
      name: "string (required)",
      email: "string (required)",
      source: "string",
      company: "string",
      metadata: "object",
    },
  },
  {
    trigger_id: "trg_lead_qualified",
    name: "Lead Qualified",
    description: "Fires when a lead's score exceeds threshold or stage changes to 'qualified'",
    source_system: "NexusAI DB (trigger on UPDATE)",
    target_system: "n8n Qualification Workflow → Calendar Booking",
    event: "UPDATE on leads WHERE stage = 'qualified'",
    webhook_path: "/api/triggers/lead-qualified",
    payload_schema: {
      lead_id: "uuid (required)",
      score: "integer",
      stage: "string",
      qualified_reason: "string",
    },
  },
  {
    trigger_id: "trg_content_published",
    name: "Content Published",
    description: "Fires when a post transitions to 'published' status",
    source_system: "WeatherPost Scheduler",
    target_system: "NexusAI Analytics → Social Distribution n8n Workflow",
    event: "UPDATE on content_posts WHERE status = 'published'",
    webhook_path: "/api/triggers/content-published",
    payload_schema: {
      post_id: "uuid (required)",
      platform: "string",
      pillar: "string",
      publish_url: "string",
    },
  },
  {
    trigger_id: "trg_proposal_sent",
    name: "Proposal Sent",
    description: "Fires when a proposal is generated and sent to a lead",
    source_system: "n8n Proposal Workflow",
    target_system: "NexusAI DB → CRM Activity Log",
    event: "Webhook callback from PandaDoc/proposal tool",
    webhook_path: "/api/triggers/proposal-sent",
    payload_schema: {
      lead_id: "uuid (required)",
      proposal_url: "string",
      amount: "number",
      expires_at: "string (ISO 8601)",
    },
  },
  {
    trigger_id: "trg_payment_received",
    name: "Payment Received",
    description: "Fires when Stripe confirms a successful charge",
    source_system: "Stripe Webhook",
    target_system: "NexusAI DB (revenue_events) → n8n Client Onboarding Workflow",
    event: "Stripe checkout.session.completed",
    webhook_path: "/api/triggers/payment-received",
    payload_schema: {
      lead_id: "uuid",
      amount: "number (required)",
      currency: "string",
      stripe_session_id: "string (required)",
      customer_email: "string",
    },
  },
  {
    trigger_id: "trg_engagement_spike",
    name: "Engagement Spike Detected",
    description: "Fires when a content post exceeds engagement thresholds",
    source_system: "WeatherPost Analytics Cron",
    target_system: "n8n → Amplification Workflow (boost, repurpose)",
    event: "Scheduled check on content_posts.engagement_data",
    webhook_path: "/api/triggers/engagement-spike",
    payload_schema: {
      post_id: "uuid (required)",
      platform: "string",
      metric: "string (likes | shares | comments)",
      value: "number",
      threshold: "number",
    },
  },
];

export const generateSystemManifest = (idea: BusinessIdea): string => {
  const manifest: SystemManifest = {
    manifest_version: "1.0.0",
    generated_at: new Date().toISOString(),
    business: {
      name: idea.business_name,
      niche: idea.niche,
      target_audience: idea.target_audience,
    },
    data_schema: generateDataSchema(idea),
    content_pillars: generateContentPillars(idea),
    api_triggers: generateApiTriggers(idea),
  };

  return JSON.stringify(manifest, null, 2);
};
