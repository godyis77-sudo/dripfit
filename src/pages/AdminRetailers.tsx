import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Search, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { directAffiliateOverrides } from "@/lib/affiliateOverrides";
import { usePageMeta } from "@/hooks/usePageMeta";
import { RETAILER_KEY_TO_NAME, type RetailerKey, type AffiliateStatus } from "@/lib/affiliateTypes";

const STATUS_META: Record<AffiliateStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  active: { label: "Active", icon: CheckCircle2, color: "text-emerald-400" },
  manual_review: { label: "Needs Review", icon: AlertTriangle, color: "text-amber-400" },
  inactive: { label: "Inactive", icon: XCircle, color: "text-muted-foreground" },
};

type FilterStatus = AffiliateStatus | "all" | "no_override";

export default function AdminRetailers() {
  usePageMeta({ title: "Admin — Retailers" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  // Check admin role
  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return data === true;
    },
    enabled: !!user,
  });

  // Build unified list: all RetailerKeys with override status
  const allRetailers = useMemo(() => {
    const allKeys = Object.values(
      // Get all keys from the RETAILER_KEY_TO_NAME map
      Object.fromEntries(
        Object.entries(RETAILER_KEY_TO_NAME).map(([key]) => [key, key])
      )
    ) as RetailerKey[];

    return allKeys
      .map((key) => {
        const override = directAffiliateOverrides[key];
        return {
          key,
          displayName: override?.displayName ?? RETAILER_KEY_TO_NAME[key] ?? key,
          status: override?.status ?? null,
          notes: override?.notes ?? null,
          countries: override?.countrySupport ?? [],
          lastVerified: override?.lastVerifiedAt ?? null,
          hasTemplate: !!override?.directLinkTemplate,
          hasOverride: !!override,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, []);

  const filtered = useMemo(() => {
    return allRetailers.filter((r) => {
      const matchesSearch =
        !search ||
        r.displayName.toLowerCase().includes(search.toLowerCase()) ||
        r.key.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "no_override" && !r.hasOverride) ||
        r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allRetailers, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { active: 0, manual_review: 0, inactive: 0, no_override: 0, total: allRetailers.length };
    allRetailers.forEach((r) => {
      if (!r.hasOverride) c.no_override++;
      else if (r.status) c[r.status]++;
    });
    return c;
  }, [allRetailers]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Checking access…</div>
      </div>
    );
  }

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
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Retailer Affiliates</h1>
            <p className="text-xs text-muted-foreground">{counts.total} retailers</p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3">
        {([
          { key: "active" as const, label: "Active", count: counts.active, color: "bg-emerald-500/20 text-emerald-400" },
          { key: "manual_review" as const, label: "Review", count: counts.manual_review, color: "bg-amber-500/20 text-amber-400" },
          { key: "inactive" as const, label: "Inactive", count: counts.inactive, color: "bg-muted text-muted-foreground" },
          { key: "no_override" as const, label: "No Config", count: counts.no_override, color: "bg-white/10 text-muted-foreground" },
        ]).map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(statusFilter === s.key ? "all" : s.key)}
            className={`rounded-lg p-2 text-center transition-all ${s.color} ${
              statusFilter === s.key ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="text-xl font-bold">{s.count}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-80">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search retailers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Retailer list */}
      <div className="px-4 space-y-2">
        {filtered.map((r) => {
          const meta = r.status ? STATUS_META[r.status] : null;
          const Icon = meta?.icon ?? XCircle;

          return (
            <div
              key={r.key}
              className="rounded-xl border border-border bg-card p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${meta?.color ?? "text-muted-foreground"}`} />
                  <span className="font-medium truncate">{r.displayName}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {r.hasTemplate && (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                      <ExternalLink className="h-3 w-3 mr-0.5" />
                      Deep Link
                    </Badge>
                  )}
                  {!r.hasOverride && (
                    <Badge variant="outline" className="text-[10px] border-white/20 text-muted-foreground">
                      Aggregator Only
                    </Badge>
                  )}
                  {meta && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        r.status === "active"
                          ? "border-emerald-500/40 text-emerald-400"
                          : r.status === "manual_review"
                          ? "border-amber-500/40 text-amber-400"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {meta.label}
                    </Badge>
                  )}
                </div>
              </div>

              {r.notes && (
                <p className="text-xs text-muted-foreground leading-relaxed">{r.notes}</p>
              )}

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="font-mono">{r.key}</span>
                {r.countries.length > 0 && <span>{r.countries.join(", ")}</span>}
                {r.lastVerified && <span>Verified: {r.lastVerified}</span>}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No retailers match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
