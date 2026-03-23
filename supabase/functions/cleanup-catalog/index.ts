import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/validation.ts";

// ─── Brand → Style Genre mapping (server-side mirror of client brandGenres.ts) ────
const BRAND_GENRE_MAP: Record<string, string> = {
  // Luxury
  'gucci': 'Luxury', 'louis vuitton': 'Luxury', 'prada': 'Luxury', 'balenciaga': 'Luxury',
  'dior': 'Luxury', 'burberry': 'Luxury', 'versace': 'Luxury', 'saint laurent': 'Luxury',
  'givenchy': 'Luxury', 'fendi': 'Luxury', 'valentino': 'Luxury', 'bottega veneta': 'Luxury',
  'chanel': 'Luxury', 'hermès': 'Luxury', 'tom ford': 'Luxury', 'alexander mcqueen': 'Luxury',
  'celine': 'Luxury', 'loewe': 'Luxury', 'hugo boss': 'Luxury', 'ralph lauren': 'Luxury',
  'moncler': 'Luxury', 'jacquemus': 'Luxury', 'rick owens': 'Luxury', 'maison margiela': 'Luxury',
  'ami paris': 'Luxury', 'cartier': 'Luxury', 'stone island': 'Luxury', 'acne studios': 'Luxury',
  'cutler and gross': 'Luxury', 'todd snyder': 'Luxury', 'reiss': 'Luxury', 'sandro': 'Luxury',
  'theory': 'Luxury', 'ted baker': 'Luxury', 'tory burch': 'Luxury', 'coach': 'Luxury',
  'kate spade': 'Luxury', 'michael kors': 'Luxury', 'suitsupply': 'Luxury', 'mejuri': 'Luxury',
  'farfetch': 'Luxury', 'saks': 'Luxury', 'ssense': 'Luxury', 'net-a-porter': 'Luxury',
  'revolve': 'Luxury',
  // Streetwear
  'supreme': 'Streetwear', 'off-white': 'Streetwear', 'stüssy': 'Streetwear',
  'a bathing ape': 'Streetwear', 'palace': 'Streetwear', 'palace skateboards': 'Streetwear',
  'fear of god': 'Streetwear', 'kith': 'Streetwear', 'essentials': 'Streetwear',
  'corteiz': 'Streetwear', 'trapstar': 'Streetwear', 'new era': 'Streetwear', 'mark bodē': 'Streetwear',
  'allsaints': 'Streetwear', 'urban outfitters': 'Streetwear',
  // Athletic
  'nike': 'Athletic', 'adidas': 'Athletic', 'puma': 'Athletic', 'lululemon': 'Athletic',
  'gymshark': 'Athletic', 'under armour': 'Athletic', 'new balance': 'Athletic', 'reebok': 'Athletic',
  'on running': 'Athletic', 'asics': 'Athletic', 'gore wear': 'Athletic', 'hoka': 'Athletic',
  'converse': 'Athletic', 'rhone': 'Athletic', 'vuori': 'Athletic',
  'girlfriend collective': 'Athletic', 'san francisco giants': 'Athletic',
  'public rec': 'Athletic', 'public rec 2.0': 'Athletic', 'mizzen+main': 'Athletic',
  // Casual — everyday wear, relaxed, trend-aware
  'zara': 'Casual', 'h&m': 'Casual', 'shein': 'Casual', 'forever 21': 'Casual',
  'boohoo': 'Casual', 'prettylittlething': 'Casual', 'fashion nova': 'Casual',
  'mango': 'Casual', 'topshop': 'Casual', 'gap': 'Casual', 'old navy': 'Casual',
  'american eagle': 'Casual', 'abercrombie & fitch': 'Casual', 'abercrombie': 'Casual',
  'calvin klein': 'Casual', 'tommy hilfiger': 'Casual', 'eloquii': 'Casual',
  'asos': 'Casual', 'amazon fashion': 'Casual',
  // Minimalist — clean lines, neutral palettes, quality basics
  'uniqlo': 'Minimalist', 'cos': 'Minimalist', 'everlane': 'Minimalist', 'allbirds': 'Minimalist',
  'true classic': 'Minimalist', 'fresh clean tees': 'Minimalist',
  'fresh clean tees canada': 'Minimalist', 'fresh clean threads': 'Minimalist',
  'eileen fisher': 'Minimalist', 'marine layer': 'Minimalist', "rothy's": 'Minimalist',
  'recurate': 'Minimalist', 'trove': 'Minimalist',
  // Loungewear — comfort-first, home & leisure, intimates
  'skims': 'Loungewear', 'savage x fenty': 'Loungewear',
  "victoria's secret": 'Loungewear', 'fabletics': 'Loungewear',
  // Bohemian — eclectic, flowy, earthy, artisanal
  'free people': 'Bohemian', 'anthropologie': 'Bohemian',
  'reformation': 'Bohemian', 'faherty': 'Bohemian',
  // Contemporary — modern polished everyday (default catch-all)
  'banana republic': 'Contemporary', 'j.crew': 'Contemporary', 'bonobos': 'Contemporary',
  'charles tyrwhitt': 'Contemporary', 'untuckit': 'Contemporary',
  'steve madden': 'Contemporary', 'ray-ban': 'Contemporary',
  'radial': 'Contemporary', 'custom club': 'Contemporary', 'project vermont': 'Contemporary',
  'authentic': 'Contemporary', 'phaidon': 'Contemporary', 'doraemon': 'Contemporary',
  'nordstrom': 'Contemporary', 'macys': 'Contemporary', 'target': 'Contemporary',
  'ok accessories': 'Contemporary', 'ok mens': 'Contemporary', 'ok unisex': 'Contemporary',
  'ok womens': 'Contemporary',
  // Outdoor & Active
  'patagonia': 'Outdoor & Active', "arc'teryx": 'Outdoor & Active', 'the north face': 'Outdoor & Active',
  'columbia': 'Outdoor & Active', 'salomon': 'Outdoor & Active', 'oakley': 'Outdoor & Active',
  'birkenstock': 'Outdoor & Active', 'dr. martens': 'Outdoor & Active', 'ugg': 'Outdoor & Active',
  // Workwear & Heritage
  'carhartt': 'Workwear & Heritage', "levi's": 'Workwear & Heritage', 'taylor stitch': 'Workwear & Heritage',
  'filson': 'Workwear & Heritage', 'roark': 'Workwear & Heritage',
  'buck mason': 'Workwear & Heritage', 'grayers': 'Workwear & Heritage', 'schott': 'Workwear & Heritage',
  // Surf & Skate
  'billabong': 'Surf & Skate', 'o5 billabong': 'Surf & Skate', 'rvca': 'Surf & Skate',
  'outerknown': 'Surf & Skate', 'vans': 'Surf & Skate', 'quiksilver': 'Surf & Skate',
  'volcom': 'Surf & Skate', 'world industries': 'Surf & Skate',
};

function getBrandGenre(brand: string): string {
  return BRAND_GENRE_MAP[brand.toLowerCase().trim()] ?? 'Contemporary';
}

// ─── Fabric & Fit extraction (regex-based) ──────────────────────────────────
// ─── Multi-signal fit & fabric extraction (mirrors categorize-products) ─────
const FIT_PATTERNS: [RegExp, string][] = [
  [/\bslim[- ]?fit\b/, "slim fit"],
  [/\bclassic[- ]?fit\b/, "classic fit"],
  [/\bregular[- ]?fit\b/, "regular fit"],
  [/\brelaxed[- ]?fit\b|\brelaxed\b/, "relaxed fit"],
  [/\bathletic[- ]?fit\b/, "athletic fit"],
  [/\bskinny[- ]?fit\b|\bskinny\b/, "skinny fit"],
  [/\bloose[- ]?fit\b|\bloose\b/, "loose fit"],
  [/\bstraight[- ]?fit\b|\bstraight[- ]?leg\b/, "straight fit"],
  [/\bmuscle[- ]?fit\b|\bmuscle\b/, "muscle fit"],
  [/\btailored[- ]?fit\b|\btailored\b/, "tailored fit"],
  [/\bmodern[- ]?fit\b/, "modern fit"],
  [/\bstandard[- ]?fit\b/, "standard fit"],
  [/\boversized?\b|\bover[- ]sized\b/, "oversized"],
  [/\bboxy\b/, "boxy"],
  [/\bcropped?\b|\bcrop\b/, "cropped"],
  [/\btapered?\b|\btaper\b/, "tapered"],
  [/\bdrop[- ]shoulder\b/, "drop shoulder"],
  [/\bwide[- ]?leg\b/, "wide leg"],
  [/\bbootcut\b|\bboot[- ]?cut\b/, "bootcut"],
  [/\bflare[d]?\b|\bflare[- ]?leg\b/, "flare"],
  [/\bfitted\b/, "fitted"],
  [/\ba[- ]?line\b/, "a-line"],
  [/\bbaggy\b/, "baggy"],
  [/\bslouchyy?\b/, "slouchy"],
  [/\blongline\b|\blong[- ]?line\b/, "longline"],
  [/\bheavy[- ]?weight\b/, "heavyweight"],
  [/\blight[- ]?weight\b/, "lightweight"],
  [/\bmid[- ]?weight\b/, "midweight"],
  [/\bhigh[- ]?rise\b|\bhigh[- ]?waist(ed)?\b/, "high rise"],
  [/\bmid[- ]?rise\b/, "mid rise"],
  [/\blow[- ]?rise\b/, "low rise"],
];

const BRAND_FIT_DEFAULTS: Record<string, string[]> = {
  "essentials": ["oversized"],
  "fear of god": ["oversized"],
  "true classic": ["athletic fit"],
  "lululemon": ["athletic fit"],
  "gymshark": ["athletic fit"],
  "carhartt": ["relaxed fit"],
  "dickies": ["relaxed fit"],
  "uniqlo": ["regular fit"],
  "nike": ["athletic fit"],
  "adidas": ["athletic fit"],
  "puma": ["athletic fit"],
  "palace skateboards": ["oversized"],
  "stüssy": ["oversized"],
  "supreme": ["oversized"],
  "off-white": ["oversized"],
  "corteiz": ["oversized"],
  "trapstar": ["oversized"],
  "rhone": ["athletic fit"],
  "vuori": ["relaxed fit"],
  "taylor stitch": ["classic fit"],
  "grayers": ["classic fit"],
  "bonobos": ["tailored fit"],
  "ralph lauren": ["classic fit"],
  "marine layer": ["relaxed fit"],
  "faherty": ["relaxed fit"],
  "outerknown": ["relaxed fit"],
  "roark": ["relaxed fit"],
  "free people": ["relaxed fit"],
  "reformation": ["slim fit"],
  "skims": ["fitted"],
  "mango": ["slim fit"],
  "zara": ["slim fit"],
  "h&m": ["regular fit"],
  "asos": ["regular fit"],
};

const CATEGORY_FIT_DEFAULTS: Record<string, string[]> = {
  "jeans": ["straight fit"],
  "leggings": ["fitted"],
  "blazers": ["tailored fit"],
  "activewear": ["athletic fit"],
  "swimwear": ["fitted"],
  "underwear": ["fitted"],
  "dresses": ["a-line"],
  "skirts": ["a-line"],
};

const FABRIC_PATTERNS: [RegExp, string][] = [
  [/\bcotton\b/, "cotton"],
  [/\bpolyester\b/, "polyester"],
  [/\bnylon\b/, "nylon"],
  [/\belastane\b|\bspandex\b|\blycra\b/, "elastane"],
  [/\brayon\b|\bviscose\b/, "rayon"],
  [/\bsilk\b/, "silk"],
  [/\bwool\b|\bmerino\b/, "wool"],
  [/\blinen\b/, "linen"],
  [/\bcashmere\b/, "cashmere"],
  [/\bdenim\b/, "denim"],
  [/\bfleece\b/, "fleece"],
  [/\bvelvet\b/, "velvet"],
  [/\bsuede\b/, "suede"],
  [/\bleather\b/, "leather"],
  [/\bfaux leather\b|\bvegan leather\b/, "faux leather"],
  [/\bcanvas\b/, "canvas"],
  [/\btwill\b/, "twill"],
  [/\bjersey\b/, "jersey"],
  [/\bchiffon\b/, "chiffon"],
  [/\bsatin\b/, "satin"],
  [/\blace\b/, "lace"],
  [/\bcorduroy\b/, "corduroy"],
  [/\bmodal\b/, "modal"],
  [/\btencel\b|\blyocell\b/, "tencel"],
  [/\bgore-?tex\b/, "gore-tex"],
  [/\bmesh\b/, "mesh"],
  [/\bripstop\b/, "ripstop"],
  [/\bpoplin\b/, "poplin"],
  [/\bchambray\b/, "chambray"],
  [/\bflannel\b/, "flannel"],
  [/\bterry\b|\bfrench terry\b/, "terry"],
  [/\bpiqué\b|\bpique\b/, "piqué"],
  [/\bsherpa\b/, "sherpa"],
];

function extractFitProfile(name: string, brand: string, category: string): string[] {
  const combined = name.toLowerCase();
  const hits = new Set<string>();
  for (const [regex, label] of FIT_PATTERNS) {
    if (regex.test(combined)) hits.add(label);
  }
  // Brand-level defaults when no fit detected from name
  if (hits.size === 0) {
    const brandLower = brand.toLowerCase().trim();
    if (BRAND_FIT_DEFAULTS[brandLower]) {
      BRAND_FIT_DEFAULTS[brandLower].forEach(d => hits.add(d));
    }
  }
  // Category-level defaults when still nothing
  if (hits.size === 0) {
    const catLower = category.toLowerCase().trim();
    if (CATEGORY_FIT_DEFAULTS[catLower]) {
      CATEGORY_FIT_DEFAULTS[catLower].forEach(d => hits.add(d));
    }
  }
  return [...hits];
}

function extractFabricComposition(text: string): string[] {
  const combined = text.toLowerCase();
  const hits = new Set<string>();
  for (const [regex, label] of FABRIC_PATTERNS) {
    if (regex.test(combined)) hits.add(label);
  }
  return [...hits];
}

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
  // "[Brand] for Women/Men" pattern
  /^[\w\s.'-]+\bfor\s+(women|men)\s*$/i,
  // "Women's/Men's [Brand] [Category]" e.g. "Women's Birkenstock Shoes"
  /^(women's?|men's?)\s+[\w\s.'-]+\s+(clothing|shoes|tops|bags|boots|sneakers|accessories|apparel|trainers|sandals|outfits|dresses)\s*$/i,
  // "Shop [Brand] Online" or "Shop [Brand]"
  /\bshop\s+[\w\s.'-]+\s+online\b/i,
  /^shop\s+[\w\s.'-]+$/i,
  // Ending with "| [Retailer]" e.g. "Men's Shoes | UNIQLO ES"
  /\|\s*(uniqlo|asos|zara|nordstrom|ssense|farfetch|net-a-porter|shopbop|mytheresa|end\.|mr\s*porter|revolve|saks|bloomingdale|etsy|nike|lululemon|adidas)\b/i,
  // "[Brand] [Category] - Etsy/ASOS/etc"
  /\b(clothing|shoes|tops|bags|accessories|apparel|trainers|outfits)\s*[-–—]\s*(etsy|asos|nordstrom|ssense|farfetch|zappos)/i,
  // "Women's [Brand] Clothing/Shoes/Accessories"
  /^(women's?|men's?)\s+[\w\s.'-]+\b(clothing|shoes|accessories|apparel|outfits)\b/i,
  // Generic listing with FREE SHIPPING, pipe-delimited retailer suffix
  /\bFREE\s+SHIPPING\b/i,
  // "Lifestyle. Nike CA" type pages
  /^(lifestyle|new\s+in|trending|best\s+sellers?|what's\s+new)\b.*\b(nike|adidas|puma|reebok|lululemon)\b/i,
  // "We Made Too Much" lululemon pages
  /\bwe\s+made\s+too\s+much\b/i,
  // Women's/Men's [Adjective] [Category] with no product specificity
  /^(women's?|men's?)\s+(black|white|red|blue|green|pink|large|small|medium|casual|formal|winter|summer|pocketed)\s+(tops|shoes|boots|bags|coats|jackets|dresses|pants|jeans|sandals|loafers|slip.?ons)\s*$/i,
  // "Women's [Brand] [Generic]" like "Women's BDG Urban Outfitters Clothing"
  /^(women's?|men's?)\s+[\w\s.'-]{3,}\s+(clothing|shoes|accessories)\b.*$/i,
  // Party outfits/wear listings
  /\b(party|night\s+out)\s+(outfits?|wear)\b/i,
  // Plus size category pages
  /\bplus\s+size\s+(jumpers|cardigans|dresses|tops|pants|jeans)\b/i,
  // "Women's/Men's [Category] | [anything]"
  /^(women's?|men's?)\s+\w+\s*\|/i,
  // Alexander McQueen Hi-Tops for Men (brand + generic category + "for")
  /^[\w\s.'-]+\b(hi-?tops|low-?tops|trainers|shoes|boots|sneakers|sandals)\s+for\s+(men|women)\s*$/i,
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
  const corsHeaders = getCorsHeaders(req);
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
    const maxItems = body.max_items ?? 99999;
    const startOffset = body.offset ?? 0;

    const stats = {
      checked: 0,
      listing_pages_deactivated: 0,
      non_products_deactivated: 0,
      too_short_deactivated: 0,
      categories_remapped: 0,
      genres_tagged: 0,
      already_clean: 0,
      fit_fabric_tagged: 0,
      dry_run: dryRun,
      samples: [] as { id: string; name: string; action: string; detail: string }[],
    };

    // Process in batches
    let offset = startOffset;
    let hasMore = true;

    while (hasMore && stats.checked < maxItems) {
      const { data: products, error } = await supabase
        .from("product_catalog")
        .select("id, name, brand, category, style_genre, is_active, fit_profile, fabric_composition")
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
      const toGenreTag: { id: string; genre: string }[] = [];
      const toFitFabric: { id: string; fit_profile: string[]; fabric_composition: string[] }[] = [];

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
        }

        // 5. Tag style_genre if missing or incorrect
        const correctGenre = getBrandGenre(product.brand || '');
        if (product.style_genre !== correctGenre) {
          toGenreTag.push({ id: product.id, genre: correctGenre });
          stats.genres_tagged++;
        }

        // 6. Extract fit_profile & fabric_composition if empty
        const existingFit: string[] = Array.isArray(product.fit_profile) ? product.fit_profile : [];
        const existingFabric: string[] = Array.isArray(product.fabric_composition) ? product.fabric_composition : [];
        if (existingFit.length === 0 || existingFabric.length === 0) {
          const fitProfile = existingFit.length === 0 ? extractFitProfile(name, product.brand || '', product.category || '') : existingFit;
          const fabricComp = existingFabric.length === 0 ? extractFabricComposition(name) : existingFabric;
          if (fitProfile.length > 0 || fabricComp.length > 0) {
            toFitFabric.push({ id: product.id, fit_profile: fitProfile, fabric_composition: fabricComp });
            stats.fit_fabric_tagged++;
          }
        }

        if (newCategory === product.category && product.style_genre === correctGenre) {
          stats.already_clean++;
        }
      }

      // Execute updates
      if (!dryRun) {
        // Batch deactivate
        if (toDeactivate.length > 0) {
          for (let i = 0; i < toDeactivate.length; i += 100) {
            const chunk = toDeactivate.slice(i, i + 100);
            await supabase
              .from("product_catalog")
              .update({ is_active: false, updated_at: new Date().toISOString() } as any)
              .in("id", chunk);
          }
        }

        // Batch remap categories
        for (const item of toRemap) {
          await supabase
            .from("product_catalog")
            .update({ category: item.newCategory, updated_at: new Date().toISOString() } as any)
            .eq("id", item.id);
        }

        // Batch genre tagging — group by genre for efficient bulk updates
        const genreGroups = new Map<string, string[]>();
        for (const item of toGenreTag) {
          if (!genreGroups.has(item.genre)) genreGroups.set(item.genre, []);
          genreGroups.get(item.genre)!.push(item.id);
        }
        for (const [genre, ids] of genreGroups) {
          for (let i = 0; i < ids.length; i += 100) {
            const chunk = ids.slice(i, i + 100);
            await supabase
              .from("product_catalog")
              .update({ style_genre: genre, updated_at: new Date().toISOString() } as any)
              .in("id", chunk);
          }
        }

        // Batch fit/fabric tagging — group by value for efficient bulk updates
        const fitGroups = new Map<string, string[]>();
        for (const item of toFitFabric) {
          const key = JSON.stringify({ f: item.fit_profile, c: item.fabric_composition });
          if (!fitGroups.has(key)) fitGroups.set(key, []);
          fitGroups.get(key)!.push(item.id);
        }
        for (const [key, ids] of fitGroups) {
          const { f, c } = JSON.parse(key);
          const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (f.length > 0) updatePayload.fit_profile = f;
          if (c.length > 0) updatePayload.fabric_composition = c;
          for (let i = 0; i < ids.length; i += 100) {
            const chunk = ids.slice(i, i + 100);
            await supabase
              .from("product_catalog")
              .update(updatePayload as any)
              .in("id", chunk);
          }
        }
      }

      if (products.length < batchSize) {
        hasMore = false;
      }
      offset += batchSize;
    }

    console.log(`Cleanup complete: ${stats.checked} checked, ${stats.listing_pages_deactivated} listing pages, ${stats.non_products_deactivated} non-products, ${stats.too_short_deactivated} too short, ${stats.categories_remapped} remapped, ${stats.genres_tagged} genres tagged, ${stats.fit_fabric_tagged} fit/fabric tagged`);

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
