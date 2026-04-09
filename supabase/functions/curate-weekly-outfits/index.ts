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

/* ── Title generation ─────────────────────────────────────────── */

const TITLE_TEMPLATES: Record<string, string[]> = {
  night_out: ["Midnight on Madison", "After Dark Edit", "Noir & Neon", "Downtown After Hours", "Late Night Legend"],
  beach_day: ["Salt & Stone", "Coastal Drift", "Golden Hour Edit", "Shore Leave", "Tide Pool Style"],
  lunch_date: ["Left Bank Morning", "Café au Lait", "Sunlit Terrace", "The Good Life", "Sidewalk Scene"],
  weekend_casual: ["Sunday Slowdown", "Off-Duty Edit", "The Comfort Zone", "Easy Does It", "Lazy Luxe"],
  office: ["Power Hour", "Corner Office", "The Sharp Edit", "Boardroom Ready", "9-to-Wine"],
  festival: ["Main Stage Energy", "Desert Bloom", "Sound & Vision", "The Lineup", "Stage Left"],
  brunch: ["Garden Party", "Morning Glory", "Golden Morning", "The Terrace Edit", "Light & Easy"],
  gym: ["Iron & Ink", "Rep & Reset", "Track Mode", "Street Athletics", "The Grind Edit"],
};

function pickTitle(occasion: string, index: number): string {
  const templates = TITLE_TEMPLATES[occasion] || ["Curated Look"];
  return templates[index % templates.length];
}

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
}

/* ── Build one outfit from catalog products ───────────────────── */

function buildOutfit(
  occasion: OccasionDef,
  products: CatalogProduct[],
  usedProductIds: Set<string>
): { items: Array<{ product: CatalogProduct; role: string; position: number }> } | null {
  const items: Array<{ product: CatalogProduct; role: string; position: number }> = [];
  let position = 0;

  for (const slot of occasion.slots) {
    const candidates = products.filter(p => {
      if (usedProductIds.has(p.id)) return false;
      const normCat = normalizeCategory(p.category);
      return slot.categories.includes(normCat);
    });

    if (candidates.length === 0) {
      if (slot.required) return null; // Can't fill required slot
      continue;
    }

    // Pick best by image_confidence, with some randomness
    const sorted = candidates.sort((a, b) => (b.image_confidence ?? 0) - (a.image_confidence ?? 0));
    const topN = sorted.slice(0, Math.min(10, sorted.length));
    const pick = topN[Math.floor(Math.random() * topN.length)];

    usedProductIds.add(pick.id);
    items.push({ product: pick, role: slot.role, position: position++ });
  }

  return items.length >= 3 ? { items } : null;
}

/* ── Main handler ─────────────────────────────────────────────── */

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const weekId = body.week_id || getCurrentWeekId();
    const gender = body.gender as string | undefined; // "mens" | "womens" | undefined (both)
    const outfitsPerOccasion = Math.min(body.outfits_per_occasion || 5, 10);
    const occasionCount = Math.min(body.occasion_count || 5, OCCASIONS.length);
    const clearExisting = body.clear_existing ?? true;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const log: string[] = [];
    log.push(`[Config] week=${weekId}, gender=${gender || "both"}, ${occasionCount} occasions × ${outfitsPerOccasion}/each`);

    // Clear existing outfits for this week if requested
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

    // Fetch products from catalog
    const genders = gender
      ? [gender === "mens" ? "male" : "female", "unisex"]
      : ["male", "female", "unisex"];

    // Fetch enough products — 2000 limit
    const { data: allProducts, error: fetchErr } = await sb
      .from("product_catalog")
      .select("id, name, brand, category, image_url, product_url, price_cents, currency, gender, image_confidence")
      .eq("is_active", true)
      .in("gender", genders)
      .not("image_url", "is", null)
      .gte("image_confidence", 0.1)
      .order("image_confidence", { ascending: false })
      .limit(2000);

    if (fetchErr) throw fetchErr;
    if (!allProducts || allProducts.length === 0) {
      return successResponse({ created: 0, log: ["No products available"] }, 200, cors);
    }

    log.push(`[Catalog] ${allProducts.length} products loaded`);

    // Split by gender for gender-specific outfits
    const maleProducts = allProducts.filter(p => p.gender === "male" || p.gender === "unisex");
    const femaleProducts = allProducts.filter(p => p.gender === "female" || p.gender === "unisex");

    // Pick occasions
    const selectedOccasions = shuffle(OCCASIONS).slice(0, occasionCount);
    const usedIds = new Set<string>();
    let totalCreated = 0;
    let sortOrder = 0;

    for (const occ of selectedOccasions) {
      const genderTargets = gender
        ? [gender]
        : ["mens", "womens"];

      for (const g of genderTargets) {
        const pool = shuffle(g === "mens" ? maleProducts : femaleProducts);

        for (let i = 0; i < outfitsPerOccasion; i++) {
          const result = buildOutfit(occ, pool, usedIds);
          if (!result) {
            log.push(`[Skip] ${occ.label} ${g} #${i + 1}: not enough products`);
            continue;
          }

          const totalPrice = result.items.reduce((s, it) => s + (it.product.price_cents ?? 0), 0);
          const title = pickTitle(occ.key, i + (g === "womens" ? 5 : 0));
          const description = `A curated ${occ.label.toLowerCase()} look featuring ${result.items.map(it => it.product.brand).filter(Boolean).join(", ")}.`;

          // Insert outfit
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

          // Insert items
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

    return successResponse({
      week_id: weekId,
      created: totalCreated,
      occasions: selectedOccasions.map(o => o.label),
      log,
    }, 200, cors);
  } catch (err) {
    console.error("curate-weekly-outfits error:", err);
    return errorResponse(err.message || "Internal error", "CURATION_ERROR", 500, cors);
  }
});
