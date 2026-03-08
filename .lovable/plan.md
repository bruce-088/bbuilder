

# Create Reusable "Export App Spec" Feature Prompt

## What You're Asking For

A template prompt you can paste into any new Lovable project to add the "Export Master Prompt" feature — allowing you to export that app's full specification for analysis by external LLMs.

## The Prompt

I'll create a markdown file containing a ready-to-use Lovable prompt that:

1. **Creates the Export page** (`/export-spec`) with PDF, Markdown, Text, and Copy buttons
2. **Generates a master prompt file** with placeholders for app name, features, DB schema, edge functions
3. **Adds PDF generation** using jsPDF with branded styling
4. **Includes Lovable formatting instructions** so external LLMs return compatible code

## File to Create

| File | Purpose |
|------|---------|
| `docs/ADD_EXPORT_SPEC_FEATURE.md` | Reusable prompt template for adding this feature to any app |

The prompt will be self-contained and include all the code patterns needed — user just pastes it into a new project and customizes the app-specific content.

