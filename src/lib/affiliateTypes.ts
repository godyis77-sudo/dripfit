export type AffiliateStatus = "active" | "manual_review" | "inactive";
export type MonetizationMode = "direct" | "aggregator" | "none";
export type AggregatorProvider = "skimlinks" | "sovrn" | null;

export type RetailerKey =
  // Mass-market & fast fashion
  | "shein" | "zara" | "hm" | "gap" | "old_navy" | "banana_republic"
  | "uniqlo" | "mango" | "forever_21" | "boohoo" | "prettylittlething"
  | "fashion_nova" | "target" | "topshop"
  // Department & multi-brand
  | "nordstrom" | "asos" | "revolve" | "amazon_fashion" | "urban_outfitters"
  | "abercrombie" | "jcrew"
  // Athletic & activewear
  | "nike" | "adidas" | "puma" | "lululemon"
  // Luxury
  | "gucci" | "louis_vuitton" | "prada" | "balenciaga" | "dior"
  | "burberry" | "versace" | "saint_laurent" | "givenchy" | "fendi"
  // Streetwear
  | "supreme" | "off_white" | "stussy" | "bape" | "palace"
  | "fear_of_god" | "kith" | "essentials" | "corteiz" | "trapstar"
  // DTC & specialty
  | "fabletics" | "reformation" | "gymshark" | "alo_yoga" | "everlane"
  | "cos" | "allsaints" | "free_people" | "vuori" | "skims" | "aritzia"
  | "carhartt" | "vans" | "converse" | "dr_martens" | "birkenstock"
  | "on_running" | "hoka" | "anthropologie"
  // Multi-brand luxury aggregators
  | "ssense" | "farfetch";

export interface DirectAffiliateConfig {
  retailer: RetailerKey;
  displayName: string;
  status: AffiliateStatus;
  countrySupport: string[];
  inviteOnly?: boolean | null;
  notes?: string;
  lastVerifiedAt: string;
  /**
   * Use only when you have a REAL direct affiliate wrapper or deep-link template.
   * Example: https://my-network.example/click?pub=123&url={url}
   */
  directLinkTemplate: string | null;
}

export interface ClickoutInput {
  retailer: RetailerKey;
  destinationUrl: string;
  countryCode?: string;
  preferredAggregator?: AggregatorProvider;
  fallbackRetailer?: RetailerKey | null;
}

export interface ClickoutResult {
  finalUrl: string;
  monetizationMode: MonetizationMode;
  provider: string | null;
  retailerUsed: RetailerKey;
  originalRetailer: RetailerKey;
}

/**
 * Map display retailer names (from SUPPORTED_RETAILERS) to RetailerKey slugs.
 */
export const RETAILER_NAME_TO_KEY: Record<string, RetailerKey> = {
  'SHEIN': 'shein', 'Zara': 'zara', 'H&M': 'hm', 'Gap': 'gap',
  'Old Navy': 'old_navy', 'Banana Republic': 'banana_republic',
  'Uniqlo': 'uniqlo', 'Mango': 'mango', 'Forever 21': 'forever_21',
  'Boohoo': 'boohoo', 'PrettyLittleThing': 'prettylittlething',
  'Fashion Nova': 'fashion_nova', 'Target': 'target', 'Topshop': 'topshop',
  'Nordstrom': 'nordstrom', 'ASOS': 'asos', 'Revolve': 'revolve',
  'Amazon Fashion': 'amazon_fashion', 'Urban Outfitters': 'urban_outfitters',
  'Abercrombie & Fitch': 'abercrombie', 'J.Crew': 'jcrew',
  'Nike': 'nike', 'Adidas': 'adidas', 'Puma': 'puma', 'Lululemon': 'lululemon',
  'Gucci': 'gucci', 'Louis Vuitton': 'louis_vuitton', 'Prada': 'prada',
  'Balenciaga': 'balenciaga', 'Dior': 'dior', 'Burberry': 'burberry',
  'Versace': 'versace', 'Saint Laurent': 'saint_laurent', 'Givenchy': 'givenchy',
  'Fendi': 'fendi', 'Supreme': 'supreme', 'Off-White': 'off_white',
  'Stüssy': 'stussy', 'A Bathing Ape': 'bape', 'Palace': 'palace',
  'Fear of God': 'fear_of_god', 'Kith': 'kith', 'Essentials': 'essentials',
  'Corteiz': 'corteiz', 'Trapstar': 'trapstar',
  'Fabletics': 'fabletics', 'Reformation': 'reformation', 'Gymshark': 'gymshark',
  'Alo Yoga': 'alo_yoga', 'Everlane': 'everlane', 'COS': 'cos',
  'AllSaints': 'allsaints', 'Free People': 'free_people', 'Vuori': 'vuori',
  'SKIMS': 'skims', 'Aritzia': 'aritzia', 'Carhartt': 'carhartt',
  'Vans': 'vans', 'Converse': 'converse', 'Dr. Martens': 'dr_martens',
  'Birkenstock': 'birkenstock', 'On': 'on_running', 'HOKA': 'hoka',
  'Anthropologie': 'anthropologie', 'SSENSE': 'ssense', 'Farfetch': 'farfetch',
};

/** Reverse lookup: RetailerKey → display name */
export const RETAILER_KEY_TO_NAME: Record<RetailerKey, string> = Object.fromEntries(
  Object.entries(RETAILER_NAME_TO_KEY).map(([name, key]) => [key, name])
) as Record<RetailerKey, string>;
