

# Plan: Automatic n8n Login Handling for Browser Agent

## Overview

Implement automatic login handling where the browser agent can fill in n8n credentials if provided by the user. When the automation detects an expired session or login page, it will automatically authenticate using stored credentials instead of failing with an auth_expired error.

## Current State

| Component | Status |
|-----------|--------|
| Login detection | `checkLoginStatus()` detects login pages |
| Auth retry | Manual "Clear & Retry" button in UI |
| Credential storage | `user_api_keys` table for AI providers |
| Browser contexts | Stored in localStorage per n8n URL |

## Solution Architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User stores   │────▶│  n8n_credentials │────▶│  Browser Agent  │
│   email + pass  │     │  (encrypted DB)  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │  Login Page Found?  │
                                              └─────────────────────┘
                                                    │         │
                                              Yes   │         │ No
                                                    ▼         ▼
                                        ┌──────────────┐  ┌──────────┐
                                        │ Auto-Login   │  │ Continue │
                                        │ with stored  │  │ workflow │
                                        │ credentials  │  │ actions  │
                                        └──────────────┘  └──────────┘
```

## Changes Required

### 1. Database: Create `n8n_credentials` Table

Store encrypted n8n credentials per user per instance URL.

```sql
CREATE TABLE public.n8n_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instance_url TEXT NOT NULL,
  encrypted_email TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, instance_url)
);

-- RLS policies for user access
ALTER TABLE public.n8n_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own n8n credentials"
  ON public.n8n_credentials FOR ALL
  USING (auth.uid() = user_id);
```

### 2. Edge Function: Add Login Automation

Update `browserbase-automation/index.ts`:

**New request parameters:**
```typescript
interface AutomationRequest {
  // ... existing fields
  n8nCredentials?: {
    email: string;
    password: string;
  };
}
```

**New `performN8nLogin()` function:**
```typescript
async function performN8nLogin(
  cdp: CDPClient,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Attempting automatic n8n login...");
    
    // Wait for login form
    await cdp.waitForSelector('input[name="email"], input[type="email"]', 10000);
    
    // Find and fill email field
    await cdp.type('input[name="email"], input[type="email"]', email);
    await delay(300);
    
    // Find and fill password field
    await cdp.type('input[name="password"], input[type="password"]', password);
    await delay(300);
    
    // Click login button
    await cdp.click('[data-testid="sign-in-button"], button[type="submit"]');
    
    // Wait for navigation/canvas to appear
    await delay(3000);
    
    // Verify login succeeded
    const loginStatus = await checkLoginStatus(cdp);
    if (loginStatus.isLoggedIn) {
      console.log("Auto-login successful!");
      return { success: true };
    }
    
    return { success: false, error: "Login failed - credentials may be incorrect" };
  } catch (e) {
    console.error("Auto-login failed:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
```

**Update background execution:**
```typescript
// In executeInBackground():
if (loginStatus.isLoginPage && !loginStatus.isLoggedIn) {
  // Check if we have credentials
  const { data: creds } = await supabase
    .from("n8n_credentials")
    .select("encrypted_email, encrypted_password")
    .eq("user_id", requestUserId)
    .eq("instance_url", n8nInstanceUrl)
    .maybeSingle();
    
  if (creds) {
    // Attempt auto-login
    const loginResult = await performN8nLogin(
      cdp, 
      creds.encrypted_email,  // Decrypt in production
      creds.encrypted_password
    );
    
    if (!loginResult.success) {
      throw new Error(`AUTO_LOGIN_FAILED: ${loginResult.error}`);
    }
    
    // Re-navigate to workflow if needed
    await cdp.navigate(n8nInstanceUrl);
    await delay(2000);
  } else {
    // No credentials - prompt user
    throw new Error("AUTH_EXPIRED: No stored credentials");
  }
}
```

### 3. Frontend Hook: Handle Auto-Login Status

Update `useBrowserbaseAutomation.ts`:

```typescript
type AutomationStatus = 
  | "idle" 
  | "starting" 
  | "running" 
  | "executing" 
  | "logging_in"  // New status
  | "completed" 
  | "failed" 
  | "stopped" 
  | "auth_expired"
  | "login_failed"; // New status
```

### 4. UI: Add n8n Credentials Management

Update `AISettingsDialog.tsx` Browser tab:

**Add credentials input section:**
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-base flex items-center gap-2">
      <Lock className="h-4 w-4" />
      n8n Login Credentials
    </CardTitle>
    <CardDescription>
      Optionally store your n8n email and password for automatic login
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {storedCredentials ? (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{storedCredentials.instanceUrl}</p>
          <p className="text-xs text-muted-foreground">
            Credentials stored for {storedCredentials.email}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleRemoveCredentials}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Remove
        </Button>
      </div>
    ) : (
      <div className="space-y-3">
        <Input
          placeholder="n8n Instance URL (e.g., https://your-n8n.app.n8n.cloud)"
          value={n8nUrl}
          onChange={(e) => setN8nUrl(e.target.value)}
        />
        <Input
          type="email"
          placeholder="Email"
          value={n8nEmail}
          onChange={(e) => setN8nEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={n8nPassword}
          onChange={(e) => setN8nPassword(e.target.value)}
        />
        <Button onClick={handleSaveCredentials} disabled={!n8nUrl || !n8nEmail || !n8nPassword}>
          <Lock className="h-4 w-4 mr-2" />
          Save Credentials
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

### 5. New Hook: `useN8nCredentials`

Create `src/hooks/useN8nCredentials.ts`:

```typescript
export function useN8nCredentials() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<N8nCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const saveCredentials = async (instanceUrl: string, email: string, password: string) => {
    // Upsert to n8n_credentials table
  };

  const removeCredentials = async (instanceUrl: string) => {
    // Delete from n8n_credentials table
  };

  const getCredentialsForUrl = (instanceUrl: string) => {
    return credentials.find(c => normalizeUrl(c.instance_url) === normalizeUrl(instanceUrl));
  };

  return { credentials, loading, saveCredentials, removeCredentials, getCredentialsForUrl };
}
```

### 6. Update FixGuidancePopover

Update the auth expired banner to show if credentials are available:

```tsx
{browserbase.isAuthExpired && (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
    <AlertTriangle className="h-4 w-4 text-amber-400" />
    <p className="text-sm font-medium text-amber-400">
      {hasStoredCredentials 
        ? "Login Failed" 
        : "Session Expired - No Credentials Saved"}
    </p>
    <p className="text-xs text-muted-foreground">
      {hasStoredCredentials
        ? "Auto-login failed. Please verify your n8n credentials in settings."
        : "Save your n8n login credentials in AI Settings to enable automatic login."}
    </p>
    <Button variant="outline" size="sm">
      {hasStoredCredentials ? "Update Credentials" : "Add Credentials"}
    </Button>
  </div>
)}
```

## Files to Create/Modify

| File | Changes |
|------|---------|
| Database migration | Create `n8n_credentials` table with RLS |
| `supabase/functions/browserbase-automation/index.ts` | Add `performN8nLogin()`, update execute flow |
| `src/hooks/useN8nCredentials.ts` | New hook for credential management |
| `src/hooks/useBrowserbaseAutomation.ts` | Add `logging_in` status, pass credentials |
| `src/components/AISettingsDialog.tsx` | Add n8n credentials UI in Browser tab |
| `src/components/AutomationEngine/FixGuidancePopover.tsx` | Update auth expired banner |

## Implementation Order

1. **Database first** - Create `n8n_credentials` table with encryption
2. **Hook** - Create `useN8nCredentials` for CRUD operations
3. **UI** - Add credentials input in AI Settings Browser tab
4. **Edge Function** - Implement `performN8nLogin()` and integrate into execution flow
5. **Frontend integration** - Update status handling and error messages

## Security Considerations

- Credentials are stored encrypted in the database (like existing API keys)
- RLS ensures users can only access their own credentials
- Credentials are only retrieved server-side in the edge function
- Passwords are never logged or exposed to the frontend after storage

## Testing Checklist

After implementation:
- [ ] Save n8n credentials via AI Settings dialog
- [ ] Trigger automation with expired context
- [ ] Verify auto-login attempts with stored credentials
- [ ] Test with incorrect credentials (should show login_failed)
- [ ] Test without stored credentials (should show auth_expired with prompt)
- [ ] Verify credentials can be removed/updated

