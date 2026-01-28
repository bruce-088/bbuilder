
# Add Hostinger-Specific Documentation to n8n Automation Guide

## Problem
Users with Hostinger-hosted n8n instances see a VPS control panel (showing Docker manager, Manage App, etc.) but the current Stage 0 instructions don't specifically explain how to use these Hostinger UI elements to:
1. Access n8n credentials
2. Connect to the n8n instance
3. Enable MCP for live verification

## Current Hostinger UI Elements (from user's screenshot)
- **Manage App** button → Opens the n8n instance directly
- **Docker manager** button → Container management (start/stop/restart)
- **"How to update n8n"** documentation link
- **"Changing the domain for n8n"** documentation link  
- **"Resetting n8n user password"** documentation link

## Implementation Plan

### 1. Update Stage 0 Setup Steps with Hostinger-Specific Instructions

**File:** `src/components/N8nAutomationGuideDialog.tsx`

Add new setup step specifically for Hostinger VPS panel navigation:

```typescript
// New step for lines 160-163 area:
{
  text: "For Hostinger VPS: Open your Hostinger dashboard → Find your VPS (e.g., srv1230972.hstgr.cloud) → Click 'Manage App' to open n8n directly, or use 'Docker manager' to restart the container if n8n is unresponsive",
  links: [
    { label: "Hostinger", url: "https://hpanel.hostinger.com" },
    { label: "Docker manager", url: "https://hpanel.hostinger.com" }
  ],
  proTip: "The 'Manage App' button opens your n8n instance URL directly. If you need to restart n8n, use Docker manager → Containers → find n8n → Restart. Use 'Resetting n8n user password' link if you've forgotten your login credentials."
}
```

### 2. Add Visual Callout in Self-Hosted Configuration Card

When Hostinger is selected, add a helpful info box that explains the Hostinger panel layout:

```tsx
{selfHostedMethod === 'hostinger' && (
  <Alert className="mt-3">
    <AlertDescription className="text-sm">
      <p className="font-medium mb-2">From your Hostinger VPS panel:</p>
      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
        <li><strong>Manage App</strong> → Opens n8n login page</li>
        <li><strong>Docker manager</strong> → Start/stop/restart n8n container</li>
        <li><strong>Resetting n8n user password</strong> → If you forgot credentials</li>
      </ul>
    </AlertDescription>
  </Alert>
)}
```

### 3. Update Connection Test Failure Instructions

**File:** `src/components/N8nAutomationGuideDialog.tsx` (handleTestConnection function)

Add Hostinger-specific troubleshooting when connection fails:

```typescript
// For Hostinger deployments, add specific instructions:
if (hostingType === 'self-hosted' && selfHostedMethod === 'hostinger') {
  instructions = [
    "1. Go to Hostinger hPanel → VPS → Your server → Applications → n8n",
    "2. Click 'Manage App' to open your n8n instance",
    "3. If you can't log in, click 'Resetting n8n user password' in the panel",
    "4. Once logged in: Settings → MCP access → Enable",
    "5. Copy MCP URL and paste in Lovable: Project Settings → Connectors → n8n",
    `Your MCP URL: ${n8nInstanceUrl ? n8nInstanceUrl.replace(/\/$/, '') : 'https://n8n.[your-server].hstgr.cloud'}/mcp-server/http`
  ];
}
```

### 4. Add Password Reset Guidance

Since Hostinger has a specific password reset flow, add a direct link:

```tsx
{selfHostedMethod === 'hostinger' && (
  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
    <Key className="w-3 h-3" />
    <span>Forgot your n8n password?</span>
    <a 
      href="https://support.hostinger.com/en/articles/6738701-how-to-reset-n8n-password"
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline inline-flex items-center gap-1"
    >
      Reset via Hostinger panel
      <ExternalLink className="w-3 h-3" />
    </a>
  </div>
)}
```

### 5. Update Edge Function with Hostinger Context

**File:** `supabase/functions/verify-n8n-workflow/index.ts`

Enhance the instructions for Hostinger:

```typescript
if (hostingType === 'self-hosted' && deploymentMethod === 'hostinger') {
  instructions = [
    "1. Open Hostinger hPanel → VPS → Your server name",
    "2. Find n8n in the Applications section",
    "3. Click 'Manage App' to open your n8n instance",
    "4. If login fails, use 'Resetting n8n user password' link in the panel",
    "5. Once logged in: Settings → MCP access → Toggle ON",
    "6. In Lovable: Project Settings → Connectors → Connect n8n",
    `7. Paste MCP URL: ${mcpUrlNote}`
  ];
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/N8nAutomationGuideDialog.tsx` | Add Hostinger VPS panel instructions, password reset link, and enhanced troubleshooting guidance |
| `supabase/functions/verify-n8n-workflow/index.ts` | Improve Hostinger-specific instructions in connection test responses |

## Expected Result

After implementation:
1. Users see clear step-by-step guidance for using the Hostinger VPS panel
2. "Manage App", "Docker manager", and "Resetting password" are explained in context
3. Password reset link is prominently displayed when Hostinger is selected
4. Connection test failures show Hostinger-specific troubleshooting steps
5. Instructions match what users actually see in their Hostinger dashboard

## Visual Guide (What the User Sees)

```text
┌─────────────────────────────────────────────────────────────┐
│  Overview  🏠 VPS - srv1230972.hstgr.cloud                  │
├─────────────────────────────────────────────────────────────┤
│  🔧 n8n                                                     │
│  Built on Ubuntu 24.04                                      │
│                                                             │
│  [Docker manager]  [Manage App 🔗]  ← Click to open n8n     │
│                                                             │
│  📖 How to update n8n  →                                    │
│  📖 Changing the domain for n8n  →                          │
│  📖 Resetting n8n user password  →  ← Use if forgot login   │
└─────────────────────────────────────────────────────────────┘
```

The updated Stage 0 will include:
- **"Click Manage App"** instruction with explanation
- **Docker manager** for troubleshooting unresponsive instances
- **Password reset** link directly in the UI
- **MCP URL auto-generation** based on their server domain
