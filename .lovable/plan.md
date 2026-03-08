

# Strategy Guide Modal

## What We're Building
A new "Strategy Guide" dialog component that explains three key concepts:
1. **Sync to Nexus** — How the manifest sync workflow sends business data to NexusAI and WeatherPost via the Triad Event Bus
2. **Using the Brain** — How to generate manifests from business ideas using Mya's chat and the dashboard sync button
3. **Reading Triad Feedback** — How to interpret events from the Triad Event Bus to evolve business strategy

## Approach
Follow the exact pattern of `HowToUseDialog.tsx` — a step-based dialog with icons, descriptions, and pro tips inside a ScrollArea.

## Files to Create/Edit

### 1. Create `src/components/StrategyGuideDialog.tsx`
- Dialog with 3 sections, each with icon, title, description, and tips
- Section 1: "Sync to Nexus" — explains the sync-to-triad edge function, x-triad-key handshake, parallel dispatch to Nexus + WeatherPost
- Section 2: "Generate Manifests with the Brain" — explains chatting with Mya, saving a business idea, then clicking Sync to push the manifest
- Section 3: "Read Triad Event Bus Feedback" — explains the `triad_events` table, event types like `MANIFEST_SYNCED`, and how to use feedback to iterate on strategy
- Same visual style as HowToUseDialog (icons, step cards, tips with CheckCircle2)

### 2. Edit `src/pages/Dashboard.tsx`
- Import `StrategyGuideDialog`
- Add state: `showStrategyGuide`
- Add a button (e.g., a "Strategy Guide" icon button near the existing HelpCircle/HowToUse button) that opens the dialog
- Render `<StrategyGuideDialog open={showStrategyGuide} onOpenChange={setShowStrategyGuide} />`

