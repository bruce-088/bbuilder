

# Fix Dashboard Layout Gap

## Problem
The dashboard uses a 3-column grid (`lg:grid-cols-3`) where the left column (2/3 width) contains Current Quest + Achievements, while the right column (1/3 width) has Timer, XP, Lead Stats, Revenue Tracker, and What's Next. The left column content is much shorter, creating a large visual gap.

## Solution
Move the **Unified Progress Card** from above the grid into the left column, placing it after the Current Quest and Achievements sections. This fills the empty space with useful content and creates a more balanced layout.

## Changes

### `src/pages/Dashboard.tsx`

1. **Remove** the standalone `UnifiedProgressCard` block (lines 830-841) that sits above the grid.
2. **Insert** the `UnifiedProgressCard` inside the left column (`lg:col-span-2`), after the `AchievementBadges` section (around line 905), so it fills the gap beneath the quest content.

This is a single file change -- just moving the component from one location to another within the same file. No new components or dependencies needed.

