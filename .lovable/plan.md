
# Mya Browser Cowork Mode

Add a "Cowork" mode to Mya's chat interface where she can remotely control your n8n instance via Browserbase, showing live progress and screenshots directly in the conversation -- similar to how Claude's cowork feature works.

## What You'll Get

- A "Cowork" toggle button in the chat header that activates browser control mode
- When active, Mya can interpret your chat messages as browser automation tasks (e.g., "activate my workflow", "add a Slack node", "fix the Google Sheets credentials")
- Inline execution cards in the chat showing: action steps, live progress, screenshots, and results
- A live browser preview panel (split-screen) with the Browserbase debug viewer embedded via iframe
- Mya automatically generates Browserbase actions from natural language, executes them, and reports back in the chat

## How It Works

```text
+---------------------------+----------------------------+
|                           |                            |
|    Mya Chat (left)        |  Live Browser View (right) |
|                           |                            |
|  [User]: "Activate my     |  [Browserbase debug iframe |
|   lead gen workflow"      |   showing n8n in real-time]|
|                           |                            |
|  [Mya]: "On it! Let me    |                            |
|   navigate to your        |                            |
|   workflow..."            |                            |
|                           |                            |
|  [Execution Card]         |                            |
|   Step 1/4: Navigate  OK  |                            |
|   Step 2/4: Click...  ... |                            |
|                           |                            |
+---------------------------+----------------------------+
```

## Technical Plan

### 1. New Component: `CoworkExecutionCard` (chat inline)
A compact card rendered inside assistant messages when Mya is executing browser actions. Shows:
- Action list with status icons (pending/running/done/failed)
- Progress bar
- Screenshot thumbnails (clickable to expand)
- "Watch Live" link to Browserbase debug URL

### 2. New Component: `CoworkBrowserPanel` (right-side panel)
A resizable split-screen panel using `react-resizable-panels` that embeds the Browserbase debug URL in an iframe. Appears when cowork mode is active and a session is running.

### 3. New Hook: `useCoworkMode`
Orchestrates the cowork flow:
- Wraps `useBrowserbaseAutomation` for session/action management
- Calls a new `cowork-interpret` edge function to translate natural-language chat messages into Browserbase actions
- Manages cowork state (active/inactive, current session, action queue)
- Injects execution results back into the chat as special "cowork" messages

### 4. New Edge Function: `cowork-interpret`
Takes a user's chat message + n8n context and returns structured Browserbase actions:
- Input: `{ message, n8nContext, conversationHistory }`
- Output: `{ actions: BrowserAction[], narration: string }`
- Uses Lovable AI to interpret intent and generate precise browser steps
- The `narration` field is what Mya says in chat while executing

### 5. Chat Page Updates (`Chat.tsx`)
- Add a "Cowork" toggle button (Globe icon) in the header
- When cowork is active and user sends a message, route it through `useCoworkMode` instead of the normal `streamChat` flow
- Render `CoworkExecutionCard` inline for cowork messages
- Show `CoworkBrowserPanel` as a right-side resizable panel when a session is live

### 6. Files to Create
| File | Purpose |
|------|---------|
| `src/components/Chat/CoworkExecutionCard.tsx` | Inline chat card showing browser action progress |
| `src/components/Chat/CoworkBrowserPanel.tsx` | Right-side iframe panel for live browser view |
| `src/hooks/useCoworkMode.ts` | Orchestration hook for cowork flow |
| `supabase/functions/cowork-interpret/index.ts` | Edge function to translate chat to browser actions |

### 7. Files to Modify
| File | Change |
|------|--------|
| `src/pages/Chat.tsx` | Add cowork toggle, split layout, route messages through cowork hook |
| `src/components/Chat/index.ts` | Export new components |
