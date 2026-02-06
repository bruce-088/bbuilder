

# Improve Ease of Use for Both Paths in the Setup Guide

## What Changes

Enhance the Unified Setup Guide to reduce friction for both the Manual and Mya paths, making each more actionable and less overwhelming.

---

## 1. Mya Path: "Do It All For Me" Quick Launch

**Problem**: Users see 7 categories with 3 commands each (21 options) -- too many choices.

**Solution**: Add a single "Quick Launch" button at the top of the Mya tab that sends a bundled starter prompt like *"Set up my business: add 3 sample leads, create a follow-up workflow, and give me a business summary"*. One tap, full demo.

- Appears as a highlighted hero card above the per-category sections
- Clicking it navigates to chat with the bundled prompt pre-filled and auto-sent

---

## 2. Mya Path: Voice Mode Hint

**Problem**: Users with the new Voice Mode don't know they can long-press mic instead of typing commands.

**Solution**: Add a small banner/tip in the Mya tab: "You can also long-press the mic button to talk to Mya hands-free" with a microphone icon.

---

## 3. Manual Path: Checklist with Local Progress

**Problem**: Manual steps are read-only text -- users can't track what they've done.

**Solution**: Add interactive checkboxes next to each manual step, persisted in `localStorage`. A small progress indicator (e.g., "3/5 done") appears on each category's accordion trigger so users see progress at a glance without expanding.

---

## 4. Manual Path: "Ask Mya to Help" Nudge

**Problem**: Users on the manual path don't realize Mya can shortcut specific steps.

**Solution**: After each manual step list, add a subtle CTA: "Or skip the rest -- just tell Mya:" followed by the equivalent Mya command button. This bridges paths without being pushy.

---

## 5. Side-by-Side: Auto-Expand First Item

**Problem**: All accordion items start collapsed -- users see a wall of titles and have to click to discover content.

**Solution**: Default-expand the first accordion item ("Lead Generation") so users immediately see the comparison format.

---

## Technical Details

### Files Modified

1. **`src/components/UnifiedSetupGuide.tsx`**
   - Add `quickLaunchPrompt` constant and hero card in the Mya tab
   - Add Voice Mode tip component
   - Add checkbox state using `useState` + `localStorage` persistence for manual steps
   - Add progress counts on accordion triggers
   - Add "Or tell Mya" bridge CTA after manual steps
   - Set `defaultValue={["lead-gen"]}` on the side-by-side Accordion

### State Management

- Manual step completion: `localStorage` key `setup_guide_progress` storing a `Record<string, boolean[]>` (capability ID to step completion array)
- No database changes needed -- this is lightweight local UI state

### No New Dependencies

All changes use existing components (Badge, Button, Checkbox from radix) and localStorage.
