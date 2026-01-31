import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BROWSERBASE_API_URL = "https://api.browserbase.com";
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ============= Types =============

interface AutomationRequest {
  action: "start" | "status" | "stop" | "execute" | "create-context" | "get-context";
  fixPrompt?: string;
  n8nInstanceUrl?: string;
  workflowId?: string;
  workflowName?: string;
  sessionId?: string;
  contextId?: string;
  actions?: BrowserAction[];
  connectUrl?: string;
}

interface BrowserAction {
  type: "navigate" | "wait" | "act" | "screenshot" | "extract";
  url?: string;
  selector?: string;
  instruction?: string;
  timeout?: number;
}

interface CDPStep {
  action: "click" | "type" | "waitForSelector" | "evaluate" | "scroll" | "press";
  selector?: string;
  text?: string;
  expression?: string;
  timeout?: number;
  key?: string;
}

interface ActionResult {
  action: BrowserAction;
  status: "completed" | "failed" | "skipped";
  screenshot?: string;
  extractedData?: unknown;
  error?: string;
  cdpSteps?: CDPStep[];
  executionTimeMs?: number;
}

interface ExecutionResult {
  success: boolean;
  sessionId: string;
  actionsExecuted: ActionResult[];
  finalScreenshot?: string;
  executionTimeMs: number;
  error?: string;
}

interface ContextResponse {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionResponse {
  id: string;
  createdAt: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  expiresAt: string;
  status: "RUNNING" | "ERROR" | "TIMED_OUT" | "COMPLETED";
  proxyBytes: number;
  avgCpuUsage: number;
  memoryUsage: number;
  keepAlive: boolean;
  contextId: string | null;
  region: string;
}

interface CreateSessionResponse extends SessionResponse {
  connectUrl: string;
}

// ============= CDP Client Class =============

class CDPClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingCommands: Map<number, { 
    resolve: (value: unknown) => void; 
    reject: (error: Error) => void;
    timeout: number;
  }> = new Map();
  private connected = false;
  private eventHandlers: Map<string, ((params: unknown) => void)[]> = new Map();

  async connect(wsUrl: string, timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`CDP: Connecting to ${wsUrl.substring(0, 50)}...`);
      
      const timeoutId = setTimeout(() => {
        if (this.ws) {
          this.ws.close();
        }
        reject(new Error("CDP connection timeout"));
      }, timeout);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        clearTimeout(timeoutId);
        this.connected = true;
        console.log("CDP: Connected successfully");
        resolve();
      };

      this.ws.onerror = (event) => {
        clearTimeout(timeoutId);
        console.error("CDP: WebSocket error", event);
        reject(new Error("CDP WebSocket connection failed"));
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.log("CDP: Connection closed");
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle command responses
          if (message.id !== undefined) {
            const pending = this.pendingCommands.get(message.id);
            if (pending) {
              clearTimeout(pending.timeout);
              this.pendingCommands.delete(message.id);
              
              if (message.error) {
                pending.reject(new Error(message.error.message || "CDP command failed"));
              } else {
                pending.resolve(message.result);
              }
            }
          }
          
          // Handle events
          if (message.method) {
            const handlers = this.eventHandlers.get(message.method);
            if (handlers) {
              handlers.forEach(handler => handler(message.params));
            }
          }
        } catch (e) {
          console.error("CDP: Failed to parse message", e);
        }
      };
    });
  }

  async send(method: string, params?: object, timeout = 30000): Promise<unknown> {
    if (!this.ws || !this.connected) {
      throw new Error("CDP: Not connected");
    }

    const id = ++this.messageId;
    const message = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new Error(`CDP command timeout: ${method}`));
      }, timeout);

      this.pendingCommands.set(id, { 
        resolve, 
        reject, 
        timeout: timeoutHandle as unknown as number 
      });
      
      this.ws!.send(message);
    });
  }

  on(event: string, handler: (params: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  async enableDomains(): Promise<void> {
    await Promise.all([
      this.send("Page.enable"),
      this.send("DOM.enable"),
      this.send("Runtime.enable"),
      this.send("Input.setIgnoreInputEvents", { ignore: false }),
    ]);
    console.log("CDP: Domains enabled");
  }

  async navigate(url: string): Promise<void> {
    console.log(`CDP: Navigating to ${url}`);
    await this.send("Page.navigate", { url });
    // Wait for load event
    await this.waitForNavigation();
  }

  async waitForNavigation(timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Navigation timeout"));
      }, timeout);

      const handler = () => {
        clearTimeout(timeoutId);
        // Remove this specific handler
        const handlers = this.eventHandlers.get("Page.loadEventFired");
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index > -1) handlers.splice(index, 1);
        }
        // Give page a moment to settle
        setTimeout(resolve, 1000);
      };

      this.on("Page.loadEventFired", handler);
    });
  }

  async querySelector(selector: string): Promise<{ nodeId: number; backendNodeId: number } | null> {
    try {
      // Get the document first
      const doc = await this.send("DOM.getDocument", { depth: 0 }) as { root: { nodeId: number } };
      const rootNodeId = doc.root.nodeId;

      // Query for the selector
      const result = await this.send("DOM.querySelector", {
        nodeId: rootNodeId,
        selector,
      }) as { nodeId: number };

      if (!result.nodeId || result.nodeId === 0) {
        return null;
      }

      // Get backend node ID for more reliable operations
      const nodeInfo = await this.send("DOM.describeNode", {
        nodeId: result.nodeId,
      }) as { node: { backendNodeId: number } };

      return {
        nodeId: result.nodeId,
        backendNodeId: nodeInfo.node.backendNodeId,
      };
    } catch (e) {
      console.error(`CDP: querySelector failed for "${selector}"`, e);
      return null;
    }
  }

  async waitForSelector(selector: string, timeout = 10000): Promise<{ nodeId: number; backendNodeId: number }> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await this.querySelector(selector);
      if (result) {
        console.log(`CDP: Found selector "${selector}"`);
        return result;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async getBoxModel(nodeId: number): Promise<{ x: number; y: number; width: number; height: number }> {
    const result = await this.send("DOM.getBoxModel", { nodeId }) as {
      model: { content: number[] };
    };
    
    const content = result.model.content;
    // content is [x1, y1, x2, y2, x3, y3, x4, y4] representing 4 corners
    const x = Math.min(content[0], content[2], content[4], content[6]);
    const y = Math.min(content[1], content[3], content[5], content[7]);
    const maxX = Math.max(content[0], content[2], content[4], content[6]);
    const maxY = Math.max(content[1], content[3], content[5], content[7]);
    
    return {
      x,
      y,
      width: maxX - x,
      height: maxY - y,
    };
  }

  async click(selector: string): Promise<void> {
    console.log(`CDP: Clicking "${selector}"`);
    
    // First try to find the element
    const node = await this.waitForSelector(selector, 5000);
    
    // Get element position
    const box = await this.getBoxModel(node.nodeId);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // Scroll element into view
    await this.send("DOM.scrollIntoViewIfNeeded", { nodeId: node.nodeId });
    await new Promise(r => setTimeout(r, 200));

    // Dispatch mouse events
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
    });
    
    await this.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
    
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    });

    console.log(`CDP: Clicked at (${x}, ${y})`);
  }

  async type(selector: string, text: string): Promise<void> {
    console.log(`CDP: Typing into "${selector}"`);
    
    // Focus the element first
    const node = await this.waitForSelector(selector, 5000);
    await this.send("DOM.focus", { nodeId: node.nodeId });
    
    // Clear existing content
    await this.send("Input.insertText", { text: "" });
    
    // Type the new text
    await this.send("Input.insertText", { text });
    
    console.log(`CDP: Typed "${text.substring(0, 20)}..."`);
  }

  async press(key: string): Promise<void> {
    console.log(`CDP: Pressing key "${key}"`);
    
    // Map common key names to key codes
    const keyMap: Record<string, { keyCode: number; code: string; key: string }> = {
      "Enter": { keyCode: 13, code: "Enter", key: "Enter" },
      "Tab": { keyCode: 9, code: "Tab", key: "Tab" },
      "Escape": { keyCode: 27, code: "Escape", key: "Escape" },
      "Backspace": { keyCode: 8, code: "Backspace", key: "Backspace" },
      "Delete": { keyCode: 46, code: "Delete", key: "Delete" },
      "ArrowUp": { keyCode: 38, code: "ArrowUp", key: "ArrowUp" },
      "ArrowDown": { keyCode: 40, code: "ArrowDown", key: "ArrowDown" },
      "ArrowLeft": { keyCode: 37, code: "ArrowLeft", key: "ArrowLeft" },
      "ArrowRight": { keyCode: 39, code: "ArrowRight", key: "ArrowRight" },
    };

    const keyInfo = keyMap[key] || { keyCode: key.charCodeAt(0), code: `Key${key.toUpperCase()}`, key };

    await this.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: keyInfo.key,
      code: keyInfo.code,
      windowsVirtualKeyCode: keyInfo.keyCode,
      nativeVirtualKeyCode: keyInfo.keyCode,
    });

    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: keyInfo.key,
      code: keyInfo.code,
      windowsVirtualKeyCode: keyInfo.keyCode,
      nativeVirtualKeyCode: keyInfo.keyCode,
    });
  }

  async screenshot(): Promise<string> {
    console.log("CDP: Taking screenshot");
    const result = await this.send("Page.captureScreenshot", {
      format: "png",
      quality: 80,
    }) as { data: string };
    
    return result.data;
  }

  async evaluate<T>(expression: string): Promise<T> {
    console.log(`CDP: Evaluating JS`);
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }) as { result: { value: T }; exceptionDetails?: unknown };

    if ((result as { exceptionDetails?: unknown }).exceptionDetails) {
      throw new Error(`JS evaluation failed: ${JSON.stringify((result as { exceptionDetails?: unknown }).exceptionDetails)}`);
    }

    return result.result.value;
  }

  async getPageInfo(): Promise<{ url: string; title: string }> {
    const [url, title] = await Promise.all([
      this.evaluate<string>("window.location.href"),
      this.evaluate<string>("document.title"),
    ]);
    return { url, title };
  }

  async scroll(direction: "up" | "down", amount = 300): Promise<void> {
    const deltaY = direction === "down" ? amount : -amount;
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 500,
      y: 500,
      deltaX: 0,
      deltaY,
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
    this.pendingCommands.clear();
    this.eventHandlers.clear();
  }
}

// ============= AI Action Interpreter =============

async function interpretAction(
  instruction: string,
  pageContext: { url: string; title: string },
  apiKey: string
): Promise<CDPStep[]> {
  console.log(`AI: Interpreting action: "${instruction.substring(0, 100)}..."`);

  const systemPrompt = `You are a browser automation expert. Your task is to convert natural language instructions into precise CDP (Chrome DevTools Protocol) steps.

Given the current page context and an instruction, generate a JSON array of steps to accomplish the task.

Available step types:
- click: Click an element. Provide a CSS selector.
- type: Type text into an input. Provide selector and text.
- waitForSelector: Wait for an element to appear. Provide selector and optional timeout.
- press: Press a keyboard key. Provide key name (Enter, Tab, Escape, etc.).
- scroll: Scroll the page. Provide direction (up/down).
- evaluate: Run JavaScript. Provide expression.

For n8n UI specifically:
- Node panels often have class ".ndv-body" or "[data-testid='ndv-container']"
- Input fields in n8n use class ".n8n-input" or standard input/textarea
- Buttons often have "[data-testid]" attributes
- The canvas is ".vue-flow" or ".n8n-canvas"
- Expression editor uses ".expression-editor" or CodeMirror classes

Return ONLY a valid JSON array of steps. Example:
[
  { "action": "waitForSelector", "selector": "button[data-testid='execute']", "timeout": 5000 },
  { "action": "click", "selector": "button[data-testid='execute']" }
]`;

  const userPrompt = `Current page: ${pageContext.url}
Page title: ${pageContext.title}

Instruction: ${instruction}

Generate the CDP steps to accomplish this. Return ONLY the JSON array.`;

  try {
    const response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI: Gateway error ${response.status}:`, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON from the response
    // Handle markdown code blocks
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const steps: CDPStep[] = JSON.parse(jsonStr);
    console.log(`AI: Generated ${steps.length} steps`);
    return steps;
  } catch (e) {
    console.error("AI: Interpretation failed", e);
    
    // Fallback: try to extract a basic action from the instruction
    const lowerInstruction = instruction.toLowerCase();
    
    if (lowerInstruction.includes("click")) {
      // Try to extract what to click
      const buttonMatch = instruction.match(/click\s+(?:the\s+)?["']?([^"']+?)["']?\s*button/i);
      if (buttonMatch) {
        return [
          { action: "waitForSelector", selector: `button:contains("${buttonMatch[1]}")`, timeout: 5000 },
          { action: "click", selector: `button:contains("${buttonMatch[1]}")` },
        ];
      }
    }
    
    if (lowerInstruction.includes("type") || lowerInstruction.includes("enter")) {
      return [
        { action: "evaluate", expression: `console.log("Manual action needed: ${instruction}")` },
      ];
    }

    // Default fallback
    return [
      { action: "evaluate", expression: `console.log("Could not interpret: ${instruction}")` },
    ];
  }
}

// ============= CDP Step Executor =============

async function executeCDPStep(cdp: CDPClient, step: CDPStep): Promise<void> {
  switch (step.action) {
    case "click":
      if (step.selector) {
        // Handle :contains pseudo-selector which isn't standard CSS
        if (step.selector.includes(":contains(")) {
          const match = step.selector.match(/:contains\(["']?(.+?)["']?\)/);
          if (match) {
            const text = match[1];
            const baseSelector = step.selector.replace(/:contains\(["']?.+?["']?\)/, "");
            // Use evaluate to find and click
            await cdp.evaluate(`
              const elements = document.querySelectorAll('${baseSelector || "*"}');
              for (const el of elements) {
                if (el.textContent.includes('${text}')) {
                  el.click();
                  break;
                }
              }
            `);
            return;
          }
        }
        await cdp.click(step.selector);
      }
      break;

    case "type":
      if (step.selector && step.text) {
        await cdp.type(step.selector, step.text);
      }
      break;

    case "waitForSelector":
      if (step.selector) {
        await cdp.waitForSelector(step.selector, step.timeout || 10000);
      }
      break;

    case "press":
      if (step.key) {
        await cdp.press(step.key);
      }
      break;

    case "scroll":
      await cdp.scroll(step.text === "up" ? "up" : "down");
      break;

    case "evaluate":
      if (step.expression) {
        await cdp.evaluate(step.expression);
      }
      break;

    default:
      console.warn(`Unknown CDP step action: ${step.action}`);
  }
}

// ============= Action Executor =============

async function executeAction(
  cdp: CDPClient,
  action: BrowserAction,
  apiKey: string
): Promise<ActionResult> {
  const startTime = Date.now();
  const result: ActionResult = {
    action,
    status: "completed",
    cdpSteps: [],
  };

  try {
    switch (action.type) {
      case "navigate":
        if (action.url) {
          await cdp.navigate(action.url);
          // Wait a bit for the page to fully load
          await new Promise(r => setTimeout(r, 2000));
        }
        break;

      case "wait":
        if (action.selector) {
          await cdp.waitForSelector(action.selector, action.timeout || 10000);
        } else if (action.timeout) {
          await new Promise(r => setTimeout(r, action.timeout));
        }
        break;

      case "act":
        if (action.instruction) {
          const pageContext = await cdp.getPageInfo();
          const steps = await interpretAction(action.instruction, pageContext, apiKey);
          result.cdpSteps = steps;

          for (const step of steps) {
            try {
              await executeCDPStep(cdp, step);
              // Small delay between steps
              await new Promise(r => setTimeout(r, 500));
            } catch (stepError) {
              console.error(`CDP step failed: ${step.action}`, stepError);
              // Continue with other steps
            }
          }
        }
        break;

      case "screenshot":
        result.screenshot = await cdp.screenshot();
        break;

      case "extract":
        if (action.instruction) {
          const pageContext = await cdp.getPageInfo();
          const steps = await interpretAction(
            `Extract data: ${action.instruction}. Return the data using console.log or return statement.`,
            pageContext,
            apiKey
          );
          
          for (const step of steps) {
            if (step.action === "evaluate" && step.expression) {
              result.extractedData = await cdp.evaluate(step.expression);
            }
          }
        }
        break;
    }
  } catch (e) {
    console.error(`Action failed: ${action.type}`, e);
    result.status = "failed";
    result.error = e instanceof Error ? e.message : "Unknown error";
  }

  result.executionTimeMs = Date.now() - startTime;
  return result;
}

// ============= Main Execution Function =============

async function executeAutomation(
  connectUrl: string,
  actions: BrowserAction[],
  sessionId: string,
  apiKey: string
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const cdp = new CDPClient();
  const results: ActionResult[] = [];
  let finalScreenshot: string | undefined;

  try {
    // Connect to the browser session
    await cdp.connect(connectUrl);
    await cdp.enableDomains();

    // Execute each action
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      console.log(`Executing action ${i + 1}/${actions.length}: ${action.type}`);
      
      const result = await executeAction(cdp, action, apiKey);
      results.push(result);

      // Take intermediate screenshot after important actions
      if (action.type === "navigate" || action.type === "act") {
        try {
          const screenshot = await cdp.screenshot();
          if (!result.screenshot) {
            result.screenshot = screenshot;
          }
        } catch {
          // Screenshot failed, continue
        }
      }

      // Stop if action failed critically
      if (result.status === "failed" && action.type === "navigate") {
        console.error("Critical navigation failure, stopping execution");
        break;
      }
    }

    // Take final screenshot
    try {
      finalScreenshot = await cdp.screenshot();
    } catch {
      // Final screenshot failed
    }

    return {
      success: results.every(r => r.status !== "failed"),
      sessionId,
      actionsExecuted: results,
      finalScreenshot,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (e) {
    console.error("Automation execution failed:", e);
    return {
      success: false,
      sessionId,
      actionsExecuted: results,
      executionTimeMs: Date.now() - startTime,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  } finally {
    cdp.disconnect();
  }
}

// ============= Browserbase API Functions =============

async function createContext(projectId: string, apiKey: string): Promise<ContextResponse> {
  const response = await fetch(`${BROWSERBASE_API_URL}/v1/contexts`, {
    method: "POST",
    headers: {
      "X-BB-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Browserbase context: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function getContext(contextId: string, apiKey: string): Promise<ContextResponse | null> {
  const response = await fetch(`${BROWSERBASE_API_URL}/v1/contexts/${contextId}`, {
    method: "GET",
    headers: {
      "X-BB-API-Key": apiKey,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get context: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function createSession(projectId: string, apiKey: string, contextId?: string): Promise<CreateSessionResponse> {
  const response = await fetch(`${BROWSERBASE_API_URL}/v1/sessions`, {
    method: "POST",
    headers: {
      "X-BB-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId,
      browserSettings: {
        viewport: { width: 1920, height: 1080 },
      },
      keepAlive: true,
      timeout: 300,
      ...(contextId && { contextId }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Browserbase session: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function getSession(sessionId: string, apiKey: string): Promise<SessionResponse> {
  const response = await fetch(`${BROWSERBASE_API_URL}/v1/sessions/${sessionId}`, {
    method: "GET",
    headers: {
      "X-BB-API-Key": apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get session status: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function stopSession(sessionId: string, apiKey: string): Promise<void> {
  const response = await fetch(`${BROWSERBASE_API_URL}/v1/sessions/${sessionId}`, {
    method: "POST",
    headers: {
      "X-BB-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "REQUEST_RELEASE",
      projectId: Deno.env.get("BROWSERBASE_PROJECT_ID"),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to stop session: ${response.status} ${errorText}`);
  }
}

function parseFixPromptToActions(fixPrompt: string, n8nUrl: string): BrowserAction[] {
  const actions: BrowserAction[] = [];

  if (n8nUrl) {
    actions.push({
      type: "navigate",
      url: n8nUrl,
    });

    actions.push({
      type: "wait",
      selector: ".n8n-canvas, [data-testid='canvas'], .vue-flow, .workflow-canvas",
      timeout: 15000,
    });
  }

  // Parse the fix prompt for specific actions
  const stepPatterns = [
    /(?:^|\n)\s*(?:Step\s*)?(\d+)[.):]\s*(.+?)(?=(?:\n\s*(?:Step\s*)?\d+[.):]|\n\n|$))/gi,
    /(?:^|\n)\s*[-•]\s*(.+?)(?=(?:\n\s*[-•]|\n\n|$))/gi,
  ];

  for (const pattern of stepPatterns) {
    const matches = fixPrompt.matchAll(pattern);
    for (const match of matches) {
      const instruction = match[2] || match[1];
      if (instruction && instruction.trim()) {
        const skipPhrases = [
          "success criteria",
          "failure indicators",
          "verification",
          "expected outcome",
          "note:",
          "important:",
        ];
        
        const lowerInstruction = instruction.toLowerCase().trim();
        if (!skipPhrases.some(phrase => lowerInstruction.startsWith(phrase))) {
          actions.push({
            type: "act",
            instruction: instruction.trim(),
          });
        }
      }
    }
  }

  if (actions.length <= 2) {
    actions.push({
      type: "act",
      instruction: `Follow these instructions to fix the workflow: ${fixPrompt.substring(0, 2000)}`,
    });
  }

  actions.push({
    type: "screenshot",
  });

  return actions;
}

// ============= Main Server =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY");
  const BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Browserbase credentials not configured. Please add BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID secrets.",
        credentialsConfigured: false,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: AutomationRequest = await req.json();
    const { action, fixPrompt, n8nInstanceUrl, workflowId, workflowName, sessionId, contextId, actions: providedActions, connectUrl } = body;

    console.log(`Browserbase automation action: ${action}`, { workflowId, workflowName, sessionId, contextId });

    switch (action) {
      case "create-context": {
        const context = await createContext(BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY);
        console.log(`Created persistent context ${context.id}`);

        return new Response(
          JSON.stringify({
            success: true,
            contextId: context.id,
            message: "Persistent context created.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-context": {
        if (!contextId) {
          return new Response(
            JSON.stringify({ success: false, error: "contextId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const context = await getContext(contextId, BROWSERBASE_API_KEY);
        
        if (!context) {
          return new Response(
            JSON.stringify({ success: false, exists: false, message: "Context not found or expired" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            exists: true,
            contextId: context.id,
            createdAt: context.createdAt,
            updatedAt: context.updatedAt,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "start": {
        if (!fixPrompt || !n8nInstanceUrl) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Missing required fields: fixPrompt and n8nInstanceUrl are required",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const session = await createSession(BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, contextId);
        const browserActions = parseFixPromptToActions(fixPrompt, n8nInstanceUrl);

        console.log(`Created session ${session.id} with ${browserActions.length} actions`);

        return new Response(
          JSON.stringify({
            success: true,
            sessionId: session.id,
            contextId: session.contextId || contextId,
            debugUrl: `https://www.browserbase.com/sessions/${session.id}`,
            connectUrl: session.connectUrl,
            status: "running",
            actions: browserActions,
            message: `Session created. ${browserActions.length} actions queued.`,
            authPersisted: !!contextId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        if (!sessionId) {
          return new Response(
            JSON.stringify({ success: false, error: "sessionId is required for status check" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const session = await getSession(sessionId, BROWSERBASE_API_KEY);

        const statusMap: Record<string, string> = {
          RUNNING: "running",
          ERROR: "failed",
          TIMED_OUT: "failed",
          COMPLETED: "completed",
        };

        return new Response(
          JSON.stringify({
            success: true,
            sessionId: session.id,
            debugUrl: `https://www.browserbase.com/sessions/${session.id}`,
            status: statusMap[session.status] || "unknown",
            browserbaseStatus: session.status,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "stop": {
        if (!sessionId) {
          return new Response(
            JSON.stringify({ success: false, error: "sessionId is required to stop session" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await stopSession(sessionId, BROWSERBASE_API_KEY);

        return new Response(
          JSON.stringify({
            success: true,
            sessionId,
            status: "stopped",
            message: "Session stopped successfully",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "execute": {
        if (!sessionId || !providedActions || !connectUrl) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "sessionId, actions, and connectUrl are required for execution",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!LOVABLE_API_KEY) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "LOVABLE_API_KEY not configured for AI action interpretation",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Executing ${providedActions.length} actions on session ${sessionId}`);

        const executionResult = await executeAutomation(
          connectUrl,
          providedActions,
          sessionId,
          LOVABLE_API_KEY
        );

        return new Response(
          JSON.stringify({
            success: executionResult.success,
            sessionId,
            status: executionResult.success ? "completed" : "failed",
            actionsExecuted: executionResult.actionsExecuted,
            finalScreenshot: executionResult.finalScreenshot,
            executionTimeMs: executionResult.executionTimeMs,
            error: executionResult.error,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown action: ${action}. Valid actions are: start, status, stop, execute, create-context, get-context`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Browserbase automation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
