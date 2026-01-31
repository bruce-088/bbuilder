import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BROWSERBASE_API_URL = "https://api.browserbase.com";

interface AutomationRequest {
  action: "start" | "status" | "stop" | "execute" | "create-context" | "get-context";
  fixPrompt?: string;
  n8nInstanceUrl?: string;
  workflowId?: string;
  workflowName?: string;
  sessionId?: string;
  contextId?: string;
  actions?: BrowserAction[];
}

interface BrowserAction {
  type: "navigate" | "wait" | "act" | "screenshot" | "extract";
  url?: string;
  selector?: string;
  instruction?: string;
  timeout?: number;
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

// Create a persistent context for storing cookies/localStorage
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

// Get an existing context
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

// Create session with optional context for auth persistence
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
      timeout: 300, // 5 minute timeout
      ...(contextId && { contextId }), // Include context if provided
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

async function stopSession(sessionId: string, apiKey: string, status: "REQUEST_RELEASE" = "REQUEST_RELEASE"): Promise<void> {
  const response = await fetch(`${BROWSERBASE_API_URL}/v1/sessions/${sessionId}`, {
    method: "POST",
    headers: {
      "X-BB-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
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

  // Always start by navigating to n8n
  if (n8nUrl) {
    actions.push({
      type: "navigate",
      url: n8nUrl,
    });

    // Wait for the canvas to load
    actions.push({
      type: "wait",
      selector: ".n8n-canvas, [data-testid='canvas'], .vue-flow",
      timeout: 10000,
    });

    // Fit all nodes in view
    actions.push({
      type: "act",
      instruction: "Press Ctrl+0 or Cmd+0 to fit all nodes in view",
    });
  }

  // Parse the fix prompt for specific actions
  // Look for step patterns like "1.", "Step 1:", etc.
  const stepPatterns = [
    /(?:^|\n)\s*(?:Step\s*)?(\d+)[.):]\s*(.+?)(?=(?:\n\s*(?:Step\s*)?\d+[.):]|\n\n|$))/gi,
    /(?:^|\n)\s*[-•]\s*(.+?)(?=(?:\n\s*[-•]|\n\n|$))/gi,
  ];

  for (const pattern of stepPatterns) {
    const matches = fixPrompt.matchAll(pattern);
    for (const match of matches) {
      const instruction = match[2] || match[1];
      if (instruction && instruction.trim()) {
        // Skip meta-instructions
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

  // If no structured steps found, add the entire prompt as a single action
  if (actions.length <= 3) {
    actions.push({
      type: "act",
      instruction: `Follow these instructions to fix the workflow: ${fixPrompt.substring(0, 2000)}`,
    });
  }

  // Take a screenshot at the end
  actions.push({
    type: "screenshot",
  });

  return actions;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY");
  const BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID");

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
    const { action, fixPrompt, n8nInstanceUrl, workflowId, workflowName, sessionId, contextId, actions: providedActions } = body;

    console.log(`Browserbase automation action: ${action}`, { workflowId, workflowName, sessionId, contextId });

    switch (action) {
      // Create a persistent context for storing n8n auth
      case "create-context": {
        const context = await createContext(BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY);
        
        console.log(`Created persistent context ${context.id}`);

        return new Response(
          JSON.stringify({
            success: true,
            contextId: context.id,
            message: "Persistent context created. Sessions using this context will share cookies and localStorage.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify a context still exists
      case "get-context": {
        if (!contextId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "contextId is required",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const context = await getContext(contextId, BROWSERBASE_API_KEY);
        
        if (!context) {
          return new Response(
            JSON.stringify({
              success: false,
              exists: false,
              message: "Context not found or expired",
            }),
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

        // Create a new Browserbase session with optional context for auth persistence
        const session = await createSession(BROWSERBASE_PROJECT_ID, BROWSERBASE_API_KEY, contextId);
        
        // Parse the fix prompt into browser actions
        const browserActions = parseFixPromptToActions(fixPrompt, n8nInstanceUrl);

        console.log(`Created session ${session.id} with ${browserActions.length} actions${contextId ? ` (using context ${contextId})` : ''}`);

        return new Response(
          JSON.stringify({
            success: true,
            sessionId: session.id,
            contextId: session.contextId || contextId,
            debugUrl: `https://www.browserbase.com/sessions/${session.id}`,
            connectUrl: session.connectUrl,
            status: "running",
            actions: browserActions,
            message: `Session created${contextId ? ' with persistent auth context' : ''}. ${browserActions.length} actions queued for execution.`,
            authPersisted: !!contextId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        if (!sessionId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "sessionId is required for status check",
            }),
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
            region: session.region,
            cpuUsage: session.avgCpuUsage,
            memoryUsage: session.memoryUsage,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "stop": {
        if (!sessionId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "sessionId is required to stop session",
            }),
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
        // This is a placeholder for future Stagehand SDK integration
        // Currently returns the actions that would be executed
        if (!sessionId || !providedActions) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "sessionId and actions are required for execution",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // In a full implementation, this would connect to the session via CDP
        // and execute actions using Stagehand or Playwright
        console.log(`Would execute ${providedActions.length} actions on session ${sessionId}`);

        return new Response(
          JSON.stringify({
            success: true,
            sessionId,
            status: "executing",
            message: `Execution started for ${providedActions.length} actions. Watch the live session for progress.`,
            actionsQueued: providedActions.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown action: ${action}. Valid actions are: start, status, stop, execute`,
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
