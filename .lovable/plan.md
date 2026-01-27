
# Fix Director.AI Prompts to Use Self-Hosted n8n Hostinger URL

## Problem Summary

When the user copies the Director.ai prompt (from the Fix Diagnosis Dialog or Export page), Director.ai navigates to n8n Cloud (`app.n8n.cloud`) instead of the user's actual self-hosted Hostinger instance at:
```
https://n8n.srv1230972.hstgr.cloud/projects/c4Rtc47DOouvg2mn/workflows
```

### Root Causes Identified

1. **`ExportComputerUsePrompt.tsx` doesn't read from `localStorage`**: While `N8nAutomationGuideDialog.tsx` persists the n8n settings to `localStorage`, the Export page initializes its own state with empty defaults and never reads the stored values.

2. **`FixDiagnosisDialog.tsx` doesn't pass n8n context to the edge function**: The diagnosis API call sends `businessContext` but omits the n8n instance URL, hosting type, and deployment method. The AI has no knowledge of the self-hosted URL.

3. **`diagnose-fix` edge function system prompt lacks n8n URL context**: Even if the URL were passed, the AI system prompt doesn't include instructions to use a specific instance URL in its Director.ai output.

4. **Generic "Navigate to n8n instance" instructions in Director.ai stages**: In `directorAiPromptGenerator.ts`, stages 1-6 use the generic phrase `Navigate to n8n instance` instead of the full URL, causing Director.ai to fall back on its default knowledge (n8n Cloud).

5. **User's workflow URL includes a project path**: The user's actual workflow location is `/projects/c4Rtc47DOouvg2mn/workflows`, not just the base domain. This path needs to be preserved for accurate navigation.

---

## Implementation Plan

### 1. Store Both Base URL and Workflow Path

**Files to modify:**
- `src/components/N8nAutomationGuideDialog.tsx`
- `src/pages/ExportComputerUsePrompt.tsx`
- `src/components/FixDiagnosisDialog.tsx`

**Changes:**

Add a new localStorage key `n8n_workflow_path` to store the full workflow page URL separately from the base domain. This allows:
- **Base URL** (`n8n_instance_url`): Used for MCP URL generation (`/mcp-server/http`)
- **Workflow Path** (`n8n_workflow_path`): Used for Director.ai navigation prompts

**State additions:**
```typescript
// New state for the full workflow/project URL the user actually uses
const [n8nWorkflowPath, setN8nWorkflowPath] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('n8n_workflow_path') || '';
  }
  return '';
});

// Persist to localStorage
useEffect(() => {
  localStorage.setItem('n8n_workflow_path', n8nWorkflowPath);
}, [n8nWorkflowPath]);
```

**UI addition (in both N8nAutomationGuideDialog and ExportComputerUsePrompt):**
```tsx
{n8nHostingType === 'self-hosted' && (
  <>
    {/* Existing base URL input */}
    <Input
      placeholder="https://n8n.srv1230972.hstgr.cloud"
      value={n8nInstanceUrl}
      onChange={(e) => setN8nInstanceUrl(e.target.value)}
      className="font-mono text-sm"
    />
    <p className="text-xs text-muted-foreground">Base domain (used for MCP URL)</p>
    
    {/* New workflow path input */}
    <Input
      placeholder="https://n8n.srv1230972.hstgr.cloud/projects/.../workflows"
      value={n8nWorkflowPath}
      onChange={(e) => setN8nWorkflowPath(e.target.value)}
      className="font-mono text-sm"
    />
    <p className="text-xs text-muted-foreground">
      Full workflow page URL (for AI navigation)
    </p>
  </>
)}
```

---

### 2. Sync localStorage in ExportComputerUsePrompt.tsx

**File:** `src/pages/ExportComputerUsePrompt.tsx`

**Changes:**

Update the state initialization to read from localStorage (matching the pattern in N8nAutomationGuideDialog):

```typescript
// Line ~66-68: Replace hardcoded defaults with localStorage reads
const [n8nHostingType, setN8nHostingType] = useState<'cloud' | 'self-hosted'>(() => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('n8n_hosting_type') as 'cloud' | 'self-hosted') || 'self-hosted';
  }
  return 'self-hosted';
});

const [selfHostedMethod, setSelfHostedMethod] = useState<'hostinger' | 'docker' | 'npm' | 'other'>(() => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('n8n_deployment_method') as 'hostinger' | 'docker' | 'npm' | 'other') || 'hostinger';
  }
  return 'hostinger';
});

const [n8nInstanceUrl, setN8nInstanceUrl] = useState<string>(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('n8n_instance_url') || '';
  }
  return '';
});

const [n8nWorkflowPath, setN8nWorkflowPath] = useState<string>(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('n8n_workflow_path') || '';
  }
  return '';
});
```

Add persistence hooks:

```typescript
useEffect(() => {
  localStorage.setItem('n8n_hosting_type', n8nHostingType);
}, [n8nHostingType]);

useEffect(() => {
  localStorage.setItem('n8n_deployment_method', selfHostedMethod);
}, [selfHostedMethod]);

useEffect(() => {
  localStorage.setItem('n8n_instance_url', n8nInstanceUrl);
}, [n8nInstanceUrl]);

useEffect(() => {
  localStorage.setItem('n8n_workflow_path', n8nWorkflowPath);
}, [n8nWorkflowPath]);
```

---

### 3. Update directorAiPromptGenerator.ts with Full URL

**File:** `src/lib/directorAiPromptGenerator.ts`

**Changes:**

1. **Update the interface** to accept the workflow path:
```typescript
export interface DirectorAiOptions {
  hostingType?: 'cloud' | 'self-hosted';
  deploymentMethod?: 'hostinger' | 'docker' | 'npm' | 'other';
  n8nInstanceUrl?: string;
  n8nWorkflowPath?: string; // NEW: Full workflow page URL for navigation
}
```

2. **Update `generateDirectorAiStages`** to use the workflow path in all "Navigate to n8n instance" instructions:

```typescript
function generateDirectorAiStages(idea: BusinessIdeaData, options?: DirectorAiOptions): AutomationStage[] {
  const n8nUrl = options?.n8nInstanceUrl?.replace(/\/$/, '') || '[YOUR_N8N_INSTANCE_URL]';
  // Use workflow path for navigation, fallback to base URL
  const n8nNavUrl = options?.n8nWorkflowPath?.replace(/\/$/, '') 
    || options?.n8nInstanceUrl?.replace(/\/$/, '') 
    || '[YOUR_N8N_INSTANCE_URL]';
  
  // ... existing hosting checks ...
  
  // Then replace ALL "Navigate to n8n instance" with:
  `Navigate to your n8n workflow dashboard at ${n8nNavUrl}`,
```

3. **Update stage actions** (lines 83, 104, 128, 152, 177, 202):

Before:
```typescript
`Navigate to n8n instance`,
```

After:
```typescript
`Navigate to your n8n workflow dashboard at ${n8nNavUrl}`,
```

4. **Update the Prerequisites section** (line 275) to show both URLs:

```typescript
## Prerequisites
Before starting, ensure you have access to:
- ${hostingDescription} instance at ${n8nUrl}
- Workflow dashboard: ${n8nNavUrl}
```

---

### 4. Pass n8n Context to Fix Diagnosis Edge Function

**File:** `src/components/FixDiagnosisDialog.tsx`

**Changes:**

1. **Read n8n settings from localStorage** at the start of `generateDiagnosis`:

```typescript
const generateDiagnosis = async () => {
  setIsLoading(true);
  setError(null);
  
  // Read n8n settings from localStorage
  const n8nHostingType = localStorage.getItem('n8n_hosting_type') || 'cloud';
  const n8nDeploymentMethod = localStorage.getItem('n8n_deployment_method') || 'hostinger';
  const n8nInstanceUrl = localStorage.getItem('n8n_instance_url') || '';
  const n8nWorkflowPath = localStorage.getItem('n8n_workflow_path') || '';

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/diagnose-fix`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        stepText,
        checkDescription: verificationData.checkDescription,
        failureIndicators: verificationData.failureIndicators,
        successIndicators: verificationData.successIndicators,
        automatedActions: verificationData.automatedActions,
        stageTitle,
        businessContext: businessIdea ? {
          businessName: businessIdea.businessName,
          niche: businessIdea.niche,
          targetAudience: businessIdea.targetAudience,
        } : null,
        // NEW: Include n8n context
        n8nContext: {
          hostingType: n8nHostingType,
          deploymentMethod: n8nDeploymentMethod,
          instanceUrl: n8nInstanceUrl,
          workflowPath: n8nWorkflowPath,
        },
      }),
    });
    // ... rest of the function
```

---

### 5. Update diagnose-fix Edge Function

**File:** `supabase/functions/diagnose-fix/index.ts`

**Changes:**

1. **Extract n8n context from request**:
```typescript
const {
  stepText,
  checkDescription,
  failureIndicators,
  successIndicators,
  automatedActions,
  stageTitle,
  businessContext,
  n8nContext, // NEW
} = await req.json();
```

2. **Include n8n context in the user prompt**:
```typescript
const userPrompt = `## CONTEXT
- Business: ${businessContext?.businessName || "User's Business"}
- Industry/Niche: ${businessContext?.niche || "Not specified"}
- Target Audience: ${businessContext?.targetAudience || "Not specified"}
- Stage: ${stageTitle}

## N8N INSTANCE CONFIGURATION
- Hosting Type: ${n8nContext?.hostingType || 'Not specified'} ${n8nContext?.deploymentMethod ? `(${n8nContext.deploymentMethod})` : ''}
- Instance URL: ${n8nContext?.instanceUrl || '[Not configured]'}
- Workflow Dashboard: ${n8nContext?.workflowPath || n8nContext?.instanceUrl || '[Not configured]'}
- MCP URL: ${n8nContext?.instanceUrl ? n8nContext.instanceUrl.replace(/\/$/, '') + '/mcp-server/http' : '[Not configured]'}

IMPORTANT: When generating Director.ai prompts, use the EXACT URLs above for navigation. Do NOT use app.n8n.cloud or any other default URL.

## STEP BEING VERIFIED
${stepText}
// ... rest of prompt
`;
```

3. **Update the system prompt** to emphasize using provided URLs:
```typescript
const systemPrompt = `You are an expert troubleshooter for n8n automation workflows and sales automation systems. A user has failed a verification step in their automation setup and needs help diagnosing and fixing it.

Your role is to:
1. Analyze the failure indicators and determine the most likely root cause
2. Provide specific, actionable fix instructions with exact UI paths
3. Generate a Director.ai-compatible prompt to automate the fix

CRITICAL: The user has provided their specific n8n instance URL in the context. 
- ALWAYS use their provided URL (not app.n8n.cloud or any default)
- Include the full workflow path URL in navigation steps
- The user's instance may be self-hosted on Hostinger or Docker

Be extremely specific. Reference exact menu paths, button names, field labels, and URLs.
Format your response in clean markdown with clear sections.`;
```

---

### 6. Update N8nAutomationGuideDialog.tsx

**File:** `src/components/N8nAutomationGuideDialog.tsx`

**Changes:**

1. Add the new `n8nWorkflowPath` state with localStorage sync (similar to existing pattern)

2. Add a new input field in the self-hosted configuration section:
```tsx
{n8nHostingType === 'self-hosted' && (
  <div className="space-y-3">
    <div>
      <Label htmlFor="n8n-base-url" className="text-sm">Base Domain</Label>
      <Input
        id="n8n-base-url"
        placeholder="https://n8n.srv1230972.hstgr.cloud"
        value={n8nInstanceUrl}
        onChange={(e) => setN8nInstanceUrl(e.target.value)}
        className="font-mono text-sm mt-1"
      />
      <p className="text-xs text-muted-foreground mt-1">Used for MCP connection</p>
    </div>
    
    <div>
      <Label htmlFor="n8n-workflow-path" className="text-sm">Workflow Page URL (optional)</Label>
      <Input
        id="n8n-workflow-path"
        placeholder="https://n8n.srv1230972.hstgr.cloud/projects/.../workflows"
        value={n8nWorkflowPath}
        onChange={(e) => setN8nWorkflowPath(e.target.value)}
        className="font-mono text-sm mt-1"
      />
      <p className="text-xs text-muted-foreground mt-1">Full URL to your workflow list page (for AI navigation)</p>
    </div>
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/directorAiPromptGenerator.ts` | Add `n8nWorkflowPath` to options interface; update all "Navigate to n8n instance" strings to use the full URL |
| `src/pages/ExportComputerUsePrompt.tsx` | Read/write all n8n settings from localStorage; add workflow path input; pass `n8nWorkflowPath` to prompt generator |
| `src/components/FixDiagnosisDialog.tsx` | Read n8n settings from localStorage and pass them to the edge function |
| `supabase/functions/diagnose-fix/index.ts` | Extract n8n context and inject it into system/user prompts |
| `src/components/N8nAutomationGuideDialog.tsx` | Add workflow path input field and localStorage sync |

---

## Expected Result

After implementation:
1. User sets their Hostinger n8n URL once in the Automation Guide or Export page
2. Both base URL and workflow path are saved to localStorage
3. When the user opens the Export page, their saved URL is pre-filled
4. When Director.ai prompts are generated (export or fix diagnosis), they contain:
   - `Navigate to your n8n workflow dashboard at https://n8n.srv1230972.hstgr.cloud/projects/c4Rtc47DOouvg2mn/workflows`
   - Not `Navigate to https://app.n8n.cloud`
5. Director.ai opens the correct Hostinger instance instead of n8n Cloud

---

## Technical Notes

- The base domain is kept separate from the workflow path because MCP URLs require the root domain (e.g., `/mcp-server/http`)
- Using localStorage ensures settings persist across page navigation and browser sessions
- The edge function receives n8n context, so the AI troubleshooter can generate accurate Director.ai prompts with the user's specific instance
