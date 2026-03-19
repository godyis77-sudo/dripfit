import { useEffect } from "react";

type AffiliateProviderProps = {
  provider?: "skimlinks" | "sovrn" | null;
};

/**
 * Injects the aggregator affiliate script (Skimlinks or Sovrn) once at app root.
 * This auto-converts untagged merchant links into monetized links.
 * Direct affiliate links (with real tracking wrappers) are left untouched.
 *
 * Replace placeholder script URLs with your real publisher setup after signup.
 */
export default function AffiliateProvider({
  provider = "skimlinks",
}: AffiliateProviderProps) {
  useEffect(() => {
    if (!provider) return;

    const existing = document.querySelector(`[data-affiliate-provider="${provider}"]`);
    if (existing) return;

    const script = document.createElement("script");
    script.async = true;
    script.dataset.affiliateProvider = provider;

    if (provider === "skimlinks") {
      // TODO: Replace YOUR_SKIMLINKS_SITE_ID with real Skimlinks publisher site ID
      script.src = "https://s.skimresources.com/js/YOUR_SKIMLINKS_SITE_ID.skimlinks.js";
    }

    if (provider === "sovrn") {
      // TODO: Replace YOUR_SOVRN_ZONE_ID with real Sovrn zone ID
      script.src = "https://ap.lijit.com/www/delivery/fpi.js?z=YOUR_SOVRN_ZONE_ID";
    }

    document.head.appendChild(script);
  }, [provider]);

  return null;
}
