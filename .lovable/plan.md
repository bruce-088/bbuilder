
# Add Email Follow-up Integration to Lead Detail Panel

## Overview

This plan adds the ability to send follow-up emails directly from the lead detail panel, with email composition via a modal dialog and activity logging to track all sent emails.

## Current State

- `LeadDetailPanel.tsx` has tabs for Details and Activity
- Activity tab can add notes but not send emails
- `useLeadManagement.ts` already supports `email_sent` activity type
- `LeadActivityTimeline.tsx` already has styling for `email_sent` activities
- No email sending edge function exists yet
- **RESEND_API_KEY** is not configured in secrets

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                      LeadDetailPanel                            │
├────────────────────────────────────┬────────────────────────────┤
│  Details Tab                       │  Activity Tab              │
│  - Contact Info                    │  - Add Note (existing)     │
│  - Stage selector                  │  - Send Email (NEW)        │
│  - Quick actions                   │  - Activity Timeline       │
└────────────────────────────────────┴────────────────────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │   SendEmailDialog       │
                              │  - Subject input        │
                              │  - Body textarea        │
                              │  - Template selector    │
                              │  - Preview              │
                              └───────────┬─────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────┐
                              │  send-lead-email        │
                              │  Edge Function          │
                              │  - Uses Resend API      │
                              │  - Logs activity        │
                              └─────────────────────────┘
```

## Implementation Plan

### Step 1: Request RESEND_API_KEY from User

Before implementing, request the Resend API key from the user:
- Direct user to resend.com to create an account
- Need verified domain for sending emails
- Create API key at resend.com/api-keys

### Step 2: Create Edge Function - `send-lead-email`

**File:** `supabase/functions/send-lead-email/index.ts`

The edge function will:
- Accept: recipient email, subject, body, lead_id, user_id
- Validate all inputs using zod
- Send email via Resend API
- Return success/failure response

```typescript
// Key structure:
interface SendEmailRequest {
  to: string;           // Lead's email address
  subject: string;      // Email subject
  body: string;         // Email body (plain text or HTML)
  leadId: string;       // For activity logging
  leadName: string;     // For personalization
  fromName?: string;    // Sender display name
}
```

### Step 3: Create SendEmailDialog Component

**File:** `src/components/LeadCRM/SendEmailDialog.tsx`

A modal dialog for composing emails:
- Subject line input
- Body textarea with larger height for message composition
- Quick template buttons for common follow-ups:
  - "Initial Outreach"
  - "Follow-up Check-in"
  - "Meeting Request"
  - "Thank You"
- Dynamic placeholders that auto-fill:
  - `{{name}}` - Lead's name
  - `{{company}}` - Lead's company
- Preview tab to see formatted email
- Send button with loading state

### Step 4: Create useLeadEmail Hook

**File:** `src/hooks/useLeadEmail.ts`

Custom hook to handle email sending logic:
```typescript
function useLeadEmail() {
  const sendEmail = async (params: {
    lead: Lead;
    subject: string;
    body: string;
  }) => {
    // 1. Call send-lead-email edge function
    // 2. On success, add email_sent activity via addActivity
    // 3. Return success/failure
  };
  
  return { sendEmail, isSending };
}
```

### Step 5: Update LeadDetailPanel

**File:** `src/components/LeadCRM/LeadDetailPanel.tsx`

Changes to the Activity tab:
1. Add "Send Email" button next to "Add Note"
2. Import and use SendEmailDialog
3. Pass onAddActivity for logging email_sent activities
4. Show warning if lead has no email address

### Step 6: Update Exports

**File:** `src/components/LeadCRM/index.ts`

Add export for the new SendEmailDialog component.

### Step 7: Update config.toml

**File:** `supabase/config.toml`

Add configuration for the new edge function:
```toml
[functions.send-lead-email]
verify_jwt = true
```

## Email Templates

Four pre-built templates with placeholder support:

1. **Initial Outreach**
   ```
   Subject: Quick question about {{company}}
   Body: Hi {{name}}, I came across {{company}} and wanted to reach out...
   ```

2. **Follow-up Check-in**
   ```
   Subject: Following up on our conversation
   Body: Hi {{name}}, I wanted to check in and see if you had any questions...
   ```

3. **Meeting Request**
   ```
   Subject: Quick call this week?
   Body: Hi {{name}}, I'd love to schedule a brief call to discuss...
   ```

4. **Thank You**
   ```
   Subject: Thank you, {{name}}!
   Body: Hi {{name}}, I just wanted to send a quick note to thank you...
   ```

## UI/UX Details

- "Send Email" button styled with green color to differentiate from notes
- Dialog has max-width of 600px for comfortable reading
- Character count shown for subject (max 100) and body (max 5000)
- Disable send if lead has no email address
- Success toast shows "Email sent to [name]"
- Email activity shows in timeline with green badge

## Security Considerations

- Edge function requires JWT authentication (verify_jwt = true)
- Validate email format before sending
- Rate limiting to prevent abuse (handled by Resend)
- Input sanitization via zod schemas

## Technical Implementation Sequence

1. Request RESEND_API_KEY from user
2. Create `send-lead-email` edge function
3. Deploy and test edge function
4. Create SendEmailDialog component with templates
5. Create useLeadEmail hook
6. Update LeadDetailPanel to integrate email button and dialog
7. Update exports in index.ts
8. End-to-end testing: send email, verify activity logged, check Resend dashboard

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/send-lead-email/index.ts` | Create | Edge function using Resend API |
| `supabase/config.toml` | Modify | Add function config with verify_jwt = true |
| `src/components/LeadCRM/SendEmailDialog.tsx` | Create | Modal dialog for composing emails |
| `src/hooks/useLeadEmail.ts` | Create | Hook for email sending logic |
| `src/components/LeadCRM/LeadDetailPanel.tsx` | Modify | Add Send Email button and dialog integration |
| `src/components/LeadCRM/index.ts` | Modify | Export SendEmailDialog |

## Testing Plan

After implementation:
1. Navigate to /leads and select a lead with an email address
2. Click "Send Email" in the Activity tab
3. Use a template or compose custom email
4. Send and verify:
   - Success toast appears
   - Activity logged in timeline
   - Email received (if using real email)
   - Edge function logs show successful send
