

# Sync Active Quest with "Your Progress" Card

## Problem
The "Your Progress" card already receives the active quest's milestone data, but it doesn't visually indicate **which** quest it's tracking. Users can't tell if the milestones belong to their active quest or something else.

## Solution
Pass the active quest's name into the `UnifiedProgressCard` and display it as a subtitle beneath "Your Progress", so users see something like:

**Your Progress**
*Tracking: My SaaS Business*

If no quest is active, show a subtle prompt like "No active quest selected".

## Changes

### 1. `src/components/MissionControl/UnifiedProgressCard.tsx`
- Add an optional `activeQuestName` prop to the interface
- Display the quest name as a subtitle under the card title (e.g., muted text showing "Tracking: {name}")
- When no quest is active, show "No active quest" in muted text

### 2. `src/pages/Dashboard.tsx` (~line 895)
- Pass the active quest's `business_name` to the `UnifiedProgressCard`:
  ```
  activeQuestName={businessIdeasWithProgress.find(i => i.id === activeQuestId)?.business_name}
  ```

No new files, dependencies, or database changes needed. Two small edits total.
