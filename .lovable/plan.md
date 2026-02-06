

# Declutter the Dashboard

## Current State

The dashboard currently shows **13 distinct sections** stacked vertically, which creates significant scroll depth and visual overload:

1. Daily Briefing (banner)
2. Today's Tasks
3. Mission HQ (tabbed card -- Quest / Progress / Quest Line)
4. Achievement Badges
5. Countdown Timer (right column)
6. XP Progress + Momentum Card (right column)
7. Lead Stats Card (right column)
8. Revenue Card (right column)
9. What's Next Card (right column)
10. Activity Feed (full width)
11. Quick Actions (6-button grid)
12. Conversations list
13. Business Plans list

## Proposed Reductions (5 changes)

### 1. Remove "What's Next Card" -- it duplicates Mission HQ
The What's Next card shows the next recommended action, but the Quest tab inside Mission HQ already does this with more detail. Removing it frees up significant right-column space.

### 2. Fold Achievement Badges into Mission HQ as a 4th tab
Instead of a separate card below Mission HQ, add an "Achievements" tab alongside Quest / Progress / Quest Line. This keeps it accessible but hidden by default.

### 3. Collapse Activity Feed into an expandable section
Replace the always-visible activity feed with a compact "Recent Activity" row that expands on click. Default state: collapsed, showing just "3 recent events" as a single line.

### 4. Reduce Quick Actions from 6 to 4 buttons
Remove "Chat with Mya" (already accessible from nav or new-chat button) and "Generate Idea" (already in Mission HQ Quest tab). Keep the 4 business-focused actions: Add a Lead, Log Revenue, Send Follow-up, Check Pipeline.

### 5. Merge Daily Briefing into the welcome header
Instead of a separate banner, show the briefing summary (next action + momentum) as a subtitle line under the "Mission: First Customer" heading. This eliminates an entire section.

## Technical Changes

### Files to modify:

| File | Change |
|------|--------|
| `src/components/MissionControl/MissionHQCard.tsx` | Add 4th "Achievements" tab rendering `AchievementBadges` |
| `src/pages/Dashboard.tsx` | Remove `WhatsNextCard`, remove standalone `AchievementBadges`, collapse `ActivityFeed`, reduce Quick Actions to 4, inline `DailyBriefing` data into header |
| `src/components/MissionControl/ActivityFeed.tsx` | Add a `collapsible` prop that defaults to collapsed state with a "Show activity" toggle |

### No files to delete
All existing components remain intact -- they're just repositioned or hidden behind toggles/tabs.

### No new dependencies or database changes needed.

## Result
The dashboard shrinks from 13 sections to roughly 8 visible sections, with achievements and activity tucked behind tabs/toggles. The right column loses one card, and the top area loses two full-width sections.

