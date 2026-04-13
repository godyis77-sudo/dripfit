import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface PromoCodesSectionProps {
  userId: string;
}

export default function PromoCodesSection({ userId }: PromoCodesSectionProps) {
  const qc = useQueryClient();
  const [newCode, setNewCode] = useState("");
  const [bonusTryons, setBonusTryons] = useState(10);
  const [showForm, setShowForm] = useState(false);

  const { data: promoCodes = [] } = useQuery({
    queryKey: ["promo-codes", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("promo_codes" as any)
        .select("*")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const createPromo = useMutation({
    mutationFn: async () => {
      const code = newCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 3 || code.length > 20) throw new Error("Code must be 3-20 characters");
      const { error } = await supabase.from("promo_codes" as any).insert({
        creator_id: userId,
        code,
        bonus_tryons: bonusTryons,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promo-codes"] });
      setNewCode("");
      setShowForm(false);
      toast({ title: "Promo code created!" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message?.includes("duplicate") ? "Code already exists" : e.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await supabase.from("promo_codes" as any).update({ is_active: !is_active }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promo-codes"] }),
  });

  const deletePromo = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("promo_codes" as any).delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promo-codes"] });
      toast({ title: "Promo code deleted" });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Promo Codes</span>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New
        </Button>
      </div>

      {showForm && (
        <div className="px-4 py-3 border-b border-border space-y-2 bg-muted/30">
          <Input
            placeholder="CODE (e.g. CLARA10)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 20))}
            className="text-xs h-8"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Bonus try-ons:</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={bonusTryons}
              onChange={(e) => setBonusTryons(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
              className="text-xs h-8 w-20"
            />
          </div>
          <Button size="sm" className="w-full text-xs" onClick={() => createPromo.mutate()} disabled={createPromo.isPending || newCode.length < 3}>
            {createPromo.isPending ? "Creating…" : "Create Promo Code"}
          </Button>
        </div>
      )}

      {promoCodes.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          No promo codes yet. Create one to offer bonus try-ons!
        </div>
      ) : (
        <div className="divide-y divide-border">
          {promoCodes.map((p: any) => (
            <div key={p.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-foreground">{p.code}</span>
                  <Badge variant="outline" className={`text-[10px] ${p.is_active ? "text-primary border-primary/30" : "text-muted-foreground"}`}>
                    {p.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  +{p.bonus_tryons} try-ons · {p.used_count} uses{p.max_uses ? ` / ${p.max_uses}` : ""}
                </span>
              </div>
              <button onClick={() => toggleActive.mutate({ id: p.id, is_active: p.is_active })} className="text-muted-foreground hover:text-foreground">
                {p.is_active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => deletePromo.mutate(p.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
