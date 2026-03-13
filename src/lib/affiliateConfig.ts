/**
 * Affiliate tracking configuration for retailer clickout URLs.
 *
 * Each entry maps a retailer name to its affiliate network, the query-param
 * format used by that network, and the placeholder affiliate/publisher ID.
 *
 * Replace the `id` values with real affiliate IDs once you've been approved
 * by each network.  Until then the params are harmless — retailers simply
 * ignore unknown query strings.
 */

export interface AffiliateEntry {
  /** Affiliate network name (for internal reference) */
  network: string;
  /** The query-string key(s) to append */
  params: Record<string, string>;
}

/** UTM defaults appended to every clickout */
const UTM = {
  utm_source: 'dripfit',
  utm_medium: 'affiliate',
} as const;

/**
 * Retailer → affiliate parameter map.
 * Only retailers with active affiliate programs are listed.
 */
export const AFFILIATE_CONFIG: Record<string, AffiliateEntry> = {
  // ── Mass-market & fast fashion ──────────────────────────────
  'SHEIN':              { network: 'ShareASale', params: { aff_id: 'DRIPFIT_SHEIN' } },
  'H&M':               { network: 'Rakuten',    params: { ranMID: 'DRIPFIT_HM', ranEAID: 'dripfit', ranSiteID: 'dripfit' } },
  'Gap':                { network: 'Rakuten',    params: { ranMID: 'DRIPFIT_GAP', ranEAID: 'dripfit', ranSiteID: 'dripfit' } },
  'Old Navy':           { network: 'CJ',         params: { cjevent: 'DRIPFIT_OLDNAVY' } },
  'Banana Republic':    { network: 'CJ',         params: { cjevent: 'DRIPFIT_BR' } },
  'Uniqlo':             { network: 'Rakuten',    params: { ranMID: 'DRIPFIT_UNIQLO', ranEAID: 'dripfit', ranSiteID: 'dripfit' } },
  'Mango':              { network: 'Awin',       params: { awc: 'DRIPFIT_MANGO' } },
  'Forever 21':         { network: 'CJ',         params: { cjevent: 'DRIPFIT_F21' } },
  'Boohoo':             { network: 'Awin',       params: { awc: 'DRIPFIT_BOOHOO' } },
  'PrettyLittleThing':  { network: 'Awin',       params: { awc: 'DRIPFIT_PLT' } },
  'Fashion Nova':       { network: 'ShareASale', params: { aff_id: 'DRIPFIT_FN' } },
  'Target':             { network: 'Impact',     params: { irclickid: 'DRIPFIT_TARGET' } },

  // ── Department & multi-brand ────────────────────────────────
  'Nordstrom':          { network: 'Rakuten',    params: { ranMID: 'DRIPFIT_NORD', ranEAID: 'dripfit', ranSiteID: 'dripfit' } },
  'ASOS':               { network: 'Awin',       params: { awc: 'DRIPFIT_ASOS' } },
  'Revolve':            { network: 'CJ',         params: { cjevent: 'DRIPFIT_REVOLVE' } },
  'Amazon Fashion':     { network: 'Amazon',     params: { tag: 'dripfit-20' } },
  'Urban Outfitters':   { network: 'Rakuten',    params: { ranMID: 'DRIPFIT_UO', ranEAID: 'dripfit', ranSiteID: 'dripfit' } },
  'Abercrombie & Fitch':{ network: 'CJ',         params: { cjevent: 'DRIPFIT_ANF' } },
  'J.Crew':             { network: 'CJ',         params: { cjevent: 'DRIPFIT_JCREW' } },

  // ── Athletic & activewear ───────────────────────────────────
  'Nike':               { network: 'Impact',     params: { irclickid: 'DRIPFIT_NIKE' } },
  'Adidas':             { network: 'Impact',     params: { irclickid: 'DRIPFIT_ADIDAS' } },
  'Puma':               { network: 'CJ',         params: { cjevent: 'DRIPFIT_PUMA' } },
  'Lululemon':          { network: 'Impact',     params: { irclickid: 'DRIPFIT_LULU' } },

  // ── Luxury (those with programs) ────────────────────────────
  'Burberry':           { network: 'Rakuten',    params: { ranMID: 'DRIPFIT_BURBERRY', ranEAID: 'dripfit', ranSiteID: 'dripfit' } },
  'Versace':            { network: 'CJ',         params: { cjevent: 'DRIPFIT_VERSACE' } },

  // ── DTC & specialty ─────────────────────────────────────────
  'Fabletics':          { network: 'CJ',         params: { cjevent: 'DRIPFIT_FAB' } },
  'Kith':               { network: 'In-house',   params: { ref: 'dripfit' } },
  'Reformation':        { network: 'ShareASale', params: { aff_id: 'DRIPFIT_REF' } },
  'Gymshark':           { network: 'Awin',       params: { awc: 'DRIPFIT_GS' } },
  'Alo Yoga':           { network: 'ShareASale', params: { aff_id: 'DRIPFIT_ALO' } },
  'Everlane':           { network: 'Pepperjam',  params: { clickId: 'DRIPFIT_EV' } },
  'COS':                { network: 'Awin',       params: { awc: 'DRIPFIT_COS' } },
  'AllSaints':          { network: 'Awin',       params: { awc: 'DRIPFIT_AS' } },
  'Free People':        { network: 'Rakuten',    params: { ranMID: 'DRIPFIT_FP', ranEAID: 'dripfit', ranSiteID: 'dripfit' } },
  'Vuori':              { network: 'AvantLink',  params: { avad: 'DRIPFIT_VUORI' } },
  'SKIMS':              { network: 'ShareASale', params: { aff_id: 'DRIPFIT_SKIMS' } },
  'Aritzia':            { network: 'Rakuten',    params: { ranMID: 'DRIPFIT_ARITZIA', ranEAID: 'dripfit', ranSiteID: 'dripfit' } },
  'Carhartt':           { network: 'AvantLink',  params: { avad: 'DRIPFIT_CARHARTT' } },
  'Vans':               { network: 'CJ',         params: { cjevent: 'DRIPFIT_VANS' } },
  'Converse':           { network: 'CJ',         params: { cjevent: 'DRIPFIT_CONVERSE' } },
  'Dr. Martens':        { network: 'Awin',       params: { awc: 'DRIPFIT_DM' } },
  'Birkenstock':        { network: 'Awin',       params: { awc: 'DRIPFIT_BIRK' } },
  'On':                 { network: 'Awin',       params: { awc: 'DRIPFIT_ON' } },
  'HOKA':               { network: 'CJ',         params: { cjevent: 'DRIPFIT_HOKA' } },
  'Anthropologie':      { network: 'Rakuten',    params: { ranMID: 'DRIPFIT_ANTHRO', ranEAID: 'dripfit', ranSiteID: 'dripfit' } },
};

/**
 * Append affiliate + UTM params to any URL.
 * If the retailer has no affiliate config, only UTMs are added.
 */
export function appendAffiliateParams(url: string, retailerName: string): string {
  try {
    const u = new URL(url);
    const entry = AFFILIATE_CONFIG[retailerName];

    // Affiliate params
    if (entry) {
      for (const [k, v] of Object.entries(entry.params)) {
        u.searchParams.set(k, v);
      }
    }

    // UTM params
    for (const [k, v] of Object.entries(UTM)) {
      u.searchParams.set(k, v);
    }

    return u.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

/** Check whether a retailer has an affiliate program configured */
export function hasAffiliateProgram(retailerName: string): boolean {
  return retailerName in AFFILIATE_CONFIG;
}
