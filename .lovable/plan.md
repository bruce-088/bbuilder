

# Connect Visual Strategy Roadmap to Setup Guide Progress

## Current State Analysis

**StrategicCommandPanel**: Uses hardcoded `mockPhases` with static status
**setup_guide_progress table**: Stores JSONB with capability IDs as keys, each containing boolean arrays
**useManualProgress hook**: Already reads/writes progress data
**Setup Guide capabilities**: 7 capability areas (lead-gen, pipeline, outreach, qualification, closing, automation, analytics)

## Implementation Plan

### 1. Create Roadmap Progress Hook
**File**: `src/hooks/useRoadmapProgress.ts`

Maps setup guide capabilities to the 5 strategic phases:
- **validation** → qualification (discovery calls, scoring)
- **landing** → pipeline (CRM setup)  
- **offer** → closing (proposals, pricing)
- **outreach** → lead-gen + outreach (lead lists, email sequences)
- **sale** → closing (payment collection) + analytics (revenue tracking)

**Algorithm**:
1. Query `setup_guide_progress` table for user's progress JSONB
2. For each phase, aggregate completion from mapped capabilities
3. Calculate status:
   - `completed`: 100% of mapped capabilities done
   - `in-progress`: 1-99% done
   - `pending`: 0% done
4. Return array of Phase objects with real data

### 2. Update StrategicCommandPanel
**File**: `src/components/StrategicCommand/StrategicCommandPanel.tsx`

Replace `mockPhases` with:
```typescript
const { phases, isLoading } = useRoadmapProgress();
```

Pass real phases to `<VisualStrategyRoadmap />`

### 3. Wire Up Phase Actions
**onPhaseClick**: Navigate to Setup Guide with capability pre-selected
**onSyncPhase**: Trigger sync action or navigate to relevant tool

### 4. Visual Updates
- Show completion percentage for in-progress phases
- Animate status transitions
- Display actual completion metrics

## Technical Details

**Phase Mapping Logic**:
```typescript
const PHASE_CAPABILITY_MAP = {
  validation: ['qualification'],
  landing: ['pipeline'],
  offer: ['closing'],
  outreach: ['lead-gen', 'outreach'],
  sale: ['closing', 'analytics']
};
```

**Completion Calculation**:
```typescript
// For each phase:
const mappedCaps = PHASE_CAPABILITY_MAP[phaseId];
const totalSteps = mappedCaps.reduce((sum, capId) => 
  sum + (capabilities.find(c => c.id === capId)?.manual.steps.length ?? 0), 0
);
const completedSteps = mappedCaps.reduce((sum, capId) => 
  sum + (progress[capId]?.filter(Boolean).length ?? 0), 0
);
const percentage = (completedSteps / totalSteps) * 100;
```

## Files to Create/Modify
1. **Create**: `src/hooks/useRoadmapProgress.ts` - Main progress aggregation logic
2. **Modify**: `src/components/StrategicCommand/StrategicCommandPanel.tsx` - Replace mock data
3. **Modify**: `src/components/StrategicCommand/VisualStrategyRoadmap.tsx` - Handle loading state

## Edge Cases
- User has no progress → all phases show "pending"
- User completed all steps → show celebration state
- Database query fails → fallback to empty progress
- Partial capability completion → calculate exact percentage

