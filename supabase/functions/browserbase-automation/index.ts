import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

// Declare EdgeRuntime global for Supabase Edge Functions
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BROWSERBASE_API_URL = "https://api.browserbase.com";
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Initialize Supabase client for job tracking
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============= Types =============

interface AutomationRequest {
  action: "start" | "status" | "stop" | "execute" | "create-context" | "get-context" | "check-credentials" | "job-status";
  fixPrompt?: string;
  n8nInstanceUrl?: string;
  workflowId?: string;
  workflowName?: string;
  sessionId?: string;
  contextId?: string;
  actions?: BrowserAction[];
  connectUrl?: string;
  jobId?: string;
  userId?: string;
}

interface AutomationJob {
  id: string;
  user_id: string;
  session_id: string;
  status: "pending" | "running" | "completed" | "failed";
  total_actions: number;
  completed_actions: number;
  current_action: string | null;
  results: ActionResult[];
  error: string | null;
  created_at: string;
  updated_at: string;
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

// ============= n8n Selector Fallback Map =============

// Robust selector mappings for n8n UI elements with fallbacks
// Priority: data-testid → ARIA roles → class-based → text-based → generic fallbacks
const N8N_SELECTORS: Record<string, string[]> = {
  // ============= Credential Modals =============
  
  // Credential save buttons
  "credential-save": [
    'button[data-testid="credential-save-button"]',
    'button[data-testid="save-credential-button"]',
    'button.n8n-button--primary:has-text("Save")',
    'button.btn--primary:has-text("Save")',
    '.credential-modal button[type="submit"]',
    'button:has-text("Save")',
    '.modal-content button.primary',
  ],
  
  // Credential modal container
  "credential-modal": [
    '[data-testid="credential-edit-dialog"]',
    '[data-testid="credential-modal"]',
    '.credential-modal',
    '[role="dialog"]:has(.credential)',
    '.modal-content:has([data-testid*="credential"])',
    '.el-dialog:has(.credential)',
  ],
  
  // Credential input fields (standard text inputs)
  "credential-input": [
    '[data-testid="parameter-input-field"]',
    '.credential-parameter input',
    '.parameter-input-list input[type="text"]',
    '.credential-input input',
    '[data-testid*="parameter-input-"] input',
    '.n8n-input-field input',
  ],
  
  // Credential secret/password inputs
  "credential-secret-input": [
    '[data-testid="parameter-input-field"][type="password"]',
    'input[type="password"]',
    '.credential-parameter input[type="password"]',
    '[data-testid*="secret"] input',
    '[data-testid*="apiKey"] input',
    '[data-testid*="password"] input',
    '.sensitive-input input',
  ],
  
  // Test connection button
  "credential-test-button": [
    '[data-testid="credential-test-button"]',
    'button:has-text("Test")',
    'button:has-text("Test Connection")',
    '.credential-test-btn',
    'button[data-testid="test-connection"]',
  ],
  
  // Credential type selection dropdown
  "credential-type-select": [
    '[data-testid="new-credential-type-select"]',
    '[data-testid="credential-type-select"]',
    '.credential-type-select',
    '[role="combobox"]:has-text("Select Credential")',
    '.credential-selector-dropdown',
  ],
  
  // Credential dropdown in node config
  "credential-dropdown": [
    '[data-testid="credential-select"]',
    '.credential-selector',
    '.n8n-credential-select',
    '.parameter-input-list .n8n-select',
    '[data-testid="node-credential-select"]',
  ],
  
  // ============= Expression Editors =============
  
  // Expression editor input (CodeMirror-based)
  "expression-editor": [
    '[data-testid="inline-expression-editor-input"]',
    '[data-testid="expression-editor"]',
    '.expression-editor .cm-content',
    '.cm-editor .cm-content',
    '.inline-expression-editor',
    '.expression-input .cm-line',
    '.expression-editor-input',
  ],
  
  // Toggle to switch between fixed/expression mode
  "expression-toggle": [
    '[data-testid="expression-toggle"]',
    'button[title="Expression"]',
    '.expression-toggle',
    '[aria-label="Toggle expression"]',
    'button.expression-mode-toggle',
    '[data-testid="switch-expression"]',
  ],
  
  // ============= Code Nodes =============
  
  // Code node editor area
  "code-editor": [
    '[data-testid="code-node-tab-code"]',
    '[data-testid="code-editor"]',
    '.code-node-editor .cm-content',
    '.cm-editor[data-language]',
    '.monaco-editor textarea',
    '.code-node .cm-content',
    '[data-testid="code-input"] .cm-content',
  ],
  
  // Code node tab buttons (Code/Settings tabs)
  "code-node-tab": [
    '[data-testid="code-node-tab"]',
    '.code-node-tabs button',
    '[role="tab"]:has-text("Code")',
    '.n8n-tabs button',
    '[data-testid="ndv-tab-code"]',
  ],
  
  // Code language selector (JavaScript/Python)
  "code-language-select": [
    '[data-testid="code-language-select"]',
    '.code-node-language-select',
    '[data-testid="select-language"]',
    '.language-selector',
    '[data-testid="code-mode-select"]',
  ],
  
  // ============= Node Configuration =============
  
  // Generic parameter input fields
  "parameter-input": [
    '[data-testid="parameter-input-field"]',
    '.parameter-input input',
    '.parameter-input textarea',
    '.n8n-input input',
    '[data-testid*="input-field"]',
    '.n8n-input-field input',
  ],
  
  // Parameter labels/names
  "parameter-label": [
    '[data-testid="parameter-label"]',
    '.parameter-label',
    '.parameter-name',
    'label.n8n-input-label',
    '.parameter-heading',
  ],
  
  // Add option/field buttons
  "add-option-button": [
    '[data-testid="add-option-button"]',
    'button:has-text("Add Option")',
    'button:has-text("Add Field")',
    '.add-option',
    '[data-testid="add-field"]',
    'button.add-option-button',
  ],
  
  // Collection/array items
  "collection-item": [
    '[data-testid="collection-item"]',
    '.collection-parameter-item',
    '.parameter-collection-item',
    '.n8n-collection-item',
    '.collection-entry',
  ],
  
  // Resource locator component
  "resource-selector": [
    '[data-testid="resource-locator"]',
    '[data-testid="resource-select"]',
    '.resource-locator',
    '.rlc-input',
    '[data-testid="rlc-container"]',
    '.resource-locator-container',
  ],
  
  // Dropdown inputs
  "dropdown-input": [
    'div.n8n-input.n8n-dropdown-input',
    '.n8n-select .n8n-input',
    'div.n8n-input-container input',
    '.el-select input',
    'input.n8n-input',
    '[role="combobox"]',
    '.parameter-input input',
  ],
  
  // Dropdown items
  "dropdown-item": [
    'div.n8n-dropdown-item.n8n-dropdown-item--with-description',
    '.n8n-dropdown-item',
    '.el-select-dropdown__item',
    '.n8n-option',
    '[role="option"]',
    '.dropdown-item',
    'li.select-option',
  ],
  
  // Input fields
  "text-input": [
    'input.n8n-input',
    '.n8n-input input',
    'input[type="text"]',
    '.parameter-input input',
    'textarea.n8n-input',
  ],
  
  // ============= NDV (Node Details View) =============
  
  // NDV container
  "ndv-container": [
    '[data-testid="ndv-container"]',
    '.ndv-body',
    '.node-details-view',
    '[data-testid="node-details-view"]',
    '.ndv-wrapper',
  ],
  
  // Node panel (alias for ndv-container)
  "node-panel": [
    '[data-testid="ndv-container"]',
    '.ndv-body',
    '.node-details-view',
    '.n8n-node-panel',
  ],
  
  // NDV close/back button
  "ndv-close": [
    '[data-testid="ndv-close-button"]',
    '[data-testid="back-to-canvas"]',
    '.ndv-close',
    'button[aria-label="Close"]',
    '.ndv-back-button',
  ],
  
  // NDV output panel
  "ndv-output-panel": [
    '[data-testid="ndv-output-panel"]',
    '.output-panel',
    '.ndv-output',
    '[data-testid="output-panel"]',
    '.output-data-panel',
  ],
  
  // NDV input panel
  "ndv-input-panel": [
    '[data-testid="ndv-input-panel"]',
    '.input-panel',
    '.ndv-input',
    '[data-testid="input-panel"]',
    '.input-data-panel',
  ],
  
  // Run data tabs
  "run-data-tab": [
    '[data-testid="run-data-tab"]',
    '[role="tab"]:has-text("Output")',
    '.run-data-tabs [role="tab"]',
    '[data-testid="output-data-tab"]',
  ],
  
  // ============= Workflow Canvas =============
  
  // Canvas/workflow area
  "canvas": [
    '.vue-flow',
    '.n8n-canvas',
    '[data-testid="canvas"]',
    '.workflow-canvas',
  ],
  
  // Add node button
  "add-node-button": [
    '[data-testid="add-node-button"]',
    '[data-testid="canvas-add-node"]',
    'button[title="Add node"]',
    '.add-node-button',
    '[data-testid="canvas-plus-button"]',
  ],
  
  // Node creator/search panel
  "node-creator": [
    '[data-testid="node-creator"]',
    '.node-creator',
    '[data-testid="nodes-panel"]',
    '.nodes-list-panel',
  ],
  
  // Node creator search bar
  "node-creator-search": [
    '[data-testid="node-creator-search-bar"]',
    '.node-creator-search input',
    'input[placeholder*="Search"]',
    '[data-testid="search-nodes"]',
    '.node-search-input',
  ],
  
  // Canvas node elements
  "canvas-node": [
    '[data-testid*="canvas-node-"]',
    '.vue-flow__node',
    '.n8n-node',
    '[data-node-name]',
    '.workflow-node',
  ],
  
  // ============= Buttons =============
  
  // Execute button
  "execute-button": [
    'button[data-testid="execute-node-button"]',
    'button[data-testid="execute"]',
    '.execute-button',
    'button:has-text("Execute")',
    'button:has-text("Test")',
  ],
  
  // Workflow save
  "workflow-save": [
    'button[data-testid="workflow-save-button"]',
    'button[data-testid="save-button"]',
    '.workflow-save-button',
    'button:has-text("Save")',
  ],
  
  // Close/cancel buttons
  "close-modal": [
    'button[data-testid="close-modal"]',
    '.modal-close',
    'button.close',
    '[aria-label="Close"]',
    'button:has-text("Cancel")',
  ],
  
  // ============= Settings & Toggles =============
  
  // Settings tab
  "settings-tab": [
    '[data-testid="settings-tab"]',
    '[role="tab"]:has-text("Settings")',
    'button:has-text("Settings")',
    '[data-testid="ndv-tab-settings"]',
  ],
  
  // Toggle switches
  "toggle-switch": [
    '[data-testid="toggle"]',
    '.n8n-switch',
    '[role="switch"]',
    '.el-switch',
    '.n8n-toggle',
  ],
  
  // Checkboxes
  "checkbox": [
    '[data-testid="checkbox"]',
    '.n8n-checkbox',
    'input[type="checkbox"]',
    '[role="checkbox"]',
    '.el-checkbox',
  ],
};

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
  private targetSessionId: string | null = null;

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
    
    // Include sessionId for target-level commands (not Target.* or Browser.*)
    const needsSession = !method.startsWith("Target.") && !method.startsWith("Browser.");
    const message = JSON.stringify({ 
      id, 
      method, 
      params,
      ...(needsSession && this.targetSessionId && { sessionId: this.targetSessionId }),
    });

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

  async attachToPage(): Promise<void> {
    console.log("CDP: Attaching to page target...");
    
    // Get all available targets
    const { targetInfos } = await this.send("Target.getTargets") as { 
      targetInfos: Array<{ targetId: string; type: string; url: string }> 
    };
    
    console.log(`CDP: Found ${targetInfos.length} targets:`, targetInfos.map(t => `${t.type}: ${t.url}`));
    
    // Find a page target (prefer non-empty URLs)
    const pageTarget = targetInfos.find(t => t.type === "page" && t.url && !t.url.startsWith("about:")) 
      || targetInfos.find(t => t.type === "page");
    
    if (!pageTarget) {
      throw new Error("No page target found in browser session");
    }
    
    console.log(`CDP: Attaching to page target: ${pageTarget.targetId} (${pageTarget.url})`);
    
    // Attach to the page target with flatten: true for simpler messaging
    const { sessionId } = await this.send("Target.attachToTarget", {
      targetId: pageTarget.targetId,
      flatten: true,
    }) as { sessionId: string };
    
    this.targetSessionId = sessionId;
    console.log(`CDP: Attached to page target with sessionId: ${sessionId}`);
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

  // Try multiple selectors with fallbacks - returns first match
  async waitForAnySelector(selectors: string[], timeout = 10000): Promise<{ nodeId: number; backendNodeId: number; matchedSelector: string }> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      for (const selector of selectors) {
        try {
          const result = await this.querySelector(selector);
          if (result) {
            console.log(`CDP: Found selector "${selector}" (fallback match)`);
            return { ...result, matchedSelector: selector };
          }
        } catch {
          // Continue to next selector
        }
      }
      await new Promise(r => setTimeout(r, 300));
    }
    
    throw new Error(`Timeout waiting for any of ${selectors.length} selectors: ${selectors.slice(0, 3).join(", ")}...`);
  }

  // Resolve a selector key to its fallback array, or return the original selector
  resolveSelectors(selectorOrKey: string): string[] {
    // CRITICAL: Check for invalid n8n: selector combinations
    // The AI sometimes generates "n8n:canvas-node[data-node-name="IF"]" which is invalid
    if (selectorOrKey.startsWith("n8n:") && selectorOrKey.includes("[")) {
      console.warn(`CDP: Invalid n8n selector combination detected: ${selectorOrKey}`);
      // Extract the attribute part and try to use it directly
      const attrMatch = selectorOrKey.match(/\[([^\]]+)\]/);
      if (attrMatch) {
        console.log(`CDP: Extracting attribute selector: [${attrMatch[1]}]`);
        return [`[${attrMatch[1]}]`];
      }
      // If no attribute found, extract just the n8n key and use its fallbacks
      const keyPart = selectorOrKey.match(/^n8n:([\w-]+)/);
      if (keyPart && N8N_SELECTORS[keyPart[1]]) {
        console.log(`CDP: Falling back to n8n:${keyPart[1]} selectors`);
        return N8N_SELECTORS[keyPart[1]];
      }
    }
    
    // Check if this matches an n8n selector key pattern
    const keyMatch = selectorOrKey.match(/^n8n:([\w-]+)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      return N8N_SELECTORS[key] || [selectorOrKey];
    }
    
    // Check if the selector itself is in our known selectors
    for (const [key, selectors] of Object.entries(N8N_SELECTORS)) {
      if (selectors.includes(selectorOrKey)) {
        console.log(`CDP: Detected n8n selector, using fallbacks for "${key}"`);
        return selectors;
      }
    }
    
    // Return as single-item array
    return [selectorOrKey];
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
    
    // Resolve to fallback selectors if available
    const selectors = this.resolveSelectors(selector);
    
    // Try each selector with fallbacks
    let node: { nodeId: number; backendNodeId: number } | null = null;
    let lastError: Error | null = null;
    
    for (const sel of selectors) {
      try {
        node = await this.waitForSelector(sel, selectors.length > 1 ? 3000 : 5000);
        if (node) {
          console.log(`CDP: Using selector "${sel}"`);
          break;
        }
      } catch (e) {
        lastError = e as Error;
        console.log(`CDP: Selector "${sel}" not found, trying next...`);
      }
    }
    
    if (!node) {
      throw lastError || new Error(`No matching selector found for: ${selector}`);
    }
    
    // Get element position
    const box = await this.getBoxModel(node.nodeId);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // Scroll element into view
    await this.send("DOM.scrollIntoViewIfNeeded", { nodeId: node.nodeId });
    await new Promise(r => setTimeout(r, 300));

    // Dispatch mouse events
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
    });
    
    await new Promise(r => setTimeout(r, 50));
    
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

// ============= Login Detection =============

async function checkLoginStatus(cdp: CDPClient): Promise<{ isLoggedIn: boolean; isLoginPage: boolean; hasCanvas: boolean }> {
  try {
    // Check for login page indicators
    const isLoginPage = await cdp.evaluate<boolean>(`
      !!(document.querySelector('[data-testid="sign-in-form"]') || 
         document.querySelector('.login-form') || 
         document.querySelector('input[name="email"][type="email"]') ||
         document.querySelector('form[action*="login"]') ||
         document.querySelector('[data-testid="login-button"]'))
    `);
    
    // Check for n8n canvas presence (indicates logged in)
    const hasCanvas = await cdp.evaluate<boolean>(`
      !!(document.querySelector('.vue-flow') || 
         document.querySelector('[data-testid="canvas"]') || 
         document.querySelector('.n8n-canvas') ||
         document.querySelector('.workflow-canvas') ||
         document.querySelector('[data-testid*="canvas-node"]'))
    `);
    
    // Additional check for n8n header/navigation (indicates app is loaded)
    const hasAppChrome = await cdp.evaluate<boolean>(`
      !!(document.querySelector('[data-testid="main-sidebar"]') ||
         document.querySelector('.n8n-menu') ||
         document.querySelector('[data-testid="workflow-name"]'))
    `);
    
    return {
      isLoggedIn: hasCanvas || hasAppChrome,
      isLoginPage,
      hasCanvas,
    };
  } catch (e) {
    console.error("CDP: Login check failed", e);
    return { isLoggedIn: false, isLoginPage: false, hasCanvas: false };
  }
}

// ============= AI Action Interpreter =============

async function interpretAction(
  instruction: string,
  pageContext: { url: string; title: string },
  apiKey: string
): Promise<CDPStep[]> {
  console.log(`AI: Interpreting action: "${instruction.substring(0, 100)}..."`);

  const systemPrompt = `You are a browser automation expert specializing in n8n workflow automation. Convert natural language instructions into precise CDP steps.

Available step types:
- click: Click an element. Use CSS selectors or "n8n:key" shortcuts.
- type: Type text into an input. Provide selector and text.
- waitForSelector: Wait for an element. Provide selector and optional timeout.
- press: Press a keyboard key (Enter, Tab, Escape, ArrowDown, etc.).
- scroll: Scroll the page. Provide direction (up/down).
- evaluate: Run JavaScript. Provide expression.

**CRITICAL: n8n SELECTOR SHORTCUTS** - Use these for reliable element targeting with built-in fallbacks:

// Credential Modals
- "n8n:credential-modal" → Credential edit dialog container
- "n8n:credential-input" → Standard credential field inputs
- "n8n:credential-secret-input" → Password/API key/secret fields
- "n8n:credential-test-button" → Test connection button
- "n8n:credential-type-select" → Credential type dropdown
- "n8n:credential-dropdown" → Credential selection in node config
- "n8n:credential-save" → Save button in credential modals

// Expression Editors (CodeMirror-based)
- "n8n:expression-editor" → CodeMirror expression input field
- "n8n:expression-toggle" → Toggle between fixed value and expression mode

// Code Nodes
- "n8n:code-editor" → Code node editor area (CodeMirror/Monaco)
- "n8n:code-node-tab" → Code/Settings tab buttons
- "n8n:code-language-select" → JavaScript/Python language selector

// Node Configuration
- "n8n:parameter-input" → Any parameter input field
- "n8n:parameter-label" → Parameter labels/names
- "n8n:add-option-button" → Add optional field buttons
- "n8n:collection-item" → Collection/array items
- "n8n:resource-selector" → Resource locator component
- "n8n:dropdown-input" → Dropdown input fields
- "n8n:dropdown-item" → Items in dropdown menus
- "n8n:text-input" → Text input fields

// NDV (Node Details View)
- "n8n:ndv-container" → Full node details panel
- "n8n:node-panel" → Node details panel (alias)
- "n8n:ndv-close" → Back to canvas / close button
- "n8n:ndv-output-panel" → Output data panel
- "n8n:ndv-input-panel" → Input data panel
- "n8n:run-data-tab" → Run data tabs (Output/Input)

// Workflow Canvas
- "n8n:canvas" → Workflow canvas area
- "n8n:add-node-button" → Add node to canvas button
- "n8n:node-creator" → Node creator/search panel
- "n8n:node-creator-search" → Search bar for nodes
- "n8n:canvas-node" → Any node on the canvas

// Buttons
- "n8n:execute-button" → Execute/test node button
- "n8n:workflow-save" → Save workflow button
- "n8n:close-modal" → Close/cancel modal buttons

// Settings & Toggles
- "n8n:settings-tab" → Settings tab button
- "n8n:toggle-switch" → Toggle switches
- "n8n:checkbox" → Checkbox inputs

**n8n UI PATTERNS:**
- Credential modals: Wait for "n8n:credential-modal", fill "n8n:credential-input" fields, click "n8n:credential-save"
- Expression editors: Click "n8n:expression-toggle" first, then interact with "n8n:expression-editor"
- Code nodes: Select "n8n:code-node-tab", then type in "n8n:code-editor"
- Dropdowns: Click "n8n:dropdown-input", wait 500ms, click "n8n:dropdown-item"
- Node config: Open "n8n:node-panel", use parameter selectors for fields
- After clicking dropdowns, use ArrowDown + Enter for selection if click fails

**CRITICAL SELECTOR RULES:**
1. n8n: shortcuts CANNOT have additional CSS qualifiers
   ❌ WRONG: "n8n:canvas-node[data-node-name="IF"]"
   ❌ WRONG: "n8n:credential-modal .input"
   ✅ CORRECT: "n8n:canvas-node" OR "[data-testid="canvas-node-IF"]"
   ✅ CORRECT: Use separate steps for container then input

2. For clicking specific nodes on canvas by name, use evaluate():
   { "action": "evaluate", "expression": "document.querySelectorAll('[data-node-name]').forEach(el => { if(el.textContent.includes('IF')) el.click(); })" }

3. n8n: shortcuts expand to fallback arrays - never combine them with CSS qualifiers!

**CODEMIRROR HANDLING:**
- CodeMirror editors (.cm-content) require special handling
- First click to focus, then use Input.insertText for typing
- Cannot use standard type() directly on CodeMirror

**ROBUST APPROACH:**
1. Always wait for elements before interacting (500-1000ms)
2. Use n8n: shortcuts when targeting n8n UI elements
3. For dropdowns, add a small delay between opening and selecting
4. If a button might not be visible, scroll first
5. For CodeMirror editors, click first then insert text
6. NEVER combine n8n: shortcuts with additional CSS qualifiers

Return ONLY a valid JSON array. Example:
[
  { "action": "waitForSelector", "selector": "n8n:credential-modal", "timeout": 5000 },
  { "action": "click", "selector": "n8n:credential-input" },
  { "action": "type", "selector": "n8n:credential-input", "text": "my-api-key" },
  { "action": "click", "selector": "n8n:credential-save" }
]`;

  const userPrompt = `Current page: ${pageContext.url}
Page title: ${pageContext.title}

Instruction: ${instruction}

Generate the CDP steps to accomplish this. Return ONLY a valid JSON array - no markdown, no explanation.`;

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
                if (el.textContent && el.textContent.includes('${text}')) {
                  el.scrollIntoView({ block: 'center' });
                  el.click();
                  break;
                }
              }
            `);
            return;
          }
        }
        
        // Handle :has-text pseudo-selector (similar to :contains)
        if (step.selector.includes(":has-text(")) {
          const match = step.selector.match(/:has-text\(["']?(.+?)["']?\)/);
          if (match) {
            const text = match[1];
            const baseSelector = step.selector.replace(/:has-text\(["']?.+?["']?\)/, "");
            await cdp.evaluate(`
              const elements = document.querySelectorAll('${baseSelector || "*"}');
              for (const el of elements) {
                if (el.textContent && el.textContent.includes('${text}')) {
                  el.scrollIntoView({ block: 'center' });
                  el.click();
                  break;
                }
              }
            `);
            return;
          }
        }
        
        // Use the click method which now has built-in fallback support
        await cdp.click(step.selector);
      }
      break;

    case "type":
      if (step.selector && step.text) {
        // Resolve selectors for type as well
        const selectors = cdp.resolveSelectors(step.selector);
        let typed = false;
        
        for (const sel of selectors) {
          try {
            await cdp.type(sel, step.text);
            typed = true;
            break;
          } catch {
            console.log(`CDP: Type selector "${sel}" not found, trying next...`);
          }
        }
        
        if (!typed) {
          throw new Error(`Could not find input for typing: ${step.selector}`);
        }
      }
      break;

    case "waitForSelector":
      if (step.selector) {
        // Support n8n: prefix in waitForSelector
        const selectors = cdp.resolveSelectors(step.selector);
        if (selectors.length > 1) {
          await cdp.waitForAnySelector(selectors, step.timeout || 10000);
        } else {
          await cdp.waitForSelector(step.selector, step.timeout || 10000);
        }
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
    
    // Attach to a page target before enabling domains
    await cdp.attachToPage();
    
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
        ...(contextId && {
          context: {
            id: contextId,
            persist: true,
          },
        }),
      },
      keepAlive: true,
      timeout: 300,
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

  // ============= Authentication Check =============
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: "Authorization required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create authenticated client to verify token
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`Authenticated user: ${user.id}`);

  // ============= Credentials Check =============
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

    console.log(`Browserbase automation action: ${action} for user: ${user.id}`, { workflowId, workflowName, sessionId, contextId });

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

        // Always use the authenticated user's ID for job tracking and security
        // This ensures users can only create and track their own jobs
        const authenticatedUserId = user.id;

        // Create job record for async execution with authenticated user's ID
        console.log(`Creating job for ${providedActions.length} actions on session ${sessionId} for user ${authenticatedUserId}`);
        
        const { data: job, error: jobError } = await supabase
          .from("automation_jobs")
          .insert({
            user_id: authenticatedUserId,
            session_id: sessionId,
            status: "pending",
            total_actions: providedActions.length,
            completed_actions: 0,
            current_action: null,
            results: [],
          })
          .select()
          .single();

        if (jobError || !job) {
          console.error("Failed to create job:", jobError);
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to create automation job: ${jobError?.message || "Unknown error"}`,
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Created job ${job.id}, starting background execution`);

        // Background execution function
        const executeInBackground = async () => {
          try {
            // Update job to running
            await supabase
              .from("automation_jobs")
              .update({ status: "running" })
              .eq("id", job.id);

            const cdp = new CDPClient();
            const results: ActionResult[] = [];
            let finalScreenshot: string | undefined;

            try {
              await cdp.connect(connectUrl);
              await cdp.attachToPage();
              await cdp.enableDomains();

              // Check login status before proceeding
              const loginStatus = await checkLoginStatus(cdp);
              console.log(`Login status:`, loginStatus);

              if (loginStatus.isLoginPage && !loginStatus.isLoggedIn) {
                // Special error format for auth expiry - will be parsed by frontend
                const authError = new Error("AUTH_EXPIRED: Login page detected - authentication context may have expired.");
                (authError as Error & { code: string }).code = "AUTH_EXPIRED";
                throw authError;
              }

              // Execute each action with progress updates
              for (let i = 0; i < providedActions.length; i++) {
                const action = providedActions[i];
                
                // Update current action
                await supabase
                  .from("automation_jobs")
                  .update({
                    current_action: `${action.type}: ${action.instruction?.substring(0, 50) || action.url || action.selector || ""}...`,
                    completed_actions: i,
                  })
                  .eq("id", job.id);

                console.log(`Job ${job.id}: Executing action ${i + 1}/${providedActions.length}: ${action.type}`);
                
                const result = await executeAction(cdp, action, LOVABLE_API_KEY!);
                results.push(result);

                // Update results in database
                await supabase
                  .from("automation_jobs")
                  .update({
                    results: results,
                    completed_actions: i + 1,
                  })
                  .eq("id", job.id);

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

                // Stop if navigation failed critically
                if (result.status === "failed" && action.type === "navigate") {
                  throw new Error("Critical navigation failure");
                }
              }

              // Take final screenshot
              try {
                finalScreenshot = await cdp.screenshot();
              } catch {
                // Final screenshot failed
              }

              // Mark job as completed
              const success = results.every(r => r.status !== "failed");
              await supabase
                .from("automation_jobs")
                .update({
                  status: success ? "completed" : "failed",
                  results: results,
                  completed_actions: providedActions.length,
                  current_action: null,
                })
                .eq("id", job.id);

              console.log(`Job ${job.id} completed with status: ${success ? "completed" : "failed"}`);
            } finally {
              cdp.disconnect();
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Unknown error";
            const isAuthExpired = errorMessage.startsWith("AUTH_EXPIRED:") || 
                                  (e instanceof Error && (e as Error & { code?: string }).code === "AUTH_EXPIRED");
            
            console.error(`Job ${job.id} failed:`, e, { isAuthExpired });
            
            await supabase
              .from("automation_jobs")
              .update({
                status: isAuthExpired ? "auth_expired" : "failed",
                error: isAuthExpired 
                  ? "Your n8n session has expired. Please clear your saved login and re-authenticate."
                  : errorMessage,
                current_action: null,
              })
              .eq("id", job.id);
          }
        };

        // Start background execution using EdgeRuntime.waitUntil
        // This keeps the function running after we return the response
        EdgeRuntime.waitUntil(executeInBackground());

        // Return immediately with job ID
        return new Response(
          JSON.stringify({
            success: true,
            jobId: job.id,
            sessionId,
            status: "pending",
            message: `Execution started. ${providedActions.length} actions queued. Poll job-status for updates.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "job-status": {
        const { jobId } = body;
        
        if (!jobId) {
          return new Response(
            JSON.stringify({ success: false, error: "jobId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Query with user_id filter to ensure users can only access their own jobs
        const { data: job, error: jobError } = await supabase
          .from("automation_jobs")
          .select("*")
          .eq("id", jobId)
          .eq("user_id", user.id) // Enforce ownership check
          .single();

        if (jobError || !job) {
          return new Response(
            JSON.stringify({ success: false, error: "Job not found or access denied" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            job: {
              id: job.id,
              sessionId: job.session_id,
              status: job.status,
              totalActions: job.total_actions,
              completedActions: job.completed_actions,
              currentAction: job.current_action,
              results: job.results,
              error: job.error,
              createdAt: job.created_at,
              updatedAt: job.updated_at,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check-credentials": {
        // Simply return whether credentials are configured
        return new Response(
          JSON.stringify({
            success: true,
            credentialsConfigured: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown action: ${action}. Valid actions are: start, status, stop, execute, create-context, get-context, check-credentials, job-status`,
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
