
# Plan: Stagehand SDK Integration via CDP for Edge Functions

## Overview

Implement actual browser action execution in the `browserbase-automation` edge function using Chrome DevTools Protocol (CDP) over WebSocket. Since the Stagehand SDK requires Node.js runtime (puppeteer-core/playwright-core), we'll use a **CDP-direct approach** combined with **AI-powered action interpretation** via the Lovable AI Gateway.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Edge Function: browserbase-automation                   │
│                                                                              │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────────────────┐  │
│  │ Parse Actions│──>│ AI Interpreter│──>│ CDP Command Generator          │  │
│  │ from Prompt  │   │ (Gemini Flash)│   │ (navigate, click, type, etc.)  │  │
│  └──────────────┘   └───────────────┘   └────────────────────────────────┘  │
│                                                    │                         │
│                                                    ▼                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    CDP WebSocket Client                                 │ │
│  │  - Connect to session.connectUrl                                        │ │
│  │  - Send CDP commands (Page.navigate, Input.*, DOM.*)                    │ │
│  │  - Capture screenshots (Page.captureScreenshot)                         │ │
│  │  - Execute JavaScript (Runtime.evaluate)                                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Browserbase Cloud Session                             │
│                        (via connectUrl WebSocket)                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: CDP WebSocket Client

Create a CDP client class that connects to Browserbase sessions via WebSocket and executes commands:

```text
CDPClient class:
├── connect(wsUrl) - Establish WebSocket connection
├── send(method, params) - Send CDP command and await response
├── navigate(url) - Page.navigate command
├── click(selector) - Find element + dispatch click events
├── type(selector, text) - Focus element + simulate typing
├── screenshot() - Page.captureScreenshot as base64
├── evaluate(expression) - Runtime.evaluate for JS execution
├── waitForSelector(selector, timeout) - Poll DOM for element
└── close() - Disconnect WebSocket
```

### Phase 2: AI-Powered Action Interpreter

Use the Lovable AI Gateway to translate natural language instructions into CDP commands:

**Input:** `"Click the login button"`

**AI Output (structured):**
```json
{
  "steps": [
    { "action": "waitForSelector", "selector": "button:contains('Login'), [data-testid='login'], .login-btn" },
    { "action": "click", "selector": "button:contains('Login')" }
  ]
}
```

The AI will analyze the current page state (via screenshots or DOM extraction) and generate appropriate selectors.

### Phase 3: Execution Loop

Implement an action execution loop that:
1. Takes the parsed `BrowserAction[]` from `parseFixPromptToActions`
2. Connects to the session via CDP
3. For each action:
   - If `navigate`: Execute `Page.navigate`
   - If `wait`: Execute `waitForSelector` or timeout
   - If `act`: Send to AI interpreter, execute resulting CDP steps
   - If `screenshot`: Capture and store base64 image
   - If `extract`: Use AI to generate extraction script, run via `Runtime.evaluate`
4. Return execution results with screenshots and logs

### Phase 4: Enhanced Response Format

Update the edge function to return detailed execution results:

```text
ExecutionResult:
├── success: boolean
├── sessionId: string
├── actionsExecuted: ActionResult[]
│   ├── action: BrowserAction
│   ├── status: "completed" | "failed" | "skipped"
│   ├── screenshot?: string (base64)
│   ├── extractedData?: any
│   └── error?: string
├── finalScreenshot: string (base64)
└── executionTimeMs: number
```

## Technical Details

### CDP Commands to Implement

| Action Type | CDP Commands Used |
|-------------|-------------------|
| `navigate` | `Page.navigate`, `Page.loadEventFired` |
| `click` | `DOM.querySelector`, `DOM.getBoxModel`, `Input.dispatchMouseEvent` |
| `type` | `DOM.focus`, `Input.insertText` or `Input.dispatchKeyEvent` |
| `wait` | `Runtime.evaluate` with polling loop |
| `screenshot` | `Page.captureScreenshot` |
| `extract` | `Runtime.evaluate` with AI-generated JS |

### AI Interpreter Prompt

The AI interpreter will receive:
- Current page URL
- Screenshot or DOM snapshot
- Natural language instruction

And return structured CDP steps with fallback selectors.

### Error Handling

- Connection timeouts (WebSocket fails to connect)
- CDP command failures (element not found, navigation error)
- AI interpretation failures (unclear instructions)
- Session expiration (Browserbase timeout)

Each failure returns detailed error info for debugging.

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/browserbase-automation/index.ts` | Add CDP client, AI interpreter, execution loop |

## Files to Create

None - all logic contained in the edge function.

## Implementation Code Structure

### CDP Client Class

```text
class CDPClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingCommands = new Map();

  async connect(wsUrl: string): Promise<void>
  async send(method: string, params?: object): Promise<any>
  async navigate(url: string): Promise<void>
  async waitForNavigation(timeout?: number): Promise<void>
  async waitForSelector(selector: string, timeout?: number): Promise<string>
  async click(selector: string): Promise<void>
  async type(selector: string, text: string): Promise<void>
  async screenshot(): Promise<string>
  async evaluate<T>(expression: string): Promise<T>
  async getPageInfo(): Promise<{ url: string; title: string }>
  disconnect(): void
}
```

### AI Action Interpreter

```text
async function interpretAction(
  instruction: string,
  pageContext: { url: string; title: string; screenshot?: string }
): Promise<CDPStep[]>

interface CDPStep {
  action: "click" | "type" | "waitForSelector" | "evaluate" | "scroll";
  selector?: string;
  text?: string;
  expression?: string;
  timeout?: number;
}
```

### Execute Action Function

```text
async function executeAction(
  cdp: CDPClient,
  action: BrowserAction,
  aiInterpreter: (instruction: string, context: any) => Promise<CDPStep[]>
): Promise<ActionResult>
```

## Hook Updates

Update `useBrowserbaseAutomation.ts` to:
- Add `execute` action trigger after `start`
- Poll for execution results (not just session status)
- Display action-by-action progress
- Show captured screenshots in UI

## UI Enhancements

Update `FixGuidancePopover.tsx` to:
- Show execution progress (action 1 of N)
- Display captured screenshots
- Show success/failure for each step
- Provide retry option for failed actions

## Execution Flow

1. User clicks "Run Auto-Fix"
2. `start` action creates session, returns `sessionId` and `actions[]`
3. Frontend calls `execute` action with `sessionId` and `actions[]`
4. Edge function:
   - Connects to session via CDP WebSocket
   - For each action, interprets and executes
   - Captures screenshots at key points
   - Returns detailed results
5. Frontend displays progress and results
6. Session auto-closes or user clicks "Stop"

## Secrets Required

Already configured:
- `BROWSERBASE_API_KEY`
- `BROWSERBASE_PROJECT_ID`
- `LOVABLE_API_KEY` (for AI interpreter)

## Limitations

1. **WebSocket in Edge Functions**: Deno supports WebSocket but with timeouts; long-running automations may need chunking
2. **No Visual AI**: CDP doesn't see visual elements like Stagehand; relies on DOM selectors
3. **Complex n8n UI**: n8n uses Vue.js with dynamic components; may need specialized selectors
4. **Session Timeout**: Default 5-minute timeout may not be enough for complex fixes

## Future Enhancements

1. Add visual element detection using AI vision models with screenshots
2. Implement action recording for debugging
3. Add rollback capability using n8n workflow export
4. Support parallel action execution for speed
