import { getUserRegion, type UserRegion } from '@/lib/session';
import { resolveClickoutByName } from '@/lib/affiliateRouter';
import { trackEvent } from '@/lib/analytics';

/** Region-specific domain overrides */
const REGION_DOMAINS: Partial<Record<string, Partial<Record<UserRegion, string>>>> = {
  'Zara': { us: 'www.zara.com/us', ca: 'www.zara.com/ca', gb: 'www.zara.com/uk', au: 'www.zara.com/au', fr: 'www.zara.com/fr', de: 'www.zara.com/de', it: 'www.zara.com/it', es: 'www.zara.com/es' },
  'H&M': { us: 'www2.hm.com/en_us', ca: 'www2.hm.com/en_ca', gb: 'www2.hm.com/en_gb', au: 'www2.hm.com/en_au', fr: 'www2.hm.com/fr_fr', de: 'www2.hm.com/de_de', it: 'www2.hm.com/it_it', es: 'www2.hm.com/es_es' },
  'ASOS': { us: 'www.asos.com/us', ca: 'www.asos.com', gb: 'www.asos.com', au: 'www.asos.com/au', fr: 'www.asos.com/fr', de: 'www.asos.com/de', it: 'www.asos.com/it', es: 'www.asos.com/es' },
  'Nike': { us: 'www.nike.com', ca: 'www.nike.com/ca', gb: 'www.nike.com/gb', au: 'www.nike.com/au', fr: 'www.nike.com/fr', de: 'www.nike.com/de', it: 'www.nike.com/it', es: 'www.nike.com/es' },
  'Adidas': { us: 'www.adidas.com/us', ca: 'www.adidas.ca', gb: 'www.adidas.co.uk', au: 'www.adidas.com.au', fr: 'www.adidas.fr', de: 'www.adidas.de', it: 'www.adidas.it', es: 'www.adidas.es' },
};

/** Build a deep search URL for a retailer + product query */
export function buildRetailerSearchUrl(retailerName: string, baseUrl: string, query: string): string {
  const q = encodeURIComponent(query);
  const searchPaths: Record<string, (q: string) => string> = {
    'Zara': (q) => `https://www.zara.com/us/en/search?searchTerm=${q}`,
    'H&M': (q) => `https://www2.hm.com/en_us/search-results.html?q=${q}`,
    'Uniqlo': (q) => `https://www.uniqlo.com/us/en/search?q=${q}`,
    'Gap': (q) => `https://www.gap.com/browse/search.do?searchText=${q}`,
    'ASOS': (q) => `https://www.asos.com/us/search/?q=${q}`,
    'Mango': (q) => `https://shop.mango.com/us/search?kw=${q}`,
    'Nike': (q) => `https://www.nike.com/w?q=${q}`,
    'Adidas': (q) => `https://www.adidas.com/us/search?q=${q}`,
    'Nordstrom': (q) => `https://www.nordstrom.com/sr?keyword=${q}`,
    'Revolve': (q) => `https://www.revolve.com/r/Search.jsp?search=${q}`,
    'Fashion Nova': (q) => `https://www.fashionnova.com/pages/search-results?q=${q}`,
    'SHEIN': (q) => `https://us.shein.com/pdsearch/${q}/`,
    'Lululemon': (q) => `https://shop.lululemon.com/search?Ntt=${q}`,
    'Amazon Fashion': (q) => `https://www.amazon.com/s?k=${q}&i=fashion`,
    'PrettyLittleThing': (q) => `https://www.prettylittlething.us/catalogsearch/result/?q=${q}`,
    'Abercrombie & Fitch': (q) => `https://www.abercrombie.com/shop/us/search?searchTerm=${q}`,
    'Urban Outfitters': (q) => `https://www.urbanoutfitters.com/search?q=${q}`,
    'Forever 21': (q) => `https://www.forever21.com/us/search/${q}`,
    'Topshop': (q) => `https://www.topshop.com/search?q=${q}`,
    'J.Crew': (q) => `https://www.jcrew.com/r/search/?N=0&Nloc=en&Ntrm=${q}`,
    'Banana Republic': (q) => `https://www.bananarepublic.com/browse/search.do?searchText=${q}`,
    'Old Navy': (q) => `https://oldnavy.gap.com/browse/search.do?searchText=${q}`,
    'Puma': (q) => `https://us.puma.com/us/en/search?q=${q}`,
    'Boohoo': (q) => `https://us.boohoo.com/search?q=${q}`,
    'Target': (q) => `https://www.target.com/s?searchTerm=${q}&category=5xtg6`,
    'Fabletics': (q) => `https://www.fabletics.com/search?q=${q}`,
    'Kith': (q) => `https://kith.com/search?q=${q}`,
    'Reformation': (q) => `https://www.thereformation.com/search?q=${q}`,
    'Gymshark': (q) => `https://www.gymshark.com/search?q=${q}`,
    'Alo Yoga': (q) => `https://www.aloyoga.com/search?q=${q}`,
    'Everlane': (q) => `https://www.everlane.com/search?q=${q}`,
    'COS': (q) => `https://www.cos.com/en_usd/search.html?q=${q}`,
    'AllSaints': (q) => `https://www.allsaints.com/search?q=${q}`,
    'Free People': (q) => `https://www.freepeople.com/search/?q=${q}`,
    'Vuori': (q) => `https://vuori.com/search?q=${q}`,
    'SKIMS': (q) => `https://skims.com/search?q=${q}`,
    'Aritzia': (q) => `https://www.aritzia.com/search?q=${q}`,
    'Carhartt': (q) => `https://www.carhartt.com/search?q=${q}`,
    'Vans': (q) => `https://www.vans.com/search?q=${q}`,
    'Converse': (q) => `https://www.converse.com/search?q=${q}`,
    'Dr. Martens': (q) => `https://www.drmartens.com/us/en/search?q=${q}`,
    'Birkenstock': (q) => `https://www.birkenstock.com/us/search?q=${q}`,
    'On': (q) => `https://www.on.com/en-us/search?q=${q}`,
    'HOKA': (q) => `https://www.hoka.com/en/us/search?q=${q}`,
    'Anthropologie': (q) => `https://www.anthropologie.com/search?q=${q}`,
  };
  const rawUrl = searchPaths[retailerName]?.(q) || `${baseUrl.replace(/\/$/, '')}/?q=${q}`;
  const result = resolveClickoutByName(retailerName, rawUrl);

  // Fire clickout analytics from search-based flows too
  try {
    const { trackEvent } = await import('@/lib/analytics');
    trackEvent('shop_clickout', {
      retailer: retailerName,
      source: 'retailer_search',
      monetization_mode: result.monetizationMode,
      affiliate_provider: result.provider,
      retailer_used: result.retailerUsed,
    });
  } catch { /* never break navigation */ }

  return result.finalUrl;
}

/** Suggested retailers for a clothing category */
export function getRetailersForCategory(category: string): string[] {
  const map: Record<string, string[]> = {
    top: ['Zara', 'H&M', 'Uniqlo', 'ASOS', 'Nordstrom'],
    bottom: ['H&M', 'ASOS', 'Gap', 'Fashion Nova', 'SHEIN'],
    dress: ['Zara', 'ASOS', 'Revolve', 'Mango', 'Nordstrom'],
    outerwear: ['Nike', 'Adidas', 'Uniqlo', 'Nordstrom', 'Zara'],
    activewear: ['Nike', 'Adidas', 'Lululemon', 'Puma'],
    shoes: ['Nike', 'Adidas', 'Nordstrom', 'ASOS'],
  };
  return map[category] || map['top'];
}

/** Pick the single best-fit retailer for badge display based on brand + category signals */
export function getBestRetailerForItem(brand: string | null, category: string): string {
  // Brand-to-retailer affinity: if we recognise the brand, suggest where it's typically sold
  const brandAffinity: Record<string, string> = {
    'nike': 'Nike', 'adidas': 'Adidas', 'puma': 'Puma', 'lululemon': 'Lululemon',
    'zara': 'Zara', 'h&m': 'H&M', 'uniqlo': 'Uniqlo', 'gap': 'Gap',
    'mango': 'Mango', 'asos': 'ASOS', 'shein': 'SHEIN', 'revolve': 'Revolve',
    'fashion nova': 'Fashion Nova', 'abercrombie': 'Abercrombie & Fitch',
    'j.crew': 'J.Crew', 'banana republic': 'Banana Republic', 'old navy': 'Old Navy',
    'urban outfitters': 'Urban Outfitters', 'forever 21': 'Forever 21',
    'prettylittlething': 'PrettyLittleThing', 'boohoo': 'Boohoo',
    'north face': 'Nordstrom', 'patagonia': 'Nordstrom', 'ralph lauren': 'Nordstrom',
    'calvin klein': 'Nordstrom', 'tommy hilfiger': 'Nordstrom',
    'levi': 'Nordstrom', "levi's": 'Nordstrom',
    'champion': 'Amazon Fashion', 'hanes': 'Amazon Fashion',
    'target': 'Target',
    'fabletics': 'Fabletics', 'kith': 'Kith', 'reformation': 'Reformation',
    'gymshark': 'Gymshark', 'alo yoga': 'Alo Yoga', 'alo': 'Alo Yoga',
    'everlane': 'Everlane', 'cos': 'COS', 'allsaints': 'AllSaints',
    'free people': 'Free People', 'vuori': 'Vuori', 'skims': 'SKIMS',
    'aritzia': 'Aritzia', 'carhartt': 'Carhartt', 'vans': 'Vans',
    'converse': 'Converse', 'dr. martens': 'Dr. Martens', 'birkenstock': 'Birkenstock',
    'on running': 'On', 'hoka': 'HOKA', 'anthropologie': 'Anthropologie',
  };

  if (brand) {
    const key = brand.toLowerCase().trim();
    if (brandAffinity[key]) return brandAffinity[key];
    // Partial match
    for (const [k, v] of Object.entries(brandAffinity)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
  }

  // Quality/style tiers by category
  const categoryPrimary: Record<string, string> = {
    top: 'Zara',
    bottom: 'H&M',
    dress: 'Zara',
    outerwear: 'Nordstrom',
    activewear: 'Nike',
    shoes: 'Nike',
  };
  return categoryPrimary[category] || 'Zara';
}
