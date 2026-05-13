import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, XCircle, FileText, RefreshCw, Ruler, DollarSign, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AdminListSkeleton } from "@/components/ui/page-skeleton";
import { usePageMeta } from "@/hooks/usePageMeta";
import { AdminNav } from "@/components/admin/AdminNav";
import { toast } from "sonner";

type JobKey = "backfill-descriptions" | "scrape-all-products" | "scrape-size-charts" | "audit-product-urls";

const JOBS: Array<{
  key: JobKey;
  fn: string;
  title: string;
  desc: string;
  cost: string;
  icon: typeof FileText;
  body?: Record<string, unknown>;
}> = [
  {
    key: "backfill-descriptions",
    fn: "backfill-descriptions",
    title: "Backfill descriptions",
    desc: "Generate AI descriptions for products missing them (~5,086 rows).",
    cost: "≈ $3–8 in AI",
    icon: FileText,
  },
  {
    key: "scrape-all-products",
    fn: "scrape-all-products",
    title: "Scrape all products",
    desc: "Restart full catalog ingestion across all configured brand/category jobs.",
    cost: "≈ $30–100 in scrape + AI",
    icon: RefreshCw,
  },
  {
    key: "scrape-size-charts",
    fn: "scrape-size-charts",
    title: "Expand size charts",
    desc: "Scrape size charts for brands that don't have one (43% → 80% goal).",
    cost: "≈ $5–15",
    icon: Ruler,
  },
  {
    key: "audit-product-urls",
    fn: "audit-product-urls",
    title: "Audit prices & URLs",
    desc: "Re-check live URLs and refresh prices on existing catalog rows.",
    cost: "≈ $2–10",
    icon: DollarSign,
  },
];

export default function AdminCatalogOps() {
  usePageMeta({ title: "Admin — Catalog Ops" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [running, setRunning] = useState<Record<JobKey, boolean>>({} as Record<JobKey, boolean>);
  const [lastResult, setLastResult] = useState<Record<JobKey, string>>({} as Record<JobKey, string>);

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return data === true;
    },
    enabled: !!user,
  });

  async function run(job: typeof JOBS[number]) {
    setRunning((s) => ({ ...s, [job.key]: true }));
    setLastResult((s) => ({ ...s, [job.key]: "" }));
    try {
      const { data, error } = await supabase.functions.invoke(job.fn, { body: job.body ?? {} });
      if (error) throw error;
      const msg = (data as any)?.message || "Job dispatched.";
      setLastResult((s) => ({ ...s, [job.key]: msg }));
      toast.success(`${job.title}: ${msg}`);
    } catch (e: any) {
      const msg = e?.message || "Failed";
      setLastResult((s) => ({ ...s, [job.key]: `Error: ${msg}` }));
      toast.error(`${job.title} failed: ${msg}`);
    } finally {
      setRunning((s) => ({ ...s, [job.key]: false }));
    }
  }

  if (roleLoading) return <AdminListSkeleton />;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Admin access required</p>
        <Button variant="outline" onClick={() => navigate("/home")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wider">Catalog Ops</h1>
            <p className="text-xs text-muted-foreground">Trigger backfills & scrapes on demand</p>
          </div>
        </div>
      </div>

      <AdminNav />

      <div className="px-4 py-4 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Each button calls a paid edge function. Estimates are rough — actual cost depends on retailer count and
          response sizes. Jobs run async in the background and may take several minutes to finish.
        </p>

        {JOBS.map((job) => {
          const Icon = job.icon;
          const isRunning = !!running[job.key];
          const result = lastResult[job.key];
          return (
            <div key={job.key} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-sm">{job.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{job.desc}</p>
                  <p className="text-[10px] uppercase tracking-wider text-primary/80 mt-1">{job.cost}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => run(job)}
                  disabled={isRunning}
                  className="shrink-0"
                >
                  {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Run"}
                </Button>
              </div>
              {result && (
                <div className={`text-[11px] flex items-start gap-1.5 ${result.startsWith("Error") ? "text-destructive" : "text-emerald-400"}`}>
                  {!result.startsWith("Error") && <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />}
                  <span className="break-words">{result}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
