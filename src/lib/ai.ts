import { supabase } from "@/integrations/supabase/client";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamChatOptions {
  messages: Message[];
  type?: "chat" | "generate_ideas";
  industry?: string;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError?: (error: Error) => void;
}

export async function streamChat({
  messages,
  type = "chat",
  industry,
  onDelta,
  onDone,
  onError,
}: StreamChatOptions) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, type, industry }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      // Process line-by-line
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          // Incomplete JSON, put it back
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          // Ignore
        }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream chat error:", error);
    if (onError) {
      onError(error instanceof Error ? error : new Error("Unknown error"));
    }
  }
}

// Mem0 integration
export async function addMemories(userId: string, messages: Message[]) {
  try {
    const { data, error } = await supabase.functions.invoke("mem0", {
      body: { action: "add", userId, messages },
    });

    if (error) {
      console.error("Error adding memories:", error);
      return { success: false };
    }

    return data;
  } catch (error) {
    console.error("Error adding memories:", error);
    return { success: false };
  }
}

export async function searchMemories(userId: string, query: string) {
  try {
    const { data, error } = await supabase.functions.invoke("mem0", {
      body: { action: "search", userId, query },
    });

    if (error) {
      console.error("Error searching memories:", error);
      return [];
    }

    return data?.memories || [];
  } catch (error) {
    console.error("Error searching memories:", error);
    return [];
  }
}

export async function getAllMemories(userId: string) {
  try {
    const { data, error } = await supabase.functions.invoke("mem0", {
      body: { action: "getAll", userId },
    });

    if (error) {
      console.error("Error getting memories:", error);
      return [];
    }

    return data?.memories || [];
  } catch (error) {
    console.error("Error getting memories:", error);
    return [];
  }
}
