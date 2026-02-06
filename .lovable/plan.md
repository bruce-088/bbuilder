

# Make Mya More Practical

## The Problem

Right now, Mya has a lot of motivational framing (XP, quests, achievements, momentum flames) but the app could feel more practical for users who want to actually run a business, not play a game. Key gaps:

1. **No quick access to key pages from the nav** -- Leads, Workflows, and the Setup Guide are buried or scattered
2. **Dashboard is heavy on gamification, light on business metrics** -- XP and achievements dominate, but practical data like "leads in pipeline," "revenue this month," and "next follow-up due" are secondary
3. **The Setup Guide steps are generic** -- they tell you to "Sign up for Apollo.io" but don't connect to anything inside the app (e.g., the built-in CRM, the built-in workflow builder)
4. **No daily action items** -- the Daily Briefing is AI-generated text but doesn't link to specific actionable tasks with buttons
5. **Chat is the main "doing" interface but there's no shortcut to common business actions** -- users have to know what to type

## What Changes

### 1. Add a Persistent Navigation Sidebar (or Top Nav Links)

Add direct links in the dashboard nav bar for the core business tools:
- **Leads** (links to /leads)
- **Workflows** (links to /workflows) -- already exists but only as a small button
- **Chat with Mya** (links to new chat)

This makes the practical tools one click away instead of buried.

**File**: `src/pages/Dashboard.tsx`
- Add "Leads" button next to existing "Workflows" button in the nav bar (lines 770-783)

### 2. Add a "Quick Actions" Row with Business-Specific Shortcuts

Replace or augment the current Quick Actions grid (lines 980-1030) with practical, context-aware shortcuts:
- **"Add a Lead"** -- opens the Add Lead dialog directly
- **"Log Revenue"** -- navigates to chat with a pre-filled prompt
- **"Send Follow-up"** -- navigates to chat with a pre-filled outreach prompt
- **"Check Pipeline"** -- navigates to /leads

These are the 4 most common actions a solopreneur takes daily.

**File**: `src/pages/Dashboard.tsx`
- Modify the Quick Actions section (around line 980) to include these practical shortcuts

### 3. Make Setup Guide Steps Reference Built-In Tools

Update the Interactive Course steps to reference the app's own capabilities instead of only external tools. For example:
- "Import leads into your CRM" should say "Import leads into **Mya's Lead Tracker** (go to Leads page)" with a button that navigates to /leads
- "Build and test each workflow" should reference the built-in Workflow Editor

Add an `inAppAction` optional field to `CourseStep` that provides a route or callback, so steps can link directly to the relevant in-app feature.

**Files**:
- `src/components/SetupGuide/CourseStepView.tsx` -- add an optional `inAppAction` prop to render a "Do it now" button that navigates to the relevant page
- `src/components/UnifiedSetupGuide.tsx` -- add `inAppAction` routes to relevant steps (e.g., `/leads` for CRM steps, `/workflows` for automation steps)

### 4. Add an Actionable "Today's Tasks" Card to the Dashboard

Replace or supplement the Daily Briefing with a concrete task list showing:
- Leads that need follow-up (last activity > 3 days ago)
- Upcoming scheduled workflows
- Uncompleted Setup Guide steps (the current one)

Each item has a direct action button ("Follow up", "View Workflow", "Do Step").

**Files**:
- Create `src/components/MissionControl/TodaysTasks.tsx` -- a new card that queries leads needing follow-up and surfaces the next course step
- `src/pages/Dashboard.tsx` -- render `TodaysTasks` above or alongside the Daily Briefing

### 5. Add Quick-Prompt Chips to the Chat Input Area

Below the chat input, show 3-4 contextual action chips based on the user's current state:
- If they have no leads: "Add my first lead"
- If they have leads but no workflows: "Create an outreach workflow"
- If they have revenue: "How's my revenue this month?"
- Default: "Give me a business summary"

These make the chat feel practical rather than open-ended.

**File**: `src/pages/Chat.tsx`
- Add a row of clickable chips below the textarea that pre-fill and send common prompts

---

## Technical Details

### Files Created
1. `src/components/MissionControl/TodaysTasks.tsx` -- New component (~120 lines)
   - Queries `leads` table for leads with no activity in 3+ days
   - Shows the user's current Setup Guide step from `useManualProgress`
   - Renders a compact card with up to 5 actionable items, each with a button

### Files Modified
1. **`src/pages/Dashboard.tsx`**
   - Add "Leads" nav button (line ~771)
   - Import and render `TodaysTasks` component in the dashboard layout
   - Update Quick Actions section with practical shortcuts (Add Lead, Log Revenue, Follow Up, Check Pipeline)

2. **`src/components/SetupGuide/CourseStepView.tsx`**
   - Add optional `inAppAction?: { label: string; route: string }` to `CourseStep` interface
   - Render a "Do it in Mya" button when `inAppAction` is present, using `useNavigate`

3. **`src/components/UnifiedSetupGuide.tsx`**
   - Add `inAppAction` to relevant steps:
     - Lead Gen step 5 ("Import leads into your CRM") -> `{ label: "Open Lead Tracker", route: "/leads" }`
     - Pipeline steps -> `{ label: "Open Lead Tracker", route: "/leads" }`
     - Automation steps -> `{ label: "Open Workflow Builder", route: "/workflows" }`
   
4. **`src/pages/Chat.tsx`**
   - Add a row of contextual quick-prompt chips below the input area
   - Chips are conditionally rendered based on lead count, workflow count, and revenue data

5. **`src/components/MissionControl/index.ts`**
   - Export the new `TodaysTasks` component

### No New Dependencies
All changes use existing UI components (Button, Card, Badge) and existing hooks (useLeadManagement, useManualProgress).

