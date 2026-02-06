

# Fix: Node Connection (Edge Drawing) Not Working

## Root Cause

The current connection mechanism requires:
1. `mousedown` on the output handle (right circle) -- sets `connectingFrom` state
2. `mouseup` **exactly** on the input handle (left circle) of another node -- creates the edge

**Two problems make this fail:**
- The 16px input handle is too small a drop target, and the mouseup consistently lands on other elements (canvas, root div) instead
- There is zero visual feedback during the drag -- no temporary line following the cursor, so the user has no idea if they're "connecting"

## Solution

### 1. Add a temporary "connecting line" that follows the cursor while dragging

When the user starts dragging from an output handle, render a dashed SVG line from the source node to the current mouse position. This gives clear visual feedback.

### 2. Use a canvas-level mouseup listener to detect the drop target

Instead of relying on the mouseup landing on the tiny input handle, detect the nearest input handle within a radius (e.g., 30px) when the mouse is released anywhere on the canvas. This makes connections much easier to complete.

### 3. Increase handle hit areas

Make the visible handles slightly larger and add an invisible larger hit area around them.

## Technical Changes

### File: `src/hooks/useWorkflowBuilder.ts`
- Add `connectingMousePos` state to track cursor position during a connection drag

### File: `src/components/WorkflowBuilder/Canvas.tsx`
- Track mouse position during connection drag and pass it to EdgeRenderer
- On mouseup anywhere on the canvas, check if cursor is near any node's input handle (within 30px snap radius)
- If near a valid input handle, complete the connection
- Clear `connectingFrom` state on mouseup regardless

### File: `src/components/WorkflowBuilder/EdgeRenderer.tsx`
- Accept optional `connectingFrom` (source node ID) and `mousePos` props
- When both are present, render a dashed line from the source node's output to the current mouse position

### File: `src/components/WorkflowBuilder/NodeRenderer.tsx`
- Increase handle size from `w-4 h-4` to `w-5 h-5` for easier targeting
- Keep the `onMouseUp` on input handles as a fallback

### File: `src/pages/WorkflowEditor.tsx`
- Pass `connectingFrom` and mouse position state through to Canvas
- Update `handleConnectEnd` to work with the new proximity-based detection

