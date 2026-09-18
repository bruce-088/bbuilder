/**
 * Polsia handoff helpers (browser side).
 *
 * Polsia (https://polsia.com) is an autonomous "AI runs your company" platform.
 * bbuilder/Mya picks and validates the idea; Polsia's agent fleet builds,
 * markets and operates it. These helpers turn a saved Business Idea into a
 * Polsia CompanyConfig brief the founder can paste into polsia.com/new.
 *
 * Server-side equivalent (used by Mya's `export_polsia_company_brief` tool):
 * supabase/functions/_shared/polsia.ts
 */

import type { Json } from "@/integrations/supabase/types";

export const POLSIA_URL = "https://polsia.com";
export const POLSIA_NEW_COMPANY_URL = "https://polsia.com/new";

export const POLSIA_AGENT_KEYS = [
  "orchestrator",
  "business_planning",
  "competitor_research",
  "social_media",
  "email_outreach",
  "customer_support",
  "ads_management",
  "code_generation",
  "finance",
  "deployment",
] as const;

export type PolsiaAgentKey = (typeof POLSIA_AGENT_KEYS)[number];

export const POLSIA_AGENT_LABELS: Record<PolsiaAgentKey, string> = {
  orchestrator: "Orchestrator",
  business_planning: "Business Planning",
  competitor_research: "Competitor Research",
  social_media: "Social Media",
  email_outreach: "Email Outreach",
  customer_support: "Customer Support",
  ads_management: "Ads Management",
  code_generation: "Code Generation",
  finance: "Finance",
  deployment: "Deployment",
};

export interface PolsiaPricingPlan {
  name: string;
  price: number;
}

export interface PolsiaFitAssessment {
  score: number;
  signals: string[];
  warnings: string[];
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
  agent_plan: Partial<Record<PolsiaAgentKey, string>>;
  onboarding_prompt: string;
  fit: PolsiaFitAssessment;
  source: "bbuilder-saved-idea" | "mya-business-plan";
}

/** Minimal shape shared by BusinessIdeaDialog / Dashboard rows. */
export interface SavedIdeaLike {
  business_name: string;
  niche: string | null;
  target_audience: string | null;
  value_proposition: string | null;
  service_offering: string | null;
  revenue_math: string | null;
  validation_path: string | null;
  ai_automation_strategy: Json | null;
}

const clean = (text: string | null | undefined, max = 600): string =>
  (text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^[\s>*-]+/gm, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const sentences = (text: string | null | undefined, n: number, max = 400): string =>
  clean(text, 2000)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, n)
    .join(" ")
    .slice(0, max);

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
    plans.push({
      name: label && !/^(the|a|an|at|for|to|of)$/i.test(label) ? label : `Plan ${plans.length + 1}`,
      price,
    });
  }
  return plans;
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

/** Heuristic 0–100 score for how well an idea fits Polsia's agent fleet. */
export function assessPolsiaFit(text: string): PolsiaFitAssessment {
  const t = text.toLowerCase();
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
    if (re.test(t)) {
      score += pts;
      signals.push(label);
    }
  }

  const negatives: Array<[RegExp, string, number]> = [
    [/in[- ]person|on[- ]site|local (?:business|clients)|door[- ]to[- ]door/, "Depends on in-person or local delivery", 20],
    [/inventory|shipping|dropship|warehouse|physical product/, "Physical fulfilment", 25],
    [/hipaa|medical advice|legal advice|licens(?:e|ed) (?:broker|advisor)|insurance underwriting/, "Regulated vertical — Polsia is not HIPAA/SOC2", 25],
    [/discovery call|sales call|retainer|custom proposal/, "Needs a human closer (calls/proposals)", 12],
    [/done[- ]for[- ]you|agency|consulting hours|billable/, "Founder-hours service model", 12],
  ];
  for (const [re, label, pts] of negatives) {
    if (re.test(t)) {
      score -= pts;
      warnings.push(label);
    }
  }

  return { score: Math.max(0, Math.min(100, score)), signals, warnings };
}

const automationSummary = (strategy: Json | null): string => {
  if (!strategy) return "";
  if (typeof strategy === "string") return strategy;
  if (typeof strategy === "object" && strategy !== null && "summary" in strategy) {
    const s = (strategy as Record<string, unknown>).summary;
    return typeof s === "string" ? s : "";
  }
  return "";
};

/** Build a Polsia CompanyConfig brief from a saved bbuilder Business Idea. */
export function buildPolsiaBriefFromIdea(
  idea: SavedIdeaLike,
  opts: { monthlyTargetUsd?: number; websiteUrl?: string; githubRepo?: string } = {},
): PolsiaCompanyBrief {
  const target = opts.monthlyTargetUsd ?? 10000;
  const name = clean(idea.business_name, 120) || "Untitled Company";
  const description = sentences(idea.service_offering || idea.niche, 3);
  const value_prop = sentences(idea.value_proposition, 2);
  const target_market = sentences(idea.target_audience, 3);
  const industry = clean((idea.niche || "Technology").split(/[.\n]/)[0], 100);
  const product_type = inferProductType(`${idea.service_offering || ""} ${description}`);
  const automation = automationSummary(idea.ai_automation_strategy);

  let plans = extractPricingPlans(idea.revenue_math || "");
  if (plans.length === 0) plans = [{ name: "Starter", price: 49 }];

  const goals30 = sentences(idea.validation_path, 4, 800)
    .split(/(?<=[.!?])\s+/)
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 4);

  const goals: Record<string, string[]> = {
    first_30_days: goals30.length
      ? goals30
      : ["Launch landing page + Stripe checkout", "Send 200 cold emails", "Get 3 paying customers"],
    first_90_days: [
      `Reach $${Math.round(target / 4).toLocaleString()} MRR`,
      "Ship v2 based on customer feedback",
      "Scale the best-performing acquisition channel",
    ],
    twelve_months: [`Hit $${target.toLocaleString()}/month net profit`],
  };

  const agent_plan: Partial<Record<PolsiaAgentKey, string>> = {
    orchestrator: `Plan each day around the first_30_days goals for ${name}; report signups, MRR and blockers every evening.`,
    business_planning: `Track progress toward $${target.toLocaleString()}/mo; recommend pricing or positioning changes weekly.`,
    competitor_research: `Monitor alternatives serving ${clean(target_market.split(/[.,;]/)[0], 80) || "the same audience"} and surface differentiation angles.`,
    social_media: `Post daily on X about the pain ${name} solves for ${clean(target_market.split(/[.,;]/)[0], 80) || "its customers"}; reply to mentions.`,
    email_outreach: `Build a prospect list of ${clean(target_market.split(/[.,;]/)[0], 80) || "ideal customers"} and run a 3-step cold sequence to the landing page.`,
    customer_support: "Answer inbound questions from a FAQ; escalate refund or scope requests to the founder.",
    ads_management: `Test small Google/Meta campaigns on the core value prop: ${clean(value_prop.split(/[.;]/)[0], 100) || name}.`,
    code_generation: `Ship the MVP described in the offering: ${clean(description.split(/[.;]/)[0], 120)}; then iterate on customer feedback.`,
    finance: "Sync Stripe daily; track MRR, churn, CAC and ad spend against the target.",
    deployment: "Provision domain, landing page and hosting; deploy every merged PR.",
  };
  if (automation) {
    agent_plan.orchestrator += ` Automation context from Mya: ${clean(automation, 200)}`;
  }

  const onboarding_prompt = [
    `${name} is a ${product_type.toLowerCase()} for ${target_market || "an underserved online niche"}.`,
    value_prop ? `It ${value_prop.charAt(0).toLowerCase()}${value_prop.slice(1)}` : "",
    description ? `The product: ${description}` : "",
    `Pricing: ${plans.map((p) => `${p.name} $${p.price}/mo`).join(", ")}.`,
    "Acquisition runs through cold email, X/Twitter content and paid ads; support is handled asynchronously by email.",
    `Goal: $${target.toLocaleString()}/month net profit. First 30 days: ${goals.first_30_days.join("; ")}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const fitText = [
    idea.niche,
    idea.target_audience,
    idea.value_proposition,
    idea.service_offering,
    idea.revenue_math,
    idea.validation_path,
    automation,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    name,
    mission: value_prop
      ? `Help ${clean(target_market.split(/[.,;]/)[0], 120) || "customers"} ${value_prop.charAt(0).toLowerCase()}${value_prop.slice(1)}`.slice(0, 300)
      : `Build ${name} into a profitable, self-running online business.`,
    vision: `Reach $${target.toLocaleString()}/month in net profit within 12 months by letting Polsia's agent fleet run acquisition, support and shipping while the founder steers strategy.`,
    description,
    target_market,
    value_prop,
    pricing_model: { plans },
    goals,
    kpis: {
      mrr_usd: 0,
      active_customers: 0,
      churn_rate: 0,
      cac_usd: 0,
      ltv_usd: 0,
      nps: 0,
      target_mrr_usd: target,
    },
    product_type,
    industry,
    website_url: opts.websiteUrl || "",
    github_repo: opts.githubRepo || "",
    agent_plan,
    onboarding_prompt,
    fit: assessPolsiaFit(fitText),
    source: "bbuilder-saved-idea",
  };
}

export function polsiaBriefFilename(brief: { name: string }): string {
  const slug = brief.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `polsia-company-${slug || "brief"}.json`;
}

/** Trigger a browser download of the brief as JSON. Returns the filename. */
export function downloadPolsiaBrief(brief: PolsiaCompanyBrief, filename = polsiaBriefFilename(brief)): string {
  const blob = new Blob([JSON.stringify(brief, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

export async function copyPolsiaOnboardingPrompt(brief: PolsiaCompanyBrief): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(brief.onboarding_prompt);
    return true;
  } catch {
    return false;
  }
}

export function fitLabel(score: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (score >= 75) return { label: "Polsia-ready", tone: "good" };
  if (score >= 50) return { label: "Needs reshaping", tone: "warn" };
  return { label: "Not a Polsia fit yet", tone: "bad" };
}
