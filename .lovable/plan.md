

# In-App Visual Workflow Engine with Multi-Agent Nodes

Build a full visual workflow builder inside Mya that replaces the dependency on n8n. Each node on the canvas is powered by its own AI agent that can autonomously execute its task -- like having a team of specialists working together.

## What You'll Get

- A new "Workflows" page with a visual drag-and-drop canvas
- Pre-built node types: Trigger, AI Agent, HTTP Request, Email, Filter, Code, Delay, Slack, Google Sheets, CRM
- Each node has a dedicated AI agent that understands its job and executes it autonomously
- Real-time execution view: watch data flow node-to-node with live status, logs, and outputs
- Workflow templates from the existing library can be loaded directly onto the canvas
- Execution history persisted to the database

## How It Works

```text
+---------------------------------------------------------------+
|  Workflow Canvas                                    [Run] [Save]|
|                                                                 |
|  [Webhook Trigger] --> [AI: Score Lead] --> [Filter: >70]       |
|       (idle)            (running...)        (pending)           |
|                              |                  |               |
|                         [Output Panel]     [AI: Send Email]     |
|                         Score: 85           (pending)           |
|                         Reason: "High                           |
|                          budget match"                          |
+---------------------------------------------------------------+
|  Node Inspector (right panel)                                   |
|  - Config fields for selected node                              |
|  - AI Agent prompt / behavior                                   |
|  - Test run output                                              |
|  - Execution logs                                               |
+---------------------------------------------------------------+
```

## Architecture

### Phase 1: Canvas and Node System (Core)

**New page: `/workflows`** with a visual canvas built using SVG/HTML positioned elements (no external library needed initially, using the same approach as the existing `WorkflowDiagram` component).

**Node types**, each with a specialized AI agent personality:

| Node Type | Agent Role | Example Behavior |
|-----------|-----------|-----------------|
| Webhook Trigger | Listener | Generates a webhook URL, receives incoming data |
| Schedule Trigger | Timer | Fires on cron/interval schedule |
| AI Agent | Thinker | Custom prompt -- scores leads, writes copy, classifies data |
| HTTP Request | Fetcher | Makes API calls with configurable method/headers/body |
| Email Send | Communicator | Composes and sends emails via Resend/SendGrid |
| Filter/Router | Decision Maker | Routes data based on conditions |
| Code | Executor | Runs user-defined JavaScript transforms |
| Delay | Pacer | Waits a configured duration before passing data |
| Set/Transform | Mapper | Reshapes data between nodes |

**Data model** (new database tables):
- `workflows` -- stores workflow metadata (name, description, owner)
- `workflow_nodes` -- stores each node's type, position, config, and AI prompt
- `workflow_edges` -- stores connections between nodes
- `workflow_executions` -- stores execution runs with status and timing
- `workflow_execution_logs` -- stores per-node execution results, inputs, outputs

### Phase 2: Execution Engine (Edge Function)

A new `workflow-executor` edge function that:

1. Receives a workflow ID and trigger data
2. Topologically sorts nodes by their connections
3. Executes each node sequentially (or in parallel for branching paths)
4. For AI Agent nodes: calls the Lovable AI Gateway with the node's custom prompt + input data
5. For HTTP nodes: makes the configured API call
6. For Filter nodes: evaluates conditions and routes data
7. Passes each node's output as the next node's input
8. Streams progress updates back to the UI via the `workflow_execution_logs` table + Supabase Realtime

### Phase 3: UI Components

**New files to create:**

| File | Purpose |
|------|---------|
| `src/pages/Workflows.tsx` | Main workflow builder page |
| `src/components/WorkflowBuilder/Canvas.tsx` | The visual canvas with pan/zoom |
| `src/components/WorkflowBuilder/NodeRenderer.tsx` | Renders individual nodes on canvas |
| `src/components/WorkflowBuilder/EdgeRenderer.tsx` | Renders SVG connection lines |
| `src/components/WorkflowBuilder/NodeInspector.tsx` | Right-side panel for configuring selected node |
| `src/components/WorkflowBuilder/NodePalette.tsx` | Left-side draggable node type list |
| `src/components/WorkflowBuilder/ExecutionOverlay.tsx` | Shows live execution status on nodes |
| `src/components/WorkflowBuilder/WorkflowToolbar.tsx` | Top bar with run/save/name controls |
| `src/hooks/useWorkflowBuilder.ts` | State management for canvas, nodes, edges |
| `src/hooks/useWorkflowExecution.ts` | Execution trigger and realtime status tracking |
| `src/lib/workflowExecutionEngine.ts` | Client-side helpers for topological sort, validation |
| `supabase/functions/workflow-executor/index.ts` | Backend execution engine |

**Files to modify:**

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/workflows` and `/workflows/:id` routes |
| `src/pages/Dashboard.tsx` | Add "Workflows" navigation link |

### Phase 4: AI Agent Per Node

Each AI Agent node gets:
- A customizable system prompt (e.g., "You are a lead scoring expert...")
- Input schema definition (what data it expects)
- Output schema definition (structured output via tool calling)
- Temperature and model selection
- Execution memory (can reference outputs from previous nodes)

The edge function handles agent execution by:
1. Building a prompt that includes the node's system prompt + incoming data from previous nodes
2. Using tool calling to enforce structured output
3. Returning typed results that downstream nodes can consume

### Database Schema

```text
workflows
  - id (uuid, PK)
  - user_id (uuid, references auth.users)
  - name (text)
  - description (text)
  - is_active (boolean)
  - created_at, updated_at

workflow_nodes
  - id (uuid, PK)
  - workflow_id (uuid, FK)
  - type (text: trigger, ai_agent, http, email, filter, code, delay, transform)
  - name (text)
  - position_x (integer)
  - position_y (integer)
  - config (jsonb: type-specific settings)
  - ai_prompt (text, nullable: for AI agent nodes)
  - ai_model (text, nullable)

workflow_edges
  - id (uuid, PK)
  - workflow_id (uuid, FK)
  - source_node_id (uuid, FK)
  - target_node_id (uuid, FK)
  - source_handle (text)
  - target_handle (text)

workflow_executions
  - id (uuid, PK)
  - workflow_id (uuid, FK)
  - status (text: pending, running, completed, failed)
  - trigger_data (jsonb)
  - started_at, completed_at

workflow_execution_logs
  - id (uuid, PK)
  - execution_id (uuid, FK)
  - node_id (uuid, FK)
  - status (text: pending, running, completed, failed, skipped)
  - input_data (jsonb)
  - output_data (jsonb)
  - error (text)
  - started_at, completed_at
```

### Implementation Sequence

Since this is a large feature, it will be built in stages:

1. **Database tables + RLS policies** -- set up the data layer
2. **Canvas UI** -- drag-and-drop node placement, connection drawing, pan/zoom
3. **Node Inspector** -- configure each node type's settings and AI prompt
4. **Save/Load** -- persist workflows to the database
5. **Execution engine** -- the edge function that runs the workflow
6. **Realtime execution view** -- watch nodes light up as they execute
7. **Template import** -- load existing workflow templates onto the canvas

