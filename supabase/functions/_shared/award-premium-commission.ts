// Shared helper: awards a creator commission when a referee upgrades to Premium.
// Idempotent via UNIQUE INDEX (creator_id, referee_id) on creator_commissions.
// Tier: $1.00 USD for upgrades 1–99/mo, $1.50 USD from #100 onward.

export async function awardPremiumCommission(
  admin: any,
  refereeUserId: string,
  source: "stripe" | "ios_iap" | "android_iap" | string = "stripe",
): Promise<{ awarded: boolean; reason?: string; amountCents?: number; tierLabel?: string }> {
  const log = (step: string, details?: any) =>
    console.log(`[AWARD-COMMISSION:${source}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

  try {
    const { data: referral } = await admin
      .from("referrals")
      .select("id, referrer_id")
      .eq("referee_id", refereeUserId)
      .maybeSingle();

    if (!referral?.referrer_id) return { awarded: false, reason: "no_referral" };

    const { data: isCreator } = await admin.rpc("has_role", {
      _user_id: referral.referrer_id,
      _role: "creator",
    });
    if (!isCreator) return { awarded: false, reason: "referrer_not_creator" };

    const d = new Date();
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const { data: monthCount } = await admin.rpc("get_creator_month_count", {
      p_creator_id: referral.referrer_id,
      p_month_key: monthKey,
    });
    const count = monthCount ?? 0;
    const isBonus = count + 1 >= 100;
    const amountCents = isBonus ? 150 : 100;
    const tierLabel = isBonus ? "bonus" : "base";

    const { error: insErr } = await admin.from("creator_commissions").insert({
      creator_id: referral.referrer_id,
      referee_id: refereeUserId,
      referral_id: referral.id,
      amount_cents: amountCents,
      currency: "USD",
      tier_label: tierLabel,
      status: "pending",
      month_key: monthKey,
      notes: `premium_upgrade:${source}`,
    });

    if (insErr) {
      const msg = String(insErr.message ?? "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return { awarded: false, reason: "already_awarded" };
      }
      log("insert_error", { message: insErr.message });
      return { awarded: false, reason: "insert_error" };
    }

    log("commission_awarded", { creator_id: referral.referrer_id, amountCents, tierLabel });
    return { awarded: true, amountCents, tierLabel };
  } catch (e) {
    log("exception", { message: e instanceof Error ? e.message : String(e) });
    return { awarded: false, reason: "exception" };
  }
}
