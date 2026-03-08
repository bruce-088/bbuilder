export const MASTER_PROMPT = `# Business Builder AI (Mya) — Complete Application Specification

> **Purpose:** This document is the full technical specification for the "Business Builder AI" application (codename: Mya). Paste it into any LLM (ChatGPT, Claude, Gemini) for analysis, then request Lovable-formatted code updates.

---

## 📋 System Overview

**Business Builder AI** is an AI-powered business idea generator, consultant, and launch accelerator for **solopreneurs and introverts**. It generates turn-key online business concepts targeting **$10,000 net profit/month**, then guides users through validation, automation, and first-customer acquisition via a gamified Mission Control system.

### Core Value Proposition
- Generate unique, actionable business ideas tailored for introverts
- Gamified Mission Control with quests, XP, achievements, and daily briefings
- AI consultant "Mya" with voice chat, tool-calling copilot, and cowork mode
- Lead CRM pipeline for prospect management
- Visual Workflow Builder for automation design
- Competitor analysis with differentiation strategies
- Business Plan Bundle export (branded PDF + n8n workflow JSON)
- Master Implementation Prompt generation (4-week roadmap)
- SVG Mind Map visualization of business plans

---

## 🔧 Technology Stack

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS with HSL design tokens (dark theme, purple accent #8B5CF6)
- shadcn/ui component library (all UI primitives)
- Framer Motion animations
- React Router v6 (SPA routing)
- TanStack React Query (data fetching/caching)
- Recharts (charts/graphs)
- react-markdown (rich content rendering)
- jsPDF + jspdf-autotable (PDF generation)
- JSZip (bundle packaging)
- canvas-confetti (celebration effects)

### Backend (Lovable Cloud / Supabase)
- PostgreSQL database with Row Level Security
- Supabase Auth (email/password)
- 22 Deno Edge Functions
- Lovable AI gateway (no external API keys needed for core AI)
- Mem0 for conversation memory persistence

---

## 🏗️ Architecture Patterns

### Authentication Pattern (AuthContext)

\`\`\`typescript
// src/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

// Pattern: Set up onAuthStateChange listener FIRST, then getSession()
// This prevents race conditions with session state
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  });
  supabase.auth.getSession().then(({ data: { session } }) => { ... });
  return () => subscription.unsubscribe();
}, []);
\`\`\`

### AI Streaming Pattern (src/lib/ai.ts)

\`\`\`typescript
// Streams SSE from the chat edge function
export async function streamChat({ messages, type, industry, n8nContext, onDelta, onDone, onError }: StreamChatOptions) {
  const url = \\\`\\\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat\\\`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: \\\`Bearer \\\${authToken}\\\` },
    body: JSON.stringify({ messages, type, industry, n8nContext }),
  });
  // ReadableStream line-by-line parsing of SSE "data: {json}" lines
  // Handles [DONE] sentinel, incomplete JSON buffering, final flush
}
\`\`\`

### RLS Policy Pattern
All user-owned tables enforce \`user_id = auth.uid()\` for SELECT, INSERT, UPDATE, DELETE. This means **authentication is required** for all CRUD operations.

---

## 🤖 Mya AI Copilot — Tool-Calling System

The chat edge function implements a **15-tool autonomous copilot**. Mya can perform database operations directly via natural language using OpenAI-compatible tool calling.

### System Prompt (Mya Persona)
\`\`\`
You are Mya (Mission Yield Accelerator), an expert business consultant for solopreneurs and introverts.
Goal: Help users discover, validate, and launch profitable online businesses generating $10,000+ net profit/month.
Expertise: Online business models, AI automation, fast validation, revenue modeling, n8n workflow design, lead generation.
Tone: Encouraging, practical, specific. Focus on businesses suitable for introverts.
Tool-first approach: When the user asks to DO something (add lead, create workflow, log revenue), USE the tools directly.
\`\`\`

### Copilot Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| \`create_workflow\` | Create automation workflow with nodes | name, description, nodes[] |
| \`add_lead\` | Add lead to CRM pipeline | name, email, company, stage, estimated_value, tags[] |
| \`trigger_workflow\` | Execute a workflow | workflow_name or workflow_id, trigger_data |
| \`list_leads\` | Query CRM pipeline | stage filter, limit |
| \`list_workflows\` | List user's workflows | active_only |
| \`log_revenue\` | Record revenue entry | amount, source, is_recurring, lead_name, notes |
| \`get_revenue_stats\` | MRR, monthly/total revenue, goal progress | (none) |
| \`update_lead\` | Modify lead details | lead_name/id, email, phone, company, tags |
| \`move_lead_stage\` | Change pipeline stage | lead_name/id, new_stage |
| \`log_lead_activity\` | Add note/call/email to timeline | lead_name/id, activity_type, content |
| \`delete_lead\` | Remove from pipeline | lead_name/id |
| \`schedule_workflow\` | Set cron schedule | workflow_name/id, schedule (human-readable) |
| \`delete_workflow\` | Remove workflow | workflow_name/id |
| \`get_pipeline_stats\` | Pipeline analytics | (none) |
| \`get_business_summary\` | Retrieve saved business idea | (none) |

### Tool Execution Pattern
\`\`\`
1. User message → AI decides to call tool(s) via function_call
2. Edge function executes tool against Supabase (server-side, with service role key)
3. Tool result injected as system message → AI generates natural language response
4. Tool results embedded in stream as [TOOL_RESULT:toolName:{json}] markers
5. Frontend parses markers → renders CopilotActionCard components
\`\`\`

---

## 🎯 Feature Specifications

### 1. Mission Control (Gamified Dashboard)

**Quest System** — 5 stages with 9 quests:
| Stage | Title | Quests |
|-------|-------|--------|
| 1 | Foundation | Generate First Plan (100 XP), Save to Library (50 XP) |
| 2 | Validation | Review Quick Start (50 XP), Validate Plan (150 XP) |
| 3 | Build | Create Landing Page (200 XP), Define Offer (100 XP) |
| 4 | Launch | Setup Automation (200 XP), Start Outreach (150 XP) |
| 5 | First Customer | Close First Sale (500 XP) |

**XP Levels:** L1: 0-99, L2: 100-299, L3: 300-599, L4: 600-999, L5: 1000+

**Achievement Badges:** Plan Generator, Plan Keeper, Deep Diver, Automator, Implementer, Deal Closer, Empire Builder

**Components:** DailyBriefing (AI-generated), XPProgress, CountdownTimer, MissionHQCard, TodaysTasks, ActivityFeed, MomentumCard, WhatsNextCard, AchievementBadges

**Hook:** \`useMissionProgress()\` — returns mission, completedQuests, activeQuestId, currentStage, xpEarned, unlockedAchievements, completeQuest(), setActiveQuestId()

### 2. Mya AI Chat

**Features:**
- Streaming markdown responses with ReactMarkdown
- Voice input via ElevenLabs STT, voice output via ElevenLabs TTS
- Voice mode overlay (hands-free conversation loop)
- Cowork mode: Mya interprets screen context → generates Browserbase actions → executes in parallel
- Memory persistence via Mem0 (addMemories, searchMemories, getAllMemories)
- Save business ideas directly from AI messages (regex parsing of structured output)
- Generate n8n workflows from chat context
- CopilotActionCard rendering for tool results
- Image paste support (up to 5 images)

**Message Flow:**
\`\`\`
User types/speaks → ChatMessage saved to DB → streamChat() to edge function
→ SSE stream with deltas → parse tool results → update messages state
→ saveMessage(assistant) → addMemories() to Mem0
\`\`\`

**Hook:** \`useVoiceChat()\` — isRecording, isPlaying, startRecording(), stopRecording(), playAudio(), voice commands
**Hook:** \`useVoiceMode()\` — isActive, toggle(), feedAssistantResponse()
**Hook:** \`useCoworkMode()\` — isActive, toggleCoworkMode(), interpretAndExecute(), currentExecution, browserbaseStatus

### 3. Business Idea Generation

Each idea includes: Business Name, Niche, Target Audience, Value Proposition, Service Offering, Revenue Math ($10K/month path), Fast Validation Path (2-4 weeks), AI Automation Strategy (JSONB)

Support for 15 industry categories. One idea generated at a time for depth.

### 4. Lead CRM Pipeline

**Stages:** captured → qualified → outreach → nurturing → won → lost

**Hook:** \`useLeadManagement()\` returns:
- leads, activities, loading, filters, setFilters
- createLead(), updateLead(), changeStage(), deleteLead(), addActivity()
- getStats() → { total, byStage, totalValue, conversionRate }
- getLeadsByStage() → Record<LeadStage, Lead[]> (for Kanban view)
- STAGES constant
- Realtime subscription on lead_contacts table

**Components:** LeadPipeline (Kanban), LeadCard, LeadDetailPanel, LeadActivityTimeline, AddLeadDialog, SendEmailDialog, LeadStatsCard, WebhookSetupPanel

### 5. Visual Workflow Builder

**Node Types:** webhook_trigger, schedule_trigger, ai_agent, http_request, email_send, filter, code, delay, transform, database_query, loop, merge

**Hook:** \`useWorkflowBuilder(workflowId?)\` returns:
- workflow, nodes, edges, selectedNode, loading, saving
- pan, setPan, zoom, setZoom (canvas state)
- connectingFrom, connectingMousePos (edge creation)
- loadWorkflow(), createWorkflow(), saveWorkflow()
- addNode(type, x, y), updateNode(), deleteNode()
- addEdge(sourceId, targetId), deleteEdge()
- moveNode(id, x, y)

Save strategy: Delete all edges/nodes then re-insert (simple upsert).

**Components:** Canvas (pan/zoom SVG), NodeRenderer, EdgeRenderer, NodePalette (drag source), NodeInspector (config panel), WorkflowToolbar, ExecutionLogPanel, ScheduleConfig

### 6. Automation Engine

- n8n workflow generation and deployment (\`useN8nDeployment\`)
- Browserbase browser automation (\`useBrowserbaseAutomation\`)
- Webhook health monitoring (\`WebhookHealthIndicator\`)
- Live execution status panels (\`N8nLiveStatusPanel\`)
- Smart fix recommendations (\`SmartFixRecommendation\`)
- Fix knowledge base (\`useFixKnowledgeBase\`)
- MCP deployment support (\`MCPDeploymentModal\`)

### 7. Competitor Analysis

**Hook:** \`useCompetitorAnalysis()\` — AI-powered research via competitor-analysis edge function
**Components:** CompetitorAnalysisPanel, CompetitorCard (strengths, weaknesses, features, pricing), DifferentiationSuggestions

### 8. Business Plan Bundle Export

\`\`\`
ZIP contains:
├── BusinessPlan.pdf (branded with purple accents)
├── README.md
├── workflows/
│   ├── master-workflow.json (consolidated n8n)
│   └── stage-{1-4}-workflow.json
└── checklist.json
\`\`\`

Generated by \`src/lib/bundleGenerator.ts\` using JSZip + jsPDF.

---

## 📊 Database Schema (PostgreSQL)

### Core Tables

| Table | Key Columns | RLS |
|-------|-------------|-----|
| \`profiles\` | id, user_id (UNIQUE), display_name, email | user_id = auth.uid() |
| \`conversations\` | id, user_id, title, is_favorite | user_id = auth.uid() |
| \`chat_messages\` | id, conversation_id (FK), user_id, role, content | user_id = auth.uid() |
| \`business_ideas\` | id, user_id, conversation_id (FK), business_name, niche, target_audience, value_proposition, service_offering, revenue_math, validation_path, ai_automation_strategy (JSONB), is_favorite | user_id = auth.uid() |
| \`ai_prompts\` | id, business_idea_id (FK), user_id, prompt_type, prompt_content | user_id = auth.uid() |

### Mission Control Tables

| Table | Key Columns |
|-------|-------------|
| \`user_missions\` | user_id, current_stage, xp_earned, achievements[], active_quest_id (FK→business_ideas), target_date, mission_started_at |
| \`mission_events\` | user_id, event_type, xp_awarded, quest_unlocked, event_data (JSONB) |

### Lead CRM Tables

| Table | Key Columns |
|-------|-------------|
| \`lead_contacts\` | user_id, name, email, phone, company, stage, source, tags[], estimated_value, business_idea_id, custom_fields (JSONB), last_contact_at |
| \`lead_activities\` | lead_id (FK), user_id, activity_type, content, metadata (JSONB) |
| \`revenue_entries\` | user_id, amount, source, entry_date, lead_id (FK), is_recurring, notes |

### Workflow Tables

| Table | Key Columns |
|-------|-------------|
| \`workflows\` | user_id, name, description, is_active |
| \`workflow_nodes\` | workflow_id (FK), type, name, config (JSONB), position_x, position_y, ai_model, ai_prompt |
| \`workflow_edges\` | workflow_id (FK), source_node_id (FK), target_node_id (FK), source_handle, target_handle |
| \`workflow_executions\` | workflow_id (FK), user_id, status, trigger_data (JSONB), started_at, completed_at |
| \`workflow_execution_logs\` | execution_id (FK), node_id (FK), status, input_data, output_data, error |
| \`workflow_schedules\` | workflow_id (FK, UNIQUE), user_id, cron_expression, enabled, next_run_at |

### n8n Integration Tables

| Table | Key Columns |
|-------|-------------|
| \`n8n_deployment_requests\` | user_id, workflow_name, workflow_json (JSONB), business_idea_id, status, n8n_workflow_id |
| \`n8n_execution_logs\` | user_id, workflow_id, execution_id, workflow_name, status, duration_ms, error_message, error_node |
| \`n8n_workflow_stats\` | user_id, workflow_id, workflow_name, total_executions, success_rate, avg_duration_ms |
| \`n8n_workflow_snapshots\` | user_id, workflow_id, workflow_name, nodes (JSONB), connections (JSONB), conversation_id |

### Other Tables

| Table | Purpose |
|-------|---------|
| \`competitor_analyses\` | Competitor research data (strengths, weaknesses, features, pricing) |
| \`differentiation_strategies\` | AI-generated differentiation recommendations |
| \`implementation_progress\` | Section-level completed_steps[] tracking |
| \`setup_guide_progress\` | Onboarding progress (JSONB) |
| \`user_preferences\` | n8n config, fix method, onboarding state |
| \`user_ai_preferences\` | Preferred AI provider, voice settings |
| \`user_api_keys\` | Encrypted API keys (provider, service_type) |
| \`automation_runs\` | Business idea automation execution tracking |
| \`automation_jobs\` | Browserbase session tracking |
| \`fix_knowledge_base\` | Learned fix patterns (node_type, issue_type, root_cause) |

---

## 🔌 Edge Functions (22 Total)

| Function | Method | Request Body | Response |
|----------|--------|-------------|----------|
| \`chat\` | POST (SSE stream) | { messages[], type, industry?, n8nContext? } | SSE: data: {choices[{delta:{content}}]} |
| \`daily-briefing\` | POST | { userId, businessIdea?, completedQuests[] } | { briefing: string } |
| \`generate-n8n-workflow\` | POST | { businessIdea, stage? } | { workflow: n8nJSON } |
| \`generate-n8n-workflow-from-prompt\` | POST | { prompt, context? } | { workflow: n8nJSON } |
| \`competitor-analysis\` | POST | { businessIdea, competitorName? } | { competitors[], strategies[] } |
| \`cowork-interpret\` | POST | { screenshot, userMessage, n8nUrl } | { narration, actions[] } |
| \`diagnose-fix\` | POST | { errorMessage, nodeType, workflowContext } | { diagnosis, fixSteps[] } |
| \`verify-step\` | POST | { step, context } | { verified, notes } |
| \`verify-n8n-workflow\` | POST | { workflowJson } | { valid, issues[] } |
| \`ai-orchestrator\` | POST | { task, steps[] } | { results[] } |
| \`browserbase-automation\` | POST | { actions[], sessionId? } | { results[], debugUrl } |
| \`elevenlabs-stt\` | POST | FormData (audio blob) | { text } |
| \`elevenlabs-tts\` | POST | { text, voiceId? } | audio/mpeg binary |
| \`mem0\` | POST | { action, userId, messages?, query? } | { memories[] } or { success } |
| \`lead-webhook\` | POST | { name, email, source?, ... } | { success, leadId } |
| \`send-lead-email\` | POST | { leadId, subject, body } | { success } |
| \`workflow-executor\` | POST | { workflowId, executionId } | { success, logs[] } |
| \`workflow-scheduler\` | POST | { action } | { scheduled[] } |
| \`n8n-data-proxy\` | POST | { url, method, headers?, body? } | proxied response |
| \`n8n-execution-sync\` | POST | { workflowId } | { executions[] } |
| \`n8n-webhook-health\` | POST | { webhookUrl } | { healthy, latencyMs } |
| \`secure-api-keys\` | POST | { action, provider, key? } | { encrypted } or { key } |
| \`validate-api-key\` | POST | { provider, key } | { valid } |

### AI Models (Lovable AI Gateway — no API key needed)
- Primary: \`google/gemini-3-flash-preview\` (chat, briefings)
- Available: \`google/gemini-2.5-pro\`, \`google/gemini-2.5-flash\`, \`openai/gpt-5\`, \`openai/gpt-5-mini\`, \`openai/gpt-5-nano\`, \`openai/gpt-5.2\`

---

## 🎨 Design System

### CSS Variables (HSL in index.css)
\`\`\`css
:root {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 262.1 83.3% 57.8%;  /* Purple accent */
  --primary-foreground: 0 0% 100%;
  --secondary: 240 3.7% 15.9%;
  --muted: 240 3.7% 15.9%;
  --accent: 240 3.7% 15.9%;
  --border: 240 3.7% 15.9%;
  --card: 240 10% 3.9%;
  --destructive: 0 62.8% 30.6%;
}
\`\`\`

### Visual Identity
- Dark theme default, purple accent gradients and glows
- Frosted glass effects (backdrop-blur)
- Card-based layouts with shadcn Card components
- Framer Motion on interactions (\`motion.div\` with fade/slide)
- canvas-confetti for celebrations (first idea, first sale)
- Custom MYA avatar (purple AI assistant) in \`src/assets/mya-avatar.png\`

---

## 📁 File Structure

\`\`\`
src/
├── App.tsx                          # React Router routes
├── contexts/
│   ├── AuthContext.tsx               # Auth provider (signUp, signIn, signOut)
│   └── MissionIntelligenceContext.tsx # Event-driven quest/XP tracking
├── lib/
│   ├── ai.ts                        # streamChat(), Mem0 functions
│   ├── pdfGenerator.ts              # Business plan PDF
│   ├── masterPromptPdfGenerator.ts  # This spec as PDF
│   ├── masterPromptContent.ts       # This spec as text
│   ├── bundleGenerator.ts           # ZIP bundle export
│   ├── confetti.ts                  # Celebration effects
│   ├── n8nWorkflowFormatter.ts      # n8n JSON formatting
│   ├── workflowTemplates/           # Pre-built workflow templates
│   └── utils.ts                     # cn() helper
├── pages/
│   ├── Landing.tsx      (/)         # Hero, features, CTA
│   ├── Auth.tsx         (/auth)     # Sign in / sign up
│   ├── Dashboard.tsx    (/dashboard)# Mission Control + ideas + conversations
│   ├── Chat.tsx         (/chat/:id) # Streaming AI chat
│   ├── Leads.tsx        (/leads)    # CRM pipeline
│   ├── Workflows.tsx    (/workflows)# Workflow list
│   ├── WorkflowEditor.tsx (/workflows/:id) # Visual builder canvas
│   ├── Compare.tsx      (/compare)  # Side-by-side idea comparison
│   └── ExportPrompt.tsx (/export-prompt) # Master prompt download
├── components/
│   ├── MissionControl/  # DailyBriefing, XPProgress, QuestList, CountdownTimer, etc.
│   ├── Chat/            # VoiceInputButton, VoiceModeOverlay, CoworkBrowserPanel, CopilotActionCard
│   ├── LeadCRM/         # LeadPipeline, LeadCard, LeadDetailPanel, AddLeadDialog, SendEmailDialog
│   ├── WorkflowBuilder/ # Canvas, NodeRenderer, EdgeRenderer, NodePalette, NodeInspector
│   ├── AutomationEngine/# N8nLiveStatusPanel, BrowserbaseExecutionPanel, SmartFixRecommendation
│   ├── CompetitorAnalysis/
│   ├── TemplateLibrary/
│   └── ui/              # shadcn/ui components
├── hooks/               # 30+ custom hooks
│   ├── useLeadManagement.ts
│   ├── useWorkflowBuilder.ts
│   ├── useMissionProgress.ts
│   ├── useCoworkMode.ts
│   ├── useVoiceChat.ts
│   ├── useVoiceMode.ts
│   ├── useCompetitorAnalysis.ts
│   ├── useRevenueTracking.ts
│   └── ... (20+ more)
supabase/functions/      # 22 Deno edge functions
\`\`\`

---

## 🔑 Required Secrets

| Secret | Description | Required |
|--------|-------------|----------|
| LOVABLE_API_KEY | Auto-provided by Lovable Cloud | Auto |
| MEM0_API_KEY | Mem0 memory service | For memory persistence |
| ELEVENLABS_API_KEY | Voice synthesis | For voice features |
| BROWSERBASE_API_KEY | Browser automation | For cowork mode |
| BROWSERBASE_PROJECT_ID | Browserbase project | For cowork mode |

---

## 📐 Lovable-Formatted Code Guidelines

When generating code updates from this spec, follow these rules:

1. **File paths:** Always use full paths from project root (e.g., \`src/components/LeadCRM/LeadCard.tsx\`)
2. **TypeScript:** All files must be \`.ts\` or \`.tsx\` with proper types
3. **Imports:** Use \`@/\` path alias (maps to \`src/\`)
4. **Styling:** Use Tailwind CSS classes with semantic tokens (\`bg-background\`, \`text-foreground\`, \`text-primary\`, \`border-border\`). Never hardcode colors.
5. **UI components:** Use shadcn/ui from \`@/components/ui/\`
6. **Database:** Import from \`@/integrations/supabase/client\` — never create new clients
7. **Auth:** Use \`useAuth()\` from \`@/contexts/AuthContext\`
8. **Toasts:** Use \`toast\` from \`sonner\`
9. **Animations:** Use \`framer-motion\` (\`motion.div\`, \`AnimatePresence\`)
10. **Edge functions:** Deno runtime, import from \`https://deno.land/std\` and \`https://esm.sh/\`

### Example Update Format
\`\`\`
File: src/components/MyComponent.tsx
Action: Create new component

\\\`\\\`\\\`tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export function MyComponent() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Title</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="default">Action</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
\\\`\\\`\\\`
\`\`\`

---

*This specification was auto-generated from the Business Builder AI (Mya) application codebase.*
`;
