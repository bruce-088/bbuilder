/**
 * Systems Library — Blueprint Schema
 *
 * Mya is a Systems Architect. Every resource she ingests answers ONE question:
 *   "How would we build, automate, and operate this business?"
 *
 * Blueprints are the product. Summaries are a byproduct.
 *
 * This schema is intentionally EXTENSIBLE: new sections can be added to
 * BLUEPRINT_SECTIONS without breaking storage or rendering — the DB column
 * is a JSONB blob keyed by section id.
 */

export type AgentRole = "mya" | "claw" | "anjel" | "human";

export const AGENT_ROLE_LABEL: Record<AgentRole, string> = {
  mya: "Mya — Strategy / Architecture / Product / BI / Blueprint",
  claw: "Claw — Chief of Staff / Orchestration / Prioritization / Delegation",
  anjel: "Anjel — Engineering / Automation / n8n / Integrations / Infra",
  human: "Human Operator",
};

export interface BlueprintSection {
  id: string;
  label: string;
  hint: string;
}

/**
 * Canonical (extensible) blueprint sections. Order matters for rendering.
 * Add new sections by appending to this list — storage and UI auto-adapt.
 */
export const BLUEPRINT_SECTIONS: BlueprintSection[] = [
  { id: "executive_summary",       label: "Executive Summary",        hint: "2–4 sentences. What is this business, who is it for, why does it work?" },
  { id: "system_dna",              label: "System DNA",                hint: "The non-negotiable structural traits (recurring? productized? AI-native?)" },
  { id: "revenue_model",           label: "Revenue Model",             hint: "Pricing, frequency, monetization mechanic." },
  { id: "offer",                   label: "Offer",                     hint: "The transformation sold. Bullet the deliverables." },
  { id: "target_customer",         label: "Target Customer",           hint: "Niche, demographic, psychographic, where they hang out." },
  { id: "customer_journey",        label: "Customer Journey",          hint: "Awareness → Interest → Purchase → Delivery → Retention." },
  { id: "business_workflow",       label: "Business Workflow",         hint: "The end-to-end operating loop." },
  { id: "required_automations",    label: "Required Automations",      hint: "List every automation needed (with trigger + outcome)." },
  { id: "ai_opportunities",        label: "AI Opportunities",          hint: "Where AI replaces or augments human work." },
  { id: "human_responsibilities",  label: "Human Responsibilities",    hint: "The minimum human surface area." },
  { id: "agent_responsibilities",  label: "Agent Responsibilities",    hint: "Mya / Claw / Anjel split. Use AgentRole roles." },
  { id: "technology_stack",        label: "Technology Stack",          hint: "Tools, APIs, infra. Prefer named stacks." },
  { id: "empty_lane_analysis",     label: "Empty Lane Analysis",       hint: "Where is the market under-served? Why is this lane open?" },
  { id: "competitive_advantage",   label: "Competitive Advantage",     hint: "The structural moat — not features." },
  { id: "risks",                   label: "Risks",                     hint: "What could kill this business? Order by likelihood." },
  { id: "kpis",                    label: "KPIs",                      hint: "Measurable signals of health. Lead + lag indicators." },
  { id: "thirty_day_mvp",          label: "30-Day MVP",                hint: "What ships in the first 30 days. No fluff." },
  { id: "ninety_day_scale",        label: "90-Day Scale Plan",         hint: "How it scales after MVP traction." },
  { id: "execution_checklist",     label: "Execution Checklist",       hint: "Ordered, atomic to-dos. Each item assignable to an agent." },
  { id: "comparative_intelligence",label: "Comparative Intelligence",  hint: "How this blueprint compares to others in the Library (automation %, niche overlap, revenue model peers). Populated via query_blueprint_library." },
  { id: "mutation_logic",          label: "Mutation Logic",            hint: "4-phase state transition plan for OpenClaw: Zero-State → Data Seeding → Tactical Scaffolding → Agent Activation." },
  { id: "openclaw_handoff",        label: "OpenClaw Handoff Package",  hint: "Structured payload Claw ingests to spin this business up." },
];

export type BlueprintMap = Record<string, string>;

export interface SystemBlueprint {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  source_type: string;
  source_url: string | null;
  source_metadata: Record<string, unknown>;
  blueprint: BlueprintMap;
  tags: string[];
  facets: BlueprintFacets;
  mutation_log: MutationStep[];
  handoff_package: HandoffPackage;
  status: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Facets power structured filtering today and semantic search tomorrow.
 * Keep keys stable so future embeddings/queries don't break.
 */
export interface BlueprintFacets {
  revenue_model?: "one_time" | "recurring" | "productized" | "marketplace" | "ads" | "service" | "hybrid";
  business_model_type?: string;
  startup_cost_usd?: number;
  automation_potential?: number; // 0–100
  outbound_required?: boolean;
  inbound_dependent?: boolean;
  tags?: string[];
  [key: string]: unknown;
}

export interface MutationStep {
  state: string;          // e.g. "create_project", "create_documentation", "generate_sops"
  label: string;
  agent: AgentRole;
  payload?: Record<string, unknown>;
}

/**
 * Canonical default mutation pipeline — 4 phases for OpenClaw.
 * Each phase is a WORKSPACE STATE TRANSITION, not files to create.
 *
 * Phase 1: Zero-State        → workspace init
 * Phase 2: Data Seeding      → docs + memory injection
 * Phase 3: Tactical Scaffolding → project file + task creation
 * Phase 4: Agent Activation  → n8n / task handoff goes live
 */
export const DEFAULT_MUTATION_PIPELINE: MutationStep[] = [
  { state: "phase_1_zero_state",            label: "Phase 1 — Zero-State (Workspace Init)",                agent: "claw" },
  { state: "phase_2_data_seeding",          label: "Phase 2 — Data Seeding (Docs & Memory Injection)",      agent: "mya" },
  { state: "phase_3_tactical_scaffolding",  label: "Phase 3 — Tactical Scaffolding (Project Files & Tasks)", agent: "claw" },
  { state: "phase_4_agent_activation",      label: "Phase 4 — Agent Activation (n8n / Task Handoff)",       agent: "anjel" },
];

/**
 * HandoffPackage is the contract between the Blueprint engine and the
 * orchestration layer (today: clipboard → OpenClaw/Mission Control;
 * tomorrow: API endpoint). Keep the shape stable.
 */
export interface HandoffPackage {
  version: "1.0";
  blueprint_id?: string;
  title: string;
  summary: string;
  agents: {
    mya: string[];   // strategic directives
    claw: string[];  // orchestration tasks
    anjel: string[]; // engineering tasks
  };
  mutation_pipeline: MutationStep[];
  required_automations: string[];
  tech_stack: string[];
  kpis: string[];
  source?: { type: string; url?: string; title?: string };
}
