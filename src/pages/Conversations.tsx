import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SubPageHeader from "@/components/SubPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Star, Clock, MessageSquare, Pencil, Trash2, X as XIcon } from "lucide-react";
import { toast } from "sonner";
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

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  is_favorite: boolean;
}

export default function Conversations() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("conversations")
      .select("id, title, updated_at, is_favorite")
      .order("updated_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setItems(data);
        setLoading(false);
      });
  }, [user]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  const filtered = items.filter((c) => {
    if (filter === "favorites" && !c.is_favorite) return false;
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleFav = async (id: string, current: boolean) => {
    const { error } = await supabase.from("conversations").update({ is_favorite: !current }).eq("id", id);
    if (error) return toast.error("Failed");
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_favorite: !current } : i)));
  };

  const saveTitle = async (id: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    await supabase.from("conversations").update({ title: editingTitle.trim() }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title: editingTitle.trim() } : i)));
    setEditingId(null);
    toast.success("Renamed");
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await supabase.from("chat_messages").delete().eq("conversation_id", toDelete);
    await supabase.from("conversations").delete().eq("id", toDelete);
    setItems((prev) => prev.filter((i) => i.id !== toDelete));
    setToDelete(null);
    toast.success("Deleted");
  };

  return (
    <div className="min-h-screen bg-background">
      <SubPageHeader title="Conversations" description="All your chats with Mya." />
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "favorites")}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-6">All</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs px-3 h-6">
                <Star className="w-3 h-3 mr-1" /> Favorites
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <Card className="glass"><CardContent className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="glass"><CardContent className="p-8 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No conversations.</p>
          </CardContent></Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)] pr-3">
            <div className="space-y-3">
              {filtered.map((conv) => (
                <Card
                  key={conv.id}
                  className="glass card-hover cursor-pointer"
                  onClick={() => editingId !== conv.id && navigate(`/chat/${conv.id}`)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {editingId === conv.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveTitle(conv.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onBlur={() => saveTitle(conv.id)}
                            autoFocus
                            className="h-7 text-sm"
                          />
                        </div>
                      ) : (
                        <h3 className="font-medium mb-1">{conv.title}</h3>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); toggleFav(conv.id, conv.is_favorite); }}>
                        <Star className={`w-4 h-4 ${conv.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingId(conv.id); setEditingTitle(conv.title || ""); }}>
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setToDelete(conv.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the conversation and all its messages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
