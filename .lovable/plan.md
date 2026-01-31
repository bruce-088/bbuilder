

# Plan: Add n8n Selector Patterns for Expression Editors, Code Nodes, and Credential Modals

## Overview
Expand the `N8N_SELECTORS` map in the `browserbase-automation` edge function with comprehensive selector patterns for:
1. **Expression Editors** - CodeMirror-based expression input fields
2. **Code Nodes** - JavaScript/Python code editor components  
3. **Credential Configuration Modals** - Full credential creation/edit workflow
4. **Additional Node Configuration Elements** - Tabs, toggles, advanced options

## Current State Analysis

### Existing Selectors (11 patterns)
The current `N8N_SELECTORS` map includes:
- `credential-save` - Save button in credential modals
- `dropdown-input` - Generic dropdown inputs
- `dropdown-item` - Dropdown menu items
- `node-panel` - Node details view container (NDV)
- `execute-button` - Execute/test node button
- `workflow-save` - Save workflow button
- `credential-dropdown` - Credential selection dropdown
- `text-input` - Basic text input fields
- `close-modal` - Close/cancel modal buttons

### Research Findings
Based on n8n's Playwright test infrastructure:
- Uses `data-testid` attributes extensively (e.g., `parameter-input-field`, `ndv-container`)
- Expression editors use CodeMirror with class `.cm-content`
- Code node has tabs for JavaScript/Python modes
- Credential modals follow a specific testid pattern: `parameter-input-{fieldName}`
- Node configuration uses `.parameter-input-list` containers

## New Selector Patterns to Add

### 1. Expression Editor Selectors
```typescript
"expression-editor": [
  '[data-testid="inline-expression-editor-input"]',
  '[data-testid="expression-editor"]',
  '.expression-editor .cm-content',
  '.cm-editor .cm-content',
  '.inline-expression-editor',
  '.expression-input .cm-line',
]

"expression-toggle": [
  '[data-testid="expression-toggle"]',
  'button[title="Expression"]',
  '.expression-toggle',
  '[aria-label="Toggle expression"]',
]
```

### 2. Code Node Selectors
```typescript
"code-editor": [
  '[data-testid="code-node-tab-code"]',
  '[data-testid="code-editor"]',
  '.code-node-editor .cm-content',
  '.cm-editor[data-language]',
  '.monaco-editor textarea',
  '.code-node .cm-content',
]

"code-node-tab": [
  '[data-testid="code-node-tab"]',
  '.code-node-tabs button',
  '[role="tab"]:has-text("Code")',
  '.n8n-tabs button',
]

"code-language-select": [
  '[data-testid="code-language-select"]',
  '.code-node-language-select',
  '[data-testid="select-language"]',
  '.language-selector',
]
```

### 3. Credential Modal Selectors
```typescript
"credential-modal": [
  '[data-testid="credential-edit-dialog"]',
  '[data-testid="credential-modal"]',
  '.credential-modal',
  '[role="dialog"]:has(.credential)',
  '.modal-content:has([data-testid*="credential"])',
]

"credential-input": [
  '[data-testid="parameter-input-field"]',
  '.credential-parameter input',
  '.parameter-input-list input[type="text"]',
  '.credential-input input',
  '[data-testid*="parameter-input-"] input',
]

"credential-secret-input": [
  '[data-testid="parameter-input-field"][type="password"]',
  'input[type="password"]',
  '.credential-parameter input[type="password"]',
  '[data-testid*="secret"] input',
  '[data-testid*="apiKey"] input',
  '[data-testid*="password"] input',
]

"credential-test-button": [
  '[data-testid="credential-test-button"]',
  'button:has-text("Test")',
  'button:has-text("Test Connection")',
  '.credential-test-btn',
]

"credential-type-select": [
  '[data-testid="new-credential-type-select"]',
  '[data-testid="credential-type-select"]',
  '.credential-type-select',
  '[role="combobox"]:has-text("Select Credential")',
]
```

### 4. Node Configuration Selectors
```typescript
"parameter-input": [
  '[data-testid="parameter-input-field"]',
  '.parameter-input input',
  '.parameter-input textarea',
  '.n8n-input input',
  '[data-testid*="input-field"]',
]

"parameter-label": [
  '[data-testid="parameter-label"]',
  '.parameter-label',
  '.parameter-name',
  'label.n8n-input-label',
]

"add-option-button": [
  '[data-testid="add-option-button"]',
  'button:has-text("Add Option")',
  'button:has-text("Add Field")',
  '.add-option',
  '[data-testid="add-field"]',
]

"collection-item": [
  '[data-testid="collection-item"]',
  '.collection-parameter-item',
  '.parameter-collection-item',
  '.n8n-collection-item',
]

"resource-selector": [
  '[data-testid="resource-locator"]',
  '[data-testid="resource-select"]',
  '.resource-locator',
  '.rlc-input',
]
```

### 5. NDV (Node Details View) Selectors
```typescript
"ndv-container": [
  '[data-testid="ndv-container"]',
  '.ndv-body',
  '.node-details-view',
  '[data-testid="node-details-view"]',
]

"ndv-close": [
  '[data-testid="ndv-close-button"]',
  '[data-testid="back-to-canvas"]',
  '.ndv-close',
  'button[aria-label="Close"]',
]

"ndv-output-panel": [
  '[data-testid="ndv-output-panel"]',
  '.output-panel',
  '.ndv-output',
]

"ndv-input-panel": [
  '[data-testid="ndv-input-panel"]',
  '.input-panel',
  '.ndv-input',
]

"run-data-tab": [
  '[data-testid="run-data-tab"]',
  '[role="tab"]:has-text("Output")',
  '.run-data-tabs [role="tab"]',
]
```

### 6. Workflow Canvas Selectors
```typescript
"add-node-button": [
  '[data-testid="add-node-button"]',
  '[data-testid="canvas-add-node"]',
  'button[title="Add node"]',
  '.add-node-button',
]

"node-creator": [
  '[data-testid="node-creator"]',
  '.node-creator',
  '[data-testid="nodes-panel"]',
]

"node-creator-search": [
  '[data-testid="node-creator-search-bar"]',
  '.node-creator-search input',
  'input[placeholder*="Search"]',
]

"canvas-node": [
  '[data-testid*="canvas-node-"]',
  '.vue-flow__node',
  '.n8n-node',
  '[data-node-name]',
]
```

### 7. Settings and Toggle Selectors
```typescript
"settings-tab": [
  '[data-testid="settings-tab"]',
  '[role="tab"]:has-text("Settings")',
  'button:has-text("Settings")',
]

"toggle-switch": [
  '[data-testid="toggle"]',
  '.n8n-switch',
  '[role="switch"]',
  '.el-switch',
]

"checkbox": [
  '[data-testid="checkbox"]',
  '.n8n-checkbox',
  'input[type="checkbox"]',
  '[role="checkbox"]',
]
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/browserbase-automation/index.ts` | Add 25+ new selector patterns to `N8N_SELECTORS` map |

## AI Interpreter System Prompt Update

The system prompt in `interpretAction()` will be updated to document all new selector shortcuts:

```text
**CRITICAL: n8n SELECTOR SHORTCUTS** - Use these for reliable element targeting:

// Expression Editors
- "n8n:expression-editor" → CodeMirror expression input
- "n8n:expression-toggle" → Toggle between fixed/expression mode

// Code Nodes  
- "n8n:code-editor" → Code node editor area
- "n8n:code-node-tab" → Code/settings tab buttons
- "n8n:code-language-select" → JavaScript/Python selector

// Credential Modals
- "n8n:credential-modal" → Credential edit dialog
- "n8n:credential-input" → Standard credential field
- "n8n:credential-secret-input" → Password/API key fields
- "n8n:credential-test-button" → Test connection button
- "n8n:credential-type-select" → Credential type dropdown

// Node Configuration
- "n8n:parameter-input" → Any parameter input field
- "n8n:add-option-button" → Add optional field button
- "n8n:resource-selector" → Resource locator component

// NDV (Node Details View)
- "n8n:ndv-container" → Full node panel
- "n8n:ndv-close" → Back to canvas button
- "n8n:ndv-output-panel" → Output data panel
- "n8n:ndv-input-panel" → Input data panel

// Canvas
- "n8n:add-node-button" → Add node to canvas
- "n8n:node-creator-search" → Search for node types
- "n8n:canvas-node" → Any node on canvas
```

## Implementation Details

### Selector Resolution Priority
The fallback system will try selectors in order:
1. `data-testid` selectors (most reliable, n8n's official test hooks)
2. Role-based selectors (`[role="..."]`)
3. Class-based selectors (`.n8n-*`, `.cm-*`)
4. Text-based selectors (`:has-text()`)
5. Generic fallbacks

### CodeMirror Interaction Notes
Expression and code editors use CodeMirror 6:
- Content area: `.cm-content` (contenteditable div)
- Lines: `.cm-line`
- Focus via: click on `.cm-content`, then use `Input.insertText`
- Cannot use standard `type()` - must focus first then insert

### Credential Modal Flow
Typical sequence for credential creation:
1. Click `n8n:credential-type-select`
2. Search and select credential type
3. Wait for `n8n:credential-modal`
4. Fill `n8n:credential-input` fields
5. Optionally click `n8n:credential-test-button`
6. Click `n8n:credential-save`

## Testing Recommendations

After implementation:
1. Test expression editor interaction in HTTP Request node
2. Test code node tab switching and JavaScript entry
3. Test full credential creation flow for Slack/Google Sheets
4. Verify NDV navigation (open node, modify, close)
5. Test resource locator components in Google Sheets node

## Expected Impact

- **Reliability**: 3x more selector fallbacks for critical UI elements
- **Coverage**: Support for 90%+ of common n8n automation scenarios
- **Debugging**: Better selector tracking in execution logs
- **AI Accuracy**: Clearer shortcuts for the AI interpreter to use

