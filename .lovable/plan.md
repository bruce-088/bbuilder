
# Plan: Align Enhanced Director.ai Fix Prompts with N8N Automation Guide Format

## Status: ✅ COMPLETED

## Summary
Updated `directorAiFixPromptGenerator.ts` to produce prompts that exactly match the structure and style used in the N8N Full Automation Setup Guide (`fixPromptGenerator.ts` and `verificationPromptGenerator.ts`).

## Changes Made

### 1. `src/lib/directorAiFixPromptGenerator.ts`
- Restructured prompt format to match guide style with JSON business context blocks
- Added `VerificationData` interface import and support
- Simplified environment config to essential fields (Instance URL, Workflow Dashboard, Hosting Type)
- Added success/failure indicators with ✅/❌ format
- Added mode declaration with warning icon ("⚠️ This is a FIX task")
- Matched exact report format table structure
- Added `generateDefaultVerificationData()` for fallback when not provided

### 2. `src/components/AutomationEngine/ExceptionReview.tsx`
- Added `VerificationData` import
- Updated `getDirectorAiPrompt()` to create verification data from fix context
- Passes `verificationData` to `generateDirectorAiFixPrompt()`

## Output Format
The generated prompts now match the N8N guide style exactly:
- JSON business context block
- Environment table with 3 key fields
- Issue details with phase, root cause, confidence
- "What Was Being Verified" section
- "Why It Failed" diagnosis
- Numbered fix actions with navigation first
- Success indicators (✅) and failure indicators (❌)
- Structured report format table
- Error handling and prevention sections
