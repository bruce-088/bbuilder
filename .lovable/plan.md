

# Master Prompt PDF Export

## What We're Building
Add a "Download as PDF" button to the existing Master Implementation Prompt dialog (`BusinessIdeaMasterPromptDialog.tsx`). When clicked, it generates a branded PDF document containing the full 4-week master prompt, pre-filled with the user's business idea data.

## Technical Changes

### New file: `src/lib/masterPromptPdfGenerator.ts`
- Reuse the same branding pattern from `pdfGenerator.ts` (dark header, purple accents, footer)
- Render the master prompt content as a structured PDF with:
  - Header: "MASTER IMPLEMENTATION PROMPT" + business name
  - Business Overview section (Niche, Target Audience, Value Prop, Service Offering, Revenue, Validation, AI Strategy)
  - Phase 1-4 sections with numbered action items
  - Success Metrics, Automation Priorities, and Start Now sections
- Uses jsPDF + autoTable (already installed)

### Modified file: `src/components/BusinessIdeaMasterPromptDialog.tsx`
- Add a "Download PDF" button next to the existing "Copy Master Prompt" button
- Calls the new PDF generator with the business idea data
- Uses the `FileDown` icon from lucide-react

### No database or backend changes needed

