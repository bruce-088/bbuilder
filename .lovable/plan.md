
# Lead Management CRM Implementation Plan

## Overview

This plan implements a lightweight CRM system integrated with Mya that tracks leads across the 6-stage sales funnel, stores contact history, syncs with n8n webhook data, and provides quick actions for follow-ups and status changes.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         LEAD MANAGEMENT CRM                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    PIPELINE VIEW (KANBAN)                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │  │ CAPTURED │ │QUALIFIED │ │ OUTREACH │ │NURTURING │ │ WON/   │ │   │
│  │  │    12    │→│    8     │→│    5     │→│    3     │→│ LOST   │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────┐  ┌────────────────────────────────┐    │
│  │      LEAD DETAILS          │  │      ACTIVITY TIMELINE         │    │
│  │  Name: John Smith          │  │  📧 Email sent (2h ago)        │    │
│  │  Email: john@example.com   │  │  📞 Call scheduled (1d ago)    │    │
│  │  Source: Landing Page      │  │  💬 Note added (3d ago)        │    │
│  │  Value: $2,500             │  │  🔄 Stage changed (5d ago)     │    │
│  └────────────────────────────┘  └────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      QUICK ACTIONS                               │   │
│  │  [Send Follow-up] [Add Note] [Schedule Call] [Mark Won/Lost]    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Table: `lead_contacts`
Stores all lead/contact information with funnel stage tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner of the lead |
| `business_idea_id` | uuid | Linked business plan (optional) |
| `name` | text | Contact name |
| `email` | text | Contact email |
| `phone` | text | Contact phone (optional) |
| `company` | text | Company name (optional) |
| `stage` | text | Funnel stage: captured, qualified, outreach, nurturing, won, lost |
| `source` | text | How lead was acquired (landing_page, referral, n8n_webhook, manual) |
| `estimated_value` | numeric | Potential deal value |
| `tags` | text[] | Custom tags for filtering |
| `custom_fields` | jsonb | Flexible additional data from webhooks |
| `created_at` | timestamptz | When lead was added |
| `updated_at` | timestamptz | Last modification |
| `last_contact_at` | timestamptz | Last interaction date |

### Table: `lead_activities`
Stores timeline of interactions with each lead.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `lead_id` | uuid | Foreign key to lead_contacts |
| `activity_type` | text | Type: note, email_sent, call, stage_change, webhook_event |
| `content` | text | Activity description or note content |
| `metadata` | jsonb | Additional context (e.g., from/to stage for stage_change) |
| `created_at` | timestamptz | When activity occurred |

## Components to Create

### 1. Main CRM Page (`src/pages/Leads.tsx`)
- Route: `/leads`
- Full-page lead management interface
- Pipeline view with drag-and-drop stage changes
- Filtering by stage, source, tags, and search
- Quick stats bar showing funnel metrics

### 2. Lead Pipeline Component (`src/components/LeadCRM/LeadPipeline.tsx`)
- Kanban-style board with columns for each stage
- Drag-and-drop functionality using existing motion library
- Lead count badges per column
- Conversion rate indicators between stages

### 3. Lead Card Component (`src/components/LeadCRM/LeadCard.tsx`)
- Compact card showing name, email, value, source
- Quick action buttons (email, note, stage change)
- Time since last contact indicator
- Click to expand for full details

### 4. Lead Detail Panel (`src/components/LeadCRM/LeadDetailPanel.tsx`)
- Slide-out panel with full lead information
- Activity timeline showing all interactions
- Editable fields for updating lead info
- Stage change dropdown with activity logging
- Quick actions: Send Follow-up, Add Note, Mark Won/Lost

### 5. Add Lead Dialog (`src/components/LeadCRM/AddLeadDialog.tsx`)
- Form for manual lead entry
- Fields: name, email, phone, company, source, estimated value
- Option to link to a business plan
- Tag selection/creation

### 6. Lead Activity Timeline (`src/components/LeadCRM/LeadActivityTimeline.tsx`)
- Chronological list of all interactions
- Icons for different activity types
- Expandable note content
- "Ask Mya" integration for AI-suggested follow-ups

### 7. Lead Stats Card (`src/components/LeadCRM/LeadStatsCard.tsx`)
- Reusable widget for Dashboard integration
- Shows pipeline summary counts
- Conversion rate metrics
- Link to full CRM view

### 8. Lead Webhook Receiver (`supabase/functions/lead-webhook/index.ts`)
- Edge function to receive leads from n8n workflows
- Validates incoming data structure
- Auto-creates leads with appropriate source tagging
- Creates initial activity log entry

## Custom Hook

### `useLeadManagement.ts`
- CRUD operations for leads and activities
- Stage transition with automatic activity logging
- Filtering and search functionality
- Real-time subscription for lead updates
- Aggregate stats calculation

## Integration Points

### n8n Workflow Integration
- New webhook endpoint `/lead-webhook` receives leads from automation workflows
- Auto-populates `custom_fields` with any extra data from n8n
- Creates "Captured via n8n" activity entry

### Mission Control Integration
- Update `useMissionProgress.ts` to check `lead_contacts` for outreach/sale quests
- Award XP when leads progress through stages
- Trigger "first_sale" achievement when a lead is marked as "won"

### Dashboard Widget
- Add `LeadStatsCard` to Dashboard showing pipeline summary
- Quick link to full CRM view
- "Hot leads" indicator for leads needing follow-up

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Leads.tsx` | Main CRM page |
| `src/components/LeadCRM/index.ts` | Barrel export |
| `src/components/LeadCRM/LeadPipeline.tsx` | Kanban board |
| `src/components/LeadCRM/LeadCard.tsx` | Individual lead card |
| `src/components/LeadCRM/LeadDetailPanel.tsx` | Slide-out details |
| `src/components/LeadCRM/AddLeadDialog.tsx` | New lead form |
| `src/components/LeadCRM/LeadActivityTimeline.tsx` | Activity history |
| `src/components/LeadCRM/LeadStatsCard.tsx` | Dashboard widget |
| `src/hooks/useLeadManagement.ts` | Lead data hook |
| `supabase/functions/lead-webhook/index.ts` | Webhook receiver |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/leads` route |
| `src/pages/Dashboard.tsx` | Add LeadStatsCard widget and navigation link |
| `src/hooks/useMissionProgress.ts` | Add lead-based quest completion checks |
| `src/components/MissionControl/types.ts` | Add lead-related achievements |

## RLS Policies

Both tables will have standard user-scoped RLS:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

The webhook edge function will use service role for inserts, validating user ownership via the request payload.

## Implementation Sequence

1. **Database Setup**: Create `lead_contacts` and `lead_activities` tables with RLS
2. **Core Hook**: Build `useLeadManagement.ts` with CRUD and filtering
3. **Lead Cards**: Create `LeadCard.tsx` and `LeadDetailPanel.tsx`
4. **Pipeline View**: Build `LeadPipeline.tsx` with drag-and-drop
5. **Forms**: Create `AddLeadDialog.tsx` for manual entry
6. **Main Page**: Assemble `Leads.tsx` with all components
7. **Webhook**: Create `lead-webhook` edge function
8. **Dashboard Integration**: Add `LeadStatsCard` and navigation
9. **Mission Control**: Update progress tracking for lead milestones
10. **Testing**: End-to-end verification of all flows

## Technical Notes

- Uses `framer-motion` (already installed) for drag-and-drop interactions
- Follows existing design system with glass morphism cards and glow effects
- Leverages existing table/form components from shadcn/ui
- Real-time updates via Supabase Realtime subscriptions
- Responsive design for mobile pipeline viewing (horizontal scroll)
