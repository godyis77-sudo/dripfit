import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { HeroFillProgress } from "@/components/admin/HeroFillProgress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, Image as ImageIcon, Ruler, Zap, Sparkles, RefreshCw } from "lucide-react";


type Job = "all" | "backfill-descriptions" | "scrape-all-products" | "scrape-size-charts" | "backfill-images" | "generate-missing-womens-heroes" | "generate-all-missing-heroes" | "recurate-beach" | "summer-blast" | "curate-summer-now";

const JOBS: { id: Job; title: string; subtitle: string; icon: any }[] = [
  { id: "curate-summer-now", title: "CURATE 300 SUMMER NOW", subtitle: "Skip scrape — fire curate immediately (5 occasions × 2 genders × 30) + auto heroes", icon: Sparkles },
  { id: "summer-blast", title: "SUMMER BLAST — FULL PIPELINE", subtitle: "Scrape + rebalance + descriptions + 300 summer outfits (long-running)", icon: Sparkles },
  { id: "all", title: "FIRE ALL", subtitle: "Run every catalog op below in parallel", icon: Zap },
  { id: "backfill-descriptions", title: "BACKFILL DESCRIPTIONS", subtitle: "Fill in missing product descriptions (~5,086 items)", icon: Database },
  { id: "scrape-all-products", title: "RESTART SCRAPER", subtitle: "Re-scrape all brand × category combos (auto-chains image backfill)", icon: ImageIcon },
  { id: "backfill-images", title: "BACKFILL GALLERY IMAGES", subtitle: "Pull additional images for ~5,261 single-image products", icon: ImageIcon },
  { id: "scrape-size-charts", title: "EXPAND SIZE CHARTS", subtitle: "Pull missing brand size charts (74 → ~150 brands)", icon: Ruler },
  { id: "generate-all-missing-heroes", title: "FILL ALL MISSING HEROES", subtitle: "Render hero images for every weekly outfit missing one (staggered 1.5s)", icon: Sparkles },
  { id: "generate-missing-womens-heroes", title: "GENERATE MISSING WOMENS HEROES", subtitle: "Render hero images for The Grind Edit + The Long Lunch", icon: Sparkles },
  { id: "recurate-beach", title: "RECURATE BEACH OUTFITS", subtitle: "Re-build beach_day + beach_tropical (forces swimwear pieces)", icon: Sparkles },
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
  const [heroTrackTrigger, setHeroTrackTrigger] = useState<number>(0);
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
      if (job === "generate-missing-womens-heroes" || job === "generate-all-missing-heroes") {
        setHeroTrackTrigger(Date.now());
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
        <HeroFillProgress autoStartTrigger={heroTrackTrigger} />


        {log.length > 0 && (
          <div className="mt-8">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-mono">RECENT</div>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
              {log.map((l, i) => <div key={i} className="truncate">{l}</div>)}
            </div>
          </div>
        )}

        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-foreground">HERO PREVIEW</div>
              <div className="text-[11px] text-muted-foreground font-mono">
                {heroes.length} heroes · {heroes.filter(h => !h.hero_image_url).length} missing image
              </div>
            </div>
            <button
              onClick={loadHeroes}
              disabled={loadingHeroes}
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono px-3 py-1.5 rounded-full border border-border text-foreground hover:border-foreground/40 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loadingHeroes ? "animate-spin" : ""}`} />
              REFRESH
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {heroes.map(h => (
              <div key={h.id} className="rounded-2xl overflow-hidden border border-border bg-card">
                <div className="relative aspect-[3/4] bg-muted">
                  {h.hero_image_url ? (
                    <img
                      src={h.hero_image_url}
                      alt={h.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                      NO IMAGE
                    </div>
                  )}
                  <div className={`absolute top-2 left-2 text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full ${
                    h.is_active ? "bg-primary text-primary-foreground" : "bg-background/80 text-muted-foreground border border-border"
                  }`}>
                    {h.is_active ? "LIVE" : "DRAFT"}
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">{h.title}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                    {h.gender} · {h.occasion}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => regenerateOne(h.id)}
                      className="flex-1 text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded-full border border-border text-foreground hover:border-foreground/40"
                    >
                      REGEN
                    </button>
                    <button
                      onClick={() => togglePublish(h)}
                      disabled={!h.hero_image_url}
                      className={`flex-1 text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded-full disabled:opacity-40 ${
                        h.is_active
                          ? "border border-border text-foreground hover:border-foreground/40"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {h.is_active ? "UNPUBLISH" : "PUBLISH"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {heroes.length === 0 && !loadingHeroes && (
              <div className="col-span-2 text-[11px] text-muted-foreground font-mono py-8 text-center">
                No hero outfits yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
