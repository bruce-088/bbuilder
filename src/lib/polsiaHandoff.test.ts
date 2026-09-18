import { describe, expect, it } from "vitest";
import {
  assessPolsiaFit,
  buildPolsiaBriefFromIdea,
  extractPricingPlans,
  fitLabel,
  inferProductType,
  polsiaBriefFilename,
  POLSIA_AGENT_KEYS,
  type SavedIdeaLike,
} from "./polsiaHandoff";

const idea: SavedIdeaLike = {
  business_name: "InboxZero for Dentists",
  niche: "Dental practice marketing SaaS",
  target_audience:
    "Solo dental practices in the US with 1-3 chairs. They lose patients to missed follow-ups.",
  value_proposition:
    "Recover lost patients with an automated recall sequence in 10 minutes of setup.",
  service_offering:
    "A web app that connects to the practice inbox and sends recall sequences. Sold as a self-serve subscription via Stripe checkout.",
  revenue_math:
    "Starter plan: $49/mo. Growth plan: $149/mo. 60 practices on Growth plus 30 on Starter = $10,410 MRR. Track churn and signups weekly.",
  validation_path:
    "Week 1: launch landing page and run cold email outreach to 200 practices. Week 2: post daily on X/Twitter. Week 3: first 10 paying signups.",
  ai_automation_strategy: { summary: "n8n workflows handle inbox parsing and follow-up emails." },
};

describe("extractPricingPlans", () => {
  it("pulls named tiers and prices out of revenue math", () => {
    const plans = extractPricingPlans(idea.revenue_math || "");
    expect(plans.length).toBeGreaterThanOrEqual(2);
    expect(plans.map((p) => p.price)).toEqual(expect.arrayContaining([49, 149]));
  });

  it("returns an empty list when no prices are present", () => {
    expect(extractPricingPlans("No pricing decided yet")).toEqual([]);
  });
});

describe("assessPolsiaFit", () => {
  it("scores digital, self-serve, channel-driven ideas highly", () => {
    const fit = assessPolsiaFit(
      `${idea.service_offering} ${idea.revenue_math} ${idea.validation_path}`,
    );
    expect(fit.score).toBeGreaterThanOrEqual(70);
    expect(fit.warnings).toHaveLength(0);
    expect(fit.signals.length).toBeGreaterThan(0);
  });

  it("penalises physical, in-person and regulated models", () => {
    const fit = assessPolsiaFit(
      "A dropship store with inventory and warehouse shipping, plus in-person consulting hours and HIPAA medical advice.",
    );
    expect(fit.score).toBeLessThan(40);
    expect(fit.warnings.length).toBeGreaterThanOrEqual(3);
  });

  it("clamps the score between 0 and 100", () => {
    const low = assessPolsiaFit(
      "inventory shipping warehouse in-person local business hipaa discovery call retainer agency billable done-for-you",
    );
    expect(low.score).toBeGreaterThanOrEqual(0);
    expect(low.score).toBeLessThanOrEqual(100);
  });
});

describe("buildPolsiaBriefFromIdea", () => {
  const brief = buildPolsiaBriefFromIdea(idea);

  it("maps the saved idea onto Polsia CompanyConfig fields", () => {
    expect(brief.name).toBe("InboxZero for Dentists");
    expect(brief.description.length).toBeGreaterThan(10);
    expect(brief.target_market).toContain("dental");
    expect(brief.value_prop).toContain("Recover lost patients");
    expect(brief.industry).toBe("Dental practice marketing SaaS");
    expect(brief.source).toBe("bbuilder-saved-idea");
  });

  it("carries pricing plans through", () => {
    expect(brief.pricing_model.plans.map((p) => p.price)).toEqual(
      expect.arrayContaining([49, 149]),
    );
  });

  it("falls back to a Starter plan when no pricing is found", () => {
    const b = buildPolsiaBriefFromIdea({ ...idea, revenue_math: null });
    expect(b.pricing_model.plans).toEqual([{ name: "Starter", price: 49 }]);
  });

  it("produces an agent plan using only known Polsia agent keys", () => {
    const keys = Object.keys(brief.agent_plan);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      expect(POLSIA_AGENT_KEYS).toContain(k);
    }
  });

  it("generates a non-empty onboarding prompt mentioning the company", () => {
    expect(brief.onboarding_prompt).toContain("InboxZero for Dentists");
    expect(brief.onboarding_prompt.length).toBeGreaterThan(100);
  });

  it("includes a fit assessment and KPIs", () => {
    expect(brief.fit.score).toBeGreaterThanOrEqual(0);
    expect(brief.fit.score).toBeLessThanOrEqual(100);
    expect(Object.keys(brief.kpis).length).toBeGreaterThan(0);
  });

  it("handles an almost-empty idea without throwing", () => {
    const b = buildPolsiaBriefFromIdea({
      business_name: "",
      niche: null,
      target_audience: null,
      value_proposition: null,
      service_offering: null,
      revenue_math: null,
      validation_path: null,
      ai_automation_strategy: null,
    });
    expect(b.name).toBe("Untitled Company");
    expect(b.pricing_model.plans.length).toBe(1);
    expect(typeof b.onboarding_prompt).toBe("string");
  });
});

describe("helpers", () => {
  it("infers a product type", () => {
    expect(typeof inferProductType("A SaaS web app with an API")).toBe("string");
  });

  it("labels fit scores", () => {
    expect(fitLabel(85).tone).toBe("good");
    expect(fitLabel(20).tone).toBe("bad");
  });

  it("builds a safe filename", () => {
    const f = polsiaBriefFilename({ name: "Inbox Zero / Dentists!" });
    expect(f).toMatch(/\.json$/);
    expect(f).not.toMatch(/[/!\s]/);
  });
});
