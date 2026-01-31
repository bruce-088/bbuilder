
# Plan: Detailed Action-by-Action Breakdown for Browserbase Automation

## Overview
Add a new `BrowserbaseExecutionPanel` component that provides a rich, detailed view of each automation action as it executes. This panel will replace the compact execution progress in `FixGuidancePopover` and can also be integrated into the main `AutomationEngine` dialog for full visibility.

## Current State Analysis

### Existing Data Structure
The `useBrowserbaseAutomation` hook already tracks:
- `actions`: Array of `BrowserAction` objects (planned actions)
- `executionResults`: Array of `ActionResult` objects with status, screenshots, errors, and timing
- `currentActionIndex`: Current action being executed
- `status`: Overall automation status

### Current UI Limitations
1. The execution progress in `FixGuidancePopover` is compact (max 32px height per action)
2. No timeline visualization showing action sequence
3. Error details are truncated
4. Screenshots require individual clicks to view
5. No timing breakdown per action
6. No selector debugging info (which fallback matched)

## Implementation Plan

### 1. Create `BrowserbaseExecutionPanel` Component
**File:** `src/components/AutomationEngine/BrowserbaseExecutionPanel.tsx`

A dedicated panel with:
- **Timeline View**: Vertical stepper showing all actions with status indicators
- **Action Cards**: Expandable cards for each action showing:
  - Action type icon (navigate, click, type, wait, screenshot)
  - Description/instruction
  - Status badge (pending, running, completed, failed, skipped)
  - Execution time
  - Error message (if failed)
  - Screenshot preview (if captured)
  - Selector info (which selector matched for debugging)
- **Summary Header**: Total actions, completed/failed counts, total execution time
- **Live Progress Bar**: Animated progress showing current action
- **Final Screenshot Section**: Large preview of final state

### 2. Update Types for Enhanced Tracking
**File:** `src/hooks/useBrowserbaseAutomation.ts`

Extend `ActionResult` interface to include:
```typescript
interface ActionResult {
  // Existing fields...
  selectorUsed?: string;      // Which selector actually matched
  fallbacksAttempted?: number; // How many fallbacks were tried
  startTime?: string;         // When action started
  endTime?: string;           // When action ended
}
```

### 3. Create Action Type Icons and Labels
**File:** `src/components/AutomationEngine/BrowserbaseExecutionPanel.tsx`

Map action types to visual representations:
- `navigate` → Globe icon, "Navigate to [URL]"
- `wait` → Clock icon, "Wait for [selector/timeout]"
- `act` → MousePointer icon, instruction text
- `screenshot` → Camera icon, "Capture screenshot"
- `extract` → Download icon, "Extract data"

### 4. Integrate Panel into AutomationEngine Dialog
**File:** `src/components/AutomationEngine/index.tsx`

Add a new collapsible section when Browserbase automation is running or has results:
- Shows during "Fix" phase execution
- Displays detailed breakdown of browser actions
- Persists after completion for review

### 5. Enhance FixGuidancePopover with "View Details" Link
**File:** `src/components/AutomationEngine/FixGuidancePopover.tsx`

Add a button to open a full-screen dialog with the detailed execution panel when results exist.

## Component Structure

```text
+------------------------------------------+
|  Browserbase Execution Details           |
|  ----------------------------------------|
|  [=============================>     ]   |
|  12/15 actions completed • 8.3s elapsed  |
+------------------------------------------+
|                                          |
|  [✓] Navigate to n8n workflows page      |
|      https://n8n.srv.../workflow/123     |
|      Completed in 1.2s                   |
|  ----------------------------------------|
|  [✓] Click "Execute Workflow" button     |
|      Selector: button[data-testid=...]   |
|      Completed in 0.3s                   |
|  ----------------------------------------|
|  [▸] Wait for execution to complete      |  <- Currently running
|      Waiting for .execution-success...   |
|  ----------------------------------------|
|  [○] Capture final screenshot            |  <- Pending
|  ----------------------------------------|
|  [○] Verify workflow status              |  <- Pending
|                                          |
+------------------------------------------+
|  Final Screenshot:                       |
|  +------------------------------------+  |
|  |                                    |  |
|  |     [Screenshot Preview]           |  |
|  |                                    |  |
|  +------------------------------------+  |
+------------------------------------------+
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/AutomationEngine/BrowserbaseExecutionPanel.tsx` | Main detailed breakdown component |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useBrowserbaseAutomation.ts` | Add enhanced action tracking fields |
| `src/components/AutomationEngine/index.tsx` | Integrate BrowserbaseExecutionPanel |
| `src/components/AutomationEngine/FixGuidancePopover.tsx` | Add "View Full Details" button |

## Technical Details

### BrowserbaseExecutionPanel Props
```typescript
interface BrowserbaseExecutionPanelProps {
  actions: BrowserAction[];
  executionResults: ActionResult[];
  currentActionIndex: number;
  status: AutomationStatus;
  isRunning: boolean;
  debugUrl?: string | null;
  finalScreenshot?: string;
  totalExecutionTime?: number;
  onViewScreenshot?: (screenshot: string) => void;
}
```

### Action Status Styling
- **Pending**: Gray circle, muted text
- **Running**: Blue pulsing dot, primary text, animated border
- **Completed**: Green checkmark, success text
- **Failed**: Red X icon, destructive text, error message visible
- **Skipped**: Gray dash, muted/strikethrough text

### Animation Details
- Current action has a subtle pulse animation
- Completed actions slide in with a checkmark animation
- Progress bar smoothly transitions between actions
- Failed actions have a subtle shake animation

## Edge Cases Handled

1. **No Actions**: Show "No actions planned" message
2. **All Failed**: Show prominent error summary at top
3. **Timeout**: Display which action timed out and the wait duration
4. **Selector Fallbacks**: Show which fallback selector succeeded
5. **Large Action Count**: Virtual scrolling for 50+ actions
6. **Screenshot Loading**: Skeleton loader while images decode

## Testing Considerations

After implementation:
1. Run a full Browserbase automation and verify each action appears in real-time
2. Verify failed actions show clear error messages
3. Confirm screenshots are viewable in the panel
4. Test with different action counts (5, 20, 50+)
5. Verify the panel works in both FixGuidancePopover context and AutomationEngine dialog

