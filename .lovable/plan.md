

# Unified Setup Guide: Manual Path vs Mya Path

## Overview

Replace the current fragmented guide system with a unified "Setup Guide" that clearly presents two paths for every business capability: the **Manual Path** (configure external tools yourself) and the **Mya Path** (just tell Mya in chat). This makes it immediately clear that Mya can handle most things users would otherwise need 20+ external apps for.

## Current Problem

The app has three separate guides (How to Use, Implementation Guide, n8n Automation Guide) that only describe the manual approach. Users don't realize they can skip most of it by just chatting with Mya. The guides also don't reflect Mya's new 13-tool capabilities.

## Design: Side-by-Side Capability Map

The new guide organizes capabilities into **7 business areas**, each showing what you'd need to do manually vs what Mya handles for you:

| Business Area | Manual Path (External Tools) | Mya Path (Just Chat) |
|---|---|---|
| **Lead Generation** | Apollo, Hunter, LinkedIn, Google Sheets | "Add a lead named..." / "Find prospects in..." |
| **Pipeline Management** | HubSpot, Close CRM, spreadsheets | "Move Sarah to qualified" / "What's my pipeline?" |
| **Outreach & Follow-up** | SendGrid, Gmail sequences, Calendly | "Create a follow-up workflow" / "Schedule outreach daily" |
| **Qualification** | Typeform, Gong, Fireflies | "Log a call with John" / "Score my leads" |
| **Proposals & Closing** | PandaDoc, DocuSign, Stripe | "Log revenue from client" / "I just closed $2000" |
| **Automation & Workflows** | n8n manual setup, webhook config | "Create a webhook automation" / "Schedule it for 9am" |
| **Analytics & Intelligence** | Dashboards, spreadsheet formulas | "How's my revenue?" / "What's my conversion rate?" |

## UI Structure

A new **UnifiedSetupGuide** dialog with:

1. **Header** explaining the two paths
2. **Toggle/Tabs** to view "Full Manual Guide" vs "Quick Start with Mya" vs "Side-by-Side"
3. **7 capability cards**, each with:
   - Manual column: Tools needed, setup steps, estimated time
   - Mya column: Example chat commands, what Mya does automatically, "Try it now" button that navigates to chat
4. **Progress tracking** carried over from the existing implementation guide

## Technical Changes

### 1. New Component: `src/components/UnifiedSetupGuide.tsx`

A new dialog component that:
- Accepts `businessIdea` prop (same as existing guides)
- Displays 7 capability areas in an accordion
- Each area has two columns: Manual vs Mya
- Manual column pulls content from existing `ImplementationGuideDialog` sections (tools, setup steps)
- Mya column shows example prompts mapped to Mya's 13 tools
- Includes "Try it" buttons that navigate to `/chat` with pre-filled messages
- Retains checkbox progress tracking from the existing guide

### 2. Update `src/components/BusinessIdeaDialog.tsx`

- Replace the separate "Implementation Guide" and "n8n Automation Guide" buttons with a single "Setup Guide" button that opens the new unified component
- Keep both old components available as imports (no deletion) for backward compatibility

### 3. Update `src/pages/Chat.tsx`

- Replace the Implementation Guide button in the chat toolbar with the new unified guide button

### 4. Update `src/components/HowToUseDialog.tsx`

- Add a brief mention of the two paths in the overview steps
- Step 4 ("Unlock Your Superpowers") updated to mention both manual and Mya paths

## What Stays the Same

- The old `ImplementationGuideDialog` and `N8nAutomationGuideDialog` files are kept (not deleted) for any deep-dive reference
- Progress tracking storage format stays compatible
- All existing navigation and routing unchanged

## Mya Tool-to-Capability Mapping (used in guide content)

- **Lead Generation**: `add_lead`, `list_leads`, `get_pipeline_stats`
- **Pipeline Management**: `update_lead`, `move_lead_stage`, `delete_lead`
- **Activity Tracking**: `log_lead_activity`
- **Automation**: `create_workflow`, `trigger_workflow`, `schedule_workflow`, `delete_workflow`, `list_workflows`
- **Revenue**: `log_revenue`, `get_revenue_stats`
- **Intelligence**: `get_pipeline_stats`, `get_business_summary`
