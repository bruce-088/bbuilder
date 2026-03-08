

# Enhance Master Prompt to Full Implementation Spec for Mya App

## Context

The current `src/lib/masterPromptContent.ts` **already describes the Mya app itself** (not a generated business plan). It covers features, DB schema, edge functions, design system, and file structure. However, it's at a summary level. To make it truly useful for external LLMs to analyze and produce Lovable-formatted code updates, we need to expand it with implementation-level detail.

## What Changes

### 1. Expand `src/lib/masterPromptContent.ts` with deeper implementation detail

Add these sections to the existing master prompt:

- **Edge Function signatures & patterns** — request/response shapes for all 22 functions, including the chat function's tool-calling system (copilot tools: `create_workflow`, `add_lead`, `complete_quest`, etc.)
- **Auth pattern** — the `AuthContext` provider pattern with `signUp`, `signIn`, `signOut`, session listener
- **AI streaming pattern** — how `src/lib/ai.ts` streams from the chat edge function via `ReadableStream`
- **Key hook interfaces** — signatures for `useLeadManagement`, `useWorkflowBuilder`, `useMissionProgress`, `useCoworkMode`, `useVoiceChat`, etc.
- **Component hierarchy** — Dashboard's section layout (Mission Control panels → Business Ideas list → Conversations list), Chat page's message flow, Lead CRM's Kanban structure
- **RLS policy summary** — all tables use `user_id = auth.uid()` for CRUD
- **Lovable-specific instructions** — a section telling the consuming LLM to format responses as Lovable-compatible code changes (full file paths, TypeScript, Tailwind classes, shadcn/ui components)

### 2. Update PDF generator to handle the larger content

The current `masterPromptPdfGenerator.ts` already parses markdown sections. No structural changes needed — it auto-paginates. Just ensure the section parsing handles the new content correctly (tables, code blocks, nested lists).

### 3. No changes to `ExportPrompt.tsx`

The page already has PDF, Markdown, Text, and Clipboard export. The UI description already says "complete app specification." No changes needed.

## Files Changed

| File | Action |
|------|--------|
| `src/lib/masterPromptContent.ts` | Expand with implementation patterns, hook interfaces, edge function specs, RLS policies, Lovable formatting instructions |

## No database or backend changes needed.

