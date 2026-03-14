import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, Share2, TrendingUp, Wallet, Users, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";
import PromoCodesSection from "@/components/creator/PromoCodesSection";
import PayoutRequestSection from "@/components/creator/PayoutRequestSection";

const CURRENCY_SYMBOL = "$";

function getMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-card p-4 flex flex-col gap-1"
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <span className="text-xl font-bold text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </motion.div>
  );
}

export default function CreatorDashboard() {
  usePageTitle("Creator Dashboard");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const monthKey = getMonthKey();

  const { data: isCreator, isLoading: roleLoading } = useQuery({
    queryKey: ["creator-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "creator" as any });
      return !!data;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["creator-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_code, referral_credits")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["creator-commissions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_commissions" as any)
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as any[]) ?? [];
    },
    enabled: !!user && isCreator === true,
  });

  const thisMonth = commissions.filter((c: any) => c.month_key === monthKey);
  const monthConversions = thisMonth.length;
  const pendingCents = commissions.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + c.amount_cents, 0);
  const paidCents = commissions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + c.amount_cents, 0);
  const totalEarnings = commissions.reduce((s: number, c: any) => s + c.amount_cents, 0);

  const referralUrl = `https://dripfitcheck.lovable.app?ref=${profile?.referral_code}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    trackEvent("referral_link_copied" as any);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "DRIPFIT ✔ — Creator Link",
        text: "Get your perfect fit with AI body scanning — try DRIPFIT ✔ free",
        url: referralUrl,
      });
    } else {
      handleCopy();
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center gap-4">
        <h1 className="text-xl font-bold text-foreground">Creator Access Required</h1>
        <p className="text-sm text-muted-foreground">This dashboard is for approved creators. Contact us to apply.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-foreground flex-1">Creator Dashboard</h1>
        <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">CREATOR</Badge>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="Total Referred" value={String(commissions.length)} />
          <StatCard icon={TrendingUp} label="This Month" value={String(monthConversions)} sub={monthKey} />
          <StatCard icon={Wallet} label="Pending" value={`${CURRENCY_SYMBOL}${(pendingCents / 100).toFixed(2)}`} />
          <StatCard icon={Clock} label="Paid Out" value={`${CURRENCY_SYMBOL}${(paidCents / 100).toFixed(2)}`} />
        </div>

        {/* Earnings Summary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4"
        >
          <span className="text-xs text-muted-foreground font-medium">Total Earnings</span>
          <div className="text-3xl font-bold text-primary mt-1">
            {CURRENCY_SYMBOL}{(totalEarnings / 100).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {monthConversions >= 100 ? "🔥 Bonus tier active — $1.50/install" : `${100 - monthConversions} more to unlock bonus tier`}
          </p>
        </motion.div>

        {/* Referral Link */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <span className="text-sm font-semibold text-foreground">Your Referral Link</span>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background">
            <span className="flex-1 text-xs font-mono text-muted-foreground truncate">{referralUrl}</span>
            <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <Button onClick={handleShare} className="w-full gap-2" size="sm">
            <Share2 className="w-4 h-4" /> Share Link
          </Button>
        </motion.div>

        {/* Promo Codes */}
        <PromoCodesSection userId={user!.id} />

        {/* Payout Requests */}
        <PayoutRequestSection userId={user!.id} pendingCents={pendingCents} />
      </div>
    </div>
  );
}
