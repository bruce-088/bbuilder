import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VoiceModeState = "idle" | "listening" | "processing" | "speaking";

const EXIT_COMMANDS = /\b(stop|goodbye|exit|that'?s all|quit)\b/i;

interface UseVoiceModeOptions {
  onSendMessage: (text: string) => Promise<void>;
  onAssistantResponse?: (text: string) => void;
  voiceId?: string;
}

export function useVoiceMode({
  onSendMessage,
  voiceId = "JBFqnCBsd6RMkjVDRZzb",
}: UseVoiceModeOptions) {
  const [state, setState] = useState<VoiceModeState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [lastAssistantText, setLastAssistantText] = useState("");
  const [elevenLabsAvailable, setElevenLabsAvailable] = useState<boolean | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const activeRef = useRef(false);
  const scribeWsRef = useRef<WebSocket | null>(null);

  // Check if ElevenLabs is available on mount
  useEffect(() => {
    checkElevenLabsAvailability();
  }, []);

  const checkElevenLabsAvailability = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      const data = await res.json();
      setElevenLabsAvailable(!!data.token);
    } catch {
      setElevenLabsAvailable(false);
    }
  };

  // ── STT: Web Speech API fallback ──
  const startWebSpeechSTT = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        handleCommittedTranscript(final.trim());
      } else {
        setLiveTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Web Speech error:", event.error);
      if (event.error !== "no-speech" && activeRef.current) {
        stopVoiceMode();
      }
    };

    recognition.onend = () => {
      // Auto-restart if still active (Web Speech sometimes stops)
      if (activeRef.current && state === "listening") {
        try {
          recognition.start();
        } catch { /* already started */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    return true;
  }, []);

  // ── STT: ElevenLabs Scribe via useScribe not feasible without React context,
  //    so we use Web Speech API as the primary STT for now ──

  const handleCommittedTranscript = useCallback(
    async (text: string) => {
      if (!text.trim() || !activeRef.current) return;

      setLiveTranscript("");

      // Check for exit commands
      if (EXIT_COMMANDS.test(text)) {
        stopVoiceMode();
        return;
      }

      // Transition to processing
      setState("processing");

      // Stop listening while processing
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ok */ }
      }

      try {
        await onSendMessage(text);
      } catch (error) {
        console.error("Voice mode send error:", error);
      }
      // After sending, we wait for feedAssistantResponse to be called
    },
    [onSendMessage]
  );

  // Called by Chat.tsx when assistant response is complete
  const feedAssistantResponse = useCallback(
    async (text: string) => {
      if (!activeRef.current) return;

      setLastAssistantText(text);

      // Try TTS
      if (elevenLabsAvailable) {
        setState("speaking");
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                text: text.substring(0, 2000),
                voiceId,
              }),
            }
          );

          if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              if (activeRef.current) {
                resumeListening();
              }
            };

            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              if (activeRef.current) {
                resumeListening();
              }
            };

            await audio.play();
            return;
          }
        } catch (error) {
          console.error("TTS error:", error);
        }
      }

      // No TTS available or failed — go back to listening after a brief pause
      if (activeRef.current) {
        setTimeout(() => resumeListening(), 1500);
      }
    },
    [elevenLabsAvailable, voiceId]
  );

  const resumeListening = useCallback(() => {
    if (!activeRef.current) return;
    setState("listening");
    setLiveTranscript("");
    startWebSpeechSTT();
  }, [startWebSpeechSTT]);

  const startVoiceMode = useCallback(async () => {
    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      return;
    }

    activeRef.current = true;
    setState("listening");
    setLiveTranscript("");
    setLastAssistantText("");
    startWebSpeechSTT();
  }, [startWebSpeechSTT]);

  const stopVoiceMode = useCallback(() => {
    activeRef.current = false;
    setState("idle");
    setLiveTranscript("");

    // Stop STT
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ok */ }
      recognitionRef.current = null;
    }

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Close WebSocket
    if (scribeWsRef.current) {
      scribeWsRef.current.close();
      scribeWsRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ok */ }
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (scribeWsRef.current) {
        scribeWsRef.current.close();
      }
    };
  }, []);

  return {
    state,
    isActive: state !== "idle",
    liveTranscript,
    lastAssistantText,
    elevenLabsAvailable,
    startVoiceMode,
    stopVoiceMode,
    feedAssistantResponse,
  };
}
