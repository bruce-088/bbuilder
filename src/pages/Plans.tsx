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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Star, Clock, Lightbulb, Eye, Trash2, Scale, Check } from "lucide-react";
import { toast } from "sonner";
import BusinessIdeaDialog from "@/components/BusinessIdeaDialog";
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

interface Plan {
  id: string;
  business_name: string;
  niche: string;
  created_at: string;
  is_favorite: boolean;
  conversation_id: string | null;
}

export default function Plans() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [search, setSearch] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("business_ideas")
      .select("id, business_name, niche, created_at, is_favorite, conversation_id")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setItems(data);
        setLoading(false);
      });
  }, [user]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const filtered = items.filter((p) => {
    if (filter === "favorites" && !p.is_favorite) return false;
    const s = search.toLowerCase();
    if (search && !p.business_name.toLowerCase().includes(s) && !p.niche?.toLowerCase().includes(s)) return false;
    return true;
  });

  const toggleFav = async (id: string, current: boolean) => {
    await supabase.from("business_ideas").update({ is_favorite: !current }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_favorite: !current } : i)));
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 4 ? [...prev, id] : prev));

  const handleDelete = async () => {
    if (!toDelete) return;
    await supabase.from("business_ideas").delete().eq("id", toDelete);
    setItems((prev) => prev.filter((i) => i.id !== toDelete));
    setToDelete(null);
    toast.success("Deleted");
  };

  return (
    <div className="min-h-screen bg-background">
      <SubPageHeader title="Business Plans" description="Your library of generated and saved plans." />
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or niche..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "favorites")}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3 h-6">All</TabsTrigger>
                <TabsTrigger value="favorites" className="text-xs px-3 h-6"><Star className="w-3 h-3 mr-1" /> Favorites</TabsTrigger>
              </TabsList>
            </Tabs>
            {items.length >= 2 && !compareMode && (
              <Button size="sm" variant="outline" onClick={() => setCompareMode(true)}>
                <Scale className="w-4 h-4 mr-1" /> Compare
              </Button>
            )}
            {compareMode && (
              <>
                <Button size="sm" variant="ghost" onClick={() => { setCompareMode(false); setSelected([]); }}>Cancel</Button>
                <Button size="sm" disabled={selected.length < 2} onClick={() => navigate(`/compare?ids=${selected.join(",")}`)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Scale className="w-4 h-4 mr-1" /> Compare ({selected.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <Card className="glass"><CardContent className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="glass"><CardContent className="p-8 text-center">
            <Lightbulb className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">No business plans yet.</p>
          </CardContent></Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)] pr-3">
            <div className="space-y-3">
              {filtered.map((plan) => (
                <Card
                  key={plan.id}
                  className={`glass card-hover cursor-pointer ${compareMode && selected.includes(plan.id) ? "ring-2 ring-emerald-500" : ""}`}
                  onClick={() => (compareMode ? toggleSelect(plan.id) : setOpenId(plan.id))}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    {compareMode && (
                      <div className="pt-0.5"><Checkbox checked={selected.includes(plan.id)} onCheckedChange={() => toggleSelect(plan.id)} /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium mb-1 truncate">{plan.business_name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(plan.created_at).toLocaleDateString()}</span>
                        {plan.niche && (<><span>•</span><span className="truncate max-w-[160px]">{plan.niche}</span></>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setOpenId(plan.id); }}>
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); toggleFav(plan.id, plan.is_favorite); }}>
                        <Star className={`w-4 h-4 ${plan.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={(e) => { e.stopPropagation(); setToDelete(plan.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {compareMode && selected.includes(plan.id) && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </main>

      <BusinessIdeaDialog
        ideaId={openId}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
        onFavoriteToggle={(id, isFavorite) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, is_favorite: isFavorite } : p)))}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Plan</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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
