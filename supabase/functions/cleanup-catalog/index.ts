import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Listing / category page detection ──────────────────────────────────────
const LISTING_PAGE_NAME_PATTERNS = [
  // Explicit listing signals
  /\bshop\s+(now|all|the|women|men|our)/i,
  /\bpage\s*\d+\s*\|/i,
  /\|\s*page\s*\d+/i,
  /\bsale\s*[&:]\s*clearance/i,
  /\bsale\s+(tops|shoes|bags|dresses|pants)/i,
  /\bdesigner\s+(sale|finds|bags|shoes)/i,
  /\bshop\s+on\s+(farfetch|ssense|nordstrom)/i,
  /\bshop\s+now\s+(at|on)\b/i,
  /\bcollection\s*\|/i,
  /\bnew\s+arrivals\s+(on|at)\b/i,
  /\bquick\s+shipping\s+to\b/i,
  // Retailer-specific listing patterns
  /\|\s*(farfetch|ssense|nordstrom|net-a-porter|asos|uniqlo|mango|zara|shopbop|mytheresa|end\.|mr\s*porter|revolve|saks|bloomingdale)/i,
  /\bfor\s+(women|men)\s*[-|—]/i,
  /\b(women's|men's)\s+designer\b/i,
  /\b(women's|men's)\s+(sale|clothing|apparel)\b/i,
  // Generic collection pages
  /\bbrowse\s+(all|our|the)\b/i,
  /\bview\s+all\b/i,
  /\beverything\s+you\s+need/i,
  /\bselection\s+of\b/i,
  /\bexplore\s+(our|the)\b/i,
  // Category page titles scraped as product names
  /^(women's?|men's?)\s+(tops|bags|shoes|boots|sneakers|dresses|pants|jeans|jackets)\s*$/i,
  /^(women's?|men's?)\s+\w+\s+(tops|bags|shoes)\s*[-|]/i,
  // FARFETCH patterns
  /\bfarfetch\s*canada\b/i,
  /\bshop\s+new\s+arrivals\b/i,
  /\bpre-owned\b.*\bfor\s+(women|men)\b/i,
  // Utility / care pages
  /\bcare\s*(guide|&\s*repair|instruction)/i,
  /\bsize\s+guide\b/i,
  /\bcustomer\s+service\b/i,
  // "Co-Ord Sets" etc as category headers
  /\bco-?ord\s+sets\s*[-—]/i,
];

// Product names that are too short or generic to be real products
const MIN_PRODUCT_NAME_LENGTH = 8;

// ─── Generic → specific category remapping ──────────────────────────────────
// We remap based on the product name keywords
function remapGenericCategory(currentCategory: string, name: string): string {
  const generic = new Set(["other", "tops", "bottoms", "outerwear", "shoes", "footwear", "accessories"]);
  if (!generic.has(currentCategory)) return currentCategory;

  const lower = name.toLowerCase();

  // Try to detect specific category from name
  if (/\bt-?shirt|tee\b/.test(lower)) return "t-shirts";
  if (/\bhoodie|sweatshirt|fleece|crewneck\b/.test(lower)) return "hoodies";
  if (/\bsweater|knit|cardigan|turtleneck|pullover\b/.test(lower)) return "sweaters";
  if (/\bpolo\b/.test(lower)) return "polos";
  if (/\bshirt|button.?down|oxford|flannel|blouse\b/.test(lower)) return "shirts";
  if (/\bjean|denim\b/.test(lower)) return "jeans";
  if (/\bshort\b/.test(lower)) return "shorts";
  if (/\bskirt\b/.test(lower)) return "skirts";
  if (/\blegging|tight|yoga\b/.test(lower)) return "leggings";
  if (/\bpant|trouser|chino|cargo|jogger\b/.test(lower)) return "pants";
  if (/\bblazer|sport.?coat\b/.test(lower)) return "blazers";
  if (/\bvest|gilet\b/.test(lower)) return "vests";
  if (/\bcoat|trench|overcoat|peacoat|parka\b/.test(lower)) return "coats";
  if (/\bjacket|bomber|puffer|windbreaker|anorak\b/.test(lower)) return "jackets";
  if (/\bjumpsuit|romper|overall\b/.test(lower)) return "jumpsuits";
  if (/\bdress|gown\b/.test(lower)) return "dresses";
  if (/\bsneaker|trainer\b/.test(lower)) return "sneakers";
  if (/\bboot|chelsea\b/.test(lower)) return "boots";
  if (/\bsandal|slide|flip.?flop|mule|espadrille\b/.test(lower)) return "sandals";
  if (/\bloafer|moccasin|slip.?on\b/.test(lower)) return "loafers";
  if (/\bheel|pump|stiletto|wedge\b/.test(lower)) return "heels";
  if (/\bbag|handbag|tote|crossbody|backpack|clutch|purse\b/.test(lower)) return "bags";
  if (/\bhat|cap|beanie|bucket|snapback\b/.test(lower)) return "hats";
  if (/\bsunglass|eyewear\b/.test(lower)) return "sunglasses";
  if (/\bjewel|necklace|bracelet|ring|earring\b/.test(lower)) return "jewelry";
  if (/\bwatch|timepiece\b/.test(lower)) return "watches";
  if (/\bbelt\b/.test(lower)) return "belts";
  if (/\bscarf|shawl|wrap\b/.test(lower)) return "scarves";
  if (/\bswim|bikini|trunk\b/.test(lower)) return "swimwear";
  if (/\bactive|gym|workout\b/.test(lower)) return "activewear";
  if (/\blounge|pajama|robe|sleepwear\b/.test(lower)) return "loungewear";
  if (/\bunderwear|boxer|brief|bra|lingerie\b/.test(lower)) return "underwear";
  if (/\bwallet|key.?chain|umbrella|air\s*freshener|perfume|cologne|fragrance|candle\b/.test(lower)) return "accessories";
  if (/\bcard\s*holder\b/.test(lower)) return "accessories";

  return currentCategory; // Can't determine — keep as-is
}

function isListingPage(name: string): boolean {
  return LISTING_PAGE_NAME_PATTERNS.some(p => p.test(name));
}

function isNonProduct(name: string): boolean {
  const lower = name.toLowerCase();
  // Perfume, fragrance, home goods, tech accessories
  if (/\b(perfume|cologne|fragrance|eau\s+de|edp|edt|candle|diffuser|incense|air\s*freshener|umbrella|phone\s*case|charger)\b/.test(lower)) {
    return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run ?? false;
    const batchSize = body.batch_size ?? 500;

    const stats = {
      checked: 0,
      listing_pages_deactivated: 0,
      non_products_deactivated: 0,
      too_short_deactivated: 0,
      categories_remapped: 0,
      already_clean: 0,
      dry_run: dryRun,
      samples: [] as { id: string; name: string; action: string; detail: string }[],
    };

    // Process in batches
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: products, error } = await supabase
        .from("product_catalog")
        .select("id, name, category, is_active")
        .eq("is_active", true)
        .range(offset, offset + batchSize - 1)
        .order("created_at", { ascending: true });

      if (error) throw new Error(`Fetch error: ${error.message}`);
      if (!products || products.length === 0) {
        hasMore = false;
        break;
      }

      stats.checked += products.length;

      const toDeactivate: string[] = [];
      const toRemap: { id: string; newCategory: string }[] = [];

      for (const product of products) {
        const name = product.name || "";

        // 1. Check if it's a listing page
        if (isListingPage(name)) {
          toDeactivate.push(product.id);
          stats.listing_pages_deactivated++;
          if (stats.samples.length < 30) {
            stats.samples.push({ id: product.id, name, action: "deactivated", detail: "listing_page" });
          }
          continue;
        }

        // 2. Check if name is too short/generic
        if (name.length < MIN_PRODUCT_NAME_LENGTH) {
          toDeactivate.push(product.id);
          stats.too_short_deactivated++;
          if (stats.samples.length < 30) {
            stats.samples.push({ id: product.id, name, action: "deactivated", detail: "too_short" });
          }
          continue;
        }

        // 3. Check if it's a non-product (perfume, home goods, etc.)
        if (isNonProduct(name)) {
          toDeactivate.push(product.id);
          stats.non_products_deactivated++;
          if (stats.samples.length < 30) {
            stats.samples.push({ id: product.id, name, action: "deactivated", detail: "non_product" });
          }
          continue;
        }

        // 4. Remap generic categories
        const newCategory = remapGenericCategory(product.category, name);
        if (newCategory !== product.category) {
          toRemap.push({ id: product.id, newCategory });
          stats.categories_remapped++;
          if (stats.samples.length < 30) {
            stats.samples.push({ id: product.id, name, action: "remapped", detail: `${product.category} → ${newCategory}` });
          }
          continue;
        }

        stats.already_clean++;
      }

      // Execute updates
      if (!dryRun) {
        // Batch deactivate
        if (toDeactivate.length > 0) {
          // Process in chunks of 100
          for (let i = 0; i < toDeactivate.length; i += 100) {
            const chunk = toDeactivate.slice(i, i + 100);
            await supabase
              .from("product_catalog")
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .in("id", chunk);
          }
        }

        // Batch remap categories
        for (const item of toRemap) {
          await supabase
            .from("product_catalog")
            .update({ category: item.newCategory, updated_at: new Date().toISOString() })
            .eq("id", item.id);
        }
      }

      if (products.length < batchSize) {
        hasMore = false;
      }
      offset += batchSize;
    }

    console.log(`Cleanup complete: ${stats.checked} checked, ${stats.listing_pages_deactivated} listing pages, ${stats.non_products_deactivated} non-products, ${stats.too_short_deactivated} too short, ${stats.categories_remapped} remapped`);

    return new Response(JSON.stringify({ success: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
