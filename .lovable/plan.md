
# Add Self-Hosted n8n Setup Instructions to Automation Guide

## Overview
Add a comprehensive "n8n Setup" prerequisite section to the automation guide that includes instructions for both n8n Cloud and self-hosted n8n (via Hostinger, Docker, npm, etc.). This section will appear as "Stage 0" before the automation stages, with verification steps and Director.ai-compatible prompts.

---

## Implementation Strategy

### 1. Add New Setup Stage to `N8nAutomationGuideDialog.tsx`

Create a new **"Stage 0: n8n Instance Setup"** that appears first in the stages list. This stage will include:

**Setup Steps:**
1. **Choose your n8n hosting type** - Toggle/selector for Cloud vs Self-hosted
2. **n8n Cloud setup** - Sign up at app.n8n.cloud, create account, get instance URL
3. **Self-hosted credentials** - Instructions based on deployment method:
   - **Docker**: Check environment variables for `N8N_BASIC_AUTH_USER` and `N8N_BASIC_AUTH_PASSWORD`
   - **Hostinger One-click**: Check Hostinger dashboard → Applications → n8n → Credentials
   - **npm/npx**: Use owner account created during `npx n8n` initial setup
4. **Find your instance URL** - Custom domain (e.g., `https://n8n.yourdomain.com`) or IP:Port (e.g., `http://your-server-ip:5678`)
5. **Verify login** - Navigate to instance URL and authenticate
6. **Enable MCP Access** - Settings → MCP access → Toggle "Enable MCP access" (for live verification)
7. **Copy MCP URL** - For connecting to Lovable's MCP connector

**Pro Tips for each step:**
- How to reset password if forgotten (Docker: re-deploy with new env vars, Hostinger: use reset option in dashboard)
- Security recommendations (enable HTTPS, use strong passwords, consider 2FA)
- Troubleshooting common access issues

**Verification Data:**
Each step will have verification actions like:
- "Navigate to your n8n instance URL and confirm login page loads"
- "Check that your credentials authenticate successfully"
- "Verify MCP access is enabled in Settings"

---

### 2. Update Director.ai Prompt Generator (`src/lib/directorAiPromptGenerator.ts`)

Add a new **"n8n-setup"** stage to the `generateDirectorAiStages` function:

```typescript
{
  id: "n8n-setup",
  title: "n8n Instance Setup & Access",
  objective: "Configure and verify access to your n8n automation instance",
  actions: [
    "Identify n8n hosting type (Cloud or Self-hosted)",
    "For Self-hosted via Hostinger: Navigate to Hostinger dashboard → Applications → n8n",
    "Locate login credentials in deployment settings",
    "For Docker: Check docker-compose.yml or environment variables for N8N_BASIC_AUTH_USER and N8N_BASIC_AUTH_PASSWORD",
    "For npm/npx: Use the owner account created during first n8n run",
    "Navigate to your n8n instance URL (custom domain or IP:port)",
    "Authenticate with your credentials",
    "Go to Settings → MCP access → Enable MCP access",
    "Copy the MCP Server URL for later use"
  ],
  validationCriteria: [
    "n8n login page loads at your instance URL",
    "Credentials authenticate successfully",
    "Dashboard displays with workflow list",
    "MCP access toggle is enabled in Settings"
  ],
  credentialKeys: ["n8n_instance_url", "n8n_username", "n8n_password"]
}
```

---

### 3. Update Verification Prompt Generator (`src/lib/verificationPromptGenerator.ts`)

Add verification data for the new n8n-setup stage:

```typescript
["n8n-setup", [
  {
    checkDescription: "Verify n8n instance is accessible",
    automatedActions: [
      "Navigate to the configured n8n instance URL",
      "Check that the login page loads successfully",
      "Verify HTTPS is enabled (if using custom domain)"
    ],
    successIndicators: [
      "Login page displays with n8n branding",
      "No certificate errors (HTTPS)",
      "Page loads within 5 seconds"
    ],
    failureIndicators: [
      "Connection refused or timeout",
      "SSL certificate error",
      "404 or 502 error page"
    ]
  },
  {
    checkDescription: "Verify login credentials work",
    automatedActions: [
      "Enter username in login form",
      "Enter password in login form",
      "Click 'Sign in' button",
      "Verify dashboard loads"
    ],
    successIndicators: [
      "Dashboard loads with workflow list",
      "User menu shows logged-in status",
      "No 'Invalid credentials' error"
    ],
    failureIndicators: [
      "'Invalid credentials' error message",
      "Account locked message",
      "Redirected back to login page"
    ]
  },
  {
    checkDescription: "Verify MCP access is enabled",
    automatedActions: [
      "Navigate to Settings in n8n",
      "Find 'MCP access' section",
      "Check if 'Enable MCP access' toggle is ON",
      "Copy the MCP Server URL"
    ],
    successIndicators: [
      "MCP access toggle exists and is enabled",
      "MCP Server URL is displayed",
      "URL format matches https://[instance]/mcp-server/http"
    ],
    failureIndicators: [
      "MCP access option not visible (check permissions)",
      "Toggle is disabled/OFF",
      "Error message about permissions"
    ]
  }
]]
```

---

### 4. Update Computer Use Prompt Generator (`src/lib/computerUsePromptGenerator.ts`)

Add the self-hosted setup instructions to the prerequisites section:

```markdown
## N8N INSTANCE ACCESS

### Option A: n8n Cloud
1. Sign up at https://app.n8n.cloud
2. Create your instance
3. Note your instance URL (e.g., https://your-name.app.n8n.cloud)

### Option B: Self-Hosted n8n
Your n8n instance URL will be one of:
- Custom domain: https://n8n.yourdomain.com
- Direct IP: http://your-server-ip:5678

**Finding Your Credentials:**

**Docker Deployment:**
1. Check your docker-compose.yml or .env file
2. Look for: N8N_BASIC_AUTH_USER and N8N_BASIC_AUTH_PASSWORD
3. If using Docker CLI: docker inspect [container-id]

**Hostinger One-Click Install:**
1. Log into Hostinger dashboard
2. Navigate to Hosting → Manage → Applications
3. Find n8n in the list
4. Click on n8n to view credentials (username/password displayed)

**npm/npx Installation:**
1. Use the owner account you created during first run
2. If forgotten: delete ~/.n8n folder and restart n8n to reset

**Verifying Access:**
1. Navigate to your n8n instance URL
2. Enter your credentials
3. Confirm you reach the workflow dashboard
```

---

### 5. UI Enhancements in the Guide Dialog

**Add a hosting type selector** at the top of the n8n setup stage:
- Radio buttons: "n8n Cloud" / "Self-hosted"
- When "Self-hosted" is selected, show deployment method dropdown:
  - Docker / Docker Compose
  - Hostinger One-Click
  - npm/npx
  - Other VPS/Server

**Conditional step display:**
- Show Cloud-specific steps when "n8n Cloud" is selected
- Show self-hosted credential-finding steps when "Self-hosted" is selected
- Tailor verification prompts based on selected hosting type

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/N8nAutomationGuideDialog.tsx` | Add Stage 0 with self-hosted setup steps, hosting type selector, conditional step display |
| `src/lib/directorAiPromptGenerator.ts` | Add n8n-setup stage with self-hosted actions |
| `src/lib/verificationPromptGenerator.ts` | Add verification data for n8n-setup stage |
| `src/lib/computerUsePromptGenerator.ts` | Add self-hosted prerequisites to prompt template |
| `src/lib/n8nWorkflowVerification.ts` | Add stage node requirements for n8n-setup |

---

## Director.ai Compatibility

The new setup instructions will be fully compatible with Director.ai because:
1. Each step has clear, sequential actions
2. Validation criteria are explicit and checkable
3. Credential keys are defined for 1Password integration
4. Failure indicators help Director.ai understand when to retry or report issues
5. The JSON context block includes n8n hosting configuration

---

## Expected User Experience

1. User opens the n8n Automation Guide
2. First accordion is "Stage 0: n8n Instance Setup"
3. User selects hosting type (Cloud or Self-hosted)
4. If Self-hosted, user selects deployment method
5. Steps update to show relevant instructions for finding credentials
6. User can verify each step with AI verification
7. Copy Test Prompt generates Director.ai-compatible verification prompt
8. Once Stage 0 is complete, user proceeds to Stage 1 (Lead Prospecting)
