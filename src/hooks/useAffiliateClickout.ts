import { useState, useCallback } from "react";
import { resolveClickoutByName } from "@/lib/affiliateRouter";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

interface PendingClickout {
  retailer: string;
  url: string;
  monetizationMode: string;
  provider: string | null;
  retailerUsed: string;
}

interface AffiliateClickoutOptions {
  /** Extra properties merged into every analytics event */
  extraProps?: Record<string, unknown>;
}

export function useAffiliateClickout(options: AffiliateClickoutOptions = {}) {
  const [pendingClickout, setPendingClickout] = useState<PendingClickout | null>(null);

  const beginClickout = useCallback(
    (retailer: string, destinationUrl: string) => {
      const result = resolveClickoutByName(retailer, destinationUrl);
      const pending: PendingClickout = {
        retailer,
        url: result.finalUrl,
        monetizationMode: result.monetizationMode,
        provider: result.provider,
        retailerUsed: result.retailerUsed,
      };

      setPendingClickout(pending);
      trackEvent("retailer_clickout_opened", {
        retailer,
        monetization_mode: result.monetizationMode,
        affiliate_provider: result.provider,
        destination_domain: safeDomain(destinationUrl),
        ...options.extraProps,
      });
    },
    [options.extraProps],
  );

  const confirmClickout = useCallback(() => {
    if (!pendingClickout) return;
    const destinationUrl = pendingClickout.url;

    trackEvent("shop_clickout", {
      retailer: pendingClickout.retailer,
      monetization_mode: pendingClickout.monetizationMode,
      affiliate_provider: pendingClickout.provider,
      retailer_used: pendingClickout.retailerUsed,
      destination_domain: safeDomain(destinationUrl),
      ...options.extraProps,
    });

    // Persist clickout to database for attribution reporting
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id ?? null;
      supabase.from("affiliate_clicks").insert({
        user_id: userId,
        session_id: userId ? null : (localStorage.getItem("dripcheck_guest_uuid") || null),
        retailer: pendingClickout.retailer,
        destination_url: destinationUrl,
        monetization_mode: pendingClickout.monetizationMode,
        affiliate_provider: pendingClickout.provider,
        retailer_used: pendingClickout.retailerUsed,
        source: (options.extraProps?.source as string) || "app",
      } as any).then(() => { /* fire and forget */ });
    });

    setPendingClickout(null);

    // Open destination directly on the confirm gesture.
    // If the browser/app preview blocks opening a new tab, fall back to same-tab navigation.
    const win = window.open(destinationUrl, "_blank", "noopener,noreferrer");
    if (win) {
      win.opener = null;
      return;
    }

    window.location.assign(destinationUrl);
  }, [pendingClickout, options.extraProps]);

  const cancelClickout = useCallback(() => {
    if (!pendingClickout) return;
    trackEvent("retailer_clickout_cancelled", {
      retailer: pendingClickout.retailer,
      monetization_mode: pendingClickout.monetizationMode,
      affiliate_provider: pendingClickout.provider,
      destination_domain: safeDomain(pendingClickout.url),
      ...options.extraProps,
    });
    setPendingClickout(null);
  }, [pendingClickout, options.extraProps]);

  return { pendingClickout, beginClickout, confirmClickout, cancelClickout };
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}
