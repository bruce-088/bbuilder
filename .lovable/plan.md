
# Plan: Align Enhanced Director.ai Fix Prompts with N8N Automation Guide Format

## Status: ✅ COMPLETED

## Summary
Updated `directorAiFixPromptGenerator.ts` to produce prompts that exactly match the structure and style used in the N8N Full Automation Setup Guide, with knowledge base integration for more accurate fix prompts.

## Changes Made

### 1. `src/lib/directorAiFixPromptGenerator.ts`
- Restructured prompt format to match guide style with JSON business context blocks
- Added `VerificationData` interface import and support
- Added `knowledgeBaseHits` property to show when KB was used
- Simplified environment config to essential fields
- Added success/failure indicators with ✅/❌ format
- Added mode declaration with warning icon

### 2. `src/hooks/useFixKnowledgeBase.ts`
- Added `PHASE_NODE_MAPPINGS` for phase-to-node-type lookups
- Added `findFixesByPhase()` function to query KB by phase name
- Added `generateVerificationDataFromKnowledgeBase()` to create enhanced verification data from past fixes
- Added `getEnhancedVerificationData()` async helper
- KB entries now contribute node-type-specific indicators (HTTP, Gmail, Sheets, OpenAI, Webhook)

### 3. `src/components/AutomationEngine/ExceptionReview.tsx`
- Integrated `useFixKnowledgeBase` hook
- Added `knowledgeBaseCache` state to pre-fetch KB entries for fix phases
- Updated `getDirectorAiPrompt()` to use KB-enhanced verification data
- Added "KB" badge indicator when knowledge base data is used

## Knowledge Base Integration
When generating fix prompts:
1. Looks up previously successful fixes by phase name
2. Maps phase to relevant node types (prospecting → httpRequest, googleSheets, etc.)
3. Extracts success/failure indicators from past fixes
4. Shows "📚 Knowledge Base Enhanced" in prompt when KB data is used
5. Displays "KB" badge on fix cards in UI
