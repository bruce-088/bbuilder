
# Remove mem0ai Package - Security Fix

## Summary
The `mem0ai` npm package can be **safely removed** as it is completely unused in the codebase. All memory functionality is implemented via direct API calls in the Supabase Edge Function, making this dependency redundant.

## Why This Is Safe

| Component | Uses mem0ai Package? | How Memory Works |
|-----------|---------------------|------------------|
| Edge Function (`supabase/functions/mem0/index.ts`) | No | Direct `fetch` to `api.mem0.ai` |
| Frontend helpers (`src/lib/ai.ts`) | No | Calls edge function via Supabase |
| Chat page (`src/pages/Chat.tsx`) | No | Uses frontend helpers |

## Changes Required

### 1. Remove from package.json
Delete the `mem0ai` dependency line from `package.json`:
```diff
- "mem0ai": "^2.2.1",
```

### 2. Lock File Update
The build system will automatically regenerate `bun.lockb` without the vulnerable package.

## What Stays Working
- Memory storage after chat messages
- Memory search for context retrieval  
- All Mem0 API features via the edge function

## Security Impact
- Resolves the supply chain vulnerability (axios SSRF/DoS)
- Reduces bundle size by removing unused code
- No functional changes to the application
