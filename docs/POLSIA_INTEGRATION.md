# bbuilder ⇄ Polsia — closing the loop

This document explains how bbuilder's AI agent **Mya** now understands
[Polsia](https://polsia.com) and how a generated $10K/mo idea travels from
bbuilder into a Polsia company.

## What Polsia is (as understood by Mya)

Polsia is an "AI that runs your company while you sleep" platform. A founder
creates a company at `polsia.com/new` (from scratch or from an existing
business) and a set of autonomous agents runs it continuously:

| Agent | What it does | Cadence (OSS reference) |
| --- | --- | --- |
| `orchestrator` | Plans and dispatches work to the other agents | continuous |
| `business_planning` | Roadmap, positioning, priorities | daily |
| `competitor_research` | Tracks competitors & market shifts | daily |
| `code_generation` | Ships product code (Claude Code CLI) | on demand |
| `deployment` | Deploys the product | on demand |
| `social_media` | Posts/replies on X/Twitter | ~2h |
| `email_outreach` | Cold email campaigns | ~3h |
| `customer_support` | Replies to inbound customer email | ~3h |
| `ads_management` | Runs Google/Meta ads | ~6h |
| `finance` | Stripe revenue, costs, KPIs | ~6h |

A Polsia company is described by a `CompanyConfig` record:
`name, mission, vision, description, target_market, value_prop,
pricing_model{plans[]}, goals, kpis, website_url, github_repo, product_type,
industry`.

Public positioning, pricing and traction figures were derived from
polsia.com, the open-source Polsia repos and public coverage at the time of
writing and may drift. The knowledge lives in one place:
`supabase/functions/_shared/polsia.ts` (`POLSIA_AGENTS`,
`POLSIA_INTEGRATIONS`, `POLSIA_COMPANY_CONFIG_FIELDS`, `POLSIA_FIT_RULES`,
`POLSIA_ANTI_PATTERNS`). Update that file when Polsia changes.

## The loop

```
Dashboard  ──"Who will run it?" → Polsia-ready──►  /chat/:id?generate=true&platform=polsia
    │
    ▼
Mya (edge fn `chat`, type=generate_ideas, platform="polsia")
    • canonical business-plan schema (unchanged, so saving/parsing still works)
    • + "## 🏢 Polsia Agent Plan"   – which Polsia agent owns each workstream
    • + "## 🧾 Polsia Company Brief" – CompanyConfig-shaped bullets + onboarding text
    │
    ▼
Handoff
    • Mya tool `export_polsia_company_brief` → CopilotActionCard with fit score,
      "Download JSON", "Copy onboarding text", "Open polsia.com/new"
    • Saved idea → BusinessIdeaDialog "Send to Polsia (autonomous agents)"
      (and "Polsia Company Brief (JSON)" in the download menu)
    │
    ▼
polsia.com/new  →  paste onboarding text / use the JSON to fill CompanyConfig
```

### 1. Polsia-ready generation mode

* `Dashboard.tsx` – the industry dialog gained a **Who will run it?** toggle:
  *You + n8n* (default, unchanged behaviour) or *Polsia-ready*.
  Choosing Polsia-ready adds `&platform=polsia` to the chat URL.
* `Chat.tsx` – reads `platform` from the query string, appends a short
  "make it Polsia-ready" sentence to the visible user message and passes
  `platform` to `streamChat`.
* `src/lib/ai.ts` – `StreamChatOptions.platform?: "standalone" | "polsia"`
  is sent in the request body.
* `supabase/functions/chat/index.ts`
  * `ChatRequestSchema` accepts `platform`.
  * When `platform === "polsia"` the `generate_ideas` prompt is
    `GENERATE_IDEAS_PROMPT + POLSIA_IDEA_ADDENDUM`. The addendum instructs Mya
    to only propose ideas that Polsia agents can run end-to-end (digital,
    self-serve Stripe monetisation, X/email/ads acquisition, async support,
    daily-trackable KPIs) and to avoid anti-patterns (physical fulfilment,
    in-person delivery, regulated verticals, human sales calls, agency
    hours).
  * The two new sections are appended **after** the canonical schema so the
    regex parser in `Chat.tsx` (`parseBusinessIdea`) and
    `_shared/parseBusinessPlanMarkdown.ts` keep working.

### 2. Mya knows Polsia in every conversation

`SYSTEM_PROMPT` now includes a **POLSIA HANDOFF SUPER-SKILL** section built
from `buildPolsiaKnowledgeBlock()` — agents, integrations, config fields, fit
rules and anti-patterns — so Mya can answer "would this run on Polsia?",
re-shape an existing idea, or export a brief on request.

### 3. `export_polsia_company_brief` tool (server)

Tool #23 in the `chat` edge function. It finds the latest business plan in
the conversation (`findLatestPlanInMessages`), runs
`buildPolsiaCompanyBrief()` and returns:

```json
{
  "client_action": "download_polsia_brief",
  "filename": "polsia-company-<slug>.json",
  "brief": { "...CompanyConfig fields...", "agent_plan": {}, "onboarding_prompt": "", "fit": { "score": 0, "signals": [], "warnings": [] } },
  "polsia_new_url": "https://polsia.com/new",
  "next_steps": ["..."]
}
```

`buildPolsiaCompanyBrief` is deterministic (no extra LLM call): it prefers the
explicit "🧾 Polsia Company Brief" section when present and otherwise derives
fields from the canonical sections. `assessPolsiaFit` gives a 0–100 heuristic
score with positive signals and warnings.

### 4. Client-side handoff (`src/lib/polsiaHandoff.ts`)

Browser twin of the server helper so **already-saved ideas** (rows in
`business_ideas`) can be exported without another round-trip:

* `buildPolsiaBriefFromIdea(savedIdea)` → `PolsiaCompanyBrief`
* `downloadPolsiaBrief`, `copyPolsiaOnboardingPrompt`, `fitLabel`
* `assessPolsiaFit`, `extractPricingPlans`, `inferProductType`

Used by `CopilotActionCard.tsx` (renders the tool result) and
`BusinessIdeaDialog.tsx` (Send to Polsia button + JSON download item).

Tests: `src/lib/polsiaHandoff.test.ts` (vitest).

## Files touched

| File | Change |
| --- | --- |
| `supabase/functions/_shared/polsia.ts` | **new** – Polsia knowledge, prompt addendum, brief builder, fit scoring |
| `supabase/functions/chat/index.ts` | `platform` in schema, Polsia super-skill in system prompt, `export_polsia_company_brief` tool + executor, Polsia addendum in `generate_ideas` |
| `src/lib/polsiaHandoff.ts` | **new** – browser brief builder / download / copy helpers |
| `src/lib/polsiaHandoff.test.ts` | **new** – unit tests |
| `src/lib/ai.ts` | `platform` option forwarded to the edge function |
| `src/pages/Dashboard.tsx` | "Who will run it?" toggle, `&platform=polsia` |
| `src/pages/Chat.tsx` | reads `platform`, passes to `streamChat` |
| `src/components/Chat/CopilotActionCard.tsx` | renders the Polsia brief card |
| `src/components/BusinessIdeaDialog.tsx` | Send to Polsia button, JSON download item |
| `docs/POLSIA_INTEGRATION.md` | this document |

## Deploying

* Frontend changes ship with the normal Lovable/Vite build.
* The `chat` edge function must be **redeployed** (Lovable does this
  automatically on publish; otherwise `supabase functions deploy chat`).
  No database migration is required — no schema changes were made.

## Known limits / next steps

* Polsia has no public API for creating companies, so the handoff is
  copy/paste + JSON download to `polsia.com/new`. If Polsia exposes an API,
  add a `POST` in `export_polsia_company_brief` and a "Create on Polsia"
  button.
* The fit score is a keyword heuristic, not a guarantee the business will
  work on Polsia.
* Polsia facts in `polsia.ts` are a snapshot; review them periodically.
