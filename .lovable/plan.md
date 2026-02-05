
# Add LeadStatsCard to Dashboard

## Overview

This plan integrates the existing `LeadStatsCard` widget into the Dashboard to show pipeline metrics at a glance, with quick navigation to the full CRM view at `/leads`.

## Current State

The Dashboard has these main sections:
1. Mission Control Header (welcome, quests, timer, XP)
2. Quest List Toggle
3. Quick Actions (2 cards: Chat with Mya, Generate Idea)
4. Recent Content (2 columns: Conversations, Business Plans)

The `LeadStatsCard` component already exists and displays:
- Total leads count, active leads, and won leads
- Pipeline value (when > 0)
- Conversion rate with progress bar (when closed leads exist)
- Stage breakdown badges

## Proposed Changes

### Placement Strategy

Add the LeadStatsCard to the **right column** of the Mission Control Header (alongside timer and XP), as a new widget that appears when users have business ideas. This placement:
- Keeps lead metrics visible at the top of the dashboard
- Groups it with other progress/metrics widgets
- Follows the progressive disclosure pattern (hidden for new users)

### File: `src/pages/Dashboard.tsx`

**Changes:**

1. **Add import** for `LeadStatsCard` and `useLeadManagement`:
   ```typescript
   import { LeadStatsCard } from "@/components/LeadCRM";
   import { useLeadManagement } from "@/hooks/useLeadManagement";
   ```

2. **Add hook usage** inside the component:
   ```typescript
   const { getStats, loading: leadsLoading } = useLeadManagement();
   const leadStats = getStats();
   ```

3. **Add LeadStatsCard widget** in the right column (around line 845, after XPProgress):
   ```tsx
   {businessIdeas.length > 0 && (
     <LeadStatsCard stats={leadStats} loading={leadsLoading} />
   )}
   ```

## Visual Layout After Change

```text
┌─────────────────────────────────────────────────────────────────┐
│                      MISSION CONTROL HEADER                     │
├────────────────────────────────────┬────────────────────────────┤
│  [Welcome / Current Quest]         │  [Countdown Timer]         │
│  [Achievements]                    │  [XP Progress]             │
│                                    │  [Lead Pipeline] ← NEW     │
│                                    │  [What's Next]             │
└────────────────────────────────────┴────────────────────────────┘
```

## Implementation Sequence

1. Add imports for LeadStatsCard and useLeadManagement hook
2. Initialize the hook and get stats
3. Add LeadStatsCard widget in the right column (after XP, before What's Next)
4. Verify the widget only shows when user has business ideas (progressive disclosure)

## Technical Notes

- Uses existing `useLeadManagement` hook which handles data fetching and real-time updates
- `getStats()` calculates all metrics from the cached leads array (no extra API call)
- Follows progressive disclosure pattern - only shows for users with business ideas
- LeadStatsCard includes "View All" button that navigates to `/leads`
