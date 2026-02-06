

# Add Database Query, Loop/Iterator, and Merge Nodes

## Overview
Add three new node types to the visual workflow engine, expanding the automation capabilities for more complex patterns like querying your database, iterating over lists, and merging parallel branches.

---

## New Node Types

### 1. Database Query
- Query your project's database directly from a workflow
- Configurable table name, operation (SELECT, INSERT, UPDATE, DELETE), filters, and column selection
- Supports template variables from upstream nodes (e.g., `{{email}}`)

### 2. Loop / Iterator
- Takes an array input and executes downstream nodes once per item
- Configurable input field (which key in the data holds the array)
- Collects all iteration results into a single output array

### 3. Merge
- Combines inputs from multiple parent branches into one object
- Configurable merge strategy: "combine" (merge all keys), "wait all" (wait for all parents), or "append" (concatenate arrays)

---

## What Changes

### A. Node Type Definitions (`types.ts`)
- Add `database_query`, `loop`, and `merge` to the `NodeType` union
- Add their entries in `NODE_TYPE_CONFIG` with label, icon, color, description, and default config

### B. Node Palette (`NodePalette.tsx`)
- Add `database_query` under a new **"Data"** category
- Add `loop` and `merge` under the **"Logic"** category

### C. Node Inspector (`NodeInspector.tsx`)
- **Database Query**: Fields for table name, operation (SELECT/INSERT/UPDATE/DELETE), filter column, filter value, and select columns
- **Loop**: Field for the array input key name
- **Merge**: Dropdown for merge strategy (combine / wait all / append)

### D. Workflow Executor (edge function)
- **`executeDatabaseQuery`**: Uses the Supabase service-role client to run the configured query against the project database. Supports SELECT with filters, INSERT, UPDATE, and DELETE.
- **`executeLoop`**: Extracts the array from input, runs the remaining downstream subgraph for each item (simplified: collects items into an output array for the next node).
- **`executeMerge`**: Already partially handled by the existing multi-parent merge logic; the new implementation adds configurable strategies (combine objects, wait for all, or append arrays).

### E. Node Renderer
- No changes needed -- it already renders any node type dynamically from `NODE_TYPE_CONFIG`.

---

## Technical Details

### New type definitions
```text
NodeType union additions:
  'database_query' | 'loop' | 'merge'
```

### NODE_TYPE_CONFIG entries
```text
database_query:
  icon: "🗄️", color: hsl(220, 70%, 50%)
  defaultConfig: { table: '', operation: 'select', filters: {}, columns: '*' }

loop:
  icon: "🔁", color: hsl(310, 60%, 55%)
  defaultConfig: { array_field: 'items', collect_results: true }

merge:
  icon: "🔗", color: hsl(30, 80%, 50%)
  defaultConfig: { strategy: 'combine' }
```

### Edge function executor additions
- `executeDatabaseQuery(node, input)` -- builds and runs a Supabase query using the service-role client
- `executeLoop(node, input)` -- splits array input into individual items, outputs them as an array (downstream nodes process the collected array)
- `executeMerge(node, input)` -- applies the selected merge strategy to combine multi-parent inputs

### Files modified
1. `src/components/WorkflowBuilder/types.ts` -- add 3 node types + configs
2. `src/components/WorkflowBuilder/NodePalette.tsx` -- add new category and node entries
3. `src/components/WorkflowBuilder/NodeInspector.tsx` -- add config panels for each new type
4. `supabase/functions/workflow-executor/index.ts` -- add 3 executor functions + switch cases

