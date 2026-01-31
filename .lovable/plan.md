

## Configure n8n Instance URL and Test Browserbase Automation

### Overview
To test the BrowserbaseExecutionPanel with live action data, we need to:
1. Configure an n8n instance URL in localStorage
2. Navigate to the Automation Engine for a business idea
3. Trigger an exception that enables the "Run Auto-Fix" button
4. Execute the Browserbase automation and observe the real-time panel updates

### Current State
- **Browserbase Credentials**: Already configured (`BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` secrets exist)
- **BrowserbaseExecutionPanel**: Already integrated into the AutomationEngine dialog
- **n8n URL Storage**: Uses `localStorage` with key `n8n_instance_url`

### Step-by-Step Implementation

#### Step 1: Set n8n Instance URL via Browser Console
You can configure the n8n instance URL directly in your browser's developer console while on the dashboard:

```javascript
// Set your n8n instance URL (choose one option):

// Option A: For Hostinger self-hosted (your setup)
localStorage.setItem('n8n_instance_url', 'https://n8n.srv1230972.hstgr.cloud');
localStorage.setItem('n8n_workflow_path', 'https://n8n.srv1230972.hstgr.cloud/workflow');
localStorage.setItem('n8n_hosting_type', 'self-hosted');
localStorage.setItem('n8n_deployment_method', 'hostinger');

// Option B: For n8n Cloud
// localStorage.setItem('n8n_instance_url', 'https://your-instance.app.n8n.cloud');
// localStorage.setItem('n8n_hosting_type', 'cloud');

// Refresh the page after setting
location.reload();
```

#### Step 2: Trigger the Automation Engine
1. From the dashboard, click on any business idea card (e.g., "SyncMaster Pro")
2. In the business idea details, look for the **"Automate Everything"** button
3. Click it to open the Automation Engine dialog

#### Step 3: Generate an Exception
The Automation Engine runs through 6 phases. To trigger the Exception Review panel (which contains the "Run Auto-Fix" button):
1. The automation will attempt to analyze, generate, and verify workflows
2. If n8n verification fails (e.g., missing nodes, workflow not found), it creates an exception
3. The Exception Review panel appears with AI fix recommendations

#### Step 4: Run the Auto-Fix
Once exceptions appear:
1. Click **"Apply Fixes"** to generate AI fix recommendations
2. Expand a fix recommendation
3. Click **"Run Auto-Fix"** (the green CDP button)
4. The **BrowserbaseExecutionPanel** will display:
   - Real-time action progress bar
   - Timeline of each action (navigate, click, type, wait, screenshot)
   - Status badges (pending → running → completed/failed)
   - Selector debugging info (which fallback matched)
   - Final screenshot preview

### Alternative: Direct Hook Testing
If you want to test the panel without a full automation cycle, we can create a test harness that simulates action execution data:

```text
+------------------------------------------+
|  Browserbase Execution Details           |
|  ----------------------------------------|
|  [=============================>     ]   |
|  28/32 actions completed • 12.3s elapsed |
+------------------------------------------+
|  [✓] Navigate to n8n workflows page      |
|      Selector: n/a (URL navigation)      |
|      Completed in 1.8s                   |
|  ----------------------------------------|
|  [✓] Click "Add Workflow" button         |
|      Selector: n8n:add-workflow (2nd)    |
|      Completed in 0.4s                   |
|  ----------------------------------------|
|  [▸] Configure HTTP Request node         |
|      Running for 3.2s...                 |
|  ----------------------------------------|
|  [○] Save credentials                    |
|  [○] Capture final screenshot            |
+------------------------------------------+
```

### Files Involved (No Changes Needed)
| File | Role |
|------|------|
| `src/hooks/useBrowserbaseAutomation.ts` | Manages automation state and API calls |
| `src/components/AutomationEngine/BrowserbaseExecutionPanel.tsx` | Displays action timeline |
| `src/components/AutomationEngine/FixGuidancePopover.tsx` | Contains "Run Auto-Fix" button |
| `src/components/AutomationEngine/index.tsx` | Hosts the panel in the dialog |

### What to Expect During Execution
1. **Starting** (1-2s): Session creation, context verification
2. **Running** (5-30s): AI interpreter generates 25-35 CDP actions
3. **Executing** (30-90s): Actions execute with real-time updates:
   - Each action shows status badge (pending → running → completed)
   - Failed actions show error message and selector attempted
   - Screenshots captured for key steps
4. **Completed**: Final screenshot displayed, timing summary shown

### Debugging Tips
- **View Live Session**: Click "Watch live session" link to see the actual browser in Browserbase
- **Console Logs**: Check browser console for `CDP:` prefixed messages showing selector fallback attempts
- **Edge Function Logs**: Use Lovable's backend function logs to see CDP communication

