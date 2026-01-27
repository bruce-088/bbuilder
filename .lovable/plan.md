
# Fix Test Connection Button and Director.ai for Self-Hosted n8n (Hostinger)

## Problem Analysis

The current "Test Connection" button has two issues:

1. **It doesn't actually test the connection** - The button calls the `verify-n8n-workflow` edge function with `mcpConnected: true` hardcoded, and the edge function just returns "connected" without verifying anything

2. **It can't reach self-hosted n8n** - The edge function runs on Supabase servers and cannot directly call the user's Hostinger-hosted n8n MCP URL

The n8n MCP connector IS already connected to this Lovable project (I can see `search_workflows`, `execute_workflow`, and `get_workflow_details` tools available). The solution is to make the Test Connection button use these MCP tools directly from the frontend.

---

## Implementation Strategy

### 1. Update Test Connection to Use Real MCP Tools

**File: `src/components/N8nAutomationGuideDialog.tsx`**

Instead of calling the edge function, the Test Connection button should:
1. Call the n8n MCP `search_workflows` tool directly
2. If the call succeeds, show the workflow count and confirm connection
3. If the call fails, show helpful error messages about checking MCP URL configuration

However, since MCP tools are only available to the Lovable agent (not directly callable from React code), we need a different approach:

**Approach: Use the existing MCP connection status from the agent context**

The frontend can detect if the n8n MCP is connected by checking if workflows can be fetched. Since I (the agent) can call `search_workflows`, the Test Connection should display:
- Instructions for the user to verify their n8n MCP URL is configured in Project Settings
- A visual confirmation once the MCP connector is linked

**Updated `handleTestConnection` logic:**
```typescript
const handleTestConnection = async () => {
  setTestingConnection(true);
  
  // The actual MCP connection is verified by checking if the connector 
  // is configured in Project Settings → Connectors → n8n
  // We can test by calling our edge function which checks the configuration
  
  const { data, error } = await supabase.functions.invoke('verify-n8n-workflow', {
    body: {
      testConnection: true,
      hostingType: hostingType, // 'cloud' or 'self-hosted'
      deploymentMethod: deploymentMethod, // 'hostinger', 'docker', etc.
      stageId: 'n8n-setup',
      stageName: 'Connection Test',
      businessContext: { ... }
    }
  });
  
  // If the user selected self-hosted Hostinger, show specific instructions
  if (hostingType === 'self-hosted' && data?.connectionStatus === 'no_mcp') {
    setConnectionTestResult({
      success: false,
      message: "n8n MCP connector not configured. Follow these steps:\n" +
        "1. In your Hostinger n8n instance: Settings → MCP access → Enable\n" +
        "2. Copy your MCP URL (e.g., https://your-n8n.hostingersite.com/mcp-server/http)\n" +
        "3. In Lovable: Project Settings → Connectors → n8n → Paste your MCP URL"
    });
  }
};
```

### 2. Update Edge Function for Better Self-Hosted Detection

**File: `supabase/functions/verify-n8n-workflow/index.ts`**

Update the connection test handler to:
1. Accept `hostingType` and `deploymentMethod` parameters
2. Return deployment-specific instructions when MCP is not connected
3. Provide Hostinger-specific troubleshooting steps

```typescript
if (testConnection) {
  const { hostingType, deploymentMethod } = request;
  
  // For self-hosted, provide specific instructions based on deployment method
  if (hostingType === 'self-hosted') {
    if (deploymentMethod === 'hostinger') {
      return {
        connectionStatus: mcpConnected ? 'connected' : 'no_mcp',
        instructions: [
          "1. Log into your Hostinger n8n instance",
          "2. Go to Settings → MCP access",
          "3. Enable MCP access and copy the MCP Server URL",
          "4. In Lovable: Project Settings → Connectors → Connect n8n",
          "5. Paste your Hostinger n8n MCP URL"
        ],
        hostingerNote: "Your MCP URL format: https://[your-subdomain].hostingersite.com/mcp-server/http"
      };
    }
    // Docker, npm, etc. specific instructions...
  }
}
```

### 3. Add Instance URL Input Field

**File: `src/components/N8nAutomationGuideDialog.tsx`**

Add an optional input field where users can enter their n8n instance URL:
- For self-hosted: Show input for custom domain or IP:port
- Display the expected MCP URL format based on their input
- Add a "Copy MCP URL" button to help users configure the connector

```tsx
{hostingType === 'self-hosted' && (
  <div className="space-y-2">
    <Label>Your n8n Instance URL</Label>
    <Input 
      placeholder="https://n8n.yourdomain.com or http://your-ip:5678"
      value={n8nInstanceUrl}
      onChange={(e) => setN8nInstanceUrl(e.target.value)}
    />
    {n8nInstanceUrl && (
      <div className="text-sm text-muted-foreground">
        <strong>Your MCP URL:</strong> {n8nInstanceUrl}/mcp-server/http
        <Button variant="ghost" size="sm" onClick={copyMcpUrl}>
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    )}
  </div>
)}
```

### 4. Update Director.ai Prompts for Dynamic Instance URLs

**File: `src/lib/directorAiPromptGenerator.ts`**

Add a parameter for the user's actual n8n instance URL in the prompt generation:

```typescript
interface DirectorAiOptions {
  hostingType?: 'cloud' | 'self-hosted';
  deploymentMethod?: 'hostinger' | 'docker' | 'npm' | 'other';
  n8nInstanceUrl?: string;
}

function generateDirectorAiStages(idea: BusinessIdeaData, options?: DirectorAiOptions): AutomationStage[] {
  const n8nUrl = options?.n8nInstanceUrl || '[YOUR_N8N_INSTANCE_URL]';
  
  return [
    {
      id: "n8n-setup",
      title: "n8n Instance Setup & Access",
      actions: [
        options?.hostingType === 'self-hosted' && options?.deploymentMethod === 'hostinger'
          ? `Navigate to your Hostinger n8n instance at ${n8nUrl}`
          : "Navigate to your n8n instance URL",
        // ... rest of actions
      ]
    }
  ];
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/N8nAutomationGuideDialog.tsx` | Add instance URL input, update test connection logic, pass hosting info to edge function |
| `supabase/functions/verify-n8n-workflow/index.ts` | Handle hosting type/method, return deployment-specific instructions |
| `src/lib/directorAiPromptGenerator.ts` | Accept instance URL parameter, generate dynamic prompts |
| `src/lib/computerUsePromptGenerator.ts` | Accept instance URL parameter for computer-use AI agents |

---

## User Experience Flow

1. User opens n8n Automation Guide
2. User selects "Self-hosted" → "Hostinger One-Click"
3. User enters their n8n instance URL (e.g., `https://n8n.mysite.com`)
4. System displays: "Your MCP URL: `https://n8n.mysite.com/mcp-server/http`" with a Copy button
5. User clicks "Test Connection"
6. If not configured: Shows Hostinger-specific instructions with their actual URL
7. If configured: Shows success with workflow count
8. Director.ai prompts now include the user's specific Hostinger URL

---

## Technical Notes

- The n8n MCP connector is already connected to this Lovable project
- MCP tools (`search_workflows`, etc.) are available to the Lovable agent but not directly callable from React code
- The Test Connection button verifies MCP configuration status, not direct API calls
- Instance URL is stored in component state and passed to prompt generators
- All prompts dynamically use the user's actual n8n URL instead of placeholders
