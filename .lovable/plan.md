

# Update Master Prompt + PDF Export + Fix Build Errors

## 1. Fix Build Errors (Critical)

The previous edit added `"types": ["vitest/globals"]` to `tsconfig.app.json`, which restricts TypeScript's type resolution and breaks all module imports. Fix: remove the `types` field so TypeScript discovers types from `node_modules/@types` normally.

## 2. Update Master Prompt Content

The current `MASTER_PROMPT` in both `MASTER_PROMPT.md` and `src/pages/ExportPrompt.tsx` is outdated (still references "IdeaForge AI"). Update to reflect the current app name **"Business Builder AI"** and all current features:

- Mission Control (gamified dashboard with quests, XP, daily briefings)
- Mya AI consultant (voice chat, cowork mode)
- Lead CRM pipeline
- Workflow Builder (visual canvas)
- Template Library
- Competitor Analysis
- Mind Map visualization
- Automation Engine (n8n, Browserbase)
- Business Plan Bundle export (PDF + n8n workflows)
- Master Implementation Prompt generation

The prompt will be structured for Lovable-style consumption: clear feature specs, database schema, design system, edge functions, and a quick-start section.

## 3. Add PDF Export

Add a "Download as PDF" button to `ExportPrompt.tsx` using the same branded PDF pattern from `pdfGenerator.ts` (dark header, purple accents, MYA branding). The PDF will render the master prompt as a structured multi-page document with:
- Branded header
- Table of contents
- Sections for each feature area
- Database schema table
- Tech stack summary

### Files Changed

| File | Action |
|------|--------|
| `tsconfig.app.json` | Remove `types` field to fix build |
| `MASTER_PROMPT.md` | Update with current app state |
| `src/pages/ExportPrompt.tsx` | Update prompt content + add PDF download button |
| `src/lib/masterPromptPdfGenerator.ts` | New - PDF generation for master prompt |

### No database changes needed.

