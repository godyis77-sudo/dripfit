import { getCorsHeaders, errorResponse, successResponse } from "../_shared/validation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

/**
 * curate-weekly-outfits — Automated outfit curation from the product catalog.
 *
 * POST body:
 *   week_id?: string          — defaults to current ISO week
 *   gender?: "mens"|"womens"  — defaults to both
 *   outfits_per_occasion?: number — default 5
 *   occasion_count?: number   — how many occasions to create for (default 5)
 *   clear_existing?: boolean  — remove previous outfits for this week_id first
 */

/* ── DripFit Brand Pool & Tribe Logic ─────────────────────────── */

const DRIPFIT_BRAND_POOL = {
  heritage_luxury: [
    'AMIRI', 'Saint Laurent', 'Fear of God',
    'GALLERY DEPARTMENT LLC', 'Gucci', 'Balenciaga',
    'Louis Vuitton', 'Prada', 'Moncler', 'Dior',
    'Loewe', 'Fendi', 'Burberry', 'Valentino',
    'Acne Studios', 'Alexander McQueen', 'Celine',
    'Bottega Veneta', 'Givenchy', 'Rick Owens',
    'Maison Margiela', 'Jacquemus', 'Sacai',
    'AMI Paris', 'Off-White', 'Stone Island',
    'Essentials',
  ],
  elevated_streetwear: [
    'Palace Skateboards', 'Daily Paper', 'Stüssy',
    'Eric Emanuel', 'Kith', 'Supreme', 'Carhartt',
    "Arc'teryx", 'Salomon', 'Dr. Martens',
    'Vans', 'New Balance', 'Converse',
  ],
  quiet_luxury: [
    'Reiss', 'Theory', 'Todd Snyder', 'COS',
    'Everlane', "Rothy's", 'Outerknown',
    'Marine Layer', 'Taylor Stitch', 'Reformation',
    'Faherty', 'Buck Mason',
  ],
  supporting: [
    'Nike', 'Adidas', 'Puma', "Levi's",
    'Uniqlo', 'Gap', 'AllSaints',
  ],
};

const APPROVED_BRANDS = new Set<string>([
  ...DRIPFIT_BRAND_POOL.heritage_luxury,
  ...DRIPFIT_BRAND_POOL.elevated_streetwear,
  ...DRIPFIT_BRAND_POOL.quiet_luxury,
  ...DRIPFIT_BRAND_POOL.supporting,
]);

const OCCASION_TRIBE_MAP: Record<string, string[]> = {
  night_out: ['heritage_luxury', 'elevated_streetwear'],
  lunch_date: ['quiet_luxury', 'heritage_luxury'],
  office: ['quiet_luxury', 'heritage_luxury'],
  weekend_casual: ['elevated_streetwear', 'quiet_luxury'],
  beach_day: ['quiet_luxury', 'elevated_streetwear'],
  festival: ['elevated_streetwear', 'heritage_luxury'],
  gym: ['elevated_streetwear', 'supporting'],
  brunch: ['quiet_luxury', 'heritage_luxury'],
  patio_evening: ['quiet_luxury', 'heritage_luxury'],
  summer_night_out: ['heritage_luxury', 'quiet_luxury'],
  spring_garden: ['quiet_luxury', 'bohemian' as any, 'heritage_luxury'],
  autumn_layers: ['quiet_luxury', 'heritage_luxury'],
  winter_polish: ['heritage_luxury', 'quiet_luxury'],
};

function getBrandTribe(brand: string): string {
  if (!brand) return 'supporting';
  if (DRIPFIT_BRAND_POOL.heritage_luxury.includes(brand)) return 'heritage_luxury';
  if (DRIPFIT_BRAND_POOL.elevated_streetwear.includes(brand)) return 'elevated_streetwear';
  if (DRIPFIT_BRAND_POOL.quiet_luxury.includes(brand)) return 'quiet_luxury';
  return 'supporting';
}

function tribeScore(tribe: string): number {
  const scores: Record<string, number> = {
    heritage_luxury: 100,
    quiet_luxury: 80,
    elevated_streetwear: 60,
    supporting: 20,
  };
  return scores[tribe] ?? 0;
}

/* ── Editorial naming pools (DripFit voice) ───────────────────── */

const EDITORIAL_NAME_POOLS: Record<string, string[]> = {
  night_out_heritage_luxury: [
    'Midnight on Madison', 'After Dark Allure',
    'Gallery Row', 'The Archive Drop',
    'Atelier After Hours',
  ],
  night_out_elevated_streetwear: [
    'Warehouse Pulse', 'Block Party Grail',
    'Downtown Heat', 'Afterglow Stack',
  ],
  lunch_date_quiet_luxury: [
    'Elevated Brunch', 'Midday Edit',
    'Cafe Society', 'The Loire Lunch',
  ],
  lunch_date_heritage_luxury: [
    'Polished Casual', 'Left Bank Morning',
    "The Curator's Hour",
  ],
  office_quiet_luxury: [
    'Boardroom Edge', 'Quiet Authority',
    'Office Flex', 'The Tailored Tuesday',
  ],
  office_heritage_luxury: [
    'Power Feminine', 'Monograms & Meetings',
    'Executive Suite',
  ],
  weekend_casual_elevated_streetwear: [
    'Gym to Street', 'Iron & Ink',
    'Weekend Uniform', 'Off-Duty Drop',
  ],
  weekend_casual_quiet_luxury: [
    'Chill Capsule', 'Sunday Edit',
    'The Slow Saturday',
  ],
  beach_day_quiet_luxury: [
    'Coastal Linen', 'Golden Hour Brunch',
    'The Riviera Edit',
  ],
  beach_day_elevated_streetwear: [
    'Boardwalk Drop', 'Sandy Concrete',
  ],
  festival_elevated_streetwear: [
    'Festival Ready', 'Desert Daze',
    'The Main Stage Fit',
  ],
  festival_heritage_luxury: [
    'Late Bloom Festival', 'Grails on Grass',
  ],
  gym_elevated_streetwear: [
    'Track Mode', 'Street Athletics', 'The Grind Edit',
  ],
  gym_supporting: [
    'Rep & Reset', 'Iron Hours',
  ],
  brunch_quiet_luxury: [
    'Garden Party', 'Morning Glory', 'Light & Easy',
  ],
  brunch_heritage_luxury: [
    'Golden Morning', 'The Terrace Edit',
  ],
};

function generateEditorialName(
  occasionKey: string,
  tribe: string,
  usedNames: Set<string>
): string {
  const key = `${occasionKey}_${tribe}`;
  const pool =
    EDITORIAL_NAME_POOLS[key] ??
    EDITORIAL_NAME_POOLS[`${occasionKey}_quiet_luxury`] ??
    [occasionKey.replace(/_/g, ' ')];

  const available = pool.filter(n => !usedNames.has(n));
  if (available.length === 0) {
    const base = pool[0];
    let i = 2;
    while (usedNames.has(`${base} ${i}`)) i++;
    const name = `${base} ${i}`;
    usedNames.add(name);
    return name;
  }

  const pick = available[Math.floor(Math.random() * available.length)];
  usedNames.add(pick);
  return pick;
}

function generateDescription(
  tribe: string,
  items: Array<{ product: CatalogProduct; role: string; position: number }>
): string {
  const brands = items
    .map(it => it.product.brand)
    .filter(Boolean)
    .filter((b, i, arr) => arr.indexOf(b) === i);

  if (brands.length === 0) return '';

  const brandList = brands.slice(0, 3).join(' · ');

  const templates: Record<string, string[]> = {
    heritage_luxury: [
      `${brandList}. Archive energy. Verified drape.`,
      `${brandList}. Houses. Cut right.`,
      `${brandList}. The grail stack.`,
    ],
    quiet_luxury: [
      `${brandList}. Quiet. Precise. Locked.`,
      `${brandList}. The silhouette is the statement.`,
      `${brandList}. Restraint. Mapped to you.`,
    ],
    elevated_streetwear: [
      `${brandList}. Heat. Layered right.`,
      `${brandList}. The uniform, elevated.`,
      `${brandList}. Grails. Dropped clean.`,
    ],
    supporting: [
      `${brandList}. Clean fit. Zero guessing.`,
    ],
  };

  const pool = templates[tribe] ?? templates.supporting;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── Occasion definitions with slot-based layering ─────────────── */

interface SlotDef {
  role: string;
  required: boolean;
  categories: string[];
}

interface OccasionDef {
  key: string;
  label: string;
  emoji: string;
  slots: SlotDef[];
  season?: string;
}

const OCCASIONS: OccasionDef[] = [
  {
    key: "night_out",
    label: "Night Out",
    emoji: "🌃",
    slots: [
      { role: "outerwear", required: false, categories: ["jackets", "blazers", "coats", "outerwear"] },
      { role: "top", required: true, categories: ["t-shirts", "shirts", "tops", "blouses", "sweaters", "tank tops"] },
      { role: "bottom", required: true, categories: ["pants", "jeans", "trousers", "skirts", "shorts"] },
      { role: "shoes", required: true, categories: ["shoes", "sneakers", "boots", "heels", "sandals", "footwear"] },
      { role: "accessory", required: false, categories: ["accessories", "bags", "jewelry", "hats"] },
    ],
  },
  {
    key: "beach_day",
    label: "Beach Day",
    emoji: "🏖️",
    season: "summer",
    slots: [
      { role: "top", required: true, categories: ["t-shirts", "shirts", "tops", "tank tops"] },
      { role: "bottom", required: true, categories: ["shorts", "skirts", "pants"] },
      { role: "shoes", required: true, categories: ["shoes", "sandals", "footwear", "sneakers"] },
      { role: "accessory", required: false, categories: ["accessories", "bags", "hats"] },
    ],
  },
  {
    key: "lunch_date",
    label: "Lunch Date",
    emoji: "☕",
    slots: [
      { role: "outerwear", required: false, categories: ["blazers", "jackets", "coats", "outerwear", "cardigans"] },
      { role: "top", required: true, categories: ["shirts", "tops", "blouses", "t-shirts", "sweaters", "knits"] },
      { role: "bottom", required: true, categories: ["pants", "trousers", "jeans", "skirts"] },
      { role: "shoes", required: true, categories: ["shoes", "sneakers", "boots", "loafers", "footwear"] },
    ],
  },
  {
    key: "weekend_casual",
    label: "Chill Day",
    emoji: "😎",
    slots: [
      { role: "outerwear", required: false, categories: ["hoodies", "jackets", "outerwear", "cardigans"] },
      { role: "top", required: true, categories: ["t-shirts", "tops", "sweaters", "hoodies", "tank tops"] },
      { role: "bottom", required: true, categories: ["pants", "jeans", "shorts", "joggers", "sweatpants"] },
      { role: "shoes", required: true, categories: ["sneakers", "shoes", "footwear"] },
    ],
  },
  {
    key: "office",
    label: "Office Flex",
    emoji: "💼",
    slots: [
      { role: "outerwear", required: true, categories: ["blazers", "jackets", "coats", "outerwear"] },
      { role: "top", required: true, categories: ["shirts", "blouses", "tops", "knits"] },
      { role: "bottom", required: true, categories: ["trousers", "pants", "skirts"] },
      { role: "shoes", required: true, categories: ["shoes", "boots", "loafers", "heels", "footwear"] },
    ],
  },
  {
    key: "festival",
    label: "Festival Ready",
    emoji: "🎶",
    season: "summer",
    slots: [
      { role: "top", required: true, categories: ["t-shirts", "tops", "tank tops", "shirts"] },
      { role: "bottom", required: true, categories: ["shorts", "pants", "jeans", "skirts"] },
      { role: "shoes", required: true, categories: ["sneakers", "boots", "shoes", "footwear"] },
      { role: "accessory", required: false, categories: ["accessories", "bags", "hats"] },
    ],
  },
  {
    key: "brunch",
    label: "Brunch Vibes",
    emoji: "🥂",
    slots: [
      { role: "outerwear", required: false, categories: ["cardigans", "jackets", "blazers", "outerwear"] },
      { role: "top", required: true, categories: ["tops", "blouses", "shirts", "t-shirts", "knits"] },
      { role: "bottom", required: true, categories: ["pants", "jeans", "skirts", "shorts"] },
      { role: "shoes", required: true, categories: ["sneakers", "shoes", "sandals", "footwear"] },
    ],
  },
  {
    key: "gym",
    label: "Gym to Street",
    emoji: "💪",
    slots: [
      { role: "top", required: true, categories: ["t-shirts", "tops", "tank tops", "hoodies"] },
      { role: "bottom", required: true, categories: ["shorts", "joggers", "pants", "leggings", "sweatpants"] },
      { role: "shoes", required: true, categories: ["sneakers", "shoes", "footwear"] },
    ],
  },
];

/* ── Helpers ──────────────────────────────────────────────────── */

function getCurrentWeekId(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Normalize category for slot matching ─────────────────────── */

function normalizeCategory(cat: string): string {
  const c = cat.toLowerCase().trim();
  if (c.includes("t-shirt") || c.includes("tee")) return "t-shirts";
  if (c.includes("shirt") && !c.includes("t-shirt")) return "shirts";
  if (c.includes("blouse")) return "blouses";
  if (c.includes("tank")) return "tank tops";
  if (c.includes("sweater") || c.includes("knit") || c.includes("pullover")) return "sweaters";
  if (c.includes("hoodie") || c.includes("sweatshirt")) return "hoodies";
  if (c.includes("top")) return "tops";
  if (c.includes("jean") || c.includes("denim")) return "jeans";
  if (c.includes("trouser") || c.includes("chino")) return "trousers";
  if (c.includes("pant")) return "pants";
  if (c.includes("short")) return "shorts";
  if (c.includes("skirt")) return "skirts";
  if (c.includes("jogger") || c.includes("sweatpant") || c.includes("track")) return "joggers";
  if (c.includes("legging")) return "leggings";
  if (c.includes("blazer")) return "blazers";
  if (c.includes("jacket") || c.includes("bomber") || c.includes("parka") || c.includes("windbreaker")) return "jackets";
  if (c.includes("coat")) return "coats";
  if (c.includes("cardigan")) return "cardigans";
  if (c.includes("outerwear")) return "outerwear";
  if (c.includes("dress")) return "dresses";
  if (c.includes("sneaker") || c.includes("trainer")) return "sneakers";
  if (c.includes("boot")) return "boots";
  if (c.includes("heel") || c.includes("pump")) return "heels";
  if (c.includes("sandal")) return "sandals";
  if (c.includes("loafer") || c.includes("moccasin")) return "loafers";
  if (c.includes("shoe") || c.includes("footwear")) return "shoes";
  if (c.includes("bag") || c.includes("tote") || c.includes("purse")) return "bags";
  if (c.includes("hat") || c.includes("cap") || c.includes("beanie")) return "hats";
  if (c.includes("accessor") || c.includes("jewel") || c.includes("watch") || c.includes("belt") || c.includes("scarf")) return "accessories";
  return c;
}

/* ── Product type ─────────────────────────────────────────────── */

interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  image_url: string;
  product_url: string | null;
  price_cents: number | null;
  currency: string | null;
  gender: string | null;
  image_confidence: number | null;
  style_genre: string | null;
  tags: string[] | null;
  fabric_composition: string[] | null;
  presentation: string | null;
}

/* ── Cohesion: STYLE families ─────────────────────────────────── */

const STYLE_FAMILIES: Record<string, string[]> = {
  minimalist: ['minimalist', 'clean', 'understated', 'modern', 'contemporary', 'refined', 'polished'],
  streetwear: ['streetwear', 'urban', 'skate', 'hype', 'hypebeast', 'graphic', 'logo-heavy'],
  technical: ['technical', 'techwear', 'performance', 'athletic', 'sport', 'activewear', 'functional'],
  heritage: ['heritage', 'classic', 'traditional', 'preppy', 'tailored', 'formal', 'workwear', 'americana'],
  bohemian: ['bohemian', 'boho', 'relaxed', 'flowy', 'festival', 'romantic', 'vintage'],
  edgy: ['edgy', 'punk', 'rock', 'grunge', 'goth', 'rebellious', 'avant-garde'],
};

function getStyleFamily(genre: string | null): string | null {
  if (!genre) return null;
  const g = genre.toLowerCase();
  for (const [family, keywords] of Object.entries(STYLE_FAMILIES)) {
    if (keywords.some(k => g.includes(k))) return family;
  }
  return null;
}

const COMPATIBLE_FAMILIES: Record<string, string[]> = {
  minimalist: ['minimalist', 'heritage', 'technical'],
  streetwear: ['streetwear', 'technical', 'edgy'],
  technical: ['technical', 'streetwear', 'minimalist'],
  heritage: ['heritage', 'minimalist', 'bohemian'],
  bohemian: ['bohemian', 'heritage', 'minimalist'],
  edgy: ['edgy', 'streetwear', 'minimalist'],
};

function stylesCompatible(a: string | null, b: string | null): boolean {
  const fa = getStyleFamily(a);
  const fb = getStyleFamily(b);
  if (!fa || !fb) return true;
  if (fa === fb) return true;
  return COMPATIBLE_FAMILIES[fa]?.includes(fb) ?? false;
}

/* ── Cohesion: COLOR ──────────────────────────────────────────── */

const COLOR_KEYWORDS = [
  'black', 'white', 'cream', 'ivory', 'beige', 'tan',
  'camel', 'brown', 'chocolate', 'khaki', 'olive',
  'forest', 'navy', 'blue', 'denim', 'indigo',
  'grey', 'gray', 'charcoal', 'silver',
  'burgundy', 'wine', 'maroon', 'red', 'rust',
  'orange', 'yellow', 'mustard', 'gold',
  'green', 'sage', 'emerald', 'teal',
  'purple', 'lavender', 'pink', 'rose',
  'cobalt', 'multi', 'pattern', 'print',
];

const NEUTRALS = new Set([
  'black', 'white', 'cream', 'ivory', 'beige', 'tan',
  'camel', 'brown', 'khaki', 'navy', 'denim', 'grey',
  'gray', 'charcoal', 'silver',
]);

function extractColors(tags: string[] | null): Set<string> {
  if (!tags) return new Set();
  const colors = new Set<string>();
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const keyword of COLOR_KEYWORDS) {
      if (lower.includes(keyword)) colors.add(keyword);
    }
  }
  return colors;
}

function colorsCohesive(outfitColors: Set<string>, newColors: Set<string>): boolean {
  if (newColors.size === 0) return true;
  const combined = new Set([...outfitColors, ...newColors]);
  const accents = [...combined].filter(c => !NEUTRALS.has(c));
  if (accents.length > 2) return false;

  const clashes: Array<[string, string]> = [
    ['red', 'pink'], ['orange', 'pink'],
    ['purple', 'orange'], ['yellow', 'pink'],
    ['red', 'green'], ['blue', 'brown'],
  ];
  for (const [a, b] of clashes) {
    if (combined.has(a) && combined.has(b)) return false;
  }
  return true;
}

/* ── Cohesion: PATTERN ────────────────────────────────────────── */

const PATTERN_KEYWORDS = [
  'striped', 'stripes', 'plaid', 'checked', 'check',
  'floral', 'print', 'printed', 'graphic', 'logo',
  'camo', 'camouflage', 'argyle', 'houndstooth',
  'paisley', 'polka', 'abstract', 'tie-dye',
  'geometric', 'patterned',
];

function hasPattern(tags: string[] | null, name: string, presentation: string | null): boolean {
  const haystack = [...(tags ?? []), name, presentation ?? ''].join(' ').toLowerCase();
  return PATTERN_KEYWORDS.some(p => haystack.includes(p));
}

/* ── Cohesion: FABRIC weight ──────────────────────────────────── */

const FABRIC_WEIGHTS: Record<string, string> = {
  cotton: 'light', linen: 'light', silk: 'light',
  chiffon: 'light', rayon: 'light', viscose: 'light',
  modal: 'light', tencel: 'light',
  polyester: 'mid', nylon: 'mid', denim: 'mid',
  twill: 'mid', jersey: 'mid', ponte: 'mid',
  wool: 'heavy', cashmere: 'heavy', mohair: 'heavy',
  leather: 'heavy', suede: 'heavy', fleece: 'heavy',
  shearling: 'heavy', tweed: 'heavy', corduroy: 'heavy',
};

function getFabricWeight(composition: string[] | null): string | null {
  if (!composition || composition.length === 0) return null;
  const text = composition.join(' ').toLowerCase();
  for (const [fabric, weight] of Object.entries(FABRIC_WEIGHTS)) {
    if (text.includes(fabric)) return weight;
  }
  return null;
}

function fabricsCohesive(outfitWeights: Set<string>, newWeight: string | null): boolean {
  if (!newWeight) return true;
  const combined = new Set([...outfitWeights, newWeight]);
  if (combined.has('light') && combined.has('heavy')) return false;
  return true;
}

/* ── Build one outfit with tribe + cohesion logic ─────────────── */

function buildOutfit(
  occasion: OccasionDef,
  products: CatalogProduct[],
  usedProductIds: Set<string>
): { items: Array<{ product: CatalogProduct; role: string; position: number }>; tribe: string } | null {
  // Pick a primary tribe for this outfit
  const occasionTribes = OCCASION_TRIBE_MAP[occasion.key] ?? ['quiet_luxury', 'heritage_luxury'];
  const primaryTribe = occasionTribes[Math.floor(Math.random() * occasionTribes.length)];
  const secondaryTribe = occasionTribes.find(t => t !== primaryTribe) ?? occasionTribes[0];

  const items: Array<{ product: CatalogProduct; role: string; position: number }> = [];
  let position = 0;

  // Cohesion state — updated as each slot is filled
  const outfitColors = new Set<string>();
  const outfitFabricWeights = new Set<string>();
  let outfitStyleFamily: string | null = null;
  let hasPatternPiece = false;

  for (const slot of occasion.slots) {
    const candidates = products.filter(p => {
      if (usedProductIds.has(p.id)) return false;
      const normCat = normalizeCategory(p.category);
      return slot.categories.includes(normCat);
    });

    if (candidates.length === 0) {
      if (slot.required) return null;
      continue;
    }

    // Apply cohesion filters
    const cohesiveCandidates = candidates.filter(p => {
      // STYLE
      if (outfitStyleFamily) {
        const candidateFamily = getStyleFamily(p.style_genre);
        if (candidateFamily && !stylesCompatible(outfitStyleFamily, p.style_genre)) {
          return false;
        }
      }
      // COLOR
      const candidateColors = extractColors(p.tags);
      if (!colorsCohesive(outfitColors, candidateColors)) return false;
      // PATTERN — max 1 patterned piece
      if (hasPatternPiece && hasPattern(p.tags, p.name, p.presentation)) return false;
      // FABRIC weight
      const candidateWeight = getFabricWeight(p.fabric_composition);
      if (!fabricsCohesive(outfitFabricWeights, candidateWeight)) return false;
      return true;
    });

    // Graceful degradation: if cohesion eliminates all, fall back
    const workingCandidates = cohesiveCandidates.length > 0 ? cohesiveCandidates : candidates;

    // Score: image confidence + tribe tier + primary-tribe bonus
    const scored = workingCandidates.map(p => {
      const t = getBrandTribe(p.brand);
      const tribeBonus =
        t === primaryTribe ? 50 :
        t === secondaryTribe ? 20 :
        t === 'supporting' ? 0 : 10;
      return {
        product: p,
        tribe: t,
        score: (p.image_confidence ?? 0) * 100 + tribeScore(t) + tribeBonus,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const topN = scored.slice(0, Math.min(5, scored.length));

    // Weighted random — top-of-list more likely
    const weights = topN.map((_, i) => topN.length - i);
    const totalW = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalW;
    let pickIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { pickIdx = i; break; }
    }
    const pick = topN[pickIdx].product;

    // Update cohesion state with the picked piece
    extractColors(pick.tags).forEach(c => outfitColors.add(c));
    const pickWeight = getFabricWeight(pick.fabric_composition);
    if (pickWeight) outfitFabricWeights.add(pickWeight);
    const pickFamily = getStyleFamily(pick.style_genre);
    if (pickFamily && !outfitStyleFamily) outfitStyleFamily = pickFamily;
    if (hasPattern(pick.tags, pick.name, pick.presentation)) hasPatternPiece = true;

    usedProductIds.add(pick.id);
    items.push({ product: pick, role: slot.role, position: position++ });
  }

  return items.length >= 3 ? { items, tribe: primaryTribe } : null;
}

/* ── Main handler ─────────────────────────────────────────────── */

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const weekId = body.week_id || getCurrentWeekId();
    const gender = body.gender as string | undefined;
    const outfitsPerOccasion = Math.min(body.outfits_per_occasion || 5, 10);
    const occasionCount = Math.min(body.occasion_count || 5, OCCASIONS.length);
    const clearExisting = body.clear_existing ?? true;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const log: string[] = [];
    log.push(`[Config] week=${weekId}, gender=${gender || "both"}, ${occasionCount} occasions × ${outfitsPerOccasion}/each`);
    log.push(`[BrandPool] ${APPROVED_BRANDS.size} approved brands across 4 tribes`);

    if (clearExisting) {
      const { data: existing } = await sb
        .from("weekly_outfits")
        .select("id")
        .eq("week_id", weekId);

      if (existing && existing.length > 0) {
        const ids = existing.map(o => o.id);
        await sb.from("weekly_outfit_items").delete().in("outfit_id", ids);
        await sb.from("weekly_outfits").delete().eq("week_id", weekId);
        log.push(`[Cleanup] Removed ${existing.length} existing outfits`);
      }
    }

    const genders = gender ? [gender] : ["mens", "womens"];

    const { data: fetchedProducts, error: fetchErr } = await sb
      .from("product_catalog")
      .select("id, name, brand, category, image_url, product_url, price_cents, currency, gender, image_confidence, style_genre, tags, fabric_composition, presentation")
      .eq("is_active", true)
      .in("gender", genders)
      .in("brand", Array.from(APPROVED_BRANDS))
      .not("image_url", "is", null)
      .gte("image_confidence", 0.1)
      .order("image_confidence", { ascending: false })
      .limit(2000);

    if (fetchErr) throw fetchErr;
    if (!fetchedProducts || fetchedProducts.length === 0) {
      return successResponse({ created: 0, log: ["No approved-brand products available"] }, 200, cors);
    }

    // Defensive in-memory filter (case-sensitive brand match)
    const allProducts = fetchedProducts.filter(p => APPROVED_BRANDS.has(p.brand));

    log.push(`[Catalog] ${allProducts.length} approved-brand products loaded`);

    const maleProducts = allProducts.filter(p => p.gender === "mens");
    const femaleProducts = allProducts.filter(p => p.gender === "womens");
    log.push(`[Pools] mens=${maleProducts.length}, womens=${femaleProducts.length}`);

    const selectedOccasions = shuffle(OCCASIONS).slice(0, occasionCount);
    const usedIds = new Set<string>();
    const usedNames = new Set<string>();
    let totalCreated = 0;
    let sortOrder = 0;

    for (const occ of selectedOccasions) {
      const genderTargets = gender ? [gender] : ["mens", "womens"];

      for (const g of genderTargets) {
        const pool = shuffle(g === "mens" ? maleProducts : femaleProducts);

        for (let i = 0; i < outfitsPerOccasion; i++) {
          const result = buildOutfit(occ, pool, usedIds);
          if (!result) {
            log.push(`[Skip] ${occ.label} ${g} #${i + 1}: not enough products`);
            continue;
          }

          const title = generateEditorialName(occ.key, result.tribe, usedNames);
          const description = generateDescription(result.tribe, result.items);

          const { data: outfit, error: oErr } = await sb
            .from("weekly_outfits")
            .insert({
              week_id: weekId,
              occasion: occ.key,
              occasion_label: occ.label,
              occasion_emoji: occ.emoji,
              title,
              description,
              gender: g,
              season: occ.season || null,
              sort_order: sortOrder++,
              is_active: true,
              is_hero: false,
            })
            .select("id")
            .single();

          if (oErr || !outfit) {
            log.push(`[Error] Insert outfit: ${oErr?.message}`);
            continue;
          }

          const itemRows = result.items.map(it => ({
            outfit_id: outfit.id,
            product_id: it.product.id,
            product_name: it.product.name,
            brand: it.product.brand,
            category: it.product.category,
            price_cents: it.product.price_cents,
            currency: it.product.currency || "USD",
            image_url: it.product.image_url,
            product_url: it.product.product_url,
            position: it.position,
          }));

          await sb.from("weekly_outfit_items").insert(itemRows);
          totalCreated++;
        }
      }
    }

    log.push(`[Done] Created ${totalCreated} outfits for week ${weekId}`);

    // ── Auto-trigger hero image generation in the background ────────
    // Fire-and-forget call to generate-outfit-hero with week_id so every
    // freshly curated outfit gets an editorial hero image without a
    // separate manual step. Skipped via skip_hero=true.
    const skipHero = body.skip_hero ?? false;
    if (totalCreated > 0 && !skipHero) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const triggerHeroes = async () => {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/generate-outfit-hero`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              week_id: weekId,
              regenerate: false, // don't overwrite existing heroes
            }),
          });
          if (!res.ok) {
            console.error(`[curate→hero] trigger failed: ${res.status} ${await res.text()}`);
          } else {
            console.log(`[curate→hero] background generation kicked off for ${weekId}`);
          }
        } catch (err) {
          console.error(`[curate→hero] error:`, err);
        }
      };

      // @ts-ignore: EdgeRuntime.waitUntil is available in Supabase edge runtime
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(triggerHeroes());
      } else {
        triggerHeroes();
      }
      log.push(`[Hero] Background generation triggered for ${totalCreated} outfits`);
    }

    return successResponse({
      week_id: weekId,
      created: totalCreated,
      occasions: selectedOccasions.map(o => o.label),
      hero_generation: skipHero ? "skipped" : "triggered",
      log,
    }, 200, cors);
  } catch (err) {
    console.error("curate-weekly-outfits error:", err);
    return errorResponse(err.message || "Internal error", "CURATION_ERROR", 500, cors);
  }
});
