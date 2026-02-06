

# Make Mya More Practical -- Implementation Plan

This implements all 5 items from the previously approved plan.

---

## 1. Add "Leads" Nav Link to Dashboard

**File: `src/pages/Dashboard.tsx`** (line ~770-774)

Add a "Leads" button between the existing "Workflows" button and "How to Use" button in the nav bar:

```tsx
<Button onClick={() => navigate("/leads")} variant="ghost" size="sm">
  <Users className="w-4 h-4 mr-2" />
  Leads
</Button>
```

Also add `Users` to the lucide-react imports (already imported in UnifiedSetupGuide but needs adding to Dashboard).

---

## 2. Replace Quick Actions with Practical Business Shortcuts

**File: `src/pages/Dashboard.tsx`** (lines ~980-1013)

Replace the current 2-card Quick Actions grid (Chat with Mya + Generate Business Idea) with a 4-card grid:

| Action | Icon | Behavior |
|--------|------|----------|
| Add a Lead | UserPlus | Navigate to `/leads` (the CRM page where AddLeadDialog exists) |
| Log Revenue | DollarSign | Navigate to new chat with pre-filled prompt: "Log revenue for today" |
| Send Follow-up | Mail | Navigate to new chat with pre-filled prompt: "Draft a follow-up email for my warmest lead" |
| Check Pipeline | BarChart3 | Navigate to `/leads` |

Keep the existing "Chat with Mya" and "Generate Business Idea" cards but move them below, or compress the grid to fit all 4 practical actions plus the original 2 in a 3-column layout.

---

## 3. Add `inAppAction` to Setup Guide Steps

**File: `src/components/SetupGuide/CourseStepView.tsx`**

- Add `inAppAction?: { label: string; route: string }` to the `CourseStep` interface
- Import `useNavigate` from react-router-dom
- Render a "Do it in Mya" button (outline variant) next to "Ask Mya" when `inAppAction` is present, which calls `navigate(inAppAction.route)`

**File: `src/components/UnifiedSetupGuide.tsx`**

Add `inAppAction` to these steps:
- Lead Gen step 5 ("Import leads into your CRM") -- `{ label: "Open Lead Tracker", route: "/leads" }`
- Pipeline step 1 ("Set up a CRM account") -- `{ label: "Open Lead Tracker", route: "/leads" }`
- Pipeline step 5 ("Manually move leads between stages") -- `{ label: "Open Lead Tracker", route: "/leads" }`
- Automation step 2 ("Learn the node-based workflow builder") -- `{ label: "Open Workflow Builder", route: "/workflows" }`
- Automation step 5 ("Build and test each workflow") -- `{ label: "Open Workflow Builder", route: "/workflows" }`

---

## 4. Create TodaysTasks Card

**New file: `src/components/MissionControl/TodaysTasks.tsx`** (~100 lines)

A compact card showing up to 5 actionable items:
- Leads needing follow-up (last activity > 3 days ago, queried from `leads` table via `useLeadManagement`)
- The user's current Setup Guide step (from `useManualProgress`)

Each item has a direct action button ("Follow up" navigates to chat, "Do Step" opens setup guide).

Props: `onNavigateToChat: (prompt: string) => void`, `onOpenSetupGuide: () => void`

**File: `src/components/MissionControl/index.ts`** -- add export

**File: `src/pages/Dashboard.tsx`** -- render TodaysTasks above the Daily Briefing section (line ~793), importing and passing the required callbacks.

---

## 5. Add Quick-Prompt Chips to Chat Footer

**File: `src/pages/Chat.tsx`**

Replace the generic starter prompts (lines 984-1003) with context-aware business action chips:
- "Add my first lead"
- "Create an outreach workflow"  
- "How's my revenue this month?"
- "Give me a business summary"

Also add a similar row of chips above the footer textarea (line ~1501) so users always have quick actions visible, even mid-conversation. These will be 3-4 small outline badges that set the input value on click.

---

## Summary of Changes

| File | Action |
|------|--------|
| `src/pages/Dashboard.tsx` | Add Leads nav link, practical Quick Actions, render TodaysTasks |
| `src/components/SetupGuide/CourseStepView.tsx` | Add `inAppAction` to interface + render button |
| `src/components/UnifiedSetupGuide.tsx` | Add `inAppAction` routes to 5 relevant steps |
| `src/components/MissionControl/TodaysTasks.tsx` | **New file** -- actionable task card |
| `src/components/MissionControl/index.ts` | Export TodaysTasks |
| `src/pages/Chat.tsx` | Replace starter prompts with business-action chips, add footer chips |

No new dependencies required.

