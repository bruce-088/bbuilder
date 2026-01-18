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
  Lightbulb,
  Bookmark,
  BookmarkCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  savedAsIdea?: boolean;
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const shouldGenerate = searchParams.get("generate") === "true";
  const industry = searchParams.get("industry") || "";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingIdeaId, setSavingIdeaId] = useState<string | null>(null);
  const [savedIdeaMessageIds, setSavedIdeaMessageIds] = useState<Set<string>>(new Set());
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

  // Check if a message looks like a business idea
  const isBusinessIdeaMessage = (content: string): boolean => {
    const indicators = [
      /business name/i,
      /target audience/i,
      /value proposition/i,
      /revenue math/i,
      /validation path/i,
      /\$10[,]?000|10k/i,
    ];
    return indicators.filter(regex => regex.test(content)).length >= 3;
  };

  // Parse business idea from message content
  const parseBusinessIdea = (content: string) => {
    const extractField = (patterns: RegExp[]): string => {
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          return match[1].trim().replace(/\*+/g, '').substring(0, 500);
        }
      }
      return "";
    };

    const businessName = extractField([
      /#+\s*💡?\s*([^\n]+)/,
      /\*\*(?:Business Name|Name):\*\*\s*([^\n*]+)/i,
      /(?:Business Name|Name):\s*([^\n]+)/i,
    ]) || "Untitled Business Idea";

    const niche = extractField([
      /##\s*🎯?\s*(?:The )?Niche[^\n]*\n+([^\n#]+)/i,
      /\*\*(?:Niche|The Niche):\*\*\s*([^\n*]+)/i,
      /(?:Niche|Industry):\s*([^\n]+)/i,
    ]);

    const targetAudience = extractField([
      /##\s*👥?\s*Target Audience[^\n]*\n+([\s\S]*?)(?=##|\n\n\*\*|$)/i,
      /\*\*Target Audience:\*\*\s*([^\n*]+)/i,
    ]);

    const valueProposition = extractField([
      /##\s*✨?\s*Value Proposition[^\n]*\n+([\s\S]*?)(?=##|\n\n\*\*|$)/i,
      /\*\*Value Proposition:\*\*\s*([^\n*]+)/i,
    ]);

    const serviceOffering = extractField([
      /##\s*📦?\s*Service.*Offering[^\n]*\n+([\s\S]*?)(?=##|\n\n\*\*|$)/i,
      /\*\*Service.*Offering:\*\*\s*([^\n*]+)/i,
    ]);

    const revenueMath = extractField([
      /##\s*💰?\s*Revenue Math[^\n]*\n+([\s\S]*?)(?=##|\n\n\*\*|$)/i,
      /\*\*Revenue Math.*:\*\*\s*([\s\S]*?)(?=\*\*[A-Z]|\n\n##|$)/i,
    ]);

    const validationPath = extractField([
      /##\s*🚀?\s*(?:Fast )?Validation Path[^\n]*\n+([\s\S]*?)(?=##|\n\n\*\*|$)/i,
      /\*\*Validation Path:\*\*\s*([^\n*]+)/i,
    ]);

    const aiAutomation = extractField([
      /##\s*🤖?\s*AI Automation[^\n]*\n+([\s\S]*?)(?=##\s*🛠️|##\s*⚠️|$)/i,
    ]);

    return {
      businessName,
      niche,
      targetAudience,
      valueProposition,
      serviceOffering,
      revenueMath,
      validationPath,
      aiAutomation,
    };
  };

  const saveAsBusinessIdea = async (messageId: string, content: string) => {
    if (!user || !id) return;

    setSavingIdeaId(messageId);

    try {
      const parsed = parseBusinessIdea(content);

      const { error } = await supabase.from("business_ideas").insert({
        user_id: user.id,
        conversation_id: id,
        business_name: parsed.businessName,
        niche: parsed.niche,
        target_audience: parsed.targetAudience,
        value_proposition: parsed.valueProposition,
        service_offering: parsed.serviceOffering,
        revenue_math: parsed.revenueMath,
        validation_path: parsed.validationPath,
        ai_automation_strategy: { summary: parsed.aiAutomation },
      });

      if (error) throw error;

      setSavedIdeaMessageIds(prev => new Set(prev).add(messageId));
      toast.success("Business idea saved! You can now compare it with others.");
    } catch (error) {
      console.error("Error saving business idea:", error);
      toast.error("Failed to save business idea");
    } finally {
      setSavingIdeaId(null);
    }
  };

  const generateConversationTitle = async (content: string) => {
    if (!id) return;

    try {
      // Extract business name from the content using regex patterns
      const businessNameMatch = content.match(/\*\*(?:Business Name|Name):\*\*\s*([^\n*]+)/i) 
        || content.match(/(?:Business Name|Name):\s*([^\n]+)/i)
        || content.match(/^#+\s*(.+)/m);
      
      let title = "New Business Idea";
      
      if (businessNameMatch && businessNameMatch[1]) {
        title = businessNameMatch[1].trim().replace(/\*+/g, '').substring(0, 50);
      } else {
        // Try to extract from niche
        const nicheMatch = content.match(/\*\*(?:Niche|Industry):\*\*\s*([^\n*]+)/i)
          || content.match(/(?:Niche|Industry):\s*([^\n]+)/i);
        if (nicheMatch && nicheMatch[1]) {
          title = `${nicheMatch[1].trim().replace(/\*+/g, '').substring(0, 40)} Idea`;
        }
      }

      await supabase
        .from("conversations")
        .update({ title })
        .eq("id", id);
    } catch (error) {
      console.error("Error generating conversation title:", error);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!user) return;

    setIsStreaming(true);

    // Build the user message based on industry selection
    const industryText = industry 
      ? `Generate a unique, detailed $10K/month business idea in the ${decodeURIComponent(industry).replace(/-/g, ' ')} industry for solopreneurs and introverts.`
      : "Generate a unique, detailed $10K/month business idea for solopreneurs and introverts.";

    // Add a user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: industryText,
    };
    setMessages([userMessage]);
    await saveMessage("user", userMessage.content);

    let assistantContent = "";
    const assistantId = crypto.randomUUID();

    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    await streamChat({
      messages: [],
      type: "generate_ideas",
      industry: industry ? decodeURIComponent(industry) : undefined,
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

        // Auto-generate conversation title from the business idea
        await generateConversationTitle(assistantContent);

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
                Generate Business Idea
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
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div
                      className={`px-4 py-3 ${
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
                    {/* Save as Business Idea button for assistant messages with business ideas */}
                    {message.role === "assistant" && 
                     message.content && 
                     isBusinessIdeaMessage(message.content) && 
                     !isStreaming && (
                      <div className="flex justify-start">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`gap-2 ${savedIdeaMessageIds.has(message.id) ? "text-green-500 border-green-500/50" : ""}`}
                          onClick={() => saveAsBusinessIdea(message.id, message.content)}
                          disabled={savingIdeaId === message.id || savedIdeaMessageIds.has(message.id)}
                        >
                          {savingIdeaId === message.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : savedIdeaMessageIds.has(message.id) ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                          {savedIdeaMessageIds.has(message.id) ? "Saved to Ideas" : "Save as Business Idea"}
                        </Button>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-1">
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
