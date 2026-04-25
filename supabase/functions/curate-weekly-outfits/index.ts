import { getCorsHeaders, errorResponse, successResponse } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

/* ── Luxury Stylist — House Cohort System ─────────────────────── */
// Editorial cohorts. Brands MAY belong to multiple cohorts; an outfit's
// allied set is checked against ALL cohorts a brand qualifies for, not a
// single canonical one. Prevents demoting Saint Laurent / Celine / Dior
// to one fixed lane.

const COHORTS = {
  // A: MAXIMALIST LUXURY — bold prints, gold, 70s silhouettes
  maximalist_luxury: [
    'Gucci', 'Versace', 'Saint Laurent', 'AMIRI',
    'Dolce & Gabbana', 'Valentino',
  ],
  // B: ROCKSTAR LUXURY — skinny tailoring, leather, midnight palette
  rockstar_luxury: [
    'Saint Laurent', 'Celine', 'AMIRI', 'Dior',
  ],
  // C: MINIMALIST LUXURY — anti-logo, sculptural, intellectual
  minimalist_luxury: [
    'Prada', 'Bottega Veneta', 'Celine', 'Loewe',
    'Acne Studios', 'Jil Sander', 'Lemaire', 'The Row',
    'Jacquemus',
  ],
  // D: LUXURY STREETWEAR BRIDGE — universal crossover
  luxury_streetwear: [
    'Louis Vuitton', 'Dior', 'Off-White', 'Fear of God',
    'Essentials', 'Kith', 'AMI Paris', 'Sacai',
    'GALLERY DEPARTMENT LLC',
  ],
  // E: PURE STREETWEAR — skate heritage, logos, relaxed
  pure_streetwear: [
    'Supreme', 'Stüssy', 'Palace Skateboards', 'Palace', 'Kith',
    'Carhartt', 'Eric Emanuel', 'Daily Paper',
  ],
  // F: TECHWEAR — technical fabrics, utility, hardware
  techwear: [
    'Stone Island', "Arc'teryx", 'Salomon', 'Carhartt',
  ],
  // G: AVANT-GARDE — deconstruction, elongated silhouettes
  avant_garde: [
    'Balenciaga', 'Rick Owens', 'Maison Margiela',
    'Acne Studios', 'Moncler',
  ],
  // H: BOURGEOIS / QUIET WEALTH — old money restraint
  bourgeois: [
    'The Row', 'Burberry', 'Fendi', 'Givenchy',
    'Alexander McQueen',
  ],
  // I: FOOTWEAR/ACCESSORY SPECIALIST (treat as supporting)
  footwear_specialist: [
    'Nike', 'Adidas', 'Puma', 'Vans', 'Converse',
    'New Balance', 'Dr. Martens',
  ],
  // J: SUPPORTING BASICS — tees, denim, fillers ONLY
  supporting: [
    'Reiss', 'Theory', 'Todd Snyder', 'COS', 'Everlane',
    "Rothy's", 'Outerknown', 'Marine Layer', 'Taylor Stitch',
    'Reformation', 'Faherty', 'Buck Mason', "Levi's",
    'Uniqlo', 'Gap', 'AllSaints',
  ],
} as const;

type CohortKey = keyof typeof COHORTS;

const ALL_COHORT_KEYS = Object.keys(COHORTS) as CohortKey[];

const APPROVED_BRANDS = new Set<string>(
  Object.values(COHORTS).flat() as string[]
);

// Allied cohorts per primary. Tightened: luxury_streetwear no longer
// allies with both maximalist + minimalist + techwear (was too permissive
// — basically "anything goes"). Now picks luxury crossovers only.
const COHORT_ALLIANCES: Record<CohortKey, CohortKey[]> = {
  maximalist_luxury:   ['maximalist_luxury', 'rockstar_luxury', 'luxury_streetwear', 'supporting'],
  rockstar_luxury:     ['rockstar_luxury', 'maximalist_luxury', 'avant_garde', 'luxury_streetwear', 'supporting'],
  minimalist_luxury:   ['minimalist_luxury', 'bourgeois', 'luxury_streetwear', 'supporting'],
  luxury_streetwear:   ['luxury_streetwear', 'pure_streetwear', 'rockstar_luxury', 'footwear_specialist', 'supporting'],
  pure_streetwear:     ['pure_streetwear', 'luxury_streetwear', 'techwear', 'footwear_specialist', 'supporting'],
  techwear:            ['techwear', 'pure_streetwear', 'footwear_specialist', 'supporting'],
  avant_garde:         ['avant_garde', 'rockstar_luxury', 'minimalist_luxury', 'supporting'],
  bourgeois:           ['bourgeois', 'minimalist_luxury', 'supporting'],
  footwear_specialist: ['footwear_specialist', 'pure_streetwear', 'luxury_streetwear', 'techwear'],
  supporting:          ['supporting'],
};

// All cohorts a brand belongs to (a brand can be in several).
function getBrandCohorts(brand: string): CohortKey[] {
  if (!brand) return ['supporting'];
  const out: CohortKey[] = [];
  for (const c of ALL_COHORT_KEYS) {
    if ((COHORTS[c] as readonly string[]).includes(brand)) out.push(c);
  }
  return out.length > 0 ? out : ['supporting'];
}

// Best-fit cohort for a brand WITHIN a given allied set. Picks the highest-
// scoring cohort the brand belongs to that is allowed under primary.
function getBrandCohortInAlliance(brand: string, alliedSet: CohortKey[]): CohortKey | null {
  const cohorts = getBrandCohorts(brand).filter(c => alliedSet.includes(c));
  if (cohorts.length === 0) return null;
  return cohorts.sort((a, b) => cohortScore(b) - cohortScore(a))[0];
}

// Editorial weight. Higher = more likely to be hero piece.
function cohortScore(cohort: CohortKey): number {
  const scores: Record<CohortKey, number> = {
    maximalist_luxury: 100,
    avant_garde: 95,
    rockstar_luxury: 90,
    minimalist_luxury: 85,
    luxury_streetwear: 75,
    bourgeois: 70,
    pure_streetwear: 55,
    techwear: 50,
    footwear_specialist: 30,
    supporting: 15,
  };
  return scores[cohort];
}

function brandCompatible(brand: string, alliedSet: CohortKey[]): boolean {
  return getBrandCohortInAlliance(brand, alliedSet) !== null;
}

/* ── Occasion aesthetic leads ─────────────────────────────────── */
// Which cohort leads each occasion. Outfits' primary cohort is sampled
// from this list; allied cohorts (per COHORT_ALLIANCES) fill the rest.
const OCCASION_AESTHETIC_LEADS: Record<string, CohortKey[]> = {
  night_out:           ['rockstar_luxury', 'maximalist_luxury', 'avant_garde'],
  summer_night_out:    ['maximalist_luxury', 'rockstar_luxury', 'minimalist_luxury'],
  lunch_date:          ['minimalist_luxury', 'bourgeois', 'rockstar_luxury'],
  brunch:              ['minimalist_luxury', 'bourgeois', 'luxury_streetwear'],
  office:              ['minimalist_luxury', 'bourgeois', 'rockstar_luxury'],
  weekend_casual:      ['luxury_streetwear', 'pure_streetwear', 'techwear'],
  beach_day:           ['minimalist_luxury', 'luxury_streetwear'],
  patio_evening:       ['minimalist_luxury', 'rockstar_luxury', 'bourgeois'],
  festival:            ['rockstar_luxury', 'luxury_streetwear', 'maximalist_luxury'],
  gym:                 ['techwear', 'luxury_streetwear', 'pure_streetwear'],
  spring_garden:       ['minimalist_luxury', 'bourgeois'],
  autumn_layers:       ['minimalist_luxury', 'bourgeois', 'luxury_streetwear'],
  winter_polish:       ['bourgeois', 'minimalist_luxury', 'rockstar_luxury'],
  date_night:          ['rockstar_luxury', 'minimalist_luxury', 'avant_garde'],
  gallery_opening:     ['avant_garde', 'minimalist_luxury', 'rockstar_luxury'],
  travel_lounge:       ['bourgeois', 'minimalist_luxury', 'luxury_streetwear'],
  beach_tropical:      ['minimalist_luxury', 'bourgeois', 'luxury_streetwear'],
  wilderness_hiking:   ['techwear', 'minimalist_luxury', 'luxury_streetwear'],
  mountain_lakes:      ['bourgeois', 'minimalist_luxury', 'techwear'],
};

/* ── Editorial naming pools (DripFit voice) ───────────────────── */

const EDITORIAL_NAME_POOLS: Record<string, string[]> = {
  // night_out
  night_out_rockstar_luxury: [
    'Midnight on Madison', 'After Dark Allure',
    'The Archive Drop', 'Atelier After Hours',
    'Post-Runway Dinner',
  ],
  night_out_maximalist_luxury: [
    'Gallery Row', 'Velvet Rope Protocol',
    'The VIP Floor', 'Baroque After Dark',
  ],
  night_out_avant_garde: [
    'Anti-Fashion Hours', 'Deconstructed Dinner',
    'Downtown Uniform', 'The Concrete Floor',
  ],
  // summer_night_out
  summer_night_out_maximalist_luxury: [
    'Heatwave After Dark', 'Rooftop Drop', 'Neon Boulevard',
  ],
  summer_night_out_rockstar_luxury: [
    'Sultry Soiree', 'The Late Summer Edit',
  ],
  summer_night_out_minimalist_luxury: [
    'Linen After Dark', 'White Noise Hour',
  ],
  // lunch_date
  lunch_date_minimalist_luxury: [
    'Quiet Authority', 'The Loire Lunch',
    'Cashmere Midday', 'Cafe Society',
  ],
  lunch_date_bourgeois: [
    'Old Money Hour', 'The Long Lunch',
    'Polished Casual', 'Private Club Midday',
  ],
  lunch_date_rockstar_luxury: [
    'Left Bank Morning', "The Curator's Hour",
  ],
  // brunch
  brunch_minimalist_luxury: [
    'Garden Party', 'Morning Glory', 'Light & Easy',
  ],
  brunch_bourgeois: [
    'Golden Morning', 'The Terrace Edit',
  ],
  brunch_luxury_streetwear: [
    'Off-Duty Brunch', 'The Sunday Drop',
  ],
  // office
  office_minimalist_luxury: [
    'Boardroom Edge', 'Quiet Authority',
    'The Tailored Tuesday', 'Monday in Monochrome',
  ],
  office_bourgeois: [
    'Executive Suite', 'Power Feminine',
    'The Corner Office', 'Monograms & Meetings',
  ],
  office_rockstar_luxury: [
    'Slimane at the Desk', 'Sharp Suit Hour',
  ],
  // weekend_casual
  weekend_casual_luxury_streetwear: [
    'Off-Duty Drop', 'The Pharrell Uniform',
    'Weekend Monogram', 'Sunday Streetwear',
  ],
  weekend_casual_pure_streetwear: [
    'Gym to Street', 'Block Party Sunday',
    'The Kith Lineup', 'Skate Park Polish',
  ],
  weekend_casual_techwear: [
    'Trail to Town', 'Tech Sunday',
  ],
  // beach_day
  beach_day_minimalist_luxury: [
    'Coastal Linen', 'The Riviera Edit',
    'Mediterranean Minimal', 'Saint-Tropez Morning',
  ],
  beach_day_luxury_streetwear: [
    'Boardwalk Drop', 'Sandy Concrete',
  ],
  // patio_evening
  patio_evening_minimalist_luxury: [
    'Patio Hours', 'Twilight Linen', 'The Veranda Edit',
  ],
  patio_evening_rockstar_luxury: [
    'Sunset Terrace', 'Aperitivo Hour',
  ],
  patio_evening_bourgeois: [
    'Members Only Patio', 'Old Money Sundown',
  ],
  // festival
  festival_rockstar_luxury: [
    'AMIRI After Dark', 'The Desert Set',
    'Late Bloom Festival', 'Main Stage Leather',
  ],
  festival_luxury_streetwear: [
    'Cactus Jack Compound', 'Festival Monogram',
    'The VIP Pit', 'Paris Fashion Week Street',
  ],
  festival_maximalist_luxury: [
    'Grails on Grass', 'Baroque on the Field',
  ],
  // gym
  gym_techwear: [
    'Track Mode', 'Iron Hours', 'The Grind Edit',
  ],
  gym_luxury_streetwear: [
    'Lux Cardio', 'Studio Drop',
  ],
  gym_pure_streetwear: [
    'Rep & Reset', 'Street Athletics',
  ],
  // date_night
  date_night_rockstar_luxury: [
    'Candlelit Leather', 'Reservation at 9', 'After-Hours Romance',
    'The Velvet Banquette', 'Dim Bar, Sharp Cut',
  ],
  date_night_minimalist_luxury: [
    'Quiet Corner Booth', 'Black Dress Hours', 'The Slow Dinner',
    'Wine Bar Minimal', 'A Night, Tailored',
  ],
  date_night_avant_garde: [
    'Architectural Romance', 'Sculpted for Dinner',
  ],
  // gallery_opening
  gallery_opening_avant_garde: [
    'White Wall Hour', 'The Margiela Opening', 'Concrete & Canvas',
    'Curator\'s Pick', 'Soho Private View',
  ],
  gallery_opening_minimalist_luxury: [
    'Black Coat, White Wall', 'The Quiet Critic', 'Opening Night Minimal',
  ],
  gallery_opening_rockstar_luxury: [
    'Downtown Opening', 'Leather at the Vernissage',
  ],
  // travel_lounge
  travel_lounge_bourgeois: [
    'First-Class Hour', 'The Concorde Edit', 'Hotel Arrival',
    'Heritage Trunk', 'Members Lounge',
  ],
  travel_lounge_minimalist_luxury: [
    'Travel Uniform', 'Cashmere on the Tarmac', 'The Quiet Itinerary',
    'Terminal 4 Minimal',
  ],
  travel_lounge_luxury_streetwear: [
    'Jet-Set Drop', 'Airport Monogram', 'Long-Haul Lux',
  ],
  // spring_garden
  spring_garden_minimalist_luxury: [
    'Spring Bloom', 'The Garden Edit', 'Pastel Stroll',
  ],
  spring_garden_bourgeois: [
    'First Warmth', 'Botanical Hour',
  ],
  // autumn_layers
  autumn_layers_minimalist_luxury: [
    'October Uniform', 'Bottega Autumn',
    'The Loewe Layer', 'Cashmere Weekend',
  ],
  autumn_layers_bourgeois: [
    'Heritage Autumn', 'The Topcoat Drop',
  ],
  autumn_layers_luxury_streetwear: [
    'Fall Drop Stack', 'Crispwear',
  ],
  // winter_polish
  winter_polish_bourgeois: [
    'The Winter Edit', 'Sofia Richie Winter',
    'Old Money Cold', 'Private Club December',
  ],
  winter_polish_minimalist_luxury: [
    'Quiet Winter', 'Snow Day Tailoring',
  ],
  winter_polish_rockstar_luxury: [
    'Cold Front Couture', 'Black Coat Hours',
  ],
  // beach_tropical
  beach_tropical_minimalist_luxury: [
    'Riviera Linen', 'The Marina Edit', 'Salt & Silk', 'Whitewash Hour',
  ],
  beach_tropical_bourgeois: [
    'Yacht Club Morning', 'Capri Hours', 'Old Money Shore',
  ],
  beach_tropical_luxury_streetwear: [
    'Boardwalk Monogram', 'Sunset Drop',
  ],
  // wilderness_hiking
  wilderness_hiking_techwear: [
    'Trail Protocol', 'The Veilance Edit', 'Ridgeline Tech', 'Backcountry Precision',
  ],
  wilderness_hiking_minimalist_luxury: [
    'Forest Minimal', 'The Pinewood Edit', 'Canopy Hours',
  ],
  wilderness_hiking_luxury_streetwear: [
    'ALD Outdoors', 'Trail Drop',
  ],
  // mountain_lakes
  mountain_lakes_bourgeois: [
    'The Alpine Edit', 'Loro Piana Morning', 'Lakeside Heritage', 'Glacier Hours',
  ],
  mountain_lakes_minimalist_luxury: [
    'Mirror Lake Minimal', 'Cashmere at Altitude', 'Still Water Hour',
  ],
  mountain_lakes_techwear: [
    'Summit Protocol', 'Alpine Precision',
  ],
};

function generateEditorialName(
  occasionKey: string,
  cohort: CohortKey,
  usedNames: Set<string>
): string | null {
  const key = `${occasionKey}_${cohort}`;
  // Fallback chain: exact (occasion, cohort) → first lead for occasion → generic
  const leads = OCCASION_AESTHETIC_LEADS[occasionKey] ?? [];
  const fallbackKey = leads.length > 0 ? `${occasionKey}_${leads[0]}` : '';
  const pool =
    EDITORIAL_NAME_POOLS[key] ??
    EDITORIAL_NAME_POOLS[fallbackKey] ??
    [occasionKey.replace(/_/g, ' ')];

  // Strict 1-per-title cap: skip outfit if no unique name remains in this
  // occasion's pool. Caller treats null as "skip outfit".
  const available = pool.filter(n => !usedNames.has(n));
  if (available.length === 0) return null;

  const pick = available[Math.floor(Math.random() * available.length)];
  usedNames.add(pick);
  return pick;
}

function generateDescription(
  cohort: CohortKey,
  items: Array<{ product: CatalogProduct; role: string; position: number }>
): string {
  const brands = Array.from(new Set(
    items.map(it => it.product.brand).filter(Boolean)
  )).slice(0, 3);
  if (brands.length === 0) return '';
  const brandList = brands.join(' · ');

  const templates: Record<CohortKey, string[]> = {
    maximalist_luxury: [
      `${brandList}. Archive maximalism. Verified drape.`,
      `${brandList}. Houses. Cut right.`,
      `${brandList}. Baroque refinement.`,
    ],
    rockstar_luxury: [
      `${brandList}. Leather and midnight.`,
      `${brandList}. The Slimane silhouette.`,
      `${brandList}. Rock-and-roll tailoring.`,
    ],
    minimalist_luxury: [
      `${brandList}. Quiet. Precise. Locked.`,
      `${brandList}. The silhouette is the statement.`,
      `${brandList}. Restraint. Mapped to you.`,
    ],
    luxury_streetwear: [
      `${brandList}. Pharrell-era luxury streetwear.`,
      `${brandList}. Monogram, modern.`,
      `${brandList}. The bridge between houses.`,
    ],
    pure_streetwear: [
      `${brandList}. Heat. Layered right.`,
      `${brandList}. Grails, dropped clean.`,
      `${brandList}. The uniform, elevated.`,
    ],
    techwear: [
      `${brandList}. Technical precision.`,
      `${brandList}. Industrial luxury.`,
      `${brandList}. Function, refined.`,
    ],
    avant_garde: [
      `${brandList}. Deconstructed authority.`,
      `${brandList}. Anti-fashion fashion.`,
      `${brandList}. The downtown uniform.`,
    ],
    bourgeois: [
      `${brandList}. Old money, new fit.`,
      `${brandList}. Quiet wealth, verified.`,
      `${brandList}. No logo required.`,
    ],
    footwear_specialist: [
      `${brandList}. Grounded right.`,
    ],
    supporting: [
      `${brandList}. Clean foundation.`,
    ],
  };

  const pool = templates[cohort] ?? templates.supporting;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── Occasion definitions with slot-based layering ─────────────── */

interface SlotDef {
  role: string;
  required: boolean;
  categories: string[];
  /** Optional gender-specific category override. If present and gender matches, replaces categories. */
  mensCategories?: string[];
  womensCategories?: string[];
  /** Optional preference keywords — boost candidates whose name/tags match. */
  keywordPrefer?: string[];
}

interface OccasionDef {
  key: string;
  label: string;
  emoji: string;
  slots: SlotDef[];
  season?: string;
}

/** Accessory categories — at least one accessory per look. */
const ACCESSORY_CATS_WOMENS = ["bags", "jewelry", "sunglasses", "watches", "accessories", "hats"];
const ACCESSORY_CATS_MENS   = ["watches", "sunglasses", "bags", "hats", "accessories", "jewelry"];

const OCCASIONS: OccasionDef[] = [
  /* ── EVERGREEN ──────────────────────────────────────────────── */
  {
    key: "night_out",
    label: "Night Out",
    emoji: "🌃",
    slots: [
      { role: "outerwear", required: false, categories: ["jackets", "blazers", "coats", "outerwear"] },
      { role: "top", required: true, categories: ["t-shirts", "shirts", "tops", "blouses", "sweaters", "tank tops"] },
      { role: "bottom", required: true, categories: ["pants", "jeans", "trousers", "skirts", "shorts"],
        mensCategories: ["pants", "jeans", "trousers"] },
      { role: "shoes", required: true, categories: ["shoes", "sneakers", "boots", "heels", "sandals", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
    ],
  },
  {
    key: "lunch_date",
    label: "Lunch Date",
    emoji: "☕",
    slots: [
      { role: "outerwear", required: false, categories: ["blazers", "jackets", "coats", "outerwear", "cardigans"] },
      { role: "top", required: true, categories: ["shirts", "tops", "blouses", "t-shirts", "sweaters", "knits"] },
      { role: "bottom", required: true, categories: ["pants", "trousers", "jeans", "skirts"],
        mensCategories: ["pants", "trousers", "jeans", "chinos"] },
      { role: "shoes", required: true, categories: ["shoes", "sneakers", "boots", "loafers", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
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
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
    ],
  },
  {
    key: "office",
    label: "Office Flex",
    emoji: "💼",
    slots: [
      { role: "outerwear", required: true, categories: ["blazers", "jackets", "coats", "outerwear"] },
      { role: "top", required: true, categories: ["shirts", "blouses", "tops", "knits"] },
      { role: "bottom", required: true, categories: ["trousers", "pants", "skirts"],
        mensCategories: ["trousers", "pants"] },
      { role: "shoes", required: true, categories: ["shoes", "boots", "loafers", "heels", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
    ],
  },
  {
    key: "brunch",
    label: "Brunch Vibes",
    emoji: "🥂",
    slots: [
      { role: "outerwear", required: false, categories: ["cardigans", "jackets", "blazers", "outerwear"] },
      { role: "top", required: true, categories: ["tops", "blouses", "shirts", "t-shirts", "knits"] },
      { role: "bottom", required: true, categories: ["pants", "jeans", "skirts", "shorts"],
        mensCategories: ["pants", "jeans", "shorts", "chinos"] },
      { role: "shoes", required: true, categories: ["sneakers", "shoes", "sandals", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
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
      { role: "accessory", required: false, categories: ["watches", "bags", "hats", "accessories"] },
    ],
  },
  {
    key: "date_night",
    label: "Date Night",
    emoji: "🕯️",
    slots: [
      { role: "outerwear", required: false, categories: ["blazers", "jackets", "coats", "outerwear"] },
      { role: "top", required: true,
        categories: ["shirts", "tops", "blouses", "t-shirts", "knits"],
        womensCategories: ["dresses", "tops", "blouses", "shirts"],
        mensCategories: ["shirts", "knits", "t-shirts"],
        keywordPrefer: ["silk", "satin", "leather", "slip", "mini", "tailored"] },
      { role: "bottom", required: false, categories: ["pants", "trousers", "skirts", "jeans"],
        mensCategories: ["trousers", "pants", "jeans"] },
      { role: "shoes", required: true, categories: ["heels", "loafers", "boots", "shoes", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
    ],
  },
  {
    key: "gallery_opening",
    label: "Gallery Opening",
    emoji: "🖼️",
    slots: [
      { role: "outerwear", required: false, categories: ["coats", "blazers", "jackets", "outerwear"] },
      { role: "top", required: true,
        categories: ["tops", "shirts", "blouses", "knits", "t-shirts"],
        keywordPrefer: ["black", "oversized", "architectural", "asymmetric", "minimal"] },
      { role: "bottom", required: true, categories: ["pants", "trousers", "skirts", "jeans"],
        mensCategories: ["trousers", "pants", "jeans"] },
      { role: "shoes", required: true, categories: ["boots", "loafers", "shoes", "sneakers", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
    ],
  },
  {
    key: "travel_lounge",
    label: "Travel & Airport",
    emoji: "✈️",
    slots: [
      { role: "outerwear", required: true, categories: ["coats", "jackets", "blazers", "cardigans", "outerwear"] },
      { role: "top", required: true,
        categories: ["knits", "sweaters", "t-shirts", "tops", "shirts"],
        keywordPrefer: ["cashmere", "merino", "knit", "ribbed"] },
      { role: "bottom", required: true, categories: ["pants", "trousers", "joggers"],
        mensCategories: ["trousers", "pants", "joggers"] },
      { role: "shoes", required: true, categories: ["loafers", "sneakers", "boots", "shoes", "footwear"] },
      { role: "accessory", required: false, categories: ["bags", "sunglasses", "watches", "accessories"] },
    ],
  },

  /* ── SPRING ─────────────────────────────────────────────────── */
  {
    key: "spring_garden",
    label: "Spring Garden",
    emoji: "🌷",
    season: "spring",
    slots: [
      { role: "outerwear", required: false, categories: ["cardigans", "blazers", "jackets"] },
      // Women: sundress / crop top / blouse. Men: linen long-sleeve / surf shirt / light tee.
      { role: "top", required: true,
        categories: ["tops", "blouses", "t-shirts", "shirts"],
        womensCategories: ["dresses", "tops", "blouses", "t-shirts"],
        mensCategories: ["shirts", "t-shirts", "tops"],
        keywordPrefer: ["sun", "linen", "crop", "floral", "pastel", "spring", "surf"] },
      { role: "bottom", required: false,
        categories: ["skirts", "pants", "shorts", "jeans"],
        womensCategories: ["skirts", "shorts", "pants"],
        mensCategories: ["chinos", "trousers", "pants", "shorts"] },
      { role: "shoes", required: true, categories: ["sneakers", "sandals", "loafers", "shoes", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
    ],
  },

  /* ── SUMMER ─────────────────────────────────────────────────── */
  {
    key: "beach_day",
    label: "Beach Day",
    emoji: "🏖️",
    season: "summer",
    slots: [
      { role: "top", required: true,
        categories: ["tops", "t-shirts", "tank tops", "shirts"],
        womensCategories: ["swimwear", "dresses", "tops", "tank tops"],
        mensCategories: ["shirts", "t-shirts", "tops", "tank tops"],
        keywordPrefer: ["swim", "bikini", "sun", "surf", "linen", "crop", "rash"] },
      { role: "bottom", required: false,
        categories: ["shorts", "skirts"],
        womensCategories: ["skirts", "shorts"],
        mensCategories: ["shorts"],
        keywordPrefer: ["cargo", "swim", "board", "linen", "beach"] },
      { role: "shoes", required: true, categories: ["sandals", "sneakers", "shoes", "footwear"] },
      { role: "accessory", required: false,
        categories: ["sunglasses", "hats", "bags", "jewelry", "watches", "accessories"] },
    ],
  },
  {
    key: "patio_evening",
    label: "Patio Evening",
    emoji: "🌅",
    season: "summer",
    slots: [
      { role: "outerwear", required: false, categories: ["cardigans", "blazers", "jackets"] },
      { role: "top", required: true,
        categories: ["tops", "blouses", "shirts", "t-shirts"],
        womensCategories: ["dresses", "tops", "blouses"],
        mensCategories: ["shirts", "t-shirts"],
        keywordPrefer: ["linen", "silk", "sun", "crop"] },
      { role: "bottom", required: false,
        categories: ["skirts", "pants", "shorts"],
        womensCategories: ["skirts", "pants", "shorts"],
        mensCategories: ["chinos", "trousers", "pants"] },
      { role: "shoes", required: true, categories: ["sandals", "loafers", "heels", "shoes", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
    ],
  },
  {
    key: "summer_night_out",
    label: "Summer Night Out",
    emoji: "🌃",
    season: "summer",
    slots: [
      { role: "top", required: true,
        categories: ["tops", "blouses", "shirts", "t-shirts"],
        womensCategories: ["dresses", "tops", "blouses"],
        mensCategories: ["shirts", "t-shirts"],
        keywordPrefer: ["silk", "satin", "linen", "crop", "mini"] },
      { role: "bottom", required: false,
        categories: ["skirts", "pants", "shorts"],
        womensCategories: ["skirts", "pants", "shorts"],
        mensCategories: ["trousers", "pants", "chinos"] },
      { role: "shoes", required: true, categories: ["heels", "loafers", "sneakers", "shoes", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
    ],
  },
  {
    key: "festival",
    label: "Festival Ready",
    emoji: "🎶",
    season: "summer",
    slots: [
      { role: "top", required: true, categories: ["t-shirts", "tops", "tank tops", "shirts"] },
      { role: "bottom", required: true, categories: ["shorts", "pants", "jeans", "skirts"],
        mensCategories: ["shorts", "pants", "jeans"] },
      { role: "shoes", required: true, categories: ["sneakers", "boots", "shoes", "footwear"] },
      { role: "accessory", required: false, categories: ["sunglasses", "hats", "bags", "jewelry", "accessories"] },
    ],
  },

  /* ── AUTUMN ─────────────────────────────────────────────────── */
  {
    key: "autumn_layers",
    label: "Autumn Layers",
    emoji: "🍂",
    season: "autumn",
    slots: [
      { role: "outerwear", required: true, categories: ["jackets", "coats", "blazers", "cardigans", "outerwear"] },
      { role: "top", required: true, categories: ["sweaters", "knits", "shirts", "t-shirts", "tops", "blouses"] },
      { role: "bottom", required: true, categories: ["pants", "jeans", "trousers", "skirts"],
        mensCategories: ["pants", "jeans", "trousers", "chinos"] },
      { role: "shoes", required: true, categories: ["boots", "loafers", "sneakers", "shoes", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
    ],
  },

  /* ── WINTER ─────────────────────────────────────────────────── */
  {
    key: "winter_polish",
    label: "Winter Polish",
    emoji: "❄️",
    season: "winter",
    slots: [
      { role: "outerwear", required: true, categories: ["coats", "jackets", "outerwear"] },
      { role: "top", required: true, categories: ["sweaters", "knits", "shirts", "blouses", "tops"] },
      { role: "bottom", required: true, categories: ["pants", "trousers", "jeans", "skirts"],
        mensCategories: ["pants", "trousers", "jeans"] },
      { role: "shoes", required: true, categories: ["boots", "loafers", "shoes", "footwear"] },
      { role: "accessory", required: false, categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
    ],
  },

  /* ── NATURE / OUTDOORS (evergreen destination) ───────────────── */
  {
    key: "beach_tropical",
    label: "Beach & Marina",
    emoji: "🏝️",
    slots: [
      { role: "outerwear", required: false, categories: ["shirts", "cardigans", "jackets"],
        keywordPrefer: ["linen", "kaftan", "cover-up", "open"] },
      { role: "top", required: true,
        categories: ["tops", "t-shirts", "tank tops", "shirts"],
        womensCategories: ["swimwear", "dresses", "tops", "tank tops", "blouses"],
        mensCategories: ["shirts", "t-shirts", "tops", "tank tops"],
        keywordPrefer: ["linen", "silk", "sun", "resort", "crop", "cabana"] },
      { role: "bottom", required: false,
        categories: ["shorts", "skirts", "pants"],
        womensCategories: ["skirts", "shorts", "pants"],
        mensCategories: ["shorts", "chinos", "pants"],
        keywordPrefer: ["linen", "swim", "board", "cabana", "tailored short"] },
      { role: "shoes", required: true, categories: ["sandals", "sneakers", "shoes", "footwear", "loafers"] },
      { role: "accessory", required: false,
        categories: ["sunglasses", "hats", "bags", "jewelry", "watches", "accessories"] },
    ],
  },
  {
    key: "wilderness_hiking",
    label: "Wilderness Trail",
    emoji: "🌲",
    slots: [
      { role: "outerwear", required: true,
        categories: ["jackets", "coats", "outerwear", "vests"],
        keywordPrefer: ["shell", "parka", "field", "sherpa", "fleece", "anorak", "utility", "quilted"] },
      { role: "top", required: true,
        categories: ["t-shirts", "tops", "shirts", "sweaters", "knits", "hoodies"],
        keywordPrefer: ["merino", "flannel", "henley", "thermal", "waffle"] },
      { role: "bottom", required: true,
        categories: ["pants", "jeans", "trousers", "joggers"],
        keywordPrefer: ["cargo", "utility", "canvas", "trail", "hiking", "relaxed"] },
      { role: "shoes", required: true,
        categories: ["boots", "sneakers", "shoes", "footwear"],
        keywordPrefer: ["hiking", "trail", "work", "combat", "field"] },
      { role: "accessory", required: false,
        categories: ["hats", "bags", "watches", "accessories"] },
    ],
  },
  {
    key: "mountain_lakes",
    label: "Mountain & Lake",
    emoji: "🏔️",
    slots: [
      { role: "outerwear", required: true,
        categories: ["coats", "jackets", "outerwear", "cardigans", "vests"],
        keywordPrefer: ["cashmere", "wool", "shearling", "quilted", "puffer", "alpine"] },
      { role: "top", required: true,
        categories: ["sweaters", "knits", "tops", "shirts", "t-shirts"],
        keywordPrefer: ["cashmere", "merino", "cable", "ribbed", "turtleneck", "mock"] },
      { role: "bottom", required: true,
        categories: ["pants", "trousers", "jeans"],
        keywordPrefer: ["wool", "flannel", "corduroy", "tailored", "cord"] },
      { role: "shoes", required: true,
        categories: ["boots", "loafers", "shoes", "footwear"],
        keywordPrefer: ["chelsea", "suede", "leather", "mountain", "shearling"] },
      { role: "accessory", required: false,
        categories: ACCESSORY_CATS_WOMENS, mensCategories: ACCESSORY_CATS_MENS },
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

/** Northern-hemisphere season for occasion biasing. */
function getCurrentSeason(): "spring" | "summer" | "autumn" | "winter" {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
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
  // Accessory subtypes — ordered before generics so they win.
  if (c.includes("swim") || c.includes("bikini")) return "swimwear";
  if (c.includes("sunglass")) return "sunglasses";
  if (c.includes("watch")) return "watches";
  if (c.includes("jewel") || c.includes("necklace") || c.includes("earring") || c.includes("bracelet") || c === "ring" || c.includes(" ring")) return "jewelry";
  if (c.includes("t-shirt") || c.includes("tee")) return "t-shirts";
  if (c.includes("shirt") && !c.includes("t-shirt")) return "shirts";
  if (c.includes("blouse")) return "blouses";
  if (c.includes("tank")) return "tank tops";
  if (c.includes("sweater") || c.includes("knit") || c.includes("pullover")) return "sweaters";
  if (c.includes("hoodie") || c.includes("sweatshirt")) return "hoodies";
  if (c.includes("top")) return "tops";
  if (c.includes("jean") || c.includes("denim")) return "jeans";
  if (c.includes("chino")) return "chinos";
  if (c.includes("trouser")) return "trousers";
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
  if (c.includes("bag") || c.includes("tote") || c.includes("purse") || c.includes("backpack") || c.includes("clutch")) return "bags";
  if (c.includes("hat") || c.includes("cap") || c.includes("beanie")) return "hats";
  if (c.includes("accessor") || c.includes("belt") || c.includes("scarf")) return "accessories";
  return c;
}

/** Coarse semantic bucket used to enforce "one footwear / one outerwear / etc."
 *  per outfit, regardless of which sub-category a product is filed under. */
function semanticBucket(normCat: string): string | null {
  if (["sneakers", "boots", "heels", "sandals", "loafers", "shoes", "footwear"].includes(normCat)) return "footwear";
  if (["jackets", "coats", "blazers", "outerwear", "cardigans"].includes(normCat)) return "outerwear";
  if (["pants", "jeans", "trousers", "shorts", "skirts", "joggers", "leggings", "chinos"].includes(normCat)) return "bottom";
  if (["dresses", "jumpsuits"].includes(normCat)) return "one_piece";
  if (["t-shirts", "shirts", "tops", "blouses", "sweaters", "hoodies", "tank tops", "knits", "polos"].includes(normCat)) return "top";
  if (["bags"].includes(normCat)) return "bag";
  if (["hats"].includes(normCat)) return "hat";
  // sunglasses/jewelry/watches/belts/scarves/accessories share no bucket — many can co-exist.
  return null;
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
  usedProductIds: Set<string>,
  gender: "mens" | "womens",
): { items: Array<{ product: CatalogProduct; role: string; position: number }>;
     cohort: CohortKey } | null {

  // ─── STEP 1: CHOOSE AESTHETIC LANE ─────────────────────────────
  const aestheticLeads = OCCASION_AESTHETIC_LEADS[occasion.key]
    ?? ['minimalist_luxury'];
  const primaryCohort = aestheticLeads[
    Math.floor(Math.random() * aestheticLeads.length)
  ];
  const alliedCohorts = COHORT_ALLIANCES[primaryCohort];

  // Filter pool to brands belonging to ANY allied cohort.
  const eligibleProducts = products.filter(p => brandCompatible(p.brand, alliedCohorts));

  const requiredSlotCount = occasion.slots.filter(s => s.required).length;
  if (eligibleProducts.length < requiredSlotCount) return null;

  // Brand diversity gate — abort if pool collapses to a single brand
  // (would produce a one-brand outfit, e.g., all Stone Island).
  const distinctBrands = new Set(eligibleProducts.map(p => p.brand));
  if (distinctBrands.size < 2) return null;

  const items: Array<{ product: CatalogProduct; role: string; position: number }> = [];
  let position = 0;

  // Cohesion state
  const outfitColors = new Set<string>();
  const outfitFabricWeights = new Set<string>();
  let outfitStyleFamily: string | null = null;
  let hasPatternPiece = false;
  const outfitCohortsUsed = new Set<CohortKey>();
  // Semantic-bucket dedupe — prevents two footwear items, two outerwear items,
  // etc. from being chosen for the same outfit even if their catalog categories
  // differ (e.g. one product tagged "sneakers" + one tagged "heels"/"loafers").
  const usedBuckets = new Set<string>();

  // ─── STEP 2: HERO-FIRST SLOT ORDER ─────────────────────────────
  const heroSlotOrder = ["outerwear", "shoes", "top", "bottom", "accessory"];
  const orderedSlots = [...occasion.slots].sort((a, b) => {
    const aIdx = heroSlotOrder.indexOf(a.role);
    const bIdx = heroSlotOrder.indexOf(b.role);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  for (const slot of orderedSlots) {
    const effectiveCats =
      gender === "mens" && slot.mensCategories?.length ? slot.mensCategories :
      gender === "womens" && slot.womensCategories?.length ? slot.womensCategories :
      slot.categories;

    // ─── STEP 3: CATEGORY CANDIDATES ─────────────────────────────
    const categoryCandidates = eligibleProducts.filter(p => {
      if (usedProductIds.has(p.id)) return false;
      const normCat = normalizeCategory(p.category);
      if (!effectiveCats.includes(normCat)) return false;
      // Reject if its semantic bucket (footwear / outerwear / bottom / top)
      // is already filled by another item in this outfit.
      const bucket = semanticBucket(normCat);
      if (bucket && usedBuckets.has(bucket)) return false;
      return true;
    });

    if (categoryCandidates.length === 0) {
      if (slot.required) return null;
      continue;
    }

    // ─── STEP 4: COHESION FILTER ─────────────────────────────────
    const cohesiveCandidates = categoryCandidates.filter(p => {
      if (outfitStyleFamily) {
        if (!stylesCompatible(outfitStyleFamily, p.style_genre)) return false;
      }
      const candidateColors = extractColors(p.tags);
      if (!colorsCohesive(outfitColors, candidateColors)) return false;
      if (hasPatternPiece && hasPattern(p.tags, p.name, p.presentation)) return false;
      const candidateWeight = getFabricWeight(p.fabric_composition);
      if (!fabricsCohesive(outfitFabricWeights, candidateWeight)) return false;
      // Cohort cap — max 3 distinct cohorts per outfit
      const brandCohort = getBrandCohortInAlliance(p.brand, alliedCohorts);
      if (!brandCohort) return false;
      if (!outfitCohortsUsed.has(brandCohort) && outfitCohortsUsed.size >= 3) {
        return false;
      }
      return true;
    });

    const workingCandidates = cohesiveCandidates.length > 0
      ? cohesiveCandidates
      : categoryCandidates;

    // ─── STEP 5: STYLIST SCORING ─────────────────────────────────
    const kw = (slot.keywordPrefer ?? []).map(k => k.toLowerCase());
    const matchesKeyword = (p: CatalogProduct): boolean => {
      if (kw.length === 0) return false;
      const hay = [p.name, ...(p.tags ?? [])].join(" ").toLowerCase();
      return kw.some(k => hay.includes(k));
    };

    const scored = workingCandidates.map(p => {
      const brandCohort =
        getBrandCohortInAlliance(p.brand, alliedCohorts) ?? 'supporting';
      const isPrimary = brandCohort === primaryCohort;
      const isSupporting = brandCohort === 'supporting';
      const isHeroSlot = slot.role === "outerwear" || slot.role === "shoes";

      // Hard penalty: supporting brands MUST NOT lead hero slots
      const supportingPenalty = (isHeroSlot && isSupporting) ? -1000 : 0;

      const cohortBaseScore = cohortScore(brandCohort);
      const primaryBonus = isPrimary ? 75 : 0;
      const heroSlotBonus = (isHeroSlot && !isSupporting) ? 40 : 0;
      const keywordBonus = matchesKeyword(p) ? 60 : 0;
      const imageBonus = (p.image_confidence ?? 0) * 80;

      return {
        product: p,
        cohort: brandCohort,
        score: cohortBaseScore + primaryBonus + heroSlotBonus
               + keywordBonus + imageBonus + supportingPenalty,
      };
    });

    const validScored = scored.filter(s => s.score > -500);
    if (validScored.length === 0) {
      if (slot.required) return null;
      continue;
    }

    validScored.sort((a, b) => b.score - a.score);
    const topN = validScored.slice(0, Math.min(4, validScored.length));

    // ─── STEP 6: WEIGHTED SELECTION ──────────────────────────────
    const weights = topN.map((_, i) => topN.length - i);
    const totalW = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalW;
    let pickIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { pickIdx = i; break; }
    }
    const pick = topN[pickIdx].product;
    const pickCohort = topN[pickIdx].cohort;

    // ─── STEP 7: UPDATE OUTFIT STATE ─────────────────────────────
    extractColors(pick.tags).forEach(c => outfitColors.add(c));
    const pickWeight = getFabricWeight(pick.fabric_composition);
    if (pickWeight) outfitFabricWeights.add(pickWeight);
    const pickFamily = getStyleFamily(pick.style_genre);
    if (pickFamily && !outfitStyleFamily) outfitStyleFamily = pickFamily;
    if (hasPattern(pick.tags, pick.name, pick.presentation)) hasPatternPiece = true;
    outfitCohortsUsed.add(pickCohort);

    usedProductIds.add(pick.id);
    const pickBucket = semanticBucket(normalizeCategory(pick.category));
    if (pickBucket) usedBuckets.add(pickBucket);
    items.push({ product: pick, role: slot.role, position: position++ });
  }

  // ─── STEP 8: VALIDATE OUTFIT QUALITY ───────────────────────────
  const hasShoes = items.some(i => i.role === "shoes");
  const hasTop = items.some(i => i.role === "top");
  const hasBottom = items.some(i => i.role === "bottom");
  const hasOuterwear = items.some(i => i.role === "outerwear");
  const hasDress = items.some(i =>
    normalizeCategory(i.product.category) === "dresses"
  );

  if (!hasShoes) return null;
  if (!hasTop && !hasOuterwear && !hasDress) return null;
  if (!hasBottom && !hasDress && !hasOuterwear) return null;

  // Reposition for display order: outerwear, top, bottom, shoes, accessory
  const displayOrder = ["outerwear", "top", "bottom", "shoes", "accessory"];
  items.sort((a, b) => displayOrder.indexOf(a.role) - displayOrder.indexOf(b.role));
  items.forEach((it, idx) => { it.position = idx; });

  return items.length >= 3 ? { items, cohort: primaryCohort } : null;
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
    const forcedOccasions = Array.isArray(body.occasions) ? body.occasions as string[] : null;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const log: string[] = [];
    log.push(`[Config] week=${weekId}, gender=${gender || "both"}, ${occasionCount} occasions × ${outfitsPerOccasion}/each`);
    log.push(`[BrandPool] ${APPROVED_BRANDS.size} approved brands across ${ALL_COHORT_KEYS.length} cohorts`);

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

    // Bias occasion selection toward the current season:
    // pick all in-season + evergreen, drop other seasons; shuffle then take occasionCount.
    const currentSeason = getCurrentSeason();
    log.push(`[Season] Current season: ${currentSeason}`);
    const seasonalEligible = OCCASIONS.filter(o => !o.season || o.season === currentSeason);
    let selectedOccasions;
    if (forcedOccasions && forcedOccasions.length > 0) {
      selectedOccasions = OCCASIONS.filter(o => forcedOccasions.includes(o.key));
      log.push(`[Occasions] FORCED: ${selectedOccasions.map(o => o.label).join(", ")}`);
    } else {
      selectedOccasions = shuffle(seasonalEligible).slice(0, occasionCount);
      log.push(`[Occasions] ${selectedOccasions.map(o => o.label).join(", ")}`);
    }

    const usedIds = new Set<string>();
    const usedNames = new Set<string>();
    let totalCreated = 0;
    let sortOrder = 0;

    for (const occ of selectedOccasions) {
      const genderTargets = (gender ? [gender] : ["mens", "womens"]) as Array<"mens" | "womens">;

      for (const g of genderTargets) {
        const pool = shuffle(g === "mens" ? maleProducts : femaleProducts);

        for (let i = 0; i < outfitsPerOccasion; i++) {
          const result = buildOutfit(occ, pool, usedIds, g);
          if (!result) {
            log.push(`[Skip] ${occ.label} ${g} #${i + 1}: not enough products`);
            continue;
          }

          const title = generateEditorialName(occ.key, result.cohort, usedNames);
          if (!title) {
            log.push(`[Skip] ${occ.label} ${g} #${i + 1}: title pool exhausted (1-per-title cap)`);
            continue;
          }
          const description = generateDescription(result.cohort, result.items);

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
