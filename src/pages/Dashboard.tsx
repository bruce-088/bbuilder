import { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  MessageSquare, 
  Lightbulb, 
  Plus, 
  LogOut, 
  Clock,
  ArrowRight,
  Loader2,
  Scale,
  Check,
  Star,
  Filter,
  Pencil,
  X as XIcon,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Search
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { toast } from "sonner";
import BusinessIdeaDialog from "@/components/BusinessIdeaDialog";

interface BusinessIdea {
  id: string;
  business_name: string;
  niche: string;
  created_at: string;
  is_favorite: boolean;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  is_favorite: boolean;
}

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [businessIdeas, setBusinessIdeas] = useState<BusinessIdea[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [conversationFilter, setConversationFilter] = useState<"all" | "favorites">("all");
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editingIdeaName, setEditingIdeaName] = useState("");
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [showIndustryDialog, setShowIndustryDialog] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [savingIdeaFromConv, setSavingIdeaFromConv] = useState<string | null>(null);
  const [savedConversationIds, setSavedConversationIds] = useState<Set<string>>(new Set());
  const [ideaToDelete, setIdeaToDelete] = useState<string | null>(null);
  const [ideaSearch, setIdeaSearch] = useState("");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editIdeaInputRef = useRef<HTMLInputElement>(null);

  const industries = [
    { value: "any", label: "Any Industry (Surprise me!)" },
    { value: "health-wellness", label: "Health & Wellness" },
    { value: "finance", label: "Finance & Investing" },
    { value: "technology", label: "Technology & SaaS" },
    { value: "education", label: "Education & Coaching" },
    { value: "ecommerce", label: "E-commerce & Retail" },
    { value: "real-estate", label: "Real Estate" },
    { value: "marketing", label: "Marketing & Advertising" },
    { value: "creative", label: "Creative & Design" },
    { value: "food-beverage", label: "Food & Beverage" },
    { value: "travel", label: "Travel & Hospitality" },
    { value: "legal", label: "Legal Services" },
    { value: "hr", label: "HR & Recruiting" },
    { value: "sustainability", label: "Sustainability & Green Tech" },
    { value: "ai-automation", label: "AI & Automation" },
  ];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [ideasResult, convsResult] = await Promise.all([
        supabase
          .from("business_ideas")
          .select("id, business_name, niche, created_at, is_favorite")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("conversations")
          .select("id, title, updated_at, is_favorite")
          .order("updated_at", { ascending: false })
          .limit(10),
      ]);

      if (ideasResult.data) setBusinessIdeas(ideasResult.data);
      if (convsResult.data) setConversations(convsResult.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("business_ideas")
        .update({ is_favorite: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setBusinessIdeas(prev => 
        prev.map(idea => 
          idea.id === id ? { ...idea, is_favorite: !currentStatus } : idea
        )
      );
      toast.success(currentStatus ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  const toggleConversationFavorite = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ is_favorite: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setConversations(prev => 
        prev.map(conv => 
          conv.id === id ? { ...conv, is_favorite: !currentStatus } : conv
        )
      );
      toast.success(currentStatus ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      console.error("Error toggling conversation favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const handleNewChat = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: "New Conversation" })
        .select()
        .single();

      if (error) throw error;
      navigate(`/chat/${data.id}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

  const openIndustryDialog = () => {
    setSelectedIndustry("");
    setShowIndustryDialog(true);
  };

  const handleGenerateIdeas = async () => {
    if (!user) return;
    setShowIndustryDialog(false);

    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: "Business Ideas Generation" })
        .select()
        .single();

      if (error) throw error;
      
      const industryParam = selectedIndustry && selectedIndustry !== "any" 
        ? `&industry=${encodeURIComponent(selectedIndustry)}` 
        : "";
      navigate(`/chat/${data.id}?generate=true${industryParam}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start idea generation");
    }
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleCompare = () => {
    if (selectedForCompare.length >= 2) {
      navigate(`/compare?ids=${selectedForCompare.join(",")}`);
    }
  };

  const filteredIdeas = businessIdeas.filter(idea => {
    const matchesFilter = filter === "favorites" ? idea.is_favorite : true;
    const searchLower = ideaSearch.toLowerCase();
    const matchesSearch = ideaSearch === "" || 
      idea.business_name.toLowerCase().includes(searchLower) ||
      idea.niche.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  const filteredConversations = conversationFilter === "favorites"
    ? conversations.filter(conv => conv.is_favorite)
    : conversations;

  const startEditingConversation = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConversationId(conv.id);
    setEditingTitle(conv.title || "");
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const cancelEditing = () => {
    setEditingConversationId(null);
    setEditingTitle("");
  };

  const startEditingIdea = (idea: BusinessIdea, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIdeaId(idea.id);
    setEditingIdeaName(idea.business_name || "");
    setTimeout(() => editIdeaInputRef.current?.focus(), 0);
  };

  const cancelEditingIdea = () => {
    setEditingIdeaId(null);
    setEditingIdeaName("");
  };

  const saveConversationTitle = async (id: string) => {
    if (!editingTitle.trim()) {
      cancelEditing();
      return;
    }

    try {
      const { error } = await supabase
        .from("conversations")
        .update({ title: editingTitle.trim() })
        .eq("id", id);

      if (error) throw error;

      setConversations(prev =>
        prev.map(conv =>
          conv.id === id ? { ...conv, title: editingTitle.trim() } : conv
        )
      );
      toast.success("Conversation renamed");
    } catch (error) {
      console.error("Error updating conversation title:", error);
      toast.error("Failed to rename conversation");
    } finally {
      cancelEditing();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveConversationTitle(id);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const saveIdeaName = async (id: string) => {
    if (!editingIdeaName.trim()) {
      cancelEditingIdea();
      return;
    }

    try {
      const { error } = await supabase
        .from("business_ideas")
        .update({ business_name: editingIdeaName.trim() })
        .eq("id", id);

      if (error) throw error;

      setBusinessIdeas(prev =>
        prev.map(idea =>
          idea.id === id ? { ...idea, business_name: editingIdeaName.trim() } : idea
        )
      );
      toast.success("Business idea renamed");
    } catch (error) {
      console.error("Error updating business idea name:", error);
      toast.error("Failed to rename business idea");
    } finally {
      cancelEditingIdea();
    }
  };

  const handleIdeaEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveIdeaName(id);
    } else if (e.key === "Escape") {
      cancelEditingIdea();
    }
  };

  const confirmDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(id);
  };

  const deleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      // First delete all messages in the conversation
      await supabase
        .from("chat_messages")
        .delete()
        .eq("conversation_id", conversationToDelete);

      // Then delete the conversation
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationToDelete);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete));
      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    } finally {
      setConversationToDelete(null);
    }
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

  const saveIdeaFromConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    setSavingIdeaFromConv(convId);

    try {
      // Fetch the first assistant message from this conversation
      const { data: messages, error: fetchError } = await supabase
        .from("chat_messages")
        .select("content")
        .eq("conversation_id", convId)
        .eq("role", "assistant")
        .order("created_at", { ascending: true })
        .limit(1);

      if (fetchError) throw fetchError;

      if (!messages || messages.length === 0) {
        toast.error("No business idea found in this conversation");
        return;
      }

      const content = messages[0].content;
      const parsed = parseBusinessIdea(content);

      const { error } = await supabase.from("business_ideas").insert({
        user_id: user.id,
        conversation_id: convId,
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

      setSavedConversationIds(prev => new Set(prev).add(convId));
      
      // Refresh business ideas list
      const { data: ideasData } = await supabase
        .from("business_ideas")
        .select("id, business_name, niche, created_at, is_favorite")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (ideasData) setBusinessIdeas(ideasData);
      
      toast.success("Business idea saved! You can now compare it with others.");
    } catch (error) {
      console.error("Error saving business idea:", error);
      toast.error("Failed to save business idea");
    } finally {
      setSavingIdeaFromConv(null);
    }
  };

  const confirmDeleteIdea = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIdeaToDelete(id);
  };

  const deleteBusinessIdea = async () => {
    if (!ideaToDelete) return;
    
    try {
      const { error } = await supabase
        .from("business_ideas")
        .delete()
        .eq("id", ideaToDelete);

      if (error) throw error;

      setBusinessIdeas(prev => prev.filter(idea => idea.id !== ideaToDelete));
      setSelectedForCompare(prev => prev.filter(id => id !== ideaToDelete));
      toast.success("Business idea deleted");
    } catch (error) {
      console.error("Error deleting business idea:", error);
      toast.error("Failed to delete business idea");
    } finally {
      setIdeaToDelete(null);
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
    <div className="min-h-screen bg-background">
      {/* Background glow effect */}
      <div className="fixed inset-0 bg-gradient-glow opacity-50 pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">IdeaForge</span>
          </div>
          <Button onClick={handleSignOut} variant="ghost" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Welcome */}
          <div className="mb-12">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Welcome to IdeaForge
            </h1>
            <p className="text-muted-foreground text-lg">
              Generate AI-powered business ideas and build your $10K/month empire
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card 
              className="glass card-hover cursor-pointer group" 
              onClick={openIndustryDialog}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="font-display">Generate Business Idea</CardTitle>
                <CardDescription>
                  Get one detailed, AI-powered business concept with revenue math, validation path, and automation strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-accent text-accent-foreground hover:opacity-90 btn-glow">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Choose Industry & Generate
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="glass card-hover cursor-pointer group" 
              onClick={handleNewChat}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-display">Chat with AI Consultant</CardTitle>
                <CardDescription>
                  Ask questions, refine ideas, and get personalized business advice from your AI consultant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Start New Chat
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Content */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Recent Ideas */}
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Business Ideas
                </h2>
                <div className="flex items-center gap-2">
                  <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "favorites")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="all" className="text-xs px-3 h-6">All</TabsTrigger>
                      <TabsTrigger value="favorites" className="text-xs px-3 h-6">
                        <Star className="w-3 h-3 mr-1" />
                        Favorites
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or niche..."
                    value={ideaSearch}
                    onChange={(e) => setIdeaSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                  {ideaSearch && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setIdeaSearch("")}
                    >
                      <XIcon className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {businessIdeas.length >= 2 && !compareMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCompareMode(true)}
                  >
                    <Scale className="w-4 h-4 mr-1" />
                    Compare
                  </Button>
                )}
                {compareMode && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCompareMode(false);
                        setSelectedForCompare([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCompare}
                      disabled={selectedForCompare.length < 2}
                      className="bg-gradient-primary"
                    >
                      <Scale className="w-4 h-4 mr-1" />
                      Compare ({selectedForCompare.length})
                    </Button>
                  </>
                )}
              </div>
              {loading ? (
                <div className="glass rounded-lg p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : filteredIdeas.length > 0 ? (
                <div className="space-y-3">
                  {filteredIdeas.map((idea) => (
                    <Card 
                      key={idea.id} 
                      className={`glass card-hover cursor-pointer transition-all ${
                        compareMode && selectedForCompare.includes(idea.id) 
                          ? "ring-2 ring-primary" 
                          : ""
                      }`}
                      onClick={() => {
                        if (editingIdeaId !== idea.id) {
                          if (compareMode) {
                            toggleCompareSelection(idea.id);
                          } else {
                            setSelectedIdeaId(idea.id);
                          }
                        }
                      }}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        {compareMode && (
                          <div className="pt-0.5">
                            <Checkbox
                              checked={selectedForCompare.includes(idea.id)}
                              onCheckedChange={() => toggleCompareSelection(idea.id)}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {editingIdeaId === idea.id ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                ref={editIdeaInputRef}
                                value={editingIdeaName}
                                onChange={(e) => setEditingIdeaName(e.target.value)}
                                onKeyDown={(e) => handleIdeaEditKeyDown(e, idea.id)}
                                onBlur={() => saveIdeaName(idea.id)}
                                className="h-7 text-sm"
                                placeholder="Business idea name"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 flex-shrink-0"
                                onClick={() => cancelEditingIdea()}
                              >
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <h3 className="font-medium mb-1">{idea.business_name}</h3>
                          )}
                          <p className="text-sm text-muted-foreground truncate">{idea.niche}</p>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(idea.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {editingIdeaId !== idea.id && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(idea.id, idea.is_favorite);
                              }}
                            >
                              <Star 
                                className={`w-4 h-4 transition-colors ${
                                  idea.is_favorite 
                                    ? "fill-yellow-400 text-yellow-400" 
                                    : "text-muted-foreground hover:text-yellow-400"
                                }`} 
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => startEditingIdea(idea, e)}
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => confirmDeleteIdea(idea.id, e)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {compareMode && selectedForCompare.includes(idea.id) && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filter === "favorites" ? (
                <Card className="glass">
                  <CardContent className="p-8 text-center">
                    <Star className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No favorite ideas yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click the star icon on any idea to add it to favorites
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass">
                  <CardContent className="p-8 text-center">
                    <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No business ideas yet</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-primary"
                      onClick={handleGenerateIdeas}
                    >
                      Generate your first ideas
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Conversations */}
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Conversations
                </h2>
                <Tabs value={conversationFilter} onValueChange={(v) => setConversationFilter(v as "all" | "favorites")}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs px-3 h-6">All</TabsTrigger>
                    <TabsTrigger value="favorites" className="text-xs px-3 h-6">
                      <Star className="w-3 h-3 mr-1" />
                      Favorites
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {loading ? (
                <div className="glass rounded-lg p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : filteredConversations.length > 0 ? (
                <div className="space-y-3">
                  {filteredConversations.map((conv) => (
                    <Card 
                      key={conv.id} 
                      className="glass card-hover cursor-pointer"
                      onClick={() => {
                        if (editingConversationId !== conv.id) {
                          navigate(`/chat/${conv.id}`);
                        }
                      }}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          {editingConversationId === conv.id ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                ref={editInputRef}
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => handleEditKeyDown(e, conv.id)}
                                onBlur={() => saveConversationTitle(conv.id)}
                                className="h-7 text-sm"
                                placeholder="Conversation title"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 flex-shrink-0"
                                onClick={() => cancelEditing()}
                              >
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <h3 className="font-medium mb-1">{conv.title}</h3>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(conv.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        {editingConversationId !== conv.id && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${savedConversationIds.has(conv.id) ? "text-green-500" : ""}`}
                              onClick={(e) => saveIdeaFromConversation(conv.id, e)}
                              disabled={savingIdeaFromConv === conv.id || savedConversationIds.has(conv.id)}
                              title={savedConversationIds.has(conv.id) ? "Already saved" : "Save as Business Idea"}
                            >
                              {savingIdeaFromConv === conv.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : savedConversationIds.has(conv.id) ? (
                                <BookmarkCheck className="w-4 h-4" />
                              ) : (
                                <Bookmark className="w-4 h-4 text-muted-foreground hover:text-primary" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleConversationFavorite(conv.id, conv.is_favorite);
                              }}
                            >
                              <Star 
                                className={`w-4 h-4 transition-colors ${
                                  conv.is_favorite 
                                    ? "fill-yellow-400 text-yellow-400" 
                                    : "text-muted-foreground hover:text-yellow-400"
                                }`} 
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => startEditingConversation(conv, e)}
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => confirmDeleteConversation(conv.id, e)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : conversationFilter === "favorites" ? (
                <Card className="glass">
                  <CardContent className="p-8 text-center">
                    <Star className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No favorite conversations yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click the star icon on any conversation to add it to favorites
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass">
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No conversations yet</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-primary"
                      onClick={handleNewChat}
                    >
                      Start your first chat
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Delete Business Idea Confirmation Dialog */}
      <AlertDialog open={!!ideaToDelete} onOpenChange={(open) => !open && setIdeaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Idea</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this business idea? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteBusinessIdea}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Conversation Confirmation Dialog */}
      <AlertDialog open={!!conversationToDelete} onOpenChange={(open) => !open && setConversationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Industry Selection Dialog */}
      <Dialog open={showIndustryDialog} onOpenChange={setShowIndustryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Choose an Industry</DialogTitle>
            <DialogDescription>
              Select an industry to focus your business idea, or let us surprise you with any industry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="industry" className="mb-2 block">Industry</Label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select an industry..." />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIndustryDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateIdeas}
              disabled={!selectedIndustry}
              className="bg-gradient-accent text-accent-foreground hover:opacity-90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Business Idea Detail Dialog */}
      <BusinessIdeaDialog
        ideaId={selectedIdeaId}
        open={!!selectedIdeaId}
        onOpenChange={(open) => !open && setSelectedIdeaId(null)}
        onFavoriteToggle={(id, isFavorite) => {
          setBusinessIdeas(prev =>
            prev.map(idea =>
              idea.id === id ? { ...idea, is_favorite: isFavorite } : idea
            )
          );
        }}
      />
    </div>
  );
}
