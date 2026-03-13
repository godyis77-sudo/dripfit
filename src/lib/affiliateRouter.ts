import type {
  ClickoutInput,
  ClickoutResult,
  RetailerKey,
} from "./affiliateTypes";
import { directAffiliateOverrides } from "./affiliateOverrides";
import { RETAILER_NAME_TO_KEY } from "./affiliateTypes";

const DEFAULT_UTMS = {
  utm_source: "dripfit",
  utm_medium: "affiliate",
  utm_campaign: "clickout",
} as const;

function addQueryParams(url: string, params: Record<string, string>): string {
  try {
    const parsed = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
      parsed.searchParams.set(key, value);
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

function buildDirectUrl(template: string, destinationUrl: string): string {
  return template.replace("{url}", encodeURIComponent(destinationUrl));
}

/** Check if a retailer can be shown for a given country */
export function canShowRetailer(retailer: RetailerKey, countryCode?: string): boolean {
  const config = directAffiliateOverrides[retailer];
  if (!config) return true; // No config = no country restriction
  if (!countryCode) return true;
  return config.countrySupport.includes(countryCode.toUpperCase());
}

/** Check if a retailer has a fully configured direct affiliate link */
export function isDirectAffiliateReady(retailer: RetailerKey): boolean {
  const config = directAffiliateOverrides[retailer];
  return Boolean(
    config &&
      config.status === "active" &&
      config.directLinkTemplate &&
      config.directLinkTemplate.includes("{url}")
  );
}

/**
 * Aggregator-safe URL:
 * Keep the merchant URL intact, add only analytics UTMs.
 * Skimlinks/Sovrn will convert the untagged merchant link automatically.
 */
function buildAggregatorCandidateUrl(destinationUrl: string): string {
  return addQueryParams(destinationUrl, { ...DEFAULT_UTMS });
}

/**
 * Main clickout resolver.
 * 1. Direct override wins if truly configured (status=active + real template)
 * 2. Luxury fallback if provided and ready
 * 3. Aggregator (Skimlinks/Sovrn) handles everything else
 * 4. No monetization if nothing applies
 */
export function resolveClickout(input: ClickoutInput): ClickoutResult {
  const {
    retailer,
    destinationUrl,
    countryCode,
    preferredAggregator = "skimlinks",
    fallbackRetailer = null,
  } = input;

  // Respect country gating
  if (!canShowRetailer(retailer, countryCode)) {
    return {
      finalUrl: destinationUrl,
      monetizationMode: "none",
      provider: null,
      retailerUsed: retailer,
      originalRetailer: retailer,
    };
  }

  // 1) Direct override wins only if truly configured
  if (isDirectAffiliateReady(retailer)) {
    const config = directAffiliateOverrides[retailer]!;
    return {
      finalUrl: buildDirectUrl(config.directLinkTemplate!, destinationUrl),
      monetizationMode: "direct",
      provider: "direct",
      retailerUsed: retailer,
      originalRetailer: retailer,
    };
  }

  // 2) Luxury fallback retailer
  if (fallbackRetailer && isDirectAffiliateReady(fallbackRetailer)) {
    const fallbackConfig = directAffiliateOverrides[fallbackRetailer]!;
    return {
      finalUrl: buildDirectUrl(fallbackConfig.directLinkTemplate!, destinationUrl),
      monetizationMode: "direct",
      provider: "direct_fallback",
      retailerUsed: fallbackRetailer,
      originalRetailer: retailer,
    };
  }

  // 3) Default: aggregator-compatible merchant URL
  if (preferredAggregator) {
    return {
      finalUrl: buildAggregatorCandidateUrl(destinationUrl),
      monetizationMode: "aggregator",
      provider: preferredAggregator,
      retailerUsed: retailer,
      originalRetailer: retailer,
    };
  }

  // 4) No monetization path
  return {
    finalUrl: destinationUrl,
    monetizationMode: "none",
    provider: null,
    retailerUsed: retailer,
    originalRetailer: retailer,
  };
}

/**
 * Convenience: resolve a clickout using display retailer name (e.g. "Nike")
 * instead of RetailerKey slug.
 */
export function resolveClickoutByName(
  retailerName: string,
  destinationUrl: string,
  countryCode?: string,
): ClickoutResult {
  const key = RETAILER_NAME_TO_KEY[retailerName];
  if (!key) {
    // Unknown retailer — still pass through aggregator for potential monetization
    return {
      finalUrl: addQueryParams(destinationUrl, { ...DEFAULT_UTMS }),
      monetizationMode: "aggregator",
      provider: "skimlinks",
      retailerUsed: "zara" as RetailerKey, // placeholder, won't matter
      originalRetailer: "zara" as RetailerKey,
    };
  }
  return resolveClickout({
    retailer: key,
    destinationUrl,
    countryCode,
    preferredAggregator: "skimlinks",
  });
}
