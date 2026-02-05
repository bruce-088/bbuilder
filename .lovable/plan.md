

# Voice Input, Audio Summaries & Competitor Analysis Integration

## Overview

This plan adds two major features to enhance the Mya platform:

1. **Voice Input & Audio Summaries** - Using ElevenLabs for text-to-speech and speech-to-text
2. **Competitor Analysis Integration** - Leveraging Perplexity's real-time web search capabilities

Both features integrate with existing infrastructure (AI provider settings, chat system, business ideas) and follow the established patterns in the codebase.

---

## Feature 1: Voice Input & Audio Summaries

### What It Does

- Voice-to-text input in chat with Mya
- Audio playback of Mya's responses (text-to-speech)
- Voice commands like "Mya, what's my pipeline looking like?"
- Daily audio summaries of progress

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Voice Integration                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌────────────────────────────────────────┐│
│  │   VoiceChatPanel │     │        Edge Functions                  ││
│  │                  │     │                                        ││
│  │ [🎙️ Hold to Talk]│────▶│  elevenlabs-stt   (Speech-to-Text)    ││
│  │                  │     │         │                              ││
│  │  Chat Response   │◀────│         ▼                              ││
│  │                  │     │  chat/index.ts   (AI Processing)       ││
│  │ [🔊 Play Audio] │     │         │                              ││
│  │                  │◀────│         ▼                              ││
│  └──────────────────┘     │  elevenlabs-tts   (Text-to-Speech)     ││
│                           └────────────────────────────────────────┘│
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              useVoiceChat Hook                                  │ │
│  │  - Manages microphone state                                     │ │
│  │  - Handles audio recording/playback                             │ │
│  │  - Voice activity detection                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Components to Create

| File | Description |
|------|-------------|
| `src/hooks/useVoiceChat.ts` | Hook for managing voice input/output state |
| `src/components/Chat/VoiceInputButton.tsx` | Microphone button with hold-to-talk functionality |
| `src/components/Chat/AudioPlaybackButton.tsx` | Play audio version of Mya's responses |
| `src/components/Dashboard/DailyAudioSummary.tsx` | Widget for generating/playing daily summaries |
| `supabase/functions/elevenlabs-tts/index.ts` | Edge function for text-to-speech |
| `supabase/functions/elevenlabs-stt/index.ts` | Edge function for speech-to-text tokens |

### Database Changes

Add ElevenLabs to the existing AI provider infrastructure:

```sql
-- Add elevenlabs_configured column to user_ai_preferences
ALTER TABLE public.user_ai_preferences 
ADD COLUMN IF NOT EXISTS elevenlabs_configured boolean DEFAULT false;

-- Add voice preferences
ALTER TABLE public.user_ai_preferences
ADD COLUMN IF NOT EXISTS preferred_voice_id text DEFAULT 'JBFqnCBsd6RMkjVDRZzb';

ALTER TABLE public.user_ai_preferences
ADD COLUMN IF NOT EXISTS voice_enabled boolean DEFAULT true;
```

### Implementation Details

#### 1. Voice Input Button (Chat Page)

Add a microphone button next to the send button:

```tsx
// VoiceInputButton.tsx
function VoiceInputButton({ onTranscript }) {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Uses @elevenlabs/react useScribe hook for real-time transcription
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    onCommittedTranscript: (data) => {
      onTranscript(data.text);
    }
  });
  
  // Hold-to-talk UI with visual feedback
}
```

#### 2. Audio Playback (TTS)

After Mya responds, show a play button:

```tsx
// AudioPlaybackButton.tsx
function AudioPlaybackButton({ text, messageId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  
  const playAudio = async () => {
    // Fetch from elevenlabs-tts edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
      method: "POST",
      body: JSON.stringify({ text, voiceId: "JBFqnCBsd6RMkjVDRZzb" })
    });
    const audioBlob = await response.blob();
    // Play audio...
  };
}
```

#### 3. Voice Commands

Pattern matching for common voice commands:

```typescript
// Voice command patterns
const VOICE_COMMANDS = [
  { pattern: /pipeline|leads/i, action: "pipeline_summary" },
  { pattern: /progress|status/i, action: "daily_progress" },
  { pattern: /next steps?|todo/i, action: "whats_next" },
  { pattern: /schedule|calendar/i, action: "schedule_overview" }
];

function processVoiceCommand(transcript: string) {
  for (const { pattern, action } of VOICE_COMMANDS) {
    if (pattern.test(transcript)) {
      return { isCommand: true, action };
    }
  }
  return { isCommand: false };
}
```

#### 4. Daily Audio Summary

Dashboard widget that generates spoken summaries:

```tsx
// DailyAudioSummary.tsx
function DailyAudioSummary() {
  const generateSummary = async () => {
    // 1. Gather stats: leads, progress, upcoming tasks
    // 2. Format as natural speech text
    // 3. Convert to audio via elevenlabs-tts
    // 4. Play automatically or on demand
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Briefing</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={generateSummary}>
          <Volume2 className="mr-2" />
          Play Today's Summary
        </Button>
      </CardContent>
    </Card>
  );
}
```

### AI Settings Integration

Add ElevenLabs tab to AISettingsDialog:

```tsx
<TabsTrigger value="elevenlabs">
  <Volume2 className="h-3.5 w-3.5" />
  <span>Voice</span>
</TabsTrigger>

<TabsContent value="elevenlabs">
  {/* API Key input */}
  {/* Voice selection dropdown */}
  {/* Test voice button */}
</TabsContent>
```

### Edge Functions

#### elevenlabs-tts/index.ts

```typescript
serve(async (req) => {
  const { text, voiceId = "JBFqnCBsd6RMkjVDRZzb" } = await req.json();
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5", // Fast model for real-time
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: 1.0,
        },
      }),
    }
  );

  const audioBuffer = await response.arrayBuffer();
  return new Response(audioBuffer, {
    headers: { "Content-Type": "audio/mpeg" }
  });
});
```

#### elevenlabs-stt/index.ts

```typescript
serve(async (req) => {
  // Generate single-use token for client-side streaming STT
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

  const response = await fetch(
    "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
    {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
    }
  );

  const { token } = await response.json();
  return new Response(JSON.stringify({ token }));
});
```

---

## Feature 2: Competitor Analysis Integration

### What It Does

- Analyze competitors mentioned in business plans
- Track competitor pricing, features, and positioning
- Suggest differentiation strategies
- Monitor industry trends and news

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    Competitor Analysis Flow                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Business Idea                                                       │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  competitor-analysis Edge Function                            │   │
│  │                                                               │   │
│  │  1. Extract competitor names from niche/business plan         │   │
│  │  2. Query Perplexity for each competitor                      │   │
│  │     - Pricing info                                            │   │
│  │     - Key features                                            │   │
│  │     - Market positioning                                      │   │
│  │     - Recent news                                             │   │
│  │  3. Generate differentiation recommendations                  │   │
│  │  4. Store results in competitor_analyses table                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│       │                                                              │
│       ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  CompetitorAnalysisPanel (Dashboard)                          │   │
│  │                                                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                    │   │
│  │  │  Competitor 1   │  │  Competitor 2   │                    │   │
│  │  │  ───────────── │  │  ─────────────  │                    │   │
│  │  │  Pricing: $X    │  │  Pricing: $Y    │                    │   │
│  │  │  Features: ...  │  │  Features: ...  │                    │   │
│  │  │  Positioning... │  │  Positioning... │                    │   │
│  │  └─────────────────┘  └─────────────────┘                    │   │
│  │                                                               │   │
│  │  🎯 Differentiation Strategy                                  │   │
│  │  ─────────────────────────────                               │   │
│  │  Based on competitor analysis, focus on: ...                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Components to Create

| File | Description |
|------|-------------|
| `src/components/CompetitorAnalysis/CompetitorCard.tsx` | Display single competitor info |
| `src/components/CompetitorAnalysis/CompetitorAnalysisPanel.tsx` | Main panel with all competitors |
| `src/components/CompetitorAnalysis/DifferentiationSuggestions.tsx` | AI-generated recommendations |
| `src/components/CompetitorAnalysis/IndustryTrends.tsx` | Real-time industry news |
| `src/hooks/useCompetitorAnalysis.ts` | Hook for fetching/managing analysis |
| `supabase/functions/competitor-analysis/index.ts` | Edge function for Perplexity queries |

### Database Changes

```sql
-- Store competitor analysis results
CREATE TABLE public.competitor_analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_idea_id uuid REFERENCES public.business_ideas(id) ON DELETE CASCADE,
  competitor_name text NOT NULL,
  pricing_info jsonb,
  features text[],
  positioning text,
  strengths text[],
  weaknesses text[],
  recent_news jsonb,
  source_urls text[],
  analyzed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Store differentiation strategies
CREATE TABLE public.differentiation_strategies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_idea_id uuid REFERENCES public.business_ideas(id) ON DELETE CASCADE,
  strategy_type text NOT NULL, -- 'pricing', 'features', 'positioning', 'niche'
  recommendation text NOT NULL,
  confidence_score integer, -- 1-100
  supporting_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.differentiation_strategies ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own analyses"
  ON public.competitor_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON public.competitor_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own strategies"
  ON public.differentiation_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
  ON public.differentiation_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Implementation Details

#### 1. Competitor Analysis Edge Function

```typescript
// supabase/functions/competitor-analysis/index.ts
serve(async (req) => {
  const { businessIdeaId, competitors, niche } = await req.json();
  
  // Get user's Perplexity API key
  const apiKey = await getDecryptedApiKey(supabase, userId, "perplexity");
  
  const results = [];
  
  for (const competitor of competitors) {
    // Query Perplexity for competitor info
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro", // Better for research
        messages: [
          {
            role: "user",
            content: `Analyze ${competitor} as a competitor in the ${niche} market. 
            Provide:
            1. Pricing structure (specific tiers if available)
            2. Key features and differentiators
            3. Target audience
            4. Strengths and weaknesses
            5. Recent news or updates (last 3 months)`
          }
        ],
        search_recency_filter: "month"
      }),
    });
    
    const data = await response.json();
    results.push({
      competitor,
      analysis: data.choices[0].message.content,
      citations: data.citations
    });
  }
  
  // Generate differentiation strategy
  const strategyResponse = await callPerplexity([
    {
      role: "user",
      content: `Based on these competitor analyses for a ${niche} business:
      ${JSON.stringify(results)}
      
      Suggest 3-5 differentiation strategies with:
      1. Strategy type (pricing, features, positioning, niche)
      2. Specific recommendation
      3. Why it would work against these competitors
      4. Confidence score (1-100)`
    }
  ], apiKey);
  
  return new Response(JSON.stringify({
    competitors: results,
    strategies: parseStrategies(strategyResponse)
  }));
});
```

#### 2. CompetitorAnalysisPanel

```tsx
// src/components/CompetitorAnalysis/CompetitorAnalysisPanel.tsx
function CompetitorAnalysisPanel({ businessIdeaId }) {
  const { 
    competitors, 
    strategies, 
    loading, 
    runAnalysis 
  } = useCompetitorAnalysis(businessIdeaId);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Competitor Intelligence
        </CardTitle>
        <Button onClick={runAnalysis} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Analyze Competitors
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* Competitor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors.map(comp => (
            <CompetitorCard key={comp.id} competitor={comp} />
          ))}
        </div>
        
        {/* Differentiation Strategies */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Your Differentiation Strategy</h3>
          {strategies.map(strategy => (
            <DifferentiationCard key={strategy.id} strategy={strategy} />
          ))}
        </div>
        
        {/* Industry Trends */}
        <IndustryTrends niche={businessIdea.niche} />
      </CardContent>
    </Card>
  );
}
```

#### 3. Industry Trends Widget

```tsx
// Real-time industry monitoring
function IndustryTrends({ niche }) {
  const { trends, loading, refresh } = useIndustryTrends(niche);
  
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Industry Trends
        </h3>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {trends.map(trend => (
        <div key={trend.id} className="flex items-start gap-3 py-2">
          <Badge variant={trend.sentiment === 'positive' ? 'success' : 'secondary'}>
            {trend.category}
          </Badge>
          <div>
            <p className="text-sm">{trend.summary}</p>
            <a href={trend.source} className="text-xs text-muted-foreground">
              {trend.sourceName} - {formatDate(trend.date)}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Integration with Business Ideas

Add competitor analysis to the business idea view:

1. **Auto-detect competitors** from business plan text
2. **Manual add** button for known competitors
3. **Schedule refresh** option for ongoing monitoring

---

## Files to Create/Modify Summary

### Voice Features

| File | Action |
|------|--------|
| `src/hooks/useVoiceChat.ts` | Create |
| `src/components/Chat/VoiceInputButton.tsx` | Create |
| `src/components/Chat/AudioPlaybackButton.tsx` | Create |
| `src/components/Dashboard/DailyAudioSummary.tsx` | Create |
| `src/components/Chat/index.ts` | Modify (add exports) |
| `src/pages/Chat.tsx` | Modify (add voice button) |
| `src/pages/Dashboard.tsx` | Modify (add audio summary widget) |
| `src/components/AISettingsDialog.tsx` | Modify (add ElevenLabs tab) |
| `src/hooks/useAIProviders.ts` | Modify (add ElevenLabs support) |
| `supabase/functions/elevenlabs-tts/index.ts` | Create |
| `supabase/functions/elevenlabs-stt/index.ts` | Create |

### Competitor Analysis Features

| File | Action |
|------|--------|
| `src/hooks/useCompetitorAnalysis.ts` | Create |
| `src/components/CompetitorAnalysis/CompetitorCard.tsx` | Create |
| `src/components/CompetitorAnalysis/CompetitorAnalysisPanel.tsx` | Create |
| `src/components/CompetitorAnalysis/DifferentiationSuggestions.tsx` | Create |
| `src/components/CompetitorAnalysis/IndustryTrends.tsx` | Create |
| `src/components/CompetitorAnalysis/index.ts` | Create |
| `src/pages/Dashboard.tsx` | Modify (add panel to business idea view) |
| `supabase/functions/competitor-analysis/index.ts` | Create |

### Database Migrations

| Migration | Tables |
|-----------|--------|
| Add voice preferences | `user_ai_preferences` (columns) |
| Create competitor tables | `competitor_analyses`, `differentiation_strategies` |

---

## API Keys Required

| Provider | Secret Name | Usage |
|----------|-------------|-------|
| ElevenLabs | `ELEVENLABS_API_KEY` | TTS and STT |
| Perplexity | User's BYOK | Competitor research |

---

## Dependencies to Install

```bash
npm install @elevenlabs/react
```

---

## Implementation Sequence

### Phase 1: Voice Input (Priority)

1. Add ElevenLabs API key support to AISettingsDialog
2. Create TTS edge function
3. Create STT token edge function
4. Add AudioPlaybackButton to chat messages
5. Add VoiceInputButton to chat input area
6. Install `@elevenlabs/react` package

### Phase 2: Voice Commands & Summaries

1. Implement voice command detection
2. Create DailyAudioSummary dashboard widget
3. Add voice settings to user preferences

### Phase 3: Competitor Analysis

1. Create database tables with RLS
2. Implement competitor-analysis edge function
3. Create CompetitorAnalysisPanel component
4. Add to business idea detail view
5. Implement industry trends monitoring

---

## Technical Considerations

### Voice Input UX

- **Permission handling**: Request microphone with clear explanation
- **Visual feedback**: Animated microphone icon while recording
- **Fallback**: Text input always available
- **Mobile support**: Touch-friendly hold-to-talk

### Perplexity Integration

- **Rate limiting**: Cache results, refresh on demand
- **Cost management**: Use `sonar` for quick queries, `sonar-pro` for deep research
- **Source attribution**: Display citations from Perplexity responses

### Performance

- **Audio streaming**: Use streaming TTS for faster response
- **Lazy loading**: Load voice components only when needed
- **Caching**: Cache competitor analyses for 24 hours

