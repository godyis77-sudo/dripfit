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

    // Skimlinks / Sovrn IDs are not yet configured.
    // Uncomment and replace placeholder IDs once you have real publisher credentials.
    // This prevents a wasted 48 KB network request to a broken URL.

    /*
    const existing = document.querySelector(`[data-affiliate-provider="${provider}"]`);
    if (existing) return;

    const script = document.createElement("script");
    script.async = true;
    script.dataset.affiliateProvider = provider;

    if (provider === "skimlinks") {
      script.src = "https://s.skimresources.com/js/YOUR_SKIMLINKS_SITE_ID.skimlinks.js";
    }

    if (provider === "sovrn") {
      script.src = "https://ap.lijit.com/www/delivery/fpi.js?z=YOUR_SOVRN_ZONE_ID";
    }

    document.head.appendChild(script);
    */
  }, [provider]);

  return null;
}
