import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const CURRENCY = "$";
const MIN_PAYOUT_CENTS = 2500; // $25 minimum

interface PayoutRequestSectionProps {
  userId: string;
  pendingCents: number;
}

export default function PayoutRequestSection({ userId, pendingCents }: PayoutRequestSectionProps) {
  const qc = useQueryClient();
  const [payoutEmail, setPayoutEmail] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: payoutRequests = [] } = useQuery({
    queryKey: ["payout-requests", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payout_requests" as any)
        .select("*")
        .eq("creator_id", userId)
        .order("requested_at", { ascending: false })
        .limit(20);
      return (data as any[]) ?? [];
    },
  });

  // Check if there's already a pending payout request
  const hasPendingRequest = payoutRequests.some((r: any) => r.status === "pending");
  const canRequestPayout = pendingCents >= MIN_PAYOUT_CENTS && !hasPendingRequest;

  const requestPayout = useMutation({
    mutationFn: async () => {
      if (!payoutEmail || !payoutEmail.includes("@")) throw new Error("Valid email required");
      if (pendingCents < MIN_PAYOUT_CENTS) throw new Error("Minimum payout is $25");

      const { error } = await supabase.from("payout_requests" as any).insert({
        creator_id: userId,
        amount_cents: pendingCents,
        payout_email: payoutEmail,
        payout_method: "paypal",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payout-requests"] });
      setShowForm(false);
      toast({ title: "Payout requested!", description: "We'll process it within 5 business days." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const statusColor: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    processing: "bg-white/5 text-muted-foreground border-white/10",
    completed: "bg-primary/15 text-primary border-primary/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Payouts</span>
        </div>
        {canRequestPayout && (
          <Button size="sm" variant="default" className="h-7 px-3 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
            <ArrowUpRight className="w-3.5 h-3.5" /> Request
          </Button>
        )}
      </div>

      {/* Payout eligibility info */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Available balance</span>
          <span className="text-sm font-bold text-foreground">{CURRENCY}{(pendingCents / 100).toFixed(2)}</span>
        </div>
        {pendingCents < MIN_PAYOUT_CENTS && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {CURRENCY}{((MIN_PAYOUT_CENTS - pendingCents) / 100).toFixed(2)} more to reach {CURRENCY}{(MIN_PAYOUT_CENTS / 100).toFixed(0)} minimum payout
          </p>
        )}
        {hasPendingRequest && (
          <p className="text-[10px] text-amber-400 mt-1">You have a pending payout request</p>
        )}
      </div>

      {showForm && (
        <div className="px-4 py-3 border-b border-border space-y-2 bg-muted/30">
          <label className="text-xs text-muted-foreground">PayPal email for payout</label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={payoutEmail}
            onChange={(e) => setPayoutEmail(e.target.value.slice(0, 255))}
            className="text-xs h-8"
          />
          <p className="text-[10px] text-muted-foreground">
            Amount: {CURRENCY}{(pendingCents / 100).toFixed(2)} · Processed within 5 business days
          </p>
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={() => requestPayout.mutate()}
            disabled={requestPayout.isPending || !payoutEmail.includes("@")}
          >
            {requestPayout.isPending ? "Submitting…" : `Request ${CURRENCY}${(pendingCents / 100).toFixed(2)} Payout`}
          </Button>
        </div>
      )}

      {/* Payout history */}
      {payoutRequests.length > 0 && (
        <div className="divide-y divide-border">
          {payoutRequests.map((r: any) => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground">
                  {CURRENCY}{(r.amount_cents / 100).toFixed(2)}
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(r.requested_at).toLocaleDateString()}
                </p>
              </div>
              <Badge className={`text-[10px] ${statusColor[r.status] || ""}`}>{r.status}</Badge>
            </div>
          ))}
        </div>
      )}

      {payoutRequests.length === 0 && !showForm && (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          No payout requests yet
        </div>
      )}
    </motion.div>
  );
}
