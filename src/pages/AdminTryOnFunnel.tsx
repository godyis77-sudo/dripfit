import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, AlertCircle, CheckCircle2, Users, MousePointerClick, Bookmark, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminNav } from "@/components/admin/AdminNav";

type FunnelMetrics = {
  window_days: number;
  guest_sessions: number;
  signups: number;
  attempts: number;
  succeeded: number;
  failed: number;
  rejected: number;
  started_only: number;
  saved_posts: number;
  unique_attempters: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  by_tier: Array<{ tier: string; attempts: number; succeeded: number; failed: number; success_rate: number }>;
  by_day: Array<{ date: string; attempts: number; succeeded: number; failed: number }>;
};

const WINDOWS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

function pct(num: number, den: number) {
  if (!den) return "0%";
  return `${((num / den) * 100).toFixed(1)}%`;
}

export default function AdminTryOnFunnel() {
  usePageMeta({ title: "Admin — Try-On Funnel" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [days, setDays] = useState<number>(30);

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user,
  });

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["tryon-funnel", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tryon_funnel_metrics" as any, { p_days: days });
      if (error) throw error;
      return data as unknown as FunnelMetrics;
    },
    enabled: !!user && isAdmin === true,
  });

  if (!user || roleLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground uppercase tracking-wider">Admin access required</p>
      </div>
    );
  }

  const m = metrics;

  // Funnel stages
  const visitors = (m?.guest_sessions ?? 0) + (m?.signups ?? 0);
  const reachedAttempt = m?.unique_attempters ?? 0;
  const totalAttempts = m?.attempts ?? 0;
  const succeeded = m?.succeeded ?? 0;
  const saved = m?.saved_posts ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-white/8">
        <div className="px-4 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg uppercase tracking-[0.2em]">Try-On Funnel</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* Window selector */}
        <div className="flex items-center gap-2">
          {WINDOWS.map((w) => (
            <Button
              key={w.days}
              variant={days === w.days ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(w.days)}
              className="uppercase tracking-wider text-xs"
            >
              {w.label}
            </Button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground font-mono">
            {isLoading ? "Loading…" : `Last ${days} days`}
          </span>
        </div>

        {/* Funnel stages */}
        <section>
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Conversion Funnel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <FunnelStep
              icon={<Users className="h-4 w-4" />}
              label="Visitors"
              value={visitors}
              sublabel={`${m?.guest_sessions ?? 0} guests · ${m?.signups ?? 0} signups`}
            />
            <FunnelStep
              icon={<MousePointerClick className="h-4 w-4" />}
              label="Started Try-On"
              value={reachedAttempt}
              sublabel={`${pct(reachedAttempt, visitors)} of visitors`}
            />
            <FunnelStep
              icon={<Activity className="h-4 w-4" />}
              label="Total Attempts"
              value={totalAttempts}
              sublabel={`${(totalAttempts / Math.max(reachedAttempt, 1)).toFixed(1)} avg per user`}
            />
            <FunnelStep
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Succeeded"
              value={succeeded}
              sublabel={`${pct(succeeded, totalAttempts)} success rate`}
              accent
            />
            <FunnelStep
              icon={<Bookmark className="h-4 w-4" />}
              label="Saved Posts"
              value={saved}
              sublabel={`${pct(saved, succeeded)} of successes`}
            />
          </div>
        </section>

        {/* Health metrics */}
        <section>
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Generation Health
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Failures" value={m?.failed ?? 0} sub={pct(m?.failed ?? 0, totalAttempts)} tone="danger" />
            <StatCard label="Rejected (limits)" value={m?.rejected ?? 0} sub="pre-flight" tone="warn" />
            <StatCard label="Avg Latency" value={`${m?.avg_latency_ms ?? 0}ms`} sub="successful gens" />
            <StatCard label="p95 Latency" value={`${m?.p95_latency_ms ?? 0}ms`} sub="tail performance" />
          </div>
        </section>

        {/* By tier */}
        <section>
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
            By User Tier
          </h2>
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="uppercase text-xs tracking-wider">Tier</TableHead>
                  <TableHead className="text-right uppercase text-xs tracking-wider">Attempts</TableHead>
                  <TableHead className="text-right uppercase text-xs tracking-wider">Success</TableHead>
                  <TableHead className="text-right uppercase text-xs tracking-wider">Failed</TableHead>
                  <TableHead className="text-right uppercase text-xs tracking-wider">Success %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(m?.by_tier ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                      No data in window
                    </TableCell>
                  </TableRow>
                ) : (
                  (m?.by_tier ?? []).map((t) => (
                    <TableRow key={t.tier}>
                      <TableCell className="font-medium uppercase text-xs tracking-wider">{t.tier}</TableCell>
                      <TableCell className="text-right font-mono">{t.attempts}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-400">{t.succeeded}</TableCell>
                      <TableCell className="text-right font-mono text-red-400">{t.failed}</TableCell>
                      <TableCell className="text-right font-mono">{t.success_rate}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* By day */}
        <section>
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Daily Trend
          </h2>
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="uppercase text-xs tracking-wider">Date</TableHead>
                  <TableHead className="text-right uppercase text-xs tracking-wider">Attempts</TableHead>
                  <TableHead className="text-right uppercase text-xs tracking-wider">Succeeded</TableHead>
                  <TableHead className="text-right uppercase text-xs tracking-wider">Failed</TableHead>
                  <TableHead className="text-right uppercase text-xs tracking-wider">Success %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(m?.by_day ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                      No activity
                    </TableCell>
                  </TableRow>
                ) : (
                  (m?.by_day ?? []).slice().reverse().map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-mono text-xs">{d.date}</TableCell>
                      <TableCell className="text-right font-mono">{d.attempts}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-400">{d.succeeded}</TableCell>
                      <TableCell className="text-right font-mono text-red-400">{d.failed}</TableCell>
                      <TableCell className="text-right font-mono">
                        {d.attempts > 0 ? `${((d.succeeded / d.attempts) * 100).toFixed(0)}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </section>
      </main>
    </div>
  );
}

function FunnelStep({
  icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sublabel: string;
  accent?: boolean;
}) {
  return (
    <Card className={`p-4 ${accent ? "border-primary/40" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className={`font-display text-2xl ${accent ? "text-primary" : ""}`}>{value.toLocaleString()}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{sublabel}</div>
    </Card>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone?: "danger" | "warn";
}) {
  const valueColor = tone === "danger" ? "text-red-400" : tone === "warn" ? "text-amber-400" : "";
  return (
    <Card className="p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{label}</div>
      <div className={`font-display text-xl ${valueColor}`}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
    </Card>
  );
}
