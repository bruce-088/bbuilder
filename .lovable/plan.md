## Goal

Add a persistent "Export Spec" button in the top nav (next to Sign Out) that calls a new edge function which dynamically assembles a Markdown spec of the live app state, then triggers a `.md` download in the browser.

## Implementation

### 1. New edge function — `supabase/functions/generate-spec/index.ts`

- Public (no JWT required), CORS enabled, returns `text/markdown`.
- Uses `SUPABASE_SERVICE_ROLE_KEY` server-side only (never echoed) to introspect:
  - **Tables & columns** via `information_schema.columns` filtered to `public` schema.
  - **Edge functions** — hardcoded registry of names + purpose + trigger (the function knows the project's own deployed set; we can't list them via API without management token, so we maintain a small curated map inside the function).
  - **Cron jobs** via `cron.job` table (workflow-scheduler) when accessible; fall back to "see workflow_schedules table".
  - **Recent changes** — pull last 10 rows from `mission_events` (or `triad_events`) ordered by `created_at desc` as the changelog source. No git access from edge runtime.
- Pulls live URLs from env: `SUPABASE_URL`, `APP_URL` (new optional secret; falls back to request `Origin` header).
- Assembles the 9 sections specified:
  1. App Identity — name "Mya", tagline, tech stack (React 18 + Vite + Tailwind + shadcn, Supabase/Lovable Cloud, Deno edge functions).
  2. Deployment — live URL (Origin / `APP_URL`), Supabase URL, edge base URL `${SUPABASE_URL}/functions/v1`, hosting "Lovable Cloud".
  3. Features list — curated array with status flags.
  4. Database schema — generated from `information_schema`.
  5. Edge functions — curated registry mapped over actual deployed names.
  6. Automation logic — read from `workflow_schedules` (cron expr, next/last run) for the requesting user if `Authorization` header present; otherwise generic description.
  7. API integrations — curated list (Lovable AI Gateway, ElevenLabs, Browserbase, Resend, Perplexity, n8n, Mem0).
  8. Known issues — curated short list maintained in function.
  9. Recent changes — last 10 `mission_events` rows (event_type + created_at). If unauthenticated, show "(sign in to include)".
- **Never** include `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, or any other secret values. Only secret **names** if listed at all (we will not list them).
- Returns the markdown body with `Content-Disposition: attachment; filename="SkyBrief-Spec.md"`.

### 2. Register function config

Add to `supabase/config.toml`:
```toml
[functions.generate-spec]
verify_jwt = false
```

### 3. Frontend — new `ExportSpecButton` component

- File: `src/components/ExportSpecButton.tsx`.
- Small button: `<Download />` icon + "Export Spec", `variant="ghost"`, `size="sm"`.
- On click:
  - `supabase.functions.invoke("generate-spec", { method: "GET" })` — but invoke wraps response, so use `fetch` against `${VITE_SUPABASE_URL}/functions/v1/generate-spec` with `apikey` + (if signed in) `Authorization: Bearer <session.access_token>` so the function can include the user's recent events.
  - Convert response text to a Blob, create object URL, click a hidden `<a download="SkyBrief-Spec.md">`, revoke URL.
  - Toast success / error via sonner.

### 4. Place the button in the top nav

- `src/pages/Dashboard.tsx` — insert `<ExportSpecButton />` immediately before the Sign Out button.
- `src/components/SubPageHeader.tsx` — same insertion so it's persistent on every authenticated page.

### 5. Files touched

- **Create**: `supabase/functions/generate-spec/index.ts`, `src/components/ExportSpecButton.tsx`.
- **Edit**: `supabase/config.toml` (add function block), `src/pages/Dashboard.tsx`, `src/components/SubPageHeader.tsx`.

## Notes / non-goals

- **No git changelog**: edge runtime has no git access. We use `mission_events` as the in-app activity log substitute and label it as such.
- **No new secrets required** to ship. `APP_URL` is optional — if not set, function uses the request's `Origin` header.
- **Spec reflects live state** for: tables/columns, user's schedules, user's recent events, deployed function list (curated but kept in sync). Curated parts (features, integrations, known issues) live in the edge function so updating them is one file change.

## Open question

Want me to also surface the button in a dedicated `/export-spec` page (with PDF/MD/copy options similar to the existing `ExportPrompt` pages)? Default plan: **no** — top-nav button + direct download is simpler and matches the request. Say the word and I'll add the page too.