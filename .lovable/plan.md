
# Train Mya as a Complete Business Automation Asset

## Overview

Mya currently has 5 tools (create_workflow, add_lead, trigger_workflow, list_leads, list_workflows). This upgrade expands her to **13 tools** covering the full business lifecycle -- from revenue tracking to lead management, business intelligence, workflow scheduling, and competitor analysis. Mya becomes a true "do everything" copilot where users never need to leave the chat.

## Current State

Mya can:
- Create workflows with nodes
- Add leads to CRM
- Trigger/list workflows
- List leads by stage

Mya **cannot** yet:
- Track revenue or log payments
- Update or move leads through pipeline stages
- Schedule workflows (cron)
- Search/recall business ideas
- Provide pipeline analytics or revenue dashboards
- Delete leads or workflows
- Send emails to leads
- Log notes/activities on leads

## New Tools to Add

### Revenue Management
1. **log_revenue** -- Record a revenue entry (amount, source, recurring flag, optional lead link)
2. **get_revenue_stats** -- Show MRR, monthly revenue, progress toward $10K goal, breakdown by source

### Lead Pipeline Actions  
3. **update_lead** -- Update any lead field (email, phone, company, tags, estimated value)
4. **move_lead_stage** -- Move a lead to a new pipeline stage (with activity logging)
5. **log_lead_activity** -- Add a note, call log, or email record to a lead's timeline
6. **delete_lead** -- Remove a lead from the pipeline

### Workflow Management
7. **schedule_workflow** -- Set a cron schedule on a workflow (e.g., "run every morning at 9am")
8. **delete_workflow** -- Remove a workflow

### Business Intelligence
9. **get_pipeline_stats** -- Show total leads, conversion rate, value by stage, top prospects
10. **get_business_summary** -- Retrieve saved business idea details (name, niche, strategy)

### Competitor Intelligence (Bonus -- leverages existing table)
11. **analyze_competitor** -- Save a competitor for tracking

## Technical Changes

### 1. Edge Function: `supabase/functions/chat/index.ts`

**Add 8 new tool definitions** to the `COPILOT_TOOLS` array with proper parameter schemas.

**Add 8 new cases** to the `executeTool` switch statement:
- `log_revenue`: Insert into `revenue_entries`
- `get_revenue_stats`: Query `revenue_entries`, compute MRR/monthly/goal progress
- `update_lead`: Update `lead_contacts` row + log activity
- `move_lead_stage`: Update stage on `lead_contacts` + insert `lead_activities` stage_change record
- `log_lead_activity`: Insert into `lead_activities`
- `delete_lead`: Delete from `lead_contacts`
- `schedule_workflow`: Insert/update `workflow_schedules`
- `delete_workflow`: Delete from `workflows`
- `get_pipeline_stats`: Aggregate query on `lead_contacts`
- `get_business_summary`: Query `business_ideas` for the user

**Enhance system prompt** with expanded examples covering revenue, pipeline management, and scheduling scenarios.

### 2. Frontend: `src/components/Chat/CopilotActionCard.tsx`

Add visual cards for each new tool:
- **log_revenue**: Shows amount, source, recurring badge, link to dashboard
- **get_revenue_stats**: Mini dashboard card with MRR, monthly, goal progress bar
- **update_lead / move_lead_stage**: Shows lead name + change summary with CRM link
- **schedule_workflow**: Shows cron expression in human-readable form
- **delete_lead / delete_workflow**: Confirmation-style card
- **get_pipeline_stats**: Mini stats card (total leads, conversion rate, pipeline value)
- **get_business_summary**: Business name + niche card

### 3. System Prompt Enhancement

Add comprehensive examples so the model always calls the right tool:
- "I just made $500 from a client" -> `log_revenue`
- "Move Sarah to qualified" -> `move_lead_stage`
- "How's my revenue looking?" -> `get_revenue_stats`
- "Schedule my follow-up workflow to run daily" -> `schedule_workflow`
- "What's my pipeline looking like?" -> `get_pipeline_stats`
- "Log a call with John about the proposal" -> `log_lead_activity`
- "Remove the old test lead" -> `delete_lead`

## No Database Changes Needed

All new tools operate on existing tables: `revenue_entries`, `lead_contacts`, `lead_activities`, `workflow_schedules`, `workflows`, `business_ideas`. No migrations required.

## Result

After this upgrade, Mya handles the complete business lifecycle from a single chat interface:

**Ideation** -> **Lead Capture** -> **Pipeline Management** -> **Automation** -> **Revenue Tracking** -> **Analytics**

Users can run their entire $10K/month business through conversation.
