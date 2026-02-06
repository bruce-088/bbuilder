

# Voice-First Mode for Mya

## Overview

Add a hands-free "Voice Mode" to the chat where users tap one button to start a continuous voice conversation with Mya. They speak naturally, Mya transcribes in real-time using ElevenLabs Scribe, auto-sends the message, executes business tools, and speaks the response back -- all without touching the keyboard.

## Current State

- **VoiceInputButton**: Uses browser Web Speech API, only fills the text input (user must still click Send)
- **AudioPlaybackButton**: Plays TTS for individual messages (manual click per message)
- **useVoiceChat hook**: Has TTS playback and MediaRecorder code but doesn't connect STT-to-send-to-TTS in a loop
- **Edge functions**: `elevenlabs-stt` (token endpoint) and `elevenlabs-tts` exist and are ready
- **Missing secret**: `ELEVENLABS_API_KEY` is NOT configured -- voice mode needs a graceful fallback to Web Speech API

## How Voice Mode Works

1. User taps the **microphone button** (hold or toggle) in the chat footer
2. A **Voice Mode overlay** appears with a pulsing waveform animation and status text
3. **STT** transcribes speech in real-time (ElevenLabs Scribe if API key available, otherwise Web Speech API fallback)
4. On silence/commit, the transcript is **auto-sent** to Mya as a chat message
5. Mya processes the message (including tool calls like `log_revenue`, `move_lead_stage`, etc.)
6. Mya's response is **auto-spoken** via ElevenLabs TTS (or skipped if no API key)
7. After TTS finishes, the mic **re-opens automatically** for the next command (continuous conversation loop)
8. User taps the stop button or says "stop" / "goodbye" to exit voice mode

## Technical Changes

### 1. New Component: `src/components/Chat/VoiceModeOverlay.tsx`

A full-screen overlay that appears during voice mode:
- Mya avatar with pulsing ring animation (listening vs speaking states)
- Live transcript text below avatar
- Status indicator: "Listening...", "Processing...", "Mya is speaking..."
- Waveform/pulse animation using framer-motion
- Close/stop button
- Tool result cards rendered inline (reuses `CopilotActionCard`)

### 2. New Hook: `src/hooks/useVoiceMode.ts`

Orchestrates the full voice loop:
- **State machine**: `idle` -> `listening` -> `processing` -> `speaking` -> `listening` (loop)
- **STT integration**: Tries ElevenLabs Scribe first (via `elevenlabs-stt` token endpoint), falls back to Web Speech API
- **Auto-send**: When transcript is committed, calls the same `handleSend` logic from Chat.tsx
- **Auto-TTS**: When assistant response is complete, plays it via `elevenlabs-tts`
- **Re-listen**: After TTS playback ends, automatically re-starts STT
- **Exit commands**: Detects "stop", "goodbye", "exit" to end voice mode
- **Graceful degradation**: If ElevenLabs API key is missing, uses Web Speech API for STT and skips TTS (text-only responses shown in overlay)

### 3. Update `src/pages/Chat.tsx`

- Add `voiceModeActive` state
- Long-press or dedicated toggle on the mic button activates voice mode
- When voice mode is active, render `VoiceModeOverlay` on top of the chat
- Pass `handleSend`-equivalent function to voice mode so transcripts go through the same copilot tool pipeline
- Messages sent/received during voice mode appear in the normal chat history too

### 4. Update `src/components/Chat/VoiceInputButton.tsx`

- Add `onLongPress` or `onDoubleClick` prop to trigger voice mode (distinct from single-tap which fills input)
- Visual indicator when voice mode is available

### 5. Secret Check

- `ELEVENLABS_API_KEY` is not currently configured
- Voice mode will work without it using Web Speech API fallback for STT (no TTS playback)
- If the user wants full ElevenLabs voice quality, we'll prompt them to add the secret

## Voice Mode States (Visual)

| State | Avatar Animation | Status Text | Mic |
|-------|-----------------|-------------|-----|
| Listening | Green pulsing ring | "Listening..." + live transcript | Active |
| Processing | Amber spinning | "Thinking..." | Off |
| Speaking | Blue wave animation | "Mya is speaking..." | Off |
| Paused | Dim ring | "Tap to continue" | Off |

## Exit Conditions

- User taps the X / stop button
- User says "stop", "goodbye", "that's all", or "exit"
- User navigates away from the chat page
- Browser tab loses focus (optional -- can pause instead)

## No Database Changes

Voice mode is entirely client-side UI. All messages still flow through the existing chat pipeline and are saved normally.

## Dependencies

- `@elevenlabs/react` (already installed) -- `useScribe` hook for realtime STT
- `framer-motion` (already installed) -- animations
- Existing `elevenlabs-stt` and `elevenlabs-tts` edge functions

