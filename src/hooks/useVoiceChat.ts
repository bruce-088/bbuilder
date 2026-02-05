import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Voice command patterns
const VOICE_COMMANDS = [
  { pattern: /pipeline|leads/i, action: "pipeline_summary" as const },
  { pattern: /progress|status/i, action: "daily_progress" as const },
  { pattern: /next steps?|todo|what('s| is) next/i, action: "whats_next" as const },
  { pattern: /help|how (do|can) I/i, action: "help" as const },
];

type VoiceCommand = "pipeline_summary" | "daily_progress" | "whats_next" | "help" | null;

interface UseVoiceChatOptions {
  onTranscript?: (text: string) => void;
  onCommand?: (command: VoiceCommand, transcript: string) => void;
  voiceId?: string;
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const { onTranscript, onCommand, voiceId = "JBFqnCBsd6RMkjVDRZzb" } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [partialTranscript, setPartialTranscript] = useState("");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check for microphone permission
  const checkPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setHasPermission(false);
      return false;
    }
  }, []);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    const granted = await checkPermission();
    if (!granted) {
      toast.error("Microphone access is required for voice input", {
        description: "Please enable microphone access in your browser settings",
      });
    }
    return granted;
  }, [checkPermission]);

  // Process voice command from transcript
  const processVoiceCommand = useCallback((transcript: string): VoiceCommand => {
    for (const { pattern, action } of VOICE_COMMANDS) {
      if (pattern.test(transcript)) {
        return action;
      }
    }
    return null;
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    const hasAccess = hasPermission ?? await requestPermission();
    if (!hasAccess) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await processRecording(audioBlob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect in 100ms chunks
      setIsRecording(true);
      setPartialTranscript("");
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to start recording");
    }
  }, [hasPermission, requestPermission]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Process recorded audio (simplified - in production use ElevenLabs STT)
  const processRecording = useCallback(async (audioBlob: Blob) => {
    // For now, we'll use browser's Web Speech API as fallback
    // In production, you'd send to elevenlabs-stt edge function
    
    // Check if Web Speech API is available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.info("Speech recognition not available in this browser", {
        description: "Please type your message instead",
      });
      return;
    }

    // The blob was recorded but we'll use Web Speech API for now
    // since it provides real-time transcription
    toast.info("Voice recorded - processing...");
  }, []);

  // Generate TTS audio
  const generateAudio = useCallback(async (text: string): Promise<string | null> => {
    if (!text.trim()) return null;
    
    setIsLoadingAudio(true);
    
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
          body: JSON.stringify({ text, voiceId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate audio");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return audioUrl;
    } catch (error) {
      console.error("Error generating audio:", error);
      toast.error("Failed to generate audio");
      return null;
    } finally {
      setIsLoadingAudio(false);
    }
  }, [voiceId]);

  // Play audio
  const playAudio = useCallback(async (text: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audioUrl = await generateAudio(text);
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };
    audio.onerror = () => {
      setIsPlaying(false);
      toast.error("Failed to play audio");
    };

    await audio.play();
  }, [generateAudio]);

  // Stop audio playback
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  return {
    // Recording state
    isRecording,
    startRecording,
    stopRecording,
    partialTranscript,
    
    // Audio playback state
    isPlaying,
    isLoadingAudio,
    playAudio,
    stopAudio,
    generateAudio,
    
    // Permission state
    hasPermission,
    requestPermission,
    
    // Voice commands
    processVoiceCommand,
  };
}

export type { VoiceCommand };
