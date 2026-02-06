

# Transform Manual Path into an Interactive Course

## Overview

Replace the current checklist-style manual steps with a guided, step-by-step interactive course. Users progress through one step at a time with rich context, tips, and the ability to ask Mya for help at each step -- turning a wall of instructions into a focused learning experience.

---

## How It Works

The manual tab and the manual column in the side-by-side view will gain a new "course mode" that presents steps one at a time instead of all at once.

### Step-by-Step Flow

1. User sees only the **current step** prominently displayed, with a step counter (e.g., "Step 2 of 5")
2. Each step shows:
   - The step instruction (what to do)
   - A short **"Why this matters"** explanation
   - Relevant **tool links** for that specific step (e.g., link to Apollo.io only on the "Sign up for Apollo" step)
   - A **"Stuck? Ask Mya"** button that sends a contextual help prompt
3. Clicking **"Mark Complete and Continue"** checks off the step and advances to the next
4. A **progress bar** at the top of each category shows overall completion
5. Users can go back to review previous steps (shown as collapsed/completed)
6. When all steps in a category are done, a completion card appears with a suggestion to move to the next category

### Data Changes

The `capabilities` data structure gets additional fields per step:

- `why`: A short sentence explaining why this step matters (e.g., "Domain verification prevents your emails from landing in spam")
- `helpPrompt`: A Mya command the user can send if stuck (e.g., "Help me set up email domain verification")
- `tools`: Which tools from the category are relevant to this specific step

### Category-Level Progress

Each category card shows:
- A thin progress bar at the top
- "Step X of Y" indicator
- Overall course progress across all categories in a summary header (e.g., "12 of 33 steps completed")

---

## Visual Design

- Current step: Full-size card with instruction, context, and action buttons
- Completed steps: Collapsed single line with checkmark and strikethrough text
- Future steps: Hidden (not shown until reached) to reduce overwhelm
- Transition: Smooth animation when advancing between steps using framer-motion

---

## Technical Details

### Files Modified

1. **`src/components/UnifiedSetupGuide.tsx`**
   - Expand the `CapabilityArea` interface: each step becomes an object `{ text: string; why: string; helpPrompt: string; relevantTools?: string[] }` instead of a plain string
   - Update the `capabilities` array with enriched step data for all 7 categories (33 total steps)
   - Replace the step list rendering in both the "manual" tab and the "side-by-side" manual column with a new `CourseStepView` inline component
   - Add a summary progress header at the top of the manual tab

2. **`src/hooks/useManualProgress.ts`**
   - Add a `getCurrentStep(capId, totalSteps)` function that returns the index of the first incomplete step (used to auto-focus the current step)
   - Add a `getOverallProgress()` function that returns total completed / total steps across all categories

3. **New component: `src/components/SetupGuide/CourseStepView.tsx`**
   - Receives: category data, current step index, toggle/complete callbacks
   - Renders the focused single-step UI with progress bar, instruction card, and navigation
   - Handles "Mark Complete and Continue" logic
   - Renders completed steps as collapsed items above the current step
   - Shows completion celebration when all steps are done

### No New Dependencies

Uses existing components: Progress bar, Card, Badge, Button, Checkbox, and framer-motion (already installed).

### localStorage

Same `setup_guide_progress` key -- no migration needed. The boolean array format already supports step-by-step tracking.

