

# Fix: Keep FixDiagnosisDialog Open When Switching Browser Tabs

## Problem
The "Fix: Step" diagnosis dialog closes when you navigate to other browser tabs. This happens because Radix UI's Dialog component uses modal behavior by default, which can interpret focus loss (when switching tabs) as a reason to close.

## Root Cause
The Radix Dialog component has default `modal={true}` behavior which:
- Traps focus within the dialog
- May close when window/document loses focus (tab switching)

While the current implementation already prevents `onInteractOutside` and `onPointerDownOutside`, it doesn't handle focus-related events.

## Solution
Add two configurations to the `FixDiagnosisDialog`:

1. **Add `modal={false}`** to the Dialog root - This prevents the focus-trap behavior that causes closure on tab switch
2. **Add `onFocusOutside` prevention** - This explicitly prevents the dialog from closing when focus moves outside (including to other tabs)

---

## Technical Implementation

### File: `src/components/FixDiagnosisDialog.tsx`

**Changes to make:**

1. Update the `Dialog` component (line 206):
```typescript
// Before
<Dialog open={open} onOpenChange={setOpen}>

// After  
<Dialog open={open} onOpenChange={setOpen} modal={false}>
```

2. Add `onFocusOutside` handler to `DialogContent` (lines 208-217):
```typescript
// Before
<DialogContent 
  className={cn(...)}
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
>

// After
<DialogContent 
  className={cn(...)}
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
  onFocusOutside={(e) => e.preventDefault()}
>
```

---

## What This Achieves

| Behavior | Before | After |
|----------|--------|-------|
| Dialog stays open when clicking outside | Yes | Yes |
| Dialog stays open when switching browser tabs | No | Yes |
| Dialog stays open when clicking on other app elements | No | Yes |
| Can still close with X button or Escape key | Yes | Yes |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/FixDiagnosisDialog.tsx` | Add `modal={false}` to Dialog, add `onFocusOutside` prevention to DialogContent |

