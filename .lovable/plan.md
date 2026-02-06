

# Combine Current Quest, Your Progress, and Quest Line into One Unified Card

## Overview

The three components -- **Current Quest**, **Your Progress**, and **Quest Line** -- all track the same active quest and milestones but are scattered across the dashboard. This plan merges them into a single tabbed card called **"Mission HQ"** that lives in the left column, reducing redundancy and giving users one place to manage their quest journey.

## Design

The unified card uses tabs to organize the three views:

```text
+--------------------------------------------------+
| Mission HQ                    [Quest | Progress | Quest Line] |
| Tracking: The LNKDN Architect                                |
+--------------------------------------------------+
| (Tab content changes based on selection)          |
|                                                   |
| QUEST tab: Active quest milestones + Continue btn |
| PROGRESS tab: Milestones checklist + Setup Guide  |
| QUEST LINE tab: Full staged quest list            |
+--------------------------------------------------+
```

- **Quest tab** (default): The current `CurrentQuestCard` content -- active quest milestones, idea switcher, continue/start buttons
- **Progress tab**: The `UnifiedProgressCard` content -- milestone checklist, setup guide progress bars, combined progress bar
- **Quest Line tab**: The `QuestList` content -- all stages with quests, milestone overlays, prompt generators

## Technical Changes

### 1. Create `src/components/MissionControl/MissionHQCard.tsx` (new file)
- A wrapper component using Radix Tabs (`@radix-ui/react-tabs`, already installed)
- Shared header showing "Mission HQ" title + active quest name subtitle
- Three tab panels rendering the existing component internals
- Accepts all props currently spread across the three components
- Keeps the "Open Setup Guide" button accessible in the Progress tab

### 2. Update `src/pages/Dashboard.tsx`
- Replace the separate `CurrentQuestCard`, `UnifiedProgressCard`, and the toggle button + `QuestList` section with a single `<MissionHQCard />` component
- Pass all existing props (completedQuests, currentStage, activeQuestId, businessIdeas, capabilities, etc.) to the new component
- Remove the `showQuestList` state variable and its toggle button since the Quest Line is now a tab
- Remove the standalone "View Full Quest Line" button section

### 3. No changes to existing sub-components
- `CurrentQuestCard`, `UnifiedProgressCard`, and `QuestList` remain as-is internally
- `MissionHQCard` imports and renders them within tab panels
- This keeps the refactor low-risk and reversible

### 4. Remove `AchievementBadges` from between the cards
- Move `AchievementBadges` to render below the new `MissionHQCard` in the left column so it stays visible without being sandwiched between merged sections

## Summary of File Changes

| File | Action |
|------|--------|
| `src/components/MissionControl/MissionHQCard.tsx` | Create -- tabbed wrapper |
| `src/components/MissionControl/index.ts` | Update -- export new component |
| `src/pages/Dashboard.tsx` | Update -- replace 3 sections with 1 component, remove `showQuestList` state |

No new dependencies, database changes, or edge function updates needed.
