import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, Message, addMemories, searchMemories } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Sparkles, 
  ArrowLeft, 
  Send, 
  Loader2,
  User,
  Lightbulb,
  Bookmark,
  BookmarkCheck,
  Workflow,
  Wrench,
  Eye,
  X,
  MessageSquare,
  Image as ImageIcon,
  ArrowUp
} from "lucide-react";
import N8nWorkflowDialog from "@/components/N8nWorkflowDialog";
import ImplementationGuideDialog from "@/components/ImplementationGuideDialog";
import BusinessIdeaDialog from "@/components/BusinessIdeaDialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import myaAvatar from "@/assets/mya-avatar.png";

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
  const [savedBusinessIdea, setSavedBusinessIdea] = useState<{ 
    id: string; 
    business_name: string; 
    niche?: string;
    target_audience?: string;
    value_proposition?: string;
    service_offering?: string;
    ai_automation_strategy?: any;
  } | null>(null);
  const [hasExistingWorkflow, setHasExistingWorkflow] = useState(false);
  const [businessIdeaDialogOpen, setBusinessIdeaDialogOpen] = useState(false);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const [pastedImages, setPastedImages] = useState<{ file: File; preview: string }[]>([]);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const footerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hasGeneratedRef = useRef(false);

  // Handle paste event for screenshots
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: { file: File; preview: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const preview = URL.createObjectURL(file);
          imageFiles.push({ file, preview });
        }
      }
    }

    if (imageFiles.length > 0) {
      setPastedImages((prev) => [...prev, ...imageFiles].slice(0, 5)); // Max 5 images
    }
  }, []);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      pastedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  const removeImage = (index: number) => {
    setPastedImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    if (user && id) {
      loadMessages();
      checkForSavedBusinessIdea();
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

  const checkForSavedBusinessIdea = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from("business_ideas")
        .select("id, business_name, niche, target_audience, value_proposition, service_offering, ai_automation_strategy")
        .eq("conversation_id", id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSavedBusinessIdea(data);
        // Check if there's an existing n8n workflow for this idea
        const { data: workflowData } = await supabase
          .from("ai_prompts")
          .select("id")
          .eq("business_idea_id", data.id)
          .eq("prompt_type", "n8n_workflow")
          .maybeSingle();
        
        if (workflowData) {
          setHasExistingWorkflow(true);
        }
      }
    } catch (error) {
      console.error("Error checking for saved business idea:", error);
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
      /^#{1,3}\s+([^#\n💡][^\n]+)/m,
      /^\*\*([^*\n:]+)\*\*/m,
    ]) || "Untitled Business Plan";

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

      const { data, error } = await supabase.from("business_ideas").insert({
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
      }).select("id, business_name").single();

      if (error) throw error;

      setSavedIdeaMessageIds(prev => new Set(prev).add(messageId));
      if (data) {
        setSavedBusinessIdea(data);
      }
      toast.success("Business plan saved! You can now compare it with others.");
    } catch (error) {
      console.error("Error saving business idea:", error);
      toast.error("Failed to save business plan");
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
      
      let title = "New Business Plan";
      
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
    if ((!input.trim() && pastedImages.length === 0) || isStreaming || !user) return;

    const userContent = input.trim();
    const hasImages = pastedImages.length > 0;
    
    // Build content with image descriptions
    let messageContent = userContent;
    if (hasImages) {
      const imageDescriptions = pastedImages.map((_, i) => `[Screenshot ${i + 1}]`).join(" ");
      messageContent = userContent ? `${userContent}\n\n${imageDescriptions}` : imageDescriptions;
    }

    setInput("");
    setPastedImages([]);

    // Resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    if (footerTextareaRef.current) {
      footerTextareaRef.current.style.height = "auto";
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent,
    };

    setMessages((prev) => [...prev, userMessage]);
    await saveMessage("user", messageContent);

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

  // Scroll to top functionality
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const handleScroll = () => {
      setShowScrollToTop(mainElement.scrollTop > 200);
    };

    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Return to dashboard</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2">
            <img 
              src={myaAvatar} 
              alt="Mya" 
              className="w-8 h-8 rounded-lg object-cover"
            />
            <span className="font-display font-bold">Mya</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main ref={mainRef} className="relative z-10 flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-5xl px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <img 
                src={myaAvatar} 
                alt="Mya" 
                className="w-16 h-16 rounded-2xl object-cover mb-6"
              />
              <h2 className="font-display text-2xl font-bold mb-2 text-center">
                How can I help you today?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md text-center">
                Ask me about business ideas, validation strategies, pricing, or anything related to building your $10K/month business.
              </p>
              
              {/* Starter prompts */}
              <div className="flex flex-wrap gap-2 mb-6 max-w-xl justify-center">
                {[
                  "What business can I start with $500?",
                  "How do I validate my idea fast?",
                  "Best niches for introverts?",
                  "How to get my first customer?"
                ].map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
              
              {/* Centered chat input for empty state */}
              <div className="w-full max-w-2xl mb-6">
                {/* Pasted images preview */}
                {pastedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                    {pastedImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.preview}
                          alt={`Pasted screenshot ${index + 1}`}
                          className="h-16 w-auto rounded-md object-cover border border-border"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center text-xs text-muted-foreground">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {pastedImages.length}/5 images
                    </div>
                  </div>
                )}
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
                    onPaste={handlePaste}
                    placeholder="I'm here to help! Ask me anything... (Paste screenshots with Ctrl+V)"
                    className="resize-none min-h-[48px] max-h-[200px]"
                    disabled={isStreaming}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={(!input.trim() && pastedImages.length === 0) || isStreaming}
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
              
              <p className="text-muted-foreground text-sm mb-3">or get a complete idea instantly</p>
              
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
                    <img 
                      src={myaAvatar} 
                      alt="Mya" 
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0 mt-1"
                    />
                  )}
                  <div className="flex flex-col gap-2 max-w-[90%]">
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
                      <div className="flex flex-wrap gap-2 justify-start">
                        {!savedBusinessIdea && (
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
                        )}
                        {savedBusinessIdea && (
                          <N8nWorkflowDialog
                            businessIdeaId={savedBusinessIdea.id}
                            businessName={savedBusinessIdea.business_name}
                            trigger={
                              <Button variant="outline" size="sm" className="gap-2">
                                <Workflow className="w-4 h-4" />
                                {hasExistingWorkflow ? "View n8n Workflow" : "Generate n8n Workflow"}
                              </Button>
                            }
                          />
                        )}
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
          <AnimatePresence>
            {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.role === "user" || messages[messages.length - 1]?.content === "") && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex gap-3 mb-6"
              >
                <img 
                  src={myaAvatar} 
                  alt="Mya" 
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                />
                <div className="message-assistant px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Floating Toolbar */}
      <AnimatePresence>
        {savedBusinessIdea && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 right-6 z-20 flex flex-col-reverse items-end gap-2"
          >
            {/* Expanded Action Buttons */}
            <AnimatePresence>
              {toolbarExpanded && (
                <>
                  {/* View Idea */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 10 }}
                    transition={{ delay: 0.05 }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            setBusinessIdeaDialogOpen(true);
                            setToolbarExpanded(false);
                          }}
                          className="h-10 px-3 gap-2 shadow-lg bg-background border border-border/50 hover:bg-accent hover:border-primary/50 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View Idea</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>View saved business plan details</p>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>

                  {/* Implementation Guide */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 10 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <ImplementationGuideDialog
                            trigger={
                              <Button className="h-10 px-3 gap-2 shadow-lg bg-background border border-border/50 hover:bg-accent hover:border-primary/50 transition-all">
                                <Wrench className="w-4 h-4" />
                                <span className="hidden sm:inline">Impl. Guide</span>
                              </Button>
                            }
                            businessIdea={{
                              id: savedBusinessIdea.id,
                              businessName: savedBusinessIdea.business_name,
                              niche: savedBusinessIdea.niche,
                              targetAudience: savedBusinessIdea.target_audience,
                              valueProposition: savedBusinessIdea.value_proposition,
                              serviceOffering: savedBusinessIdea.service_offering,
                              aiAutomationStrategy: savedBusinessIdea.ai_automation_strategy,
                            }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Step-by-step implementation guide</p>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>

                  {/* n8n Workflow */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 10 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <N8nWorkflowDialog
                            businessIdeaId={savedBusinessIdea.id}
                            businessName={savedBusinessIdea.business_name}
                            trigger={
                              <Button className="h-10 px-3 gap-2 shadow-lg bg-background border border-border/50 hover:bg-accent hover:border-primary/50 transition-all">
                                <Workflow className="w-4 h-4" />
                                <span className="hidden sm:inline">n8n Workflow</span>
                              </Button>
                            }
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Generate or view n8n automation workflow</p>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>

                  {/* Focus Chat */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 10 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            textareaRef.current?.focus();
                            setToolbarExpanded(false);
                          }}
                          className="h-10 px-3 gap-2 shadow-lg bg-background border border-border/50 hover:bg-accent hover:border-primary/50 transition-all"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span className="hidden sm:inline">Chat</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Focus on chat input</p>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Toggle Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setToolbarExpanded(!toolbarExpanded)}
                  className="h-12 w-12 rounded-full shadow-lg bg-gradient-primary hover:opacity-90 btn-glow p-0"
                >
                  <motion.div
                    animate={{ rotate: toolbarExpanded ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {toolbarExpanded ? (
                      <X className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{toolbarExpanded ? "Close quick actions" : "Open quick actions"}</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Scroll to Top Button */}
      <AnimatePresence>
        {showScrollToTop && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 left-6 z-20"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full shadow-lg bg-background/80 backdrop-blur-sm border-primary/20 hover:bg-primary/10"
                  onClick={scrollToTop}
                >
                  <ArrowUp className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Scroll to top of conversation</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input - only show in footer when there are messages */}
      {messages.length > 0 && (
        <footer className="relative z-10 border-t border-border/50 backdrop-blur-xl">
          <div className="container mx-auto max-w-5xl px-4 py-4">
            {/* Pasted images preview in footer */}
            {pastedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                {pastedImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img.preview}
                      alt={`Pasted screenshot ${index + 1}`}
                      className="h-16 w-auto rounded-md object-cover border border-border"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center text-xs text-muted-foreground">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {pastedImages.length}/5 images
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="h-12 px-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Textarea
                ref={footerTextareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="I'm here to help! Ask me anything... (Paste screenshots with Ctrl+V)"
                className="resize-none min-h-[48px] max-h-[200px]"
                disabled={isStreaming}
              />
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && pastedImages.length === 0) || isStreaming}
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
      )}

      {/* Business Idea Dialog */}
      {savedBusinessIdea && (
        <BusinessIdeaDialog
          ideaId={savedBusinessIdea.id}
          open={businessIdeaDialogOpen}
          onOpenChange={setBusinessIdeaDialogOpen}
        />
      )}
    </div>
  );
}
