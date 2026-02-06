import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Plus, TrendingUp, Target, Repeat } from "lucide-react";
import { useRevenueTracking } from "@/hooks/useRevenueTracking";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function RevenueCard() {
  const { entries, loading, addEntry, getStats } = useRevenueTracking();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("manual");
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const stats = getStats();

  const handleAdd = async () => {
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      await addEntry({ amount: Number(amount), source, is_recurring: isRecurring, notes: notes || undefined });
      toast.success("Revenue entry added!");
      setShowAddDialog(false);
      setAmount("");
      setNotes("");
    } catch {
      toast.error("Failed to add entry");
    } finally {
      setSaving(false);
    }
  };

  // Build monthly chart data (last 6 months)
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = 0;
    }
    for (const e of entries) {
      const key = e.entry_date.slice(0, 7);
      if (key in months) months[key] += Number(e.amount);
    }
    return Object.entries(months).map(([month, revenue]) => ({
      month: month.slice(5),
      revenue: Math.round(revenue),
    }));
  })();

  return (
    <>
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Revenue Tracker
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Goal Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Target className="h-3 w-3" />
                Monthly Goal
              </span>
              <span className="font-semibold text-foreground">
                ${stats.monthlyRevenue.toLocaleString()} / $10,000
              </span>
            </div>
            <Progress value={stats.progressToGoal} className="h-2" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-sm font-bold text-foreground">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                <Repeat className="h-2.5 w-2.5" /> MRR
              </p>
              <p className="text-sm font-bold text-foreground">${stats.mrr.toLocaleString()}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                <TrendingUp className="h-2.5 w-2.5" /> This Month
              </p>
              <p className="text-sm font-bold text-foreground">${stats.monthlyRevenue.toLocaleString()}</p>
            </div>
          </div>

          {/* Mini chart */}
          {entries.length > 0 && (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: number) => [`$${value}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Revenue Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Revenue Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount ($)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="client">Client Payment</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="product">Product Sale</SelectItem>
                  <SelectItem value="service">Service Fee</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Recurring (MRR)</Label>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="h-8" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={saving || !amount} size="sm">
              {saving ? "Adding..." : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
