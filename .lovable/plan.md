

# Unified Progress Dashboard

Add a new card to the Dashboard that shows **Quick Start Checklist milestones** (the 5 business milestones from `ProgressIndicator`) and **Setup Guide completion** (the 7 capability areas from `UnifiedSetupGuide`) side by side in a single, scannable view.

---

## New Component

**File: `src/components/MissionControl/UnifiedProgressCard.tsx`** (~120 lines)

A `Card` with two columns (stacked on mobile):

### Left Column -- "Business Milestones" (Quick Start Checklist)
- Shows the 5 milestone dots from `MILESTONE_KEYS` (Validation, Landing Page, Offer, Outreach, First Sale)
- Each milestone shows a check icon when complete, muted circle when incomplete
- Data source: the active quest's `completedSteps` array (already available in Dashboard as `businessIdeasWithProgress`)
- Bottom: "X of 5 milestones complete" summary text

### Right Column -- "Setup Guide Progress" (7 Capability Areas)
- Lists the 7 capability areas (Lead Gen, Pipeline, Outreach, Qualification, Proposals, Automation, Analytics)
- Each shows: icon, title, and a small progress bar or "3/5 steps" label
- Data source: `useManualProgress(capabilities)` hook -- call `getCompleted(capId, totalSteps)` for each area
- Bottom: overall progress percentage from `getOverallProgress()`

### Header
- Title: "Your Progress"
- A combined progress bar showing weighted overall completion (milestones + guide steps)
- A "Open Setup Guide" button that triggers `onOpenSetupGuide`

### Props
```typescript
interface UnifiedProgressCardProps {
  completedMilestones: string[];  // from active quest's completedSteps
  capabilities: CapabilityArea[]; // the 7 capability areas (imported from UnifiedSetupGuide or passed in)
  onOpenSetupGuide: () => void;
}
```

The component will internally call `useManualProgress(capabilities)` to get per-area completion data.

---

## Integration Changes

### `src/components/MissionControl/index.ts`
- Export `UnifiedProgressCard`

### `src/pages/Dashboard.tsx` (~line 816-825)
- Import `UnifiedProgressCard`
- Render it after `TodaysTasks` and before "Mission Control Header"
- Pass:
  - `completedMilestones`: active quest's `completedSteps` (or first idea's)
  - `capabilities`: import the capabilities array from `UnifiedSetupGuide` (needs exporting)
  - `onOpenSetupGuide`: existing `() => setShowSetupGuide(true)`

### `src/components/UnifiedSetupGuide.tsx`
- Export the `capabilities` array (currently a `const` inside the file, not exported) and the `CapabilityArea` interface so the progress card can reference it

---

## Visual Layout

```text
+--------------------------------------------------+
| Your Progress                   [Open Setup Guide]|
| ================================================  |  <- combined bar
|                                                    |
|  Business Milestones     |  Setup Guide            |
|  ----------------------  |  ---------------------- |
|  [x] Validation          |  Lead Gen      ===- 3/5 |
|  [ ] Landing Page        |  Pipeline      ==-- 2/5 |
|  [ ] Offer               |  Outreach      ---- 0/5 |
|  [ ] Outreach            |  Qualification ---- 0/5 |
|  [ ] First Sale          |  Proposals     ---- 0/5 |
|                          |  Automation    =--- 1/6 |
|  1 of 5 complete         |  Analytics     ---- 0/5 |
|                          |  4/35 overall           |
+--------------------------------------------------+
```

---

## Technical Details

- The `capabilities` array and `CapabilityArea` type will be exported from `UnifiedSetupGuide.tsx` with a simple `export` keyword addition
- `useManualProgress` is called inside the new component with the imported capabilities, reusing the existing localStorage + DB persistence
- No new database tables or migrations needed
- No new dependencies required
- The MILESTONE_KEYS mapping is imported from `ProgressIndicator.tsx` (or duplicated as a small constant)

