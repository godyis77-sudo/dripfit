import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, DollarSign, Download, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { AdminNav } from "@/components/admin/AdminNav";

const CURRENCY = "$";

export default function AdminCommissions() {
  usePageMeta({ title: "Admin — Commissions" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"commissions" | "payouts">("commissions");

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user,
  });

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ["admin-commissions", statusFilter],
    queryFn: async () => {
      let q = supabase.from("creator_commissions" as any).select("*").order("created_at", { ascending: false }).limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return (data as any[]) ?? [];
    },
    enabled: !!user && isAdmin === true,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "approved") updates.approved_at = new Date().toISOString();
      if (status === "paid") updates.paid_at = new Date().toISOString();
      await supabase.from("creator_commissions" as any).update(updates).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-commissions"] });
      toast({ title: "Commission updated" });
    },
  });

  const { data: payoutRequests = [] } = useQuery({
    queryKey: ["admin-payout-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payout_requests" as any)
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(100);
      return (data as any[]) ?? [];
    },
    enabled: !!user && isAdmin === true,
  });

  const updatePayoutStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed" || status === "rejected") updates.processed_at = new Date().toISOString();
      await supabase.from("payout_requests" as any).update(updates).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payout-requests"] });
      toast({ title: "Payout request updated" });
    },
  });

  const handleExport = () => {
    const csv = [
      "id,creator_id,referee_id,amount_cents,currency,tier,status,month,created_at",
      ...commissions.map((c: any) =>
        [c.id, c.creator_id, c.referee_id, c.amount_cents, c.currency, c.tier_label, c.status, c.month_key, c.created_at].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (roleLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center gap-4">
        <h1 className="text-xl font-bold text-foreground">Admin Required</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const totalPending = commissions.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + c.amount_cents, 0);
  const totalPaid = commissions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + c.amount_cents, 0);
  const pendingPayouts = payoutRequests.filter((r: any) => r.status === "pending").length;
  const filters = ["all", "pending", "approved", "paid"];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-foreground flex-1">Commission Admin</h1>
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" /> CSV
        </Button>
      </div>

      <AdminNav />

      <div className="px-4 pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-amber-500/20 bg-card p-4">
            <span className="text-xs text-muted-foreground">Pending Payout</span>
            <div className="text-xl font-bold text-amber-400">{CURRENCY}{(totalPending / 100).toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-card p-4">
            <span className="text-xs text-muted-foreground">Total Paid</span>
            <div className="text-xl font-bold text-emerald-400">{CURRENCY}{(totalPaid / 100).toFixed(2)}</div>
          </div>
        </div>

        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("commissions")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "commissions" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            Commissions
          </button>
          <button
            onClick={() => setActiveTab("payouts")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors relative ${
              activeTab === "payouts" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            Payout Requests
            {pendingPayouts > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                {pendingPayouts}
              </span>
            )}
          </button>
        </div>

        {activeTab === "commissions" && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {commissions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No commissions found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Creator</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[80px]">
                          {c.creator_id?.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground">
                          {CURRENCY}{(c.amount_cents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="flex gap-1">
                          {c.status === "pending" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-400"
                              onClick={() => updateStatus.mutate({ id: c.id, status: "approved" })}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                          )}
                          {c.status === "approved" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary"
                              onClick={() => updateStatus.mutate({ id: c.id, status: "paid" })}>
                              <DollarSign className="w-3.5 h-3.5 mr-1" /> Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}

        {activeTab === "payouts" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {payoutRequests.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No payout requests.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Creator</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutRequests.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.requested_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[80px]">
                        {r.creator_id?.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {CURRENCY}{(r.amount_cents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {r.payout_email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-400"
                              onClick={() => updatePayoutStatus.mutate({ id: r.id, status: "completed" })}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pay
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive"
                              onClick={() => updatePayoutStatus.mutate({ id: r.id, status: "rejected" })}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
