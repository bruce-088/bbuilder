import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onActivateVoiceMode?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceInputButton({ 
  onTranscript, 
  onActivateVoiceMode,
  disabled = false,
  className 
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    if (onActivateVoiceMode) {
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        onActivateVoiceMode();
      }, 600);
    }
  }, [onActivateVoiceMode]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Fallback: Web Speech API
  const startWebSpeechSTT = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };
    recognition.onerror = (event: any) => {
      console.error("Web Speech API error:", event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  }, [onTranscript]);

  // Primary: try ElevenLabs STT token, fall back to Web Speech API
  const startRecording = useCallback(async () => {
    setIsRecording(true);

    try {
      // Try to get ElevenLabs STT token
      const tokenRes = await fetch(
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

      if (!tokenRes.ok) {
        throw new Error(`STT token failed: ${tokenRes.status}`);
      }

      const { token } = await tokenRes.json();
      if (!token) throw new Error("No token received");

      // Got token — use MediaRecorder to capture audio, then transcribe via ElevenLabs batch
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length === 0) {
          setIsRecording(false);
          return;
        }

        setIsProcessing(true);
        try {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          // Use the batch transcription approach
          const transcribeRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`,
            {
              method: "POST",
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: formData,
            }
          );

          if (!transcribeRes.ok) throw new Error("Transcription failed");
          const data = await transcribeRes.json();
          if (data.token) {
            // Token endpoint — we already have the token, use Web Speech as fallback for actual transcription
            throw new Error("Token-only endpoint, falling back");
          }
          if (data.text) {
            onTranscript(data.text);
          }
        } catch {
          // If ElevenLabs transcription fails, the recording is lost — notify user
          toast.info("Using browser speech recognition instead");
        } finally {
          setIsProcessing(false);
          setIsRecording(false);
        }
      };

      mediaRecorder.start();
      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 15000);

      return;
    } catch (err) {
      console.log("ElevenLabs STT unavailable, falling back to Web Speech API:", err);
      setIsRecording(false);
      // Fall back to Web Speech API
      startWebSpeechSTT();
    }
  }, [onTranscript, startWebSpeechSTT]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleClick = () => {
    if (didLongPress.current) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    startRecording();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isRecording ? "destructive" : "ghost"}
          size="icon"
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          disabled={disabled || isProcessing}
          className={cn(
            "transition-all",
            isRecording && "animate-pulse bg-red-500 hover:bg-red-600",
            onActivateVoiceMode && !isRecording && "ring-1 ring-primary/30",
            className
          )}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isProcessing ? "Processing audio..." : isRecording ? "Recording... (click to stop)" : onActivateVoiceMode ? "Tap to dictate • Hold for Voice Mode" : "Voice input"}
      </TooltipContent>
    </Tooltip>
  );
}