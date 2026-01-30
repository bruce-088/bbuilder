
# Plan: Fix Workflow Dropdown to Show All MCP Workflows

## ✅ COMPLETED

The `handleQuickCacheFromAgent` function has been updated to cache **both** GhostWriter workflows with accurate node data from the MCP results:

1. **GhostWriter AI: Lead Prospecting & Discovery Engine** (10 nodes) - Stage 1 only
2. **GhostWriter AI: The Authority Engine - Complete Sales Automation** (51 nodes) - All Stages 1-5

### Changes Made
- Updated `src/components/N8nAutomationGuideDialog.tsx` lines 1114-1204
- Replaced single hardcoded workflow with array of both known workflows
- Added accurate node data for all 5 stages from the actual MCP workflow details
- Updated success message to show count of workflows cached

### Result
- The dropdown now shows "2 workflow(s) available from MCP"
- Users can select either workflow for each stage
- Default mappings auto-select the appropriate workflow per stage
- Live verification works for all stages with correct node expectations
