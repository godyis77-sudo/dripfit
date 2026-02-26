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
  };
  return searchPaths[retailerName]?.(q) || `${baseUrl.replace(/\/$/, '')}/?q=${q}`;
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
