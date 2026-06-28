import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SubPageHeader from "@/components/SubPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, BookOpen, Star, Trash2, Youtube, FileText, Globe, Mic, Book, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import BlueprintDialog from "@/components/Library/BlueprintDialog";
import type { SystemBlueprint } from "@/lib/blueprintSchema";

const SOURCE_ICON: Record<string, JSX.Element> = {
  youtube:  <Youtube className="w-3.5 h-3.5" />,
  pdf:      <FileText className="w-3.5 h-3.5" />,
  article:  <Globe className="w-3.5 h-3.5" />,
  podcast:  <Mic className="w-3.5 h-3.5" />,
  book:     <Book className="w-3.5 h-3.5" />,
  manual:   <ClipboardList className="w-3.5 h-3.5" />,
};

export default function Library() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<SystemBlueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("system_blueprints" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        if (data) setItems(data as unknown as SystemBlueprint[]);
        setLoading(false);
      });
  }, [user]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const filtered = items.filter((b) => {
    if (filter === "favorites" && !b.is_favorite) return false;
    const s = search.toLowerCase();
    if (!s) return true;
    return (
      b.title.toLowerCase().includes(s) ||
      (b.summary || "").toLowerCase().includes(s) ||
      b.tags.some((t) => t.toLowerCase().includes(s))
    );
  });

  const toggleFav = async (id: string, current: boolean) => {
    await supabase.from("system_blueprints" as any).update({ is_favorite: !current }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_favorite: !current } : i)));
  };

  const remove = async (id: string) => {
    await supabase.from("system_blueprints" as any).delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Blueprint removed");
  };

  return (
    <div className="min-h-screen bg-background">
      <SubPageHeader
        title="Systems Library"
        description="Mya's permanent knowledge base. Every resource → a reusable blueprint."
      />
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search blueprints, tags, summaries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-6">All</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs px-3 h-6"><Star className="w-3 h-3 mr-1" /> Favorites</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <Card className="glass"><CardContent className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="glass"><CardContent className="p-10 text-center">
            <BookOpen className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-muted-foreground mb-1">Your library is empty.</p>
            <p className="text-xs text-muted-foreground">
              Paste a YouTube link in chat with Mya and say <em>"deconstruct this into a blueprint"</em>.
            </p>
          </CardContent></Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)] pr-3">
            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map((b) => (
                <Card
                  key={b.id}
                  className="glass card-hover cursor-pointer"
                  onClick={() => setOpenId(b.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{b.title}</h3>
                        {b.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{b.summary}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleFav(b.id, b.is_favorite); }}>
                          <Star className={`w-3.5 h-3.5 ${b.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={(e) => { e.stopPropagation(); remove(b.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                        {SOURCE_ICON[b.source_type] || <ClipboardList className="w-3.5 h-3.5" />}
                        {b.source_type}
                      </Badge>
                      {b.facets?.revenue_model && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{String(b.facets.revenue_model)}</Badge>
                      )}
                      {typeof b.facets?.automation_potential === "number" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          🤖 {b.facets.automation_potential}%
                        </Badge>
                      )}
                      {b.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </main>

      <BlueprintDialog
        blueprintId={openId}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </div>
  );
}
