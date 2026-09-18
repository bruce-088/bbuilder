// Polsia platform knowledge + handoff builder.
//
// Polsia (https://polsia.com) is an autonomous "AI runs your company" platform.
// A founder describes a company at https://polsia.com/new and a fleet of
// specialised agents (orchestrator, business planning, competitor research,
// social media, email outreach, customer support, ads, code generation,
// finance, deployment) plan, build, market and operate it on a daily cycle.
//
// bbuilder's job in this loop is the part Polsia is weakest at: choosing and
// validating an idea that the Polsia agent fleet can actually run to $10K/mo.
// This module gives Mya a ground-truth model of Polsia (derived from
// polsia.com, github.com/PolsiaAI/Polsia and github.com/PolsiaAI/PolsiaAI)
// and a deterministic mapper from a Mya Business Plan → Polsia CompanyConfig.

import type { ParsedBusinessPlan } from "./parseBusinessPlanMarkdown.ts";

// ─── Platform profile (ground truth Mya reasons from) ───

export interface PolsiaAgent {
  key: string;
  name: string;
  responsibility: string;
  cadence: string;
}

/** Agents in the open-source Polsia stack (backend/app/agents/* + Celery Beat). */
export const POLSIA_AGENTS: PolsiaAgent[] = [
  { key: "orchestrator", name: "Orchestrator", responsibility: "Writes the morning plan and evening summary, assigns tasks to every other agent", cadence: "06:00 / 20:00 daily" },
  { key: "business_planning", name: "Business Planning", responsibility: "Strategy, KPIs, growth recommendations", cadence: "Daily" },
  { key: "competitor_research", name: "Competitor Research", responsibility: "Web search, competitor profile updates", cadence: "Daily" },
  { key: "social_media", name: "Social Media", responsibility: "Drafts and posts to X/Twitter, replies to mentions", cadence: "Every 2h" },
  { key: "email_outreach", name: "Email Outreach", responsibility: "Prospect finding + cold email sequences (SendGrid)", cadence: "Every 3h" },
  { key: "customer_support", name: "Customer Support", responsibility: "Reads the inbox (IMAP), drafts replies", cadence: "Every 3h" },
  { key: "ads_management", name: "Ads Management", responsibility: "Google + Meta campaign creation and optimisation", cadence: "Every 6h" },
  { key: "code_generation", name: "Code Generation", responsibility: "Ships features, fixes bugs, opens GitHub PRs", cadence: "On demand" },
  { key: "finance", name: "Finance", responsibility: "Stripe revenue sync, spend tracking, daily snapshot", cadence: "Every 6h" },
  { key: "deployment", name: "Deployment", responsibility: "Provisions servers/domains and deploys the product", cadence: "On demand" },
];

/** Integrations the Polsia agents can drive out of the box. */
export const POLSIA_INTEGRATIONS = [
  "Stripe (payments, revenue tracking, revenue share)",
  "GitHub (code generation agent opens PRs)",
  "X / Twitter (social posting + mentions)",
  "SendGrid + IMAP (cold outreach + support inbox)",
  "Google Ads + Meta Ads",
  "Tavily web search (competitor research)",
  "Provisioned domain, landing page, hosting and founder inbox",
];

/** Fields Polsia's CompanyConfig table expects (alembic 0001_initial_schema). */
export const POLSIA_COMPANY_CONFIG_FIELDS = [
  "name", "mission", "vision", "description", "target_market", "value_prop",
  "pricing_model", "goals", "kpis", "website_url", "github_repo",
  "product_type", "industry",
] as const;

/** What makes an idea a strong fit for the Polsia agent fleet. */
export const POLSIA_FIT_RULES = [
  "Digital-only delivery: software, SaaS, micro-SaaS, APIs, digital products, content/newsletter, marketplaces with no physical fulfilment. Nothing that needs a human on site, shipping, or a licence to operate.",
  "Self-serve monetisation through Stripe (subscriptions, one-off checkout, usage pricing). Avoid invoices, retainers or negotiated contracts that need a human closer.",
  "Acquisition channels that map to Polsia agents: cold email, X/Twitter content, Google/Meta ads, SEO landing pages. Avoid ideas that depend on in-person networking, phone sales, or platforms Polsia can't post to.",
  "The MVP must be buildable by a code-generation agent from a written spec in days: a web app, landing page + Stripe checkout, an automation, a data product. No hardware, no mobile-app-store-only products, no deep regulated integrations.",
  "Support load must be answerable by an inbox agent with a FAQ — low-touch, asynchronous, no 24/7 SLAs or safety-critical advice.",
  "Clear daily KPIs the Finance/Orchestrator agents can track: MRR, active customers, signups, churn, CAC, ad spend.",
  "Compliance-light: Polsia is not SOC2/HIPAA/FedRAMP — avoid healthcare records, regulated finance, legal advice, children's data.",
  "Solo-founder economics: $0–$500 to start, path to $10K/month net with unit economics that survive Polsia's ~$49/mo subscription plus a revenue share on transactions.",
];

/** Patterns Mya must reject or reshape before handing off to Polsia. */
export const POLSIA_ANTI_PATTERNS = [
  "Local services, agencies or consulting that require the founder's own hours to deliver",
  "Physical products, inventory, dropshipping or anything with shipping/returns",
  "High-ticket B2B sales cycles that need discovery calls, demos and custom proposals",
  "Regulated verticals (medical, legal, lending, insurance, gambling)",
  "Businesses whose only channel is one Polsia can't operate (TikTok-only, LinkedIn-only, phone, door-to-door)",
  "Ideas with no measurable KPI in the first 30 days",
];

/** Compact knowledge block injected into Mya's system prompt. */
export function buildPolsiaKnowledgeBlock(): string {
  const agents = POLSIA_AGENTS.map((a) => `- **${a.name}** (\`${a.key}\`, ${a.cadence}) — ${a.responsibility}`).join("\n");
  const fit = POLSIA_FIT_RULES.map((r) => `- ${r}`).join("\n");
  const anti = POLSIA_ANTI_PATTERNS.map((r) => `- ${r}`).join("\n");
  const integrations = POLSIA_INTEGRATIONS.map((i) => `- ${i}`).join("\n");
  return `## 🏢 POLSIA PLATFORM KNOWLEDGE (ground truth)
Polsia (polsia.com) is an autonomous AI platform — "AI that runs your company while you sleep." A founder creates a company at polsia.com/new (either "Create a new company — start from scratch" or "Grow my company"), Polsia provisions the stack (domain, landing page, GitHub repo, Stripe, founder inbox) and its agent fleet runs the business on a daily plan → execute → report cycle. Free to start, ~$49/mo Pro, plus a revenue share on transactions. Polsia is strong at execution and weak at idea selection and market validation — that is exactly the gap bbuilder + Mya fill.

### Polsia agent fleet
${agents}

### Integrations Polsia can operate
${integrations}

### Polsia CompanyConfig schema (what the platform ingests)
\`${POLSIA_COMPANY_CONFIG_FIELDS.join("`, `")}\` — goals and kpis are JSON objects, pricing_model is \`{ plans: [{ name, price }] }\`.

### What fits Polsia
${fit}

### Reject or reshape
${anti}`;
}

/**
 * Extra instructions appended to GENERATE_IDEAS_PROMPT when the user asks for a
 * Polsia-ready idea. Adds two sections AFTER the canonical schema so the
 * existing plan parser / saver keeps working unchanged.
 */
export const POLSIA_IDEA_ADDENDUM = `
## 🏢 POLSIA-READY MODE (MANDATORY CONSTRAINTS)
This idea will be handed to Polsia's autonomous agent fleet to build, market and operate. Design it so that EVERY function of the business maps onto a Polsia agent and its integrations. Apply the POLSIA PLATFORM KNOWLEDGE rules strictly:
- Digital-only product, self-serve Stripe monetisation, MVP a code-generation agent can ship from your spec in under a week.
- Acquisition ONLY via channels Polsia agents run: cold email, X/Twitter, Google/Meta ads, SEO landing page.
- Support answerable asynchronously from an inbox with a FAQ.
- Daily-trackable KPIs (signups, MRR, active customers, churn, CAC).
- Nothing regulated, physical, local, or dependent on founder hours.
In "💰 Revenue Math" include Polsia's cost (~$49/mo + revenue share) in the net-profit calculation. In "🚀 Fast Validation Path" make the validation something Polsia's agents can execute autonomously (landing page + waitlist + cold email + X posts), because Polsia itself skips validation.

After the canonical sections above, append these TWO extra sections, in this order:

## 🏢 Polsia Agent Plan
A markdown table with columns: Agent | Daily Job For This Business | Success Metric. One row for EACH of: Orchestrator, Business Planning, Competitor Research, Social Media, Email Outreach, Customer Support, Ads Management, Code Generation, Finance, Deployment. Be concrete — name the prospect list, the tweet angle, the ad audience, the feature backlog.

## 🧾 Polsia Company Brief
Bullet list using EXACTLY these labels (one per line): **Name:**, **Mission:**, **Vision:**, **Description:**, **Target Market:**, **Value Prop:**, **Pricing Model:**, **Product Type:**, **Industry:**, **30-Day Goals:**, **KPIs:**. Then a final fenced block labelled \`\`\`text containing a 4–6 sentence paste-ready "company description" the founder can drop into polsia.com/new → "Create a new company".`;

// ─── Business Plan → Polsia CompanyConfig mapper ───

export interface PolsiaPricingPlan {
  name: string;
  price: number;
}

export interface PolsiaCompanyBrief {
  name: string;
  mission: string;
  vision: string;
  description: string;
  target_market: string;
  value_prop: string;
  pricing_model: { plans: PolsiaPricingPlan[] };
  goals: Record<string, string[]>;
  kpis: Record<string, number>;
  product_type: string;
  industry: string;
  website_url: string;
  github_repo: string;
  /** agent key → what that agent should do for this business */
  agent_plan: Record<string, string>;
  /** Paste-ready description for polsia.com/new */
  onboarding_prompt: string;
  /** 0–100 heuristic fit score + reasoning */
  fit: PolsiaFitAssessment;
  source: "mya-business-plan";
}

export interface PolsiaFitAssessment {
  score: number;
  signals: string[];
  warnings: string[];
}

const SECTION_ALIASES: Record<string, RegExp> = {
  niche: /niche/i,
  audience: /target audience|target market/i,
  value: /value prop/i,
  offering: /offering|product/i,
  revenue: /revenue/i,
  validation: /validation/i,
  automation: /automation/i,
  stack: /tech stack/i,
  challenges: /challenge/i,
  agentPlan: /polsia agent plan/i,
  brief: /polsia company brief/i,
};

function findSection(plan: ParsedBusinessPlan, key: keyof typeof SECTION_ALIASES): string {
  const re = SECTION_ALIASES[key];
  const hit = plan.sections.find((s) => re.test(s.heading));
  return hit ? hit.body.trim() : "";
}

/** Strip markdown emphasis/bullets so values are clean single strings. */
export function cleanMarkdown(text: string, max = 600): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^[\s>*-]+/gm, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function firstSentences(text: string, count: number, max = 400): string {
  const clean = cleanMarkdown(text, 2000);
  const parts = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, count).join(" ").slice(0, max);
}

/** Pull "**Label:** value" lines out of the Polsia Company Brief section. */
export function parseLabelledLines(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /^\s*[-*]?\s*\*\*([^*:]+):\*\*\s*(.+?)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

/** Extract the paste-ready ```text block from the brief section, if present. */
export function extractTextBlock(body: string): string {
  const m = body.match(/```(?:text)?\s*\n([\s\S]*?)\n```/);
  return m ? m[1].trim() : "";
}

/** Parse "$29/mo", "$490", "$1,200 per month" style prices from revenue math. */
export function extractPricingPlans(text: string): PolsiaPricingPlan[] {
  const plans: PolsiaPricingPlan[] = [];
  const seen = new Set<number>();
  const re = /(?:([A-Z][A-Za-z+ ]{2,30}?)\s*(?:tier|plan|package)?\s*[:@–-]?\s*)?\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)(?:\s*(?:\/|per)\s*(?:mo|month|user|seat))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && plans.length < 4) {
    const price = Number(m[2].replace(/,/g, ""));
    if (!Number.isFinite(price) || price <= 0 || price > 5000 || seen.has(price)) continue;
    seen.add(price);
    const label = (m[1] || "").trim();
    plans.push({ name: label && !/^(the|a|an|at|for|to|of)$/i.test(label) ? label : `Plan ${plans.length + 1}`, price });
  }
  return plans;
}

/** Parse the "Agent | Job | Metric" table into an agent_plan map. */
export function parseAgentPlanTable(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const rows = body.split("\n").filter((l) => l.trim().startsWith("|"));
  for (const row of rows) {
    const cells = row.split("|").map((c) => c.trim()).filter((c, i, arr) => !(i === 0 && c === "") && !(i === arr.length - 1 && c === ""));
    if (cells.length < 2) continue;
    if (/^-+$/.test(cells[0].replace(/\s/g, "")) || /^agent$/i.test(cells[0])) continue;
    const agentName = cleanMarkdown(cells[0], 60);
    const agent = POLSIA_AGENTS.find((a) => new RegExp(a.name.split(" ")[0], "i").test(agentName));
    const job = cleanMarkdown(cells.slice(1).join(" — "), 400);
    if (agent && job) out[agent.key] = job;
  }
  return out;
}

export function inferProductType(text: string): string {
  const t = text.toLowerCase();
  if (/micro[- ]?saas|saas|subscription software|web app|dashboard|platform/.test(t)) return "SaaS";
  if (/\bapi\b/.test(t)) return "API";
  if (/newsletter|community|membership/.test(t)) return "Membership";
  if (/course|template|ebook|digital product|notion/.test(t)) return "Digital Product";
  if (/marketplace|directory/.test(t)) return "Marketplace";
  if (/automation|workflow|agent/.test(t)) return "Automation Service";
  return "Digital Product";
}

/** Heuristic Polsia-fit score so Mya can flag weak handoffs honestly. */
export function assessPolsiaFit(planText: string): PolsiaFitAssessment {
  const t = planText.toLowerCase();
  const signals: string[] = [];
  const warnings: string[] = [];
  let score = 50;

  const positives: Array<[RegExp, string, number]> = [
    [/stripe|subscription|checkout|self-serve|self serve/, "Self-serve Stripe-style monetisation", 12],
    [/saas|web app|api|digital product|template|newsletter/, "Digital-only product", 12],
    [/cold email|outreach|x\/twitter|twitter|tweet|google ads|meta ads|landing page|seo/, "Acquisition via channels Polsia agents run", 12],
    [/mrr|churn|signups?|active customers|cac/, "Daily-trackable KPIs named", 8],
    [/faq|help ?desk|inbox|support email/, "Async support model", 6],
  ];
  for (const [re, label, pts] of positives) {
    if (re.test(t)) { score += pts; signals.push(label); }
  }

  const negatives: Array<[RegExp, string, number]> = [
    [/in[- ]person|on[- ]site|local (?:business|clients)|door[- ]to[- ]door/, "Depends on in-person or local delivery", 20],
    [/inventory|shipping|dropship|warehouse|physical product/, "Physical fulfilment", 25],
    [/hipaa|medical advice|legal advice|licens(?:e|ed) (?:broker|advisor)|insurance underwriting/, "Regulated vertical — Polsia is not HIPAA/SOC2", 25],
    [/discovery call|sales call|retainer|custom proposal/, "Needs a human closer (calls/proposals)", 12],
    [/done[- ]for[- ]you|agency|consulting hours|billable/, "Founder-hours service model", 12],
  ];
  for (const [re, label, pts] of negatives) {
    if (re.test(t)) { score -= pts; warnings.push(label); }
  }

  return { score: Math.max(0, Math.min(100, score)), signals, warnings };
}

export interface BuildBriefOptions {
  websiteUrl?: string;
  githubRepo?: string;
  monthlyTargetUsd?: number;
}

/**
 * Deterministically map a parsed Mya Business Plan into a Polsia CompanyConfig
 * brief. Prefers the explicit "🧾 Polsia Company Brief" section when the plan
 * was generated in Polsia-ready mode; otherwise derives every field from the
 * canonical sections so ANY saved idea can be handed to Polsia.
 */
export function buildPolsiaCompanyBrief(
  plan: ParsedBusinessPlan,
  rawPlanText: string,
  opts: BuildBriefOptions = {},
): PolsiaCompanyBrief {
  const target = opts.monthlyTargetUsd ?? 10000;
  const title = plan.title.replace(/^💡\s*/, "").replace(/\*+/g, "").trim() || "Untitled Company";

  const niche = findSection(plan, "niche");
  const audience = findSection(plan, "audience");
  const value = findSection(plan, "value");
  const offering = findSection(plan, "offering");
  const revenue = findSection(plan, "revenue");
  const validation = findSection(plan, "validation");
  const automation = findSection(plan, "automation");
  const agentPlanSection = findSection(plan, "agentPlan");
  const briefSection = findSection(plan, "brief");

  const labelled = parseLabelledLines(briefSection);
  const pick = (label: string, fallback: string) => labelled[label] ? cleanMarkdown(labelled[label]) : fallback;

  const description = pick("description", firstSentences(offering || niche, 3));
  const value_prop = pick("value prop", firstSentences(value, 2));
  const target_market = pick("target market", firstSentences(audience, 3));
  const industry = pick("industry", cleanMarkdown(niche.split(/[.\n]/)[0] || "Technology", 100));
  const product_type = pick("product type", inferProductType(`${offering} ${description}`));
  const mission = pick("mission", value_prop ? `Help ${cleanMarkdown(target_market.split(/[.,;]/)[0] || "customers", 120)} ${value_prop.charAt(0).toLowerCase()}${value_prop.slice(1)}`.slice(0, 300) : `Build ${title} into a profitable, self-running online business.`);
  const vision = pick("vision", `Reach $${target.toLocaleString()}/month in net profit within 12 months by letting Polsia's agent fleet run acquisition, support and shipping while the founder steers strategy.`);

  let plans = extractPricingPlans(labelled["pricing model"] || "");
  if (plans.length === 0) plans = extractPricingPlans(revenue);
  if (plans.length === 0) plans = [{ name: "Starter", price: 49 }];

  const goals30 = labelled["30-day goals"]
    ? labelled["30-day goals"].split(/;|\s\|\s|(?<=\.)\s+/).map((g) => cleanMarkdown(g, 160)).filter(Boolean).slice(0, 5)
    : firstSentences(validation, 4, 800).split(/(?<=[.!?])\s+/).map((g) => g.trim()).filter(Boolean).slice(0, 4);
  const goals: Record<string, string[]> = {
    first_30_days: goals30.length ? goals30 : ["Launch landing page + Stripe checkout", "Send 200 cold emails", "Get 3 paying customers"],
    first_90_days: [`Reach $${Math.round(target / 4).toLocaleString()} MRR`, "Ship v2 based on customer feedback", "Scale the best-performing acquisition channel"],
    twelve_months: [`Hit $${target.toLocaleString()}/month net profit`],
  };

  const kpis: Record<string, number> = {
    mrr_usd: 0,
    active_customers: 0,
    churn_rate: 0,
    cac_usd: 0,
    ltv_usd: 0,
    nps: 0,
    target_mrr_usd: target,
  };

  const agent_plan = parseAgentPlanTable(agentPlanSection);
  if (Object.keys(agent_plan).length === 0 && automation) {
    // Fall back: give every agent a generic job derived from the automation strategy.
    const summary = firstSentences(automation, 2, 240);
    for (const a of POLSIA_AGENTS) agent_plan[a.key] = `${a.responsibility}. Context: ${summary}`;
  }

  const onboarding_prompt = extractTextBlock(briefSection) ||
    [
      `${title} is a ${product_type.toLowerCase()} for ${target_market || "an underserved online niche"}.`,
      value_prop ? `It ${value_prop.charAt(0).toLowerCase()}${value_prop.slice(1)}` : "",
      description ? `The product: ${description}` : "",
      `Pricing: ${plans.map((p) => `${p.name} $${p.price}/mo`).join(", ")}.`,
      `Acquisition runs through cold email, X/Twitter content and paid ads; support is handled asynchronously by email.`,
      `Goal: $${target.toLocaleString()}/month net profit. First 30 days: ${goals.first_30_days.join("; ")}.`,
    ].filter(Boolean).join(" ");

  return {
    name: title,
    mission,
    vision,
    description,
    target_market,
    value_prop,
    pricing_model: { plans },
    goals,
    kpis,
    product_type,
    industry,
    website_url: opts.websiteUrl || "",
    github_repo: opts.githubRepo || "",
    agent_plan,
    onboarding_prompt,
    fit: assessPolsiaFit(rawPlanText),
    source: "mya-business-plan",
  };
}
