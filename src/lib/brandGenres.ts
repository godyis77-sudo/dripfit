/**
 * Style-Based Genre Classification System
 * Maps brands to fashion style genres for filtering & sorting.
 * Genres describe aesthetic/style, NOT business models.
 */

export const BRAND_GENRES = [
  'Athletic',
  'Bohemian',
  'Casual',
  'Contemporary',
  'Loungewear',
  'Luxury',
  'Minimalist',
  'Outdoor & Active',
  'Streetwear',
  'Surf & Skate',
  'Workwear & Heritage',
] as const;

export type BrandGenre = typeof BRAND_GENRES[number];

/**
 * Canonical mapping of known brands → style genre.
 * Brands not listed here default to 'Contemporary'.
 */
const BRAND_GENRE_MAP: Record<string, BrandGenre> = {
  // ── Luxury ──────────────────────────────────────────
  'Gucci': 'Luxury',
  'Louis Vuitton': 'Luxury',
  'Prada': 'Luxury',
  'Balenciaga': 'Luxury',
  'Dior': 'Luxury',
  'Burberry': 'Luxury',
  'Versace': 'Luxury',
  'Saint Laurent': 'Luxury',
  'Givenchy': 'Luxury',
  'Fendi': 'Luxury',
  'Valentino': 'Luxury',
  'Bottega Veneta': 'Luxury',
  'Chanel': 'Luxury',
  'Hermès': 'Luxury',
  'Tom Ford': 'Luxury',
  'Alexander McQueen': 'Luxury',
  'Celine': 'Luxury',
  'Loewe': 'Luxury',
  'Hugo Boss': 'Luxury',
  'Ralph Lauren': 'Luxury',
  'Moncler': 'Luxury',
  'Jacquemus': 'Luxury',
  'Rick Owens': 'Luxury',
  'Maison Margiela': 'Luxury',
  'AMI Paris': 'Luxury',
  'Cartier': 'Luxury',
  'Stone Island': 'Luxury',
  'Acne Studios': 'Luxury',
  'Cutler And Gross': 'Luxury',
  'Todd Snyder': 'Luxury',
  'Reiss': 'Luxury',
  'Sandro': 'Luxury',
  'Theory': 'Luxury',
  'Ted Baker': 'Luxury',
  'Tory Burch': 'Luxury',
  'Coach': 'Luxury',
  'Kate Spade': 'Luxury',
  'Michael Kors': 'Luxury',
  'SuitSupply': 'Luxury',
  'Mejuri': 'Luxury',
  'Farfetch': 'Luxury',
  'Saks': 'Luxury',
  'SSENSE': 'Luxury',
  'Net-a-Porter': 'Luxury',
  'Revolve': 'Luxury',

  // ── Streetwear ──────────────────────────────────────
  'Supreme': 'Streetwear',
  'Off-White': 'Streetwear',
  'Stüssy': 'Streetwear',
  'A Bathing Ape': 'Streetwear',
  'Palace': 'Streetwear',
  'Palace Skateboards': 'Streetwear',
  'Fear of God': 'Streetwear',
  'Kith': 'Streetwear',
  'Essentials': 'Streetwear',
  'Corteiz': 'Streetwear',
  'Trapstar': 'Streetwear',
  'New Era': 'Streetwear',
  'AllSaints': 'Streetwear',
  'Urban Outfitters': 'Streetwear',
  'Mark Bodē': 'Streetwear',

  // ── Athletic ────────────────────────────────────────
  'Nike': 'Athletic',
  'Adidas': 'Athletic',
  'Puma': 'Athletic',
  'Lululemon': 'Athletic',
  'Gymshark': 'Athletic',
  'Under Armour': 'Athletic',
  'New Balance': 'Athletic',
  'Reebok': 'Athletic',
  'On Running': 'Athletic',
  'ASICS': 'Athletic',
  'Gore Wear': 'Athletic',
  'HOKA': 'Athletic',
  'Converse': 'Athletic',
  'Rhone': 'Athletic',
  'Vuori': 'Athletic',
  'Girlfriend Collective': 'Athletic',
  'Public Rec': 'Athletic',
  'Public Rec 2.0': 'Athletic',
  'Mizzen+Main': 'Athletic',
  'San Francisco Giants': 'Athletic',

  // ── Casual ──────────────────────────────────────────
  // Everyday wear — relaxed, accessible, trend-aware
  'Zara': 'Casual',
  'H&M': 'Casual',
  'SHEIN': 'Casual',
  'Forever 21': 'Casual',
  'Boohoo': 'Casual',
  'PrettyLittleThing': 'Casual',
  'Fashion Nova': 'Casual',
  'Mango': 'Casual',
  'Topshop': 'Casual',
  'Gap': 'Casual',
  'Old Navy': 'Casual',
  'American Eagle': 'Casual',
  'Abercrombie & Fitch': 'Casual',
  'Abercrombie': 'Casual',
  'Calvin Klein': 'Casual',
  'Tommy Hilfiger': 'Casual',
  'Eloquii': 'Casual',
  'ASOS': 'Casual',
  'Amazon Fashion': 'Casual',

  // ── Minimalist ──────────────────────────────────────
  // Clean lines, neutral palettes, quality basics
  'Uniqlo': 'Minimalist',
  'COS': 'Minimalist',
  'Everlane': 'Minimalist',
  'Allbirds': 'Minimalist',
  'True Classic': 'Minimalist',
  'Fresh Clean Tees': 'Minimalist',
  'Fresh Clean Tees Canada': 'Minimalist',
  'Fresh Clean Threads': 'Minimalist',
  'Eileen Fisher': 'Minimalist',
  "Rothy's": 'Minimalist',
  'Marine Layer': 'Minimalist',

  // ── Loungewear ──────────────────────────────────────
  // Comfort-first, home & leisure, intimates
  'SKIMS': 'Loungewear',
  'Savage X Fenty': 'Loungewear',
  "Victoria's Secret": 'Loungewear',
  'Fabletics': 'Loungewear',

  // ── Bohemian ────────────────────────────────────────
  // Eclectic, flowy, earthy, artisanal aesthetic
  'Free People': 'Bohemian',
  'Anthropologie': 'Bohemian',
  'Reformation': 'Bohemian',
  'Faherty': 'Bohemian',

  // ── Contemporary ────────────────────────────────────
  // Modern, polished everyday — default catch-all
  'Banana Republic': 'Contemporary',
  'J.Crew': 'Contemporary',
  'Bonobos': 'Contemporary',
  'Charles Tyrwhitt': 'Contemporary',
  'UNTUCKit': 'Contemporary',
  'Steve Madden': 'Contemporary',
  'Ray-Ban': 'Contemporary',
  'Radial': 'Contemporary',
  'Custom Club': 'Contemporary',
  'Project Vermont': 'Contemporary',
  'Authentic': 'Contemporary',
  'Phaidon': 'Contemporary',
  'Doraemon': 'Contemporary',
  'Nordstrom': 'Contemporary',
  'Macys': 'Contemporary',
  'Target': 'Contemporary',
  'Ok Accessories': 'Contemporary',
  'Ok Mens': 'Contemporary',
  'OK Mens': 'Contemporary',
  'Ok Unisex': 'Contemporary',
  'OK Unisex': 'Contemporary',
  'Ok Womens': 'Contemporary',
  'OK Womens': 'Contemporary',

  // ── Outdoor & Active ────────────────────────────────
  'Patagonia': 'Outdoor & Active',
  "Arc'teryx": 'Outdoor & Active',
  'The North Face': 'Outdoor & Active',
  'Columbia': 'Outdoor & Active',
  'Hoka': 'Outdoor & Active',
  'Salomon': 'Outdoor & Active',
  'Oakley': 'Outdoor & Active',
  'Birkenstock': 'Outdoor & Active',
  'Dr. Martens': 'Outdoor & Active',
  'UGG': 'Outdoor & Active',

  // ── Workwear & Heritage ─────────────────────────────
  'Carhartt': 'Workwear & Heritage',
  "Levi's": 'Workwear & Heritage',
  'Taylor Stitch': 'Workwear & Heritage',
  'Filson': 'Workwear & Heritage',
  'Roark': 'Workwear & Heritage',
  'Buck Mason': 'Workwear & Heritage',
  'Grayers': 'Workwear & Heritage',
  'Grayers ': 'Workwear & Heritage',
  'Schott': 'Workwear & Heritage',

  // ── Surf & Skate ────────────────────────────────────
  'Billabong': 'Surf & Skate',
  'O5 Billabong': 'Surf & Skate',
  'O5 BILLABONG': 'Surf & Skate',
  'RVCA': 'Surf & Skate',
  'Outerknown': 'Surf & Skate',
  'Vans': 'Surf & Skate',
  'Quiksilver': 'Surf & Skate',
  'Volcom': 'Surf & Skate',
  'World Industries': 'Surf & Skate',

  // ── Sustainable brands → reclassified ───────────────
  'Recurate': 'Minimalist',
  'Trove': 'Minimalist',
};

// Normalised lookup (case-insensitive)
const NORMALISED_MAP = new Map<string, BrandGenre>();
for (const [brand, genre] of Object.entries(BRAND_GENRE_MAP)) {
  NORMALISED_MAP.set(brand.toLowerCase().trim(), genre);
}

/** Get the genre for a brand name (case-insensitive). Falls back to 'Contemporary'. */
export function getBrandGenre(brand: string): BrandGenre {
  return NORMALISED_MAP.get(brand.toLowerCase().trim()) ?? 'Contemporary';
}

/** Get all brands belonging to a specific genre. */
export function getBrandsByGenre(genre: BrandGenre): string[] {
  return Object.entries(BRAND_GENRE_MAP)
    .filter(([, g]) => g === genre)
    .map(([brand]) => brand)
    .sort();
}

/** Classify an array of brands into a genre→brands map. */
export function classifyBrands(brands: string[]): Record<BrandGenre, string[]> {
  const result = {} as Record<BrandGenre, string[]>;
  for (const g of BRAND_GENRES) result[g] = [];
  for (const brand of brands) {
    result[getBrandGenre(brand)].push(brand);
  }
  return result;
}

/** Sort brands: first by genre order, then alphabetically within genre. */
export function sortBrandsByGenre(brands: string[]): string[] {
  const genreOrder = new Map(BRAND_GENRES.map((g, i) => [g, i]));
  return [...brands].sort((a, b) => {
    const ga = getBrandGenre(a);
    const gb = getBrandGenre(b);
    const orderDiff = (genreOrder.get(ga) ?? 99) - (genreOrder.get(gb) ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return a.localeCompare(b);
  });
}

/** Sort products by retailer then brand within retailer. */
export function sortProductsByRetailer<T extends { retailer: string; brand: string }>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const retailerCmp = a.retailer.localeCompare(b.retailer);
    if (retailerCmp !== 0) return retailerCmp;
    return a.brand.localeCompare(b.brand);
  });
}

/** Sort products by brand genre, then brand name. */
export function sortProductsByGenre<T extends { brand: string }>(products: T[]): T[] {
  const genreOrder = new Map(BRAND_GENRES.map((g, i) => [g, i]));
  return [...products].sort((a, b) => {
    const ga = getBrandGenre(a.brand);
    const gb = getBrandGenre(b.brand);
    const orderDiff = (genreOrder.get(ga) ?? 99) - (genreOrder.get(gb) ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return a.brand.localeCompare(b.brand);
  });
}
