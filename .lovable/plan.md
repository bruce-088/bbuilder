

# Plan: Enhance Director.ai Fix Prompts with Explicit n8n Canvas Navigation Instructions

## Problem Analysis

Director.ai reported this feedback after receiving the current fix prompt:
> "I am unable to navigate the workflow canvas to find and access the nodes that need fixing. The canvas is showing a vertical line of nodes but I cannot see them clearly or access their configuration panels."

**Root Cause:** The current `generateDirectorAiFixPrompt` function generates high-level fix steps (like "Update the Claude node API key") but lacks explicit browser automation instructions for:
- How to navigate the n8n canvas (zoom, pan, scroll)
- How to select and click on specific nodes
- How to open node configuration panels
- Visual cues to identify the correct node

## Solution

Enhance the Director.ai fix prompt generator to include a dedicated **n8n Canvas Navigation** section with explicit browser actions for interacting with the n8n workflow editor.

---

## Technical Changes

### File: `src/lib/directorAiFixPromptGenerator.ts`

Add a new section to the generated prompt that provides explicit n8n UI navigation instructions.

| Change | Description |
|--------|-------------|
| Add `generateCanvasNavigationInstructions()` helper | Generates node-specific navigation steps |
| Add n8n UI navigation section | Includes zoom, pan, and node selection instructions |
| Add visual identification cues | Describes what each node type looks like in n8n |
| Add keyboard shortcuts | Include n8n keyboard shortcuts for navigation |

### New Helper Function

```typescript
function generateCanvasNavigationInstructions(nodeNames: string[]): string {
  return `
## n8n Canvas Navigation Guide

### How to Find Nodes on the Canvas
1. **Zoom Out First**: Press \`Ctrl/Cmd + -\` or use scroll wheel while holding Ctrl to zoom out and see all nodes
2. **Use Node Search**: Press \`Ctrl/Cmd + K\` to open the command palette, type the node name to jump to it
3. **Pan the Canvas**: Click and drag on empty canvas space to pan around
4. **Fit All Nodes**: Press \`Ctrl/Cmd + 0\` to fit all nodes in view

### How to Open a Node's Configuration Panel
1. **Single Click** on any node to select it (node gets highlighted with blue border)
2. **Double Click** on the node to open its configuration panel (slides in from the right)
3. Alternatively: Right-click the node and select "Open" from the context menu

### Visual Node Identification
${nodeNames.map(name => `- **${name}**: Look for a rectangular node with "${name}" label at the top`).join('\n')}

### Nodes That Need Fixing
${nodeNames.map((name, i) => `${i + 1}. Locate the **"${name}"** node on the canvas
   - Double-click to open its configuration panel
   - The panel will slide in from the right side of the screen`).join('\n')}

### Troubleshooting Canvas Navigation
- If nodes appear too small: Zoom in with \`Ctrl/Cmd + +\`
- If canvas is panning unexpectedly: Click on empty space to deselect any nodes
- If node panel won't open: Try clicking elsewhere first, then double-click the target node
`;
}
```

### Updated `generateDirectorAiFixPrompt` Function

Add the canvas navigation section after "N8N Environment" and before "Issue Details":

```typescript
// Extract node names from steps or fix context
const nodeNamesToFix = extractNodeNamesFromSteps(issue.steps);

prompt += generateCanvasNavigationInstructions(nodeNamesToFix);

// Enhance Fix Actions with explicit click instructions
prompt += `## Fix Actions
Execute the following browser actions to resolve this issue:

1. Navigate to ${urlInfo.workflowUrl}
2. Wait for the workflow canvas to fully load (nodes should be visible)
3. Press \`Ctrl/Cmd + 0\` to fit all nodes in view
`;

issue.steps.forEach((step, i) => {
  // Add explicit click/navigation context to each step
  prompt += `${i + 4}. ${enhanceStepWithUIActions(step)}\n`;
});
```

### New Helper: Extract Node Names

```typescript
function extractNodeNamesFromSteps(steps: string[]): string[] {
  const nodePatterns = [
    /(?:the\s+)?["']?([A-Z][a-zA-Z0-9\s]+)["']?\s+node/gi,
    /(?:Update|Configure|Fix|Open)\s+["']?([A-Z][a-zA-Z0-9\s]+)["']?/gi,
  ];
  
  const nodeNames = new Set<string>();
  steps.forEach(step => {
    nodePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(step)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && !['the', 'this', 'that'].includes(name.toLowerCase())) {
          nodeNames.add(name);
        }
      }
    });
  });
  
  return Array.from(nodeNames);
}
```

### New Helper: Enhance Steps with UI Actions

```typescript
function enhanceStepWithUIActions(step: string): string {
  // If step mentions a node, add explicit click instructions
  const nodeMatch = step.match(/["']?([A-Z][a-zA-Z0-9\s]+)["']?\s+node/i);
  if (nodeMatch) {
    const nodeName = nodeMatch[1];
    return `**Double-click** on the "${nodeName}" node to open its configuration panel. ${step}`;
  }
  
  // If step mentions credentials, add navigation context
  if (step.toLowerCase().includes('credential')) {
    return `${step}. Look for the "Credential" dropdown field in the node's configuration panel.`;
  }
  
  // If step mentions API key, add field location context
  if (step.toLowerCase().includes('api key') || step.toLowerCase().includes('apikey')) {
    return `${step}. The API key field is typically in the "Authentication" or "Credentials" section of the node panel.`;
  }
  
  return step;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/directorAiFixPromptGenerator.ts` | Add canvas navigation helper functions and enhance fix prompt generation |

---

## Example Enhanced Output

Before (current):
```
## Fix Actions
1. Navigate to https://n8n.example.com/workflows
2. Update the Claude node API key
3. Connect the Beehiiv credentials
4. Fix the Email node template
```

After (enhanced):
```
## n8n Canvas Navigation Guide

### How to Find Nodes on the Canvas
1. **Zoom Out First**: Press `Ctrl/Cmd + -` or use scroll wheel while holding Ctrl
2. **Use Node Search**: Press `Ctrl/Cmd + K` to open the command palette
3. **Pan the Canvas**: Click and drag on empty canvas space
4. **Fit All Nodes**: Press `Ctrl/Cmd + 0`

### How to Open a Node's Configuration Panel
1. **Single Click** on any node to select it
2. **Double Click** on the node to open its configuration panel

### Nodes That Need Fixing
1. Locate the **"Claude"** node on the canvas
   - Double-click to open its configuration panel
2. Locate the **"Beehiiv"** node on the canvas
   - Double-click to open its configuration panel
3. Locate the **"Email"** node on the canvas
   - Double-click to open its configuration panel

## Fix Actions
1. Navigate to https://n8n.example.com/workflows
2. Wait for the workflow canvas to fully load
3. Press `Ctrl/Cmd + 0` to fit all nodes in view
4. **Double-click** on the "Claude" node to open its configuration panel. Update the API key in the "Credentials" section.
5. **Double-click** on the "Beehiiv" node to open its configuration panel. Connect the credentials dropdown.
6. **Double-click** on the "Email" node to open its configuration panel. Fix the HTML template field.
```

---

## Expected Behavior After Implementation

1. Director.ai prompts will include explicit canvas navigation instructions
2. AI agents will know how to zoom, pan, and search for nodes
3. Each fix step will include explicit "double-click to open" instructions
4. Node names will be extracted and listed with navigation guidance
5. Keyboard shortcuts for n8n will be included for faster navigation

---

## Validation Criteria

- Generated prompts include "n8n Canvas Navigation Guide" section
- Keyboard shortcuts (Ctrl+K, Ctrl+0, etc.) are documented
- Node names are extracted from fix steps and listed
- Each step includes explicit click/double-click instructions
- Director.ai can successfully navigate to and open node configuration panels

