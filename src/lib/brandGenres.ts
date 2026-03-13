/**
 * Brand Genre Classification System
 * Maps brands to retail genres for filtering & sorting.
 */

export const BRAND_GENRES = [
  'Luxury',
  'Streetwear',
  'Athletic',
  'Fast Fashion',
  'Contemporary',
  'Outdoor & Active',
  'Workwear & Heritage',
  'Surf & Skate',
  'Sustainable',
  'Department Store',
] as const;

export type BrandGenre = typeof BRAND_GENRES[number];

/**
 * Canonical mapping of known brands → genre.
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
  'Fabletics': 'Athletic',
  'Rhone': 'Athletic',
  'Vuori': 'Athletic',
  'Girlfriend Collective': 'Athletic',

  // ── Fast Fashion ────────────────────────────────────
  'SHEIN': 'Fast Fashion',
  'Zara': 'Fast Fashion',
  'H&M': 'Fast Fashion',
  'Forever 21': 'Fast Fashion',
  'Boohoo': 'Fast Fashion',
  'PrettyLittleThing': 'Fast Fashion',
  'Fashion Nova': 'Fast Fashion',
  'Mango': 'Fast Fashion',
  'Topshop': 'Fast Fashion',
  'Uniqlo': 'Fast Fashion',
  'True Classic': 'Fast Fashion',
  'Fresh Clean Tees': 'Fast Fashion',
  'Fresh Clean Tees Canada': 'Fast Fashion',
  'Fresh Clean Threads': 'Fast Fashion',
  'American Eagle': 'Fast Fashion',
  'COS': 'Fast Fashion',
  'Calvin Klein': 'Fast Fashion',
  'Tommy Hilfiger': 'Fast Fashion',

  // ── Contemporary ────────────────────────────────────
  'Gap': 'Contemporary',
  'Old Navy': 'Contemporary',
  'Banana Republic': 'Contemporary',
  'J.Crew': 'Contemporary',
  'Abercrombie & Fitch': 'Contemporary',
  'Abercrombie': 'Contemporary',
  'Todd Snyder': 'Contemporary',
  'Grayers': 'Contemporary',
  'Public Rec': 'Contemporary',
  'Public Rec 2.0': 'Contemporary',
  'Marine Layer': 'Contemporary',
  'Anthropologie': 'Contemporary',
  "Rothy's": 'Contemporary',
  'AllSaints': 'Contemporary',
  'Bonobos': 'Contemporary',
  'Buck Mason': 'Contemporary',
  'Charles Tyrwhitt': 'Contemporary',
  'Eileen Fisher': 'Contemporary',
  'Free People': 'Contemporary',
  'Mizzen+Main': 'Contemporary',
  'Reiss': 'Contemporary',
  'Sandro': 'Contemporary',
  'Theory': 'Contemporary',
  'Ted Baker': 'Contemporary',
  'Tory Burch': 'Contemporary',
  'UNTUCKit': 'Contemporary',
  'Coach': 'Contemporary',
  'Kate Spade': 'Contemporary',
  'Michael Kors': 'Contemporary',
  'SuitSupply': 'Contemporary',
  'Eloquii': 'Contemporary',
  'Mejuri': 'Contemporary',
  'Schott': 'Contemporary',
  'SKIMS': 'Contemporary',
  'Savage X Fenty': 'Contemporary',
  "Victoria's Secret": 'Contemporary',

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

  // ── Surf & Skate ────────────────────────────────────
  'Billabong': 'Surf & Skate',
  'O5 Billabong': 'Surf & Skate',
  'O5 BILLABONG': 'Surf & Skate',
  'RVCA': 'Surf & Skate',
  'Outerknown': 'Surf & Skate',
  'Vans': 'Surf & Skate',
  'Quiksilver': 'Surf & Skate',
  'Volcom': 'Surf & Skate',

  // ── Sustainable ─────────────────────────────────────
  'Reformation': 'Sustainable',
  'Everlane': 'Sustainable',
  'Allbirds': 'Sustainable',
  'Faherty': 'Sustainable',

  // ── Department Store / Multi-brand ──────────────────
  'Nordstrom': 'Department Store',
  'ASOS': 'Department Store',
  'Revolve': 'Department Store',
  'Amazon Fashion': 'Department Store',
  'Urban Outfitters': 'Department Store',
  'Target': 'Department Store',
  'Farfetch': 'Department Store',
  'Steve Madden': 'Department Store',
  'Macys': 'Department Store',
  'Saks': 'Department Store',
  'SSENSE': 'Department Store',
  'Net-a-Porter': 'Department Store',
  'Ray-Ban': 'Department Store',
};

// Normalised lookup (case-insensitive)
const NORMALISED_MAP = new Map<string, BrandGenre>();
for (const [brand, genre] of Object.entries(BRAND_GENRE_MAP)) {
  NORMALISED_MAP.set(brand.toLowerCase(), genre);
}

/** Get the genre for a brand name (case-insensitive). Falls back to 'Contemporary'. */
export function getBrandGenre(brand: string): BrandGenre {
  return NORMALISED_MAP.get(brand.toLowerCase()) ?? 'Contemporary';
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
