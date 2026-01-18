import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, Message, addMemories, searchMemories } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sparkles, 
  ArrowLeft, 
  Send, 
  Loader2,
  User,
  Bot,
  Lightbulb
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const shouldGenerate = searchParams.get("generate") === "true";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasGeneratedRef = useRef(false);

  useEffect(() => {
    if (user && id) {
      loadMessages();
    }
  }, [user, id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-generate ideas if requested
  useEffect(() => {
    if (shouldGenerate && !hasGeneratedRef.current && !loading && messages.length === 0) {
      hasGeneratedRef.current = true;
      handleGenerateIdeas();
    }
  }, [shouldGenerate, loading, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages: ChatMessage[] = (data || []).map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const saveMessage = async (role: "user" | "assistant", content: string) => {
    if (!user || !id) return;

    try {
      await supabase.from("chat_messages").insert({
        conversation_id: id,
        user_id: user.id,
        role,
        content,
      });

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!user) return;

    setIsStreaming(true);

    // Add a user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: "Generate 5 unique $10K/month business ideas for solopreneurs and introverts.",
    };
    setMessages([userMessage]);
    await saveMessage("user", userMessage.content);

    let assistantContent = "";
    const assistantId = crypto.randomUUID();

    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    await streamChat({
      messages: [],
      type: "generate_ideas",
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          )
        );
      },
      onDone: async () => {
        setIsStreaming(false);
        await saveMessage("assistant", assistantContent);

        // Add to Mem0 memory
        if (user) {
          await addMemories(user.id, [
            { role: "user", content: userMessage.content },
            { role: "assistant", content: assistantContent },
          ]);
        }
      },
      onError: (error) => {
        setIsStreaming(false);
        toast.error(error.message);
      },
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !user) return;

    const userContent = input.trim();
    setInput("");

    // Resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userContent,
    };

    setMessages((prev) => [...prev, userMessage]);
    await saveMessage("user", userContent);

    setIsStreaming(true);

    // Search for relevant memories
    let memoryContext = "";
    try {
      const memories = await searchMemories(user.id, userContent);
      if (memories && memories.length > 0) {
        memoryContext = `\n\nRelevant context from previous conversations:\n${memories
          .slice(0, 3)
          .map((m: { memory?: string }) => m.memory || "")
          .filter(Boolean)
          .join("\n")}`;
      }
    } catch (error) {
      console.error("Error fetching memories:", error);
    }

    const messagesForAI: Message[] = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    if (memoryContext) {
      messagesForAI.push({
        role: "system",
        content: memoryContext,
      });
    }

    messagesForAI.push({ role: "user", content: userContent });

    let assistantContent = "";
    const assistantId = crypto.randomUUID();

    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    await streamChat({
      messages: messagesForAI,
      type: "chat",
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          )
        );
      },
      onDone: async () => {
        setIsStreaming(false);
        await saveMessage("assistant", assistantContent);

        // Add to Mem0 memory
        if (user) {
          await addMemories(user.id, [
            { role: "user", content: userContent },
            { role: "assistant", content: assistantContent },
          ]);
        }
      },
      onError: (error) => {
        setIsStreaming(false);
        toast.error(error.message);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background glow effect */}
      <div className="fixed inset-0 bg-gradient-glow opacity-50 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">IdeaForge AI</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">
                How can I help you today?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Ask me about business ideas, validation strategies, pricing, or anything related to building your $10K/month business.
              </p>
              <Button
                onClick={handleGenerateIdeas}
                className="bg-gradient-accent text-accent-foreground hover:opacity-90 btn-glow"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Generate 5 Business Ideas
              </Button>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex gap-3 mb-6 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-4 py-3 ${
                      message.role === "user"
                        ? "message-user"
                        : "message-assistant"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Typing indicator */}
          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="message-assistant px-4 py-3">
                <div className="flex gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="relative z-10 border-t border-border/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <div className="flex gap-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about business ideas, validation strategies..."
              className="resize-none min-h-[48px] max-h-[200px]"
              disabled={isStreaming}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="bg-gradient-primary hover:opacity-90 btn-glow h-12 px-4"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
