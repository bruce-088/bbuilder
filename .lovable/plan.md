

# Plan: Change Director.ai Button from Download to Copy

## Problem

The current implementation downloads the Director.ai prompt as a `.md` file when clicked. The user prefers a simpler flow: click to copy the prompt to clipboard, then paste it directly into Director.ai.

## Solution

Change the Director.ai button behavior from file download to clipboard copy, with appropriate visual feedback.

---

## Technical Changes

### File: `src/components/AutomationEngine/FixGuidancePopover.tsx`

| Change | Description |
|--------|-------------|
| Rename state | `directorDownloaded` → `directorCopied` |
| Replace handler | `handleDownloadDirectorPrompt` → `handleCopyDirectorPrompt` |
| Simplify logic | Remove Blob/download code, use `navigator.clipboard.writeText()` |
| Update icon | Replace `Download` icon with `Copy` icon |
| Update text | "Click to download" → "Click to copy" |
| Update feedback | "Downloaded!" → "Copied!" |
| Update toast | "Director.ai prompt downloaded!" → "Director.ai prompt copied!" |

### Updated Handler

```typescript
const handleCopyDirectorPrompt = () => {
  if (!directorAiPrompt) {
    toast.error("Director.ai prompt not available");
    return;
  }
  
  navigator.clipboard.writeText(directorAiPrompt);
  setDirectorCopied(true);
  toast.success("Director.ai prompt copied!");
  setTimeout(() => setDirectorCopied(false), 3000);
};
```

### Updated UI Element

```typescript
<button
  onClick={handleCopyDirectorPrompt}
  disabled={!hasEnhancedPrompt}
  className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
    hasEnhancedPrompt 
      ? "bg-primary/5 border border-primary/20 hover:bg-primary/10 cursor-pointer" 
      : "bg-muted/50 opacity-50 cursor-not-allowed"
  }`}
>
  <div className={`...`}>
    {directorCopied ? (
      <Check className="h-4 w-4 text-emerald-500" />
    ) : (
      <Bot className="h-4 w-4 text-primary" />
    )}
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium">
      {directorCopied ? "Copied!" : "Director.ai / Claude Computer Use"}
    </p>
    <p className="text-xs text-muted-foreground">
      {hasEnhancedPrompt 
        ? "Click to copy optimized prompt" 
        : "Enhanced prompt not available"
      }
    </p>
  </div>
  {hasEnhancedPrompt && !directorCopied && (
    <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  )}
  ...
</button>
```

### Import Update

Replace `Download` with `Copy` in the lucide-react import:
```typescript
import { ..., Copy } from "lucide-react";
```

---

## Expected Behavior

1. **Click Director.ai box** → Copies enhanced prompt to clipboard
2. **Visual feedback** → Shows "Copied!" with checkmark for 3 seconds
3. **Toast notification** → "Director.ai prompt copied!"
4. **Disabled state** → Grayed out when no enhanced prompt available
5. **Copy icon** → Shows clipboard icon instead of download icon

