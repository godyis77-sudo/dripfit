import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, Image as ImageIcon, Ruler, Zap, Sparkles, RefreshCw } from "lucide-react";

type Job = "all" | "backfill-descriptions" | "scrape-all-products" | "scrape-size-charts" | "backfill-images" | "generate-missing-womens-heroes";

const JOBS: { id: Job; title: string; subtitle: string; icon: any }[] = [
  { id: "all", title: "FIRE ALL", subtitle: "Run every catalog op below in parallel", icon: Zap },
  { id: "backfill-descriptions", title: "BACKFILL DESCRIPTIONS", subtitle: "Fill in missing product descriptions (~5,086 items)", icon: Database },
  { id: "scrape-all-products", title: "RESTART SCRAPER", subtitle: "Re-scrape all brand × category combos (auto-chains image backfill)", icon: ImageIcon },
  { id: "backfill-images", title: "BACKFILL GALLERY IMAGES", subtitle: "Pull additional images for ~5,261 single-image products", icon: ImageIcon },
  { id: "scrape-size-charts", title: "EXPAND SIZE CHARTS", subtitle: "Pull missing brand size charts (74 → ~150 brands)", icon: Ruler },
  { id: "generate-missing-womens-heroes", title: "GENERATE MISSING WOMENS HEROES", subtitle: "Render hero images for The Grind Edit + The Long Lunch", icon: Sparkles },
];

type HeroRow = {
  id: string;
  title: string;
  occasion: string;
  gender: string;
  hero_image_url: string | null;
  is_active: boolean;
};

export default function AdminCatalogOps() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<Job | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [heroes, setHeroes] = useState<HeroRow[]>([]);
  const [loadingHeroes, setLoadingHeroes] = useState(false);

  const loadHeroes = useCallback(async () => {
    setLoadingHeroes(true);
    const { data, error } = await supabase
      .from("weekly_outfits")
      .select("id, title, occasion, gender, hero_image_url, is_active")
      .eq("is_hero", true)
      .order("gender", { ascending: true })
      .order("occasion", { ascending: true });
    if (error) {
      toast({ title: "Hero load failed", description: error.message, variant: "destructive" });
    } else {
      setHeroes((data ?? []) as HeroRow[]);
    }
    setLoadingHeroes(false);
  }, [toast]);

  useEffect(() => { loadHeroes(); }, [loadHeroes]);

  const regenerateOne = async (outfitId: string) => {
    try {
      const { error } = await supabase.functions.invoke("generate-outfit-hero", {
        body: { outfit_id: outfitId, regenerate: true },
      });
      if (error) throw error;
      toast({ title: "Regenerating", description: "Refresh in ~45s to see the new image." });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message ?? "Unknown error", variant: "destructive" });
    }
  };

  const togglePublish = async (h: HeroRow) => {
    const next = !h.is_active;
    const { error } = await supabase
      .from("weekly_outfits")
      .update({ is_active: next })
      .eq("id", h.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setHeroes(prev => prev.map(x => x.id === h.id ? { ...x, is_active: next } : x));
    toast({ title: next ? "Published" : "Unpublished", description: h.title });
  };

  const fire = async (job: Job) => {
    setBusy(job);
    try {
      const { data, error } = await supabase.functions.invoke("trigger-catalog-ops", { body: { job } });
      if (error) throw error;
      const stamp = new Date().toLocaleTimeString();
      setLog(prev => [`${stamp} — fired ${job}: ${JSON.stringify(data)}`, ...prev].slice(0, 30));
      toast({ title: "Dispatched", description: `${job} is running in the background.` });
      if (job === "generate-missing-womens-heroes") {
        setTimeout(loadHeroes, 60_000);
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AdminNav />
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-display uppercase tracking-wider mb-1 text-foreground">CATALOG OPS</h1>
        <p className="text-xs text-muted-foreground mb-6 font-mono">
          Admin only. Each button triggers a paid backend job. Watch costs.
        </p>

        <div className="space-y-3">
          {JOBS.map(({ id, title, subtitle, icon: Icon }) => {
            const isAll = id === "all";
            return (
              <button
                key={id}
                disabled={busy !== null}
                onClick={() => fire(id)}
                className={`w-full text-left p-4 rounded-2xl border transition-colors flex items-start gap-3 disabled:opacity-50 ${
                  isAll
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-foreground/40"
                }`}
              >
                <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold uppercase tracking-wider">{title}</div>
                  <div className={`text-xs mt-0.5 ${isAll ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{subtitle}</div>
                </div>
                {busy === id && <Loader2 className="w-4 h-4 animate-spin" />}
              </button>
            );
          })}
        </div>

        {log.length > 0 && (
          <div className="mt-8">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-mono">RECENT</div>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
              {log.map((l, i) => <div key={i} className="truncate">{l}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
