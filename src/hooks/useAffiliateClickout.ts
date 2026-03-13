import { useState, useCallback } from "react";
import { resolveClickoutByName } from "@/lib/affiliateRouter";
import { trackEvent } from "@/lib/analytics";

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
    trackEvent("shop_clickout", {
      retailer: pendingClickout.retailer,
      monetization_mode: pendingClickout.monetizationMode,
      affiliate_provider: pendingClickout.provider,
      retailer_used: pendingClickout.retailerUsed,
      destination_domain: safeDomain(pendingClickout.url),
      ...options.extraProps,
    });
    window.open(pendingClickout.url, "_blank", "noopener");
    setPendingClickout(null);
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
