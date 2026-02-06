
# Make Mya the Most Powerful AI Business System

## Vision
Transform Mya from a business plan generator with workflow tools into an **autonomous AI business operating system** that actively drives revenue, acquires customers, and scales operations -- making the $10K/month goal feel inevitable.

---

## The 5 Power Upgrades (Priority Order)

### 1. Autonomous Workflow Scheduler (Workflows Run Themselves)
Right now workflows only execute when manually triggered. The system needs **scheduled and event-driven execution** so automations run 24/7 without user intervention.

**What changes:**
- Add a `workflow_schedules` table storing cron expressions per workflow
- Create a `workflow-scheduler` edge function invoked by a Supabase cron job (pg_cron) every minute, checking which workflows are due and invoking `workflow-executor`
- Support event triggers: when a lead is added, when a mission event fires, or when a webhook hits -- automatically invoke the right workflow
- Add schedule configuration UI in the WorkflowToolbar (cron picker, enable/disable toggle)

**Why it matters:** Automations that don't run automatically aren't automations. This is the single biggest gap.

---

### 2. Realtime Execution Overlay (See Your Workflows Think)
Users can't see what's happening when a workflow runs. Adding a live execution overlay makes the system feel alive and debuggable.

**What changes:**
- Nodes on the canvas change color in real-time based on execution status (idle/running/success/error) using the existing Supabase Realtime subscription in `useWorkflowExecution`
- Clicking a completed node in the inspector shows its input/output data and execution time
- A live execution log panel slides up from the bottom during runs
- A "replay" mode lets users step through a past execution visually

**Why it matters:** Visibility builds trust. Users who can see their AI agents working are far more likely to rely on and expand them.

---

### 3. AI Business Copilot Mode (Mya Acts, Not Just Advises)
Currently Mya chats and generates plans. The copilot upgrade gives Mya the ability to **take actions** directly: create workflows, add leads, trigger automations, update quest progress -- all from the chat.

**What changes:**
- Upgrade the `chat` edge function with tool-calling capabilities (using the Lovable AI gateway's tool calling)
- Define tools: `create_workflow`, `add_lead`, `run_workflow`, `update_quest`, `query_database`, `send_email`
- When Mya calls a tool, the frontend renders an inline action card showing what was done
- Example: "Hey Mya, set up a lead capture workflow for my coaching business" -- Mya creates the workflow, adds nodes, and returns a link to the editor

**Why it matters:** The gap between advice and action is where most users drop off. Eliminating it makes Mya 10x more valuable.

---

### 4. Revenue Intelligence Dashboard (Track Real Money)
The system tracks quests and XP but not actual revenue. Adding revenue tracking closes the loop on the $10K/month mission.

**What changes:**
- Create a `revenue_entries` table (amount, source, lead_id, date, recurring flag)
- Build a Revenue Dashboard card on the main dashboard with: monthly revenue chart, MRR calculation, revenue by source, projected runway to $10K
- Integrate with Lead CRM: when a lead moves to "Won", prompt for deal value
- Auto-update mission progress and achievements when revenue milestones are hit ($1, $100, $1K, $5K, $10K)
- Add a revenue goal tracker with a visual thermometer showing progress to $10K/month

**Why it matters:** Revenue is the only metric that matters. Tracking it inside the app keeps users focused and motivated.

---

### 5. Smart Workflow Templates with One-Click Deploy
The Template Library exists but templates are static. Making them **context-aware** and deployable in one click supercharges adoption.

**What changes:**
- Templates auto-customize based on the user's saved business idea (inject business name, niche, target audience into node configs)
- One-click deploy creates the workflow, populates all nodes with business-specific data, and opens the editor
- Add an "AI Suggest" button that analyzes the user's current business stage and recommends which template to deploy next
- Track which templates have been deployed and their execution success rates

**Why it matters:** Reduces the workflow builder from a blank canvas problem to a guided, contextualized experience.

---

## Technical Summary

### New database tables
- `workflow_schedules` -- cron expressions, last_run, next_run, enabled flag
- `revenue_entries` -- amount, source, lead_id, date, is_recurring, notes

### New edge functions
- `workflow-scheduler` -- cron-triggered function that checks schedules and invokes executor

### Modified edge functions
- `chat/index.ts` -- add tool-calling support for copilot actions
- `workflow-executor/index.ts` -- accept scheduled trigger context

### Modified frontend files
- `WorkflowToolbar.tsx` -- schedule configuration UI
- `WorkflowEditor.tsx` -- realtime execution overlay on canvas
- `NodeRenderer.tsx` -- execution status coloring
- `NodeInspector.tsx` -- show execution input/output data
- `Dashboard.tsx` -- revenue dashboard card, AI action cards in chat
- `Chat.tsx` -- tool-call rendering for copilot actions
- `Leads.tsx` -- deal value on lead conversion

### Files count
- ~3 new edge functions/tables
- ~8-10 modified files
- ~3-4 new components (RevenueCard, ExecutionOverlay, CopilotActionCard, ScheduleConfig)

---

## Implementation Order
1. **Realtime Execution Overlay** -- builds on existing infrastructure, immediate visual impact
2. **Autonomous Workflow Scheduler** -- makes workflows actually useful
3. **Revenue Intelligence Dashboard** -- closes the mission loop
4. **AI Business Copilot Mode** -- the killer feature
5. **Smart Workflow Templates** -- accelerates adoption

Each upgrade is independent and can be shipped incrementally.
