

# Plan: Add Director.ai Prompt Download to FixGuidancePopover

## Problem Analysis

Currently, the `FixGuidancePopover` component shows three destination options for fix prompts:
1. **Mya Chat** - Clickable, opens a chat with the basic fix details
2. **Director.ai / Claude Computer Use** - Static display only (not clickable)
3. **n8n Workflow Editor** - Static display only

The user wants the **Director.ai / Claude Computer Use** box to be clickable and download a prompt that is:
- Specifically optimized for Director.ai browser automation
- Different from the Mya Chat prompt (which uses `fixDetails`)
- Uses the enhanced `directorAiPrompt` that includes n8n URLs, browser actions, and validation criteria

## Solution

Make the Director.ai box interactive with a download action that saves the enhanced Director.ai-optimized prompt as a `.md` file.

---

## Technical Changes

### 1. Update FixGuidancePopover Component

**File:** `src/components/AutomationEngine/FixGuidancePopover.tsx`

Convert the static Director.ai `<div>` into an interactive `<button>` with:
- Click handler that downloads the `directorAiPrompt` as a markdown file
- Visual feedback (download icon, hover states)
- "Downloaded!" state indicator after successful download
- Separate copied/downloaded state from the generic "Copy to Clipboard" button

| Change | Description |
|--------|-------------|
| Add `directorDownloaded` state | Track download status for visual feedback |
| Add `handleDownloadDirectorPrompt` function | Create blob and trigger download |
| Convert static `<div>` to `<button>` | Make Director.ai option interactive |
| Add Download icon | Show download action affordance |
| Style active state | Highlight when enhanced prompt available |

### 2. Implementation Details

**New handler function:**
```typescript
const handleDownloadDirectorPrompt = () => {
  if (!directorAiPrompt) {
    toast.error("Director.ai prompt not available");
    return;
  }
  
  const blob = new Blob([directorAiPrompt], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const timestamp = Date.now();
  a.download = `director-ai-fix-${nodeType || "automation"}-${timestamp}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  setDirectorDownloaded(true);
  toast.success("Director.ai prompt downloaded!");
  setTimeout(() => setDirectorDownloaded(false), 3000);
};
```

**Updated UI element:**
```typescript
<button
  onClick={handleDownloadDirectorPrompt}
  disabled={!hasEnhancedPrompt}
  className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
    hasEnhancedPrompt 
      ? "bg-primary/5 border border-primary/20 hover:bg-primary/10 cursor-pointer" 
      : "bg-muted/50 opacity-50 cursor-not-allowed"
  }`}
>
  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
    hasEnhancedPrompt ? "bg-primary/10" : "bg-muted"
  }`}>
    {directorDownloaded ? (
      <Check className="h-4 w-4 text-emerald-500" />
    ) : (
      <Bot className="h-4 w-4 text-primary" />
    )}
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium">
      {directorDownloaded ? "Downloaded!" : "Director.ai / Claude Computer Use"}
    </p>
    <p className="text-xs text-muted-foreground">
      {hasEnhancedPrompt 
        ? "Click to download optimized prompt" 
        : "Enhanced prompt not available"
      }
    </p>
  </div>
  {hasEnhancedPrompt && !directorDownloaded && (
    <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  )}
  {hasEnhancedPrompt && (
    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
      Best
    </Badge>
  )}
</button>
```

---

## Prompt Differentiation

| Target | Prompt Source | Content |
|--------|---------------|---------|
| Mya Chat | `fixDetails` | Basic fix description, steps, and solution summary |
| Director.ai | `directorAiPrompt` | Full browser automation prompt with n8n URLs, business context JSON, step-by-step actions, validation criteria, and report format |
| Copy to Clipboard | `directorAiPrompt` (if available) or `fixDetails` | Same as Director.ai if enhanced, otherwise basic |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AutomationEngine/FixGuidancePopover.tsx` | Add download handler, convert static div to button, add Download icon import, add state for download feedback |

---

## Expected Behavior After Implementation

1. **Director.ai box** → Clickable when enhanced prompt is available
2. **Click action** → Downloads `.md` file named `director-ai-fix-{phase}-{timestamp}.md`
3. **Visual feedback** → Shows "Downloaded!" with checkmark after download
4. **Disabled state** → Grayed out and non-clickable when no enhanced prompt exists
5. **Badge retained** → "Best" badge still shows when enhanced prompt available
6. **Icon change** → Shows Download icon instead of just the Bot icon

---

## Validation Criteria

- Clicking the Director.ai box downloads a `.md` file
- File contains the full Director.ai optimized prompt (n8n URLs, JSON context, browser actions)
- Mya Chat still opens chat with basic fix details (unchanged)
- Copy to Clipboard copies the enhanced prompt (unchanged)
- Download works when enhanced prompt is available
- Box is disabled/grayed when no enhanced prompt exists

