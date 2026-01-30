
# Plan: Add "Chat with Mya about this" Button

## Overview
Add a new button to the `NodeFixActions` component that opens a new chat conversation with Mya, pre-loaded with the n8n troubleshooting context. This allows users to get immediate, context-aware help without manually copying and pasting prompts.

## User Experience
1. User sees an incomplete node in the verification checklist
2. User clicks "Chat with Mya" button (next to existing "Ask AI" button)
3. A new chat conversation is created automatically
4. The chat opens with the fix prompt already sent as the first message
5. Mya responds with specific troubleshooting guidance using the full n8n workflow context

## Implementation Steps

### Step 1: Extend Chat Page to Accept Pre-filled Messages
**File: `src/pages/Chat.tsx`**

- Add support for reading an initial message from URL search params (`?prompt=...`) or navigation state
- Add support for receiving n8n context via navigation state
- When both are present, auto-send the message with the n8n context attached

```text
Changes:
- Import useLocation from react-router-dom
- Read location.state for { initialPrompt, n8nContext }
- Add useEffect to auto-send the initial prompt when present
- Pass n8nContext to streamChat() when sending the auto-message
```

### Step 2: Add "Chat with Mya" Button to NodeFixActions
**File: `src/components/NodeFixActions.tsx`**

- Add new button with MessageSquare icon labeled "Chat with Mya"
- On click:
  1. Create a new conversation in the database
  2. Build the full n8n context object with node details
  3. Navigate to `/chat/{id}` with state containing the prompt and context
- Style the button with primary color to make it prominent

```text
Changes:
- Import useNavigate from react-router-dom
- Import useAuth to get user ID for conversation creation
- Import supabase client for database operations
- Add MessageSquare icon import
- Create handleChatWithMya function that:
  a. Creates conversation with title "[Node] Fix Request"
  b. Builds N8nContext object with workflow nodes array
  c. Navigates with state: { initialPrompt, n8nContext }
- Add new Button component between "Ask AI" and existing buttons
```

### Step 3: Update N8nContext to Include Current Node Focus
**File: `src/lib/ai.ts`**

- Optionally add a `focusNode` field to `N8nContext` interface to highlight which node needs fixing
- This helps Mya understand which specific node the user needs help with

## Technical Details

### Navigation State Structure
```typescript
interface ChatNavigationState {
  initialPrompt: string;  // The generated fix prompt
  n8nContext: {
    workflowName: string;
    workflowId: string;
    n8nInstanceUrl: string;
    businessName: string;
    niche?: string;
    nodes: Array<{
      name: string;
      type: string;
      parameters?: Record<string, unknown>;
      credentials?: Record<string, unknown>;
    }>;
  };
}
```

### Auto-send Logic in Chat.tsx
```text
useEffect:
  - Check if location.state has initialPrompt
  - If present and messages.length === 0 and not already sending:
    - Set the prompt as user message
    - Save to database
    - Call streamChat with n8nContext from state
    - Clear the state to prevent re-sending on refresh
```

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/Chat.tsx` | Modify | Add support for initial prompt via navigation state, auto-send with n8n context |
| `src/components/NodeFixActions.tsx` | Modify | Add "Chat with Mya" button with navigation logic |
| `src/lib/ai.ts` | Minor | Optionally add focusNode to N8nContext (already has nodes array) |

## Edge Cases Handled

1. **User not logged in**: The navigate will redirect to auth (existing behavior in Chat.tsx)
2. **Database error creating conversation**: Show toast error and fallback to "Ask AI" copy behavior
3. **Page refresh after navigation**: The prompt won't re-send since messages.length > 0
4. **Multiple clicks**: Disable button while creating conversation to prevent duplicates
