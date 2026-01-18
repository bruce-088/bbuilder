import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Sparkles, 
  MessageSquare, 
  Lightbulb, 
  Plus, 
  LogOut, 
  Clock,
  ArrowRight,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface BusinessIdea {
  id: string;
  business_name: string;
  niche: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [businessIdeas, setBusinessIdeas] = useState<BusinessIdea[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

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
          .select("id, business_name, niche, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("conversations")
          .select("id, title, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5),
      ]);

      if (ideasResult.data) setBusinessIdeas(ideasResult.data);
      if (convsResult.data) setConversations(convsResult.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
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

  const handleGenerateIdeas = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: "Business Ideas Generation" })
        .select()
        .single();

      if (error) throw error;
      navigate(`/chat/${data.id}?generate=true`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start idea generation");
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
              onClick={handleGenerateIdeas}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="font-display">Generate Business Ideas</CardTitle>
                <CardDescription>
                  Get 5 AI-powered, turn-key business concepts with revenue math and automation strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-accent text-accent-foreground hover:opacity-90 btn-glow">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Generate Ideas
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
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Recent Business Ideas
              </h2>
              {loading ? (
                <div className="glass rounded-lg p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : businessIdeas.length > 0 ? (
                <div className="space-y-3">
                  {businessIdeas.map((idea) => (
                    <Card 
                      key={idea.id} 
                      className="glass card-hover cursor-pointer"
                      onClick={() => navigate(`/idea/${idea.id}`)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-1">{idea.business_name}</h3>
                        <p className="text-sm text-muted-foreground">{idea.niche}</p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(idea.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Recent Conversations
              </h2>
              {loading ? (
                <div className="glass rounded-lg p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : conversations.length > 0 ? (
                <div className="space-y-3">
                  {conversations.map((conv) => (
                    <Card 
                      key={conv.id} 
                      className="glass card-hover cursor-pointer"
                      onClick={() => navigate(`/chat/${conv.id}`)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-1">{conv.title}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
    </div>
  );
}
