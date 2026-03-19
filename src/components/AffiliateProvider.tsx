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

    // Don't inject placeholder scripts — only inject when real IDs are configured
    const SKIMLINKS_SITE_ID = ""; // TODO: Set your real Skimlinks publisher site ID
    const SOVRN_ZONE_ID = ""; // TODO: Set your real Sovrn zone ID

    if (provider === "skimlinks" && !SKIMLINKS_SITE_ID) return;
    if (provider === "sovrn" && !SOVRN_ZONE_ID) return;

    const existing = document.querySelector(`[data-affiliate-provider="${provider}"]`);
    if (existing) return;

    const script = document.createElement("script");
    script.async = true;
    script.dataset.affiliateProvider = provider;

    if (provider === "skimlinks") {
      script.src = `https://s.skimresources.com/js/${SKIMLINKS_SITE_ID}.skimlinks.js`;
    }

    if (provider === "sovrn") {
      script.src = `https://ap.lijit.com/www/delivery/fpi.js?z=${SOVRN_ZONE_ID}`;
    }

    document.head.appendChild(script);
  }, [provider]);

  return null;
}
