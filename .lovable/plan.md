

# "Inevitable Success" -- Unified Progress System + Voice Command Center

The goal: make the path from $0 to $10K/month feel like gravity pulling you forward. Every action a user takes automatically advances their quest, triggers Mya's encouragement, and surfaces exactly what to do next. No manual check-offs. No guessing. Just momentum.

---

## Core Philosophy

Right now, quest completion relies on scanning `implementation_progress` for keyword matches ("landing", "outreach", etc.) -- fragile and invisible to users. The new system flips this: **real actions emit real events**, and Mya responds in real-time with celebration, coaching, and the next step. The experience should feel like a co-pilot who already knows what you need.

---

## What Gets Built

### 1. Mission Events Table (the connective tissue)

A new `mission_events` table captures every meaningful action as it happens:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| event_type | text | lead_captured, lead_won, workflow_deployed, plan_saved, email_sent, stage_changed, automation_completed |
| event_data | jsonb | Context (lead_id, amount, quest_id, business plan name) |
| xp_awarded | integer | XP granted for this event |
| quest_unlocked | text | Which quest this event completes (nullable) |
| created_at | timestamptz | Timestamp |

RLS: users can only see/insert their own events.

### 2. Mission Intelligence Hook (`useMissionIntelligence`)

A new hook that replaces the fragile keyword-scanning logic:

- Subscribes to `mission_events` via Realtime so the UI updates the instant something happens
- Provides an `emitEvent()` function that other hooks call when actions occur
- Auto-calculates quest completion from events instead of keyword matching
- Triggers confetti + toast notifications with Mya's voice ("You just captured your first lead!")
- Exposes `getNextAction()` -- always knows the single most important thing to do right now
- Tracks a "momentum score" (events in last 24 hours) to show users they're building velocity

### 3. Event Emitters Wired Into Existing Hooks

No new user actions required. Events fire automatically from existing flows:

- **`useLeadManagement`**: lead created -> `lead_captured` event; lead moved to "won" -> `lead_won` + `first_sale` quest unlock
- **`useAutomationRun`**: automation completes -> `automation_completed` event + `setup_automation` quest unlock
- **Chat save flow**: business plan saved -> `plan_saved` event + `save_idea` quest unlock
- **`changeStage` in leads**: any stage change -> `stage_changed` event; outreach stage -> `start_outreach` quest unlock

### 4. Daily Briefing System

A new `daily-briefing` edge function + `DailyBriefing` component:

- Edge function queries the user's recent events, lead pipeline stats, and mission progress
- Uses Lovable AI (Gemini Flash) to generate a 2-3 sentence personalized briefing in Mya's voice
- Example: *"Morning! You captured 2 leads yesterday and your GhostWriter workflow ran 8 times. Your next step is defining your offer -- want me to walk you through it?"*
- Dashboard shows a greeting card at the top with the briefing text + play button for audio (via existing `elevenlabs-tts`)
- If no ElevenLabs key is configured, the briefing is text-only (graceful degradation)

### 5. Enhanced Voice Commands

`useVoiceChat` gets new command patterns:

- "How am I doing" / "briefing" -> triggers daily briefing
- "Pipeline" / "leads" -> speaks pipeline summary (already partially built)
- "What's next" -> Mya speaks the next action from `getNextAction()`
- "Complete [milestone]" -> marks a quest milestone and celebrates

### 6. Activity Feed Component

A compact `ActivityFeed` component on the Dashboard showing the last 10 mission events with:

- Timestamp + event icon + description
- XP awarded badge
- Quest unlocks highlighted with accent color
- Realtime updates (new events slide in at the top)

### 7. Dashboard Redesign (Top Section)

The Dashboard top section gets reorganized for "inevitable momentum":

```text
+------------------------------------------+
|  Good morning! [Daily Briefing text]  [>] |  <- Briefing card with play button
+------------------------------------------+
|  Countdown  |  XP Progress  |  Momentum  |  <- 3 compact stat cards
+------------------------------------------+
|  Current Quest Card (unchanged)           |  <- Existing quest card
+------------------------------------------+
|  Activity Feed (last 5 events)            |  <- New, compact
+------------------------------------------+
```

The "Momentum" card shows events in the last 24 hours as a simple flame icon + count, reinforcing daily action.

---

## Technical Implementation Details

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useMissionIntelligence.ts` | Event emission, Realtime subscription, auto-quest advancement, next action logic |
| `src/components/MissionControl/ActivityFeed.tsx` | Recent events timeline |
| `src/components/MissionControl/DailyBriefing.tsx` | Greeting card with briefing text + voice playback |
| `src/components/MissionControl/MomentumCard.tsx` | 24-hour activity count with streak tracking |
| `supabase/functions/daily-briefing/index.ts` | AI-generated spoken summary using Lovable AI |

### Modified Files

| File | Changes |
|------|---------|
| `src/hooks/useLeadManagement.ts` | Add `emitEvent()` calls in `createLead`, `changeStage` (especially "won") |
| `src/hooks/useAutomationRun.ts` | Add `emitEvent()` call on successful automation completion |
| `src/hooks/useMissionProgress.ts` | Replace keyword-scanning `loadCompletedQuests` with event-based query from `mission_events` |
| `src/hooks/useVoiceChat.ts` | Add "briefing", "how am I doing", "what's next" command patterns |
| `src/pages/Dashboard.tsx` | Add DailyBriefing card, MomentumCard, ActivityFeed; reorganize top section layout |
| `src/components/MissionControl/types.ts` | Add event type definitions and momentum-related types |
| `supabase/config.toml` | Add `[functions.daily-briefing]` entry |

### Database Changes

1. Create `mission_events` table with RLS policies (user can SELECT/INSERT own rows)
2. Enable Realtime on `mission_events` table
3. Create index on `(user_id, created_at DESC)` for fast briefing queries

### Implementation Order

1. Create `mission_events` table with RLS + Realtime
2. Build `useMissionIntelligence` hook (emit + subscribe + auto-advance)
3. Wire event emitters into `useLeadManagement` and `useAutomationRun`
4. Refactor `useMissionProgress` to read from events instead of keyword scanning
5. Build `DailyBriefing` component + `daily-briefing` edge function
6. Build `ActivityFeed` and `MomentumCard` components
7. Enhance `useVoiceChat` with new command patterns
8. Update Dashboard layout to integrate all new components
9. End-to-end testing: create a lead via webhook, verify event fires, quest advances, briefing updates, and voice command responds

