

# Mind Map for Business Plan

## Overview
Create an interactive, visual mind map component that displays a business plan's key sections (Niche, Target Audience, Value Proposition, Service Offering, Revenue Math, Validation Path, AI Automation Strategy) as nodes radiating from a central hub. This gives users a bird's-eye view of their business concept.

## Design

The mind map will be an SVG-based radial layout with:
- A **central node** showing the business name
- **7 branch nodes** arranged in a circle, each representing one plan section
- Curved connector lines from center to each branch
- Click-to-expand behavior: clicking a branch reveals the full text in a popover or expanded card
- Color-coded branches matching existing purple brand palette with distinct accent tones per section

```text
                    [Niche]
                   /
    [AI Strategy]--     --[Target Audience]
                  \   /
              [Business Name]
                  /   \
  [Validation]--       --[Value Proposition]
                   \
    [Revenue Math]--[Service Offering]
```

## Where It Lives

- Accessible from the **Business Idea Detail Dialog** (`BusinessIdeaDialog.tsx`) as a new tab or toggle ("Mind Map" view alongside the existing detail list)
- Also usable standalone if needed later

## Technical Changes

### New file: `src/components/BusinessPlanMindMap.tsx`
- Accepts a business idea object (business_name, niche, target_audience, value_proposition, service_offering, revenue_math, validation_path, ai_automation_strategy)
- Renders an SVG mind map with:
  - Central circle node with business name
  - 7 branch nodes positioned radially (evenly spaced at ~51-degree intervals)
  - Curved SVG path connectors from center to each branch
  - Each branch node shows an icon and short label
  - Clicking a branch node opens a popover/tooltip with the full section text
- Responsive: scales within its container
- Uses existing Tailwind colors and Lucide icons matching `detailItems` definitions (Target, Users, Sparkles, CheckCircle2, DollarSign, Zap, Bot)

### Modified file: `src/components/BusinessIdeaDialog.tsx`
- Add a toggle button (e.g., "Mind Map" / "Details" view switcher) near the top of the dialog content
- When "Mind Map" is selected, render `BusinessPlanMindMap` instead of the linear detail list
- Default view remains the existing detail list

### No database changes needed
All data already exists in the `business_ideas` table.

### No new dependencies needed
SVG rendering is native; popovers use existing Radix `Popover` component.

