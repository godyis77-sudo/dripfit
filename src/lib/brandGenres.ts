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
  'Banana Republic': 'Contemporary',
  'J.Crew': 'Contemporary',
  'Bonobos': 'Contemporary',
  'Charles Tyrwhitt': 'Contemporary',
  'Free People': 'Contemporary',
  'Anthropologie': 'Contemporary',
  'UNTUCKit': 'Contemporary',

  // ── Luxury (promoted from Contemporary) ─────────────
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

  // ── Fast Fashion (moved from Contemporary) ──────────
  'Gap': 'Fast Fashion',
  'Old Navy': 'Fast Fashion',
  'Abercrombie & Fitch': 'Fast Fashion',
  'Abercrombie': 'Fast Fashion',
  'Eloquii': 'Fast Fashion',
  'SKIMS': 'Fast Fashion',
  'Savage X Fenty': 'Fast Fashion',
  "Victoria's Secret": 'Fast Fashion',

  // ── Athletic (moved from Contemporary) ──────────────
  'Public Rec': 'Athletic',
  'Public Rec 2.0': 'Athletic',
  'Mizzen+Main': 'Athletic',

  // ── Sustainable (moved from Contemporary) ───────────
  'Eileen Fisher': 'Sustainable',
  'Marine Layer': 'Sustainable',
  "Rothy's": 'Sustainable',

  // ── Workwear & Heritage (moved from Contemporary) ───
  'Buck Mason': 'Workwear & Heritage',
  'Grayers': 'Workwear & Heritage',
  'Schott': 'Workwear & Heritage',

  // ── Streetwear (moved from Contemporary) ────────────
  'AllSaints': 'Streetwear',

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

  // ── Department Store (true multi-brand retailers) ───
  'Nordstrom': 'Department Store',
  'Macys': 'Department Store',
  'Target': 'Department Store',
  'Ok Accessories': 'Department Store',
  'Ok Mens': 'Department Store',
  'OK Mens': 'Department Store',
  'Ok Unisex': 'Department Store',
  'OK Unisex': 'Department Store',
  'Ok Womens': 'Department Store',
  'OK Womens': 'Department Store',

  // ── Luxury (promoted from Department Store) ─────────
  'Farfetch': 'Luxury',
  'Saks': 'Luxury',
  'SSENSE': 'Luxury',
  'Net-a-Porter': 'Luxury',
  'Revolve': 'Luxury',

  // ── Fast Fashion (moved from Department Store) ──────
  'ASOS': 'Fast Fashion',
  'Amazon Fashion': 'Fast Fashion',

  // ── Streetwear (moved from Department Store) ────────
  'Urban Outfitters': 'Streetwear',

  // ── Contemporary (moved from Department Store) ──────
  'Steve Madden': 'Contemporary',
  'Ray-Ban': 'Contemporary',

  // ── Remaining catalog brands ────────────────────────
  'Cutler And Gross': 'Luxury',
  'Grayers ': 'Workwear & Heritage',  // trailing space variant
  'World Industries': 'Surf & Skate',
  'Recurate': 'Sustainable',
  'Trove': 'Sustainable',
  'Radial': 'Contemporary',
  'Custom Club': 'Contemporary',
  'Mark Bodē': 'Streetwear',
  'Project Vermont': 'Contemporary',
  'Authentic': 'Contemporary',
  'Phaidon': 'Contemporary',
  'Doraemon': 'Contemporary',
  'San Francisco Giants': 'Athletic',
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
