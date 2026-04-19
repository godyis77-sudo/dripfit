import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { successResponse, errorResponse, getCorsHeaders } from "../_shared/validation.ts";

// Default HTTP User-Agent for Shopify and direct requests
const HTTP_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ScrapeMethod =
  | 'shopify'
  | 'direct'
  | 'search'
  | 'search_fallback'
  | 'retailer_jsonld'         // (legacy) parsed from retailer HTML via Firecrawl + JSON-LD
  | 'retailer_pdp'            // (legacy) PDP follow-up after a thin retailer listing stub
  | 'retailer_firecrawl_json'; // Firecrawl v2 JSON-schema array extraction (current path)

interface RawProduct {
  name: string;
  brand: string;
  product_url: string;
  price_cents: number | null;
  currency: string;
  image_urls: string[];
  category_raw: string | null;
  colour: string | null;
  description: string | null;
  _method?: ScrapeMethod;
}

interface ClassifiedProduct extends RawProduct {
  image_url: string;
  additional_images: string[];
  presentation: 'ghost_mannequin' | 'flat_lay' | 'model_shot';
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-INSERT QUALITY GATE — reject listing pages before they enter the catalog
// ─────────────────────────────────────────────────────────────────────────────

const LISTING_PAGE_NAME_PATTERNS = [
  /\bshop\s+(now|all|the|women|men|our)/i,
  /\bpage\s*\d+\s*\|/i,
  /\|\s*page\s*\d+/i,
  /\bsale\s*[&:]\s*clearance/i,
  /\bdesigner\s+(sale|finds|bags|shoes)/i,
  /\bshop\s+on\s+(farfetch|ssense|nordstrom)/i,
  /\bshop\s+now\s+(at|on)\b/i,
  /\|\s*(farfetch|ssense|nordstrom|net-a-porter|asos|uniqlo|mango|zara|shopbop|mytheresa|end\.|mr\s*porter|revolve|saks|bloomingdale)/i,
  /\bfor\s+(women|men)\s*[-|—]/i,
  /\b(women's|men's)\s+designer\b/i,
  /\b(women's|men's)\s+(sale|clothing|apparel)\b/i,
  /\bbrowse\s+(all|our|the)\b/i,
  /\bview\s+all\b/i,
  /\beverything\s+you\s+need/i,
  /\bnew\s+arrivals\s+(on|at)\b/i,
  /\bquick\s+shipping\b/i,
  /\bcare\s*(guide|&\s*repair|instruction)/i,
  /\bcustomer\s+service\b/i,
  /\bpre-owned\b.*\bfor\s+(women|men)\b/i,
  /^(women's?|men's?)\s+(tops|bags|shoes|boots|sneakers|dresses|pants|jeans|jackets)\s*$/i,
  /\b(perfume|cologne|fragrance|eau\s+de\s|edp\b|edt\b|candle|diffuser|incense|air\s*freshener|umbrella)\b/i,
];

function isListingPageName(name: string): boolean {
  return LISTING_PAGE_NAME_PATTERNS.some(p => p.test(name));
}

// ─────────────────────────────────────────────────────────────────────────────
// RETAILER CATEGORY URLs — with Firecrawl actions for JS-rendered pages
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryUrl {
  url: string;
  waitFor?: number;
  actions?: Array<{ type: string; selector?: string; milliseconds?: number }>;
}

// Helper to convert string URLs to CategoryUrl objects
function toUrlConfig(urls: string[], opts?: { waitFor?: number; actions?: Array<{ type: string; selector?: string; milliseconds?: number }> }): CategoryUrl[] {
  return urls.map(url => ({ url, ...opts }));
}

// Actions for common JS-rendered dropdown/filter patterns
const CLICK_LOAD_MORE: Array<{ type: string; selector: string; milliseconds: number }> = [
  { type: 'wait', selector: '', milliseconds: 2000 },
  { type: 'click', selector: 'button[data-testid="load-more"], button.load-more, [aria-label="Load more"], a.show-more, button:has-text("Show More"), button:has-text("Load More"), button:has-text("View More")', milliseconds: 1500 },
];

const SCROLL_TO_LOAD: Array<{ type: string; selector: string; milliseconds: number }> = [
  { type: 'wait', selector: '', milliseconds: 2000 },
  { type: 'scroll', selector: '', milliseconds: 3000 },
];

const CATEGORY_MAP: Record<string, Record<string, CategoryUrl[]>> = {
  zara: {
    tops:       toUrlConfig(['https://www.zara.com/us/en/man-tshirts-l855.html', 'https://www.zara.com/us/en/woman-tshirts-l1362.html'], { waitFor: 5000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.zara.com/us/en/man-trousers-l838.html', 'https://www.zara.com/us/en/woman-trousers-l1335.html'], { waitFor: 5000, actions: SCROLL_TO_LOAD }),
    shorts:     toUrlConfig(['https://www.zara.com/us/en/man-shorts-l838.html', 'https://www.zara.com/us/en/woman-shorts-l1355.html'], { waitFor: 5000 }),
    skirts:     toUrlConfig(['https://www.zara.com/us/en/woman-skirts-l1299.html'], { waitFor: 5000 }),
    swimwear:   toUrlConfig(['https://www.zara.com/us/en/man-swimwear-l4393.html', 'https://www.zara.com/us/en/woman-swimwear-l1352.html'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://www.zara.com/us/en/man-jackets-l825.html', 'https://www.zara.com/us/en/woman-jackets-l1114.html'], { waitFor: 5000 }),
    dresses:    toUrlConfig(['https://www.zara.com/us/en/woman-dresses-l1066.html'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.zara.com/us/en/man-shoes-l769.html', 'https://www.zara.com/us/en/woman-shoes-l1251.html'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.zara.com/us/en/man-accessories-l4734.html', 'https://www.zara.com/us/en/woman-accessories-l1011.html'], { waitFor: 5000 }),
    scarves:    toUrlConfig(['https://www.zara.com/us/en/woman-accessories-scarves-l1412.html'], { waitFor: 5000 }),
    loungewear: toUrlConfig(['https://www.zara.com/us/en/man-loungewear-l5932.html'], { waitFor: 5000 }),
  },
  hm: {
    tops:       toUrlConfig(['https://www2.hm.com/en_us/men/products/t-shirts-and-tanks.html?sort=stock&image-size=small&image=model&offset=0&page-size=72', 'https://www2.hm.com/en_us/women/products/tops.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www2.hm.com/en_us/men/products/pants.html?sort=stock&image-size=small&image=model&offset=0&page-size=72', 'https://www2.hm.com/en_us/women/products/pants.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www2.hm.com/en_us/men/products/shorts.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    skirts:     toUrlConfig(['https://www2.hm.com/en_us/women/products/skirts.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://www2.hm.com/en_us/men/products/swimwear.html?sort=stock&image-size=small&image=model&offset=0&page-size=72', 'https://www2.hm.com/en_us/women/products/swimwear.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    loungewear: toUrlConfig(['https://www2.hm.com/en_us/men/products/loungewear.html?sort=stock&image-size=small&image=model&offset=0&page-size=72', 'https://www2.hm.com/en_us/women/products/loungewear.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www2.hm.com/en_us/men/products/jackets-and-coats.html?sort=stock&image-size=small&image=model&offset=0&page-size=72', 'https://www2.hm.com/en_us/women/products/jackets-and-coats.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www2.hm.com/en_us/women/products/dresses.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www2.hm.com/en_us/men/products/shoes.html?sort=stock&image-size=small&image=model&offset=0&page-size=72', 'https://www2.hm.com/en_us/women/products/shoes.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www2.hm.com/en_us/men/products/accessories.html?sort=stock&image-size=small&image=model&offset=0&page-size=72', 'https://www2.hm.com/en_us/women/products/accessories.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    activewear: toUrlConfig(['https://www2.hm.com/en_us/women/products/sport.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
  },
  uniqlo: {
    tops:       toUrlConfig(['https://www.uniqlo.com/us/en/men/tops/t-shirts', 'https://www.uniqlo.com/us/en/women/tops/t-shirts'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.uniqlo.com/us/en/men/bottoms/pants', 'https://www.uniqlo.com/us/en/women/bottoms/pants'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.uniqlo.com/us/en/men/bottoms/shorts', 'https://www.uniqlo.com/us/en/women/bottoms/shorts'], { waitFor: 4000 }),
    swimwear:   toUrlConfig(['https://www.uniqlo.com/us/en/men/innerwear-and-loungewear/swimwear'], { waitFor: 4000 }),
    loungewear: toUrlConfig(['https://www.uniqlo.com/us/en/men/innerwear-and-loungewear/loungewear', 'https://www.uniqlo.com/us/en/women/innerwear-and-loungewear/loungewear'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.uniqlo.com/us/en/men/outerwear', 'https://www.uniqlo.com/us/en/women/outerwear'], { waitFor: 4000 }),
    dresses:    toUrlConfig(['https://www.uniqlo.com/us/en/women/dresses-and-jumpsuits'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://www.uniqlo.com/us/en/men/shoes-and-bags', 'https://www.uniqlo.com/us/en/women/shoes-and-bags'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://www.uniqlo.com/us/en/men/accessories-and-shoes'], { waitFor: 4000 }),
    skirts:     toUrlConfig(['https://www.uniqlo.com/us/en/women/bottoms/skirts'], { waitFor: 4000 }),
    activewear: toUrlConfig(['https://www.uniqlo.com/us/en/men/sport-utility-wear', 'https://www.uniqlo.com/us/en/women/sport-utility-wear'], { waitFor: 4000 }),
  },
  shein: {
    tops:       toUrlConfig(['https://us.shein.com/Men-T-Shirts-c-12206.html', 'https://us.shein.com/Women-T-Shirts-c-1738.html'], { waitFor: 5000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://us.shein.com/Men-Pants-c-12207.html', 'https://us.shein.com/Women-Pants-Leggings-c-1740.html'], { waitFor: 5000 }),
    shorts:     toUrlConfig(['https://us.shein.com/Men-Shorts-c-12209.html', 'https://us.shein.com/Women-Shorts-c-1912.html'], { waitFor: 5000 }),
    skirts:     toUrlConfig(['https://us.shein.com/Women-Skirts-c-1732.html'], { waitFor: 5000 }),
    swimwear:   toUrlConfig(['https://us.shein.com/Men-Swimwear-c-12210.html', 'https://us.shein.com/Women-Swimwear-c-1866.html'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://us.shein.com/Men-Jackets-Coats-c-12201.html', 'https://us.shein.com/Women-Jackets-c-1735.html'], { waitFor: 5000 }),
    dresses:    toUrlConfig(['https://us.shein.com/Women-Dresses-c-1727.html'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://us.shein.com/Men-Shoes-c-12211.html', 'https://us.shein.com/Women-Shoes-c-1745.html'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://us.shein.com/Men-Accessories-c-12214.html', 'https://us.shein.com/Women-Accessories-c-1764.html'], { waitFor: 5000 }),
    loungewear: toUrlConfig(['https://us.shein.com/Women-Loungewear-c-2189.html'], { waitFor: 5000 }),
    activewear: toUrlConfig(['https://us.shein.com/Women-Activewear-c-2220.html'], { waitFor: 5000 }),
    jewelry:    toUrlConfig(['https://us.shein.com/Women-Jewelry-c-1762.html'], { waitFor: 5000 }),
  },
  nike: {
    tops:       toUrlConfig(['https://www.nike.com/w/mens-tops-t-shirts-9om13zav4s6', 'https://www.nike.com/w/womens-tops-t-shirts-5e1x6z9om13'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.nike.com/w/mens-pants-tights-2kq19z6o5re', 'https://www.nike.com/w/womens-pants-tights-2kq19z5e1x6'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.nike.com/w/mens-shorts-38fphz6o5re', 'https://www.nike.com/w/womens-shorts-38fphz5e1x6'], { waitFor: 4000 }),
    swimwear:   toUrlConfig(['https://www.nike.com/w/mens-swimwear-3glsmz6o5re'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.nike.com/w/mens-jackets-vests-50r7yz6o5re', 'https://www.nike.com/w/womens-jackets-vests-50r7yz5e1x6'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://www.nike.com/w/mens-shoes-nik1zy7ok', 'https://www.nike.com/w/womens-shoes-5e1x6zy7ok'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://www.nike.com/w/mens-accessories-equipment-6o5rezawwv', 'https://www.nike.com/w/womens-accessories-equipment-5e1x6zawwv'], { waitFor: 4000 }),
    skirts:     toUrlConfig(['https://www.nike.com/w/womens-skirts-dresses-5e1x6z8y3qp'], { waitFor: 4000 }),
    activewear: toUrlConfig(['https://www.nike.com/w/mens-training-gym-clothing-58jtoznik1'], { waitFor: 4000 }),
  },
  asos: {
    tops:       toUrlConfig(['https://www.asos.com/us/men/t-shirts-vests/cat/?cid=7616&page=1', 'https://www.asos.com/us/women/tops/cat/?cid=4169&page=1'], { waitFor: 3000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.asos.com/us/men/pants-chinos/cat/?cid=4910', 'https://www.asos.com/us/women/pants-leggings/cat/?cid=7212'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.asos.com/us/men/shorts/cat/?cid=7078', 'https://www.asos.com/us/women/shorts/cat/?cid=9263'], { waitFor: 3000 }),
    skirts:     toUrlConfig(['https://www.asos.com/us/women/skirts/cat/?cid=2639'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://www.asos.com/us/men/swimwear/cat/?cid=13210', 'https://www.asos.com/us/women/swimwear-beachwear/cat/?cid=2238'], { waitFor: 3000 }),
    loungewear: toUrlConfig(['https://www.asos.com/us/men/loungewear/cat/?cid=28286', 'https://www.asos.com/us/women/loungewear/cat/?cid=21849'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.asos.com/us/men/jackets-coats/cat/?cid=3606', 'https://www.asos.com/us/women/jackets-coats/cat/?cid=2641'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.asos.com/us/women/dresses/cat/?cid=8799'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.asos.com/us/men/shoes/cat/?cid=1935', 'https://www.asos.com/us/women/shoes/cat/?cid=1931'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.asos.com/us/men/accessories/cat/?cid=4210', 'https://www.asos.com/us/women/accessories/cat/?cid=4174'], { waitFor: 3000 }),
    activewear: toUrlConfig(['https://www.asos.com/us/men/sportswear/cat/?cid=26090', 'https://www.asos.com/us/women/activewear/cat/?cid=26091'], { waitFor: 3000 }),
    jewelry:    toUrlConfig(['https://www.asos.com/us/women/jewelry-watches/cat/?cid=4175'], { waitFor: 3000 }),
  },
  // ── Sportswear & Athletic ──
  adidas: {
    tops:       toUrlConfig(['https://www.adidas.com/us/men-t_shirts', 'https://www.adidas.com/us/women-t_shirts'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.adidas.com/us/men-pants', 'https://www.adidas.com/us/women-pants'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.adidas.com/us/men-shorts', 'https://www.adidas.com/us/women-shorts'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.adidas.com/us/men-jackets', 'https://www.adidas.com/us/women-jackets'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://www.adidas.com/us/men-shoes', 'https://www.adidas.com/us/women-shoes'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://www.adidas.com/us/men-accessories', 'https://www.adidas.com/us/women-accessories'], { waitFor: 4000 }),
    activewear: toUrlConfig(['https://www.adidas.com/us/men-sport'], { waitFor: 4000 }),
  },
  'new balance': {
    tops:       toUrlConfig(['https://www.newbalance.com/men/clothing/tops/', 'https://www.newbalance.com/women/clothing/tops/']),
    bottoms:    toUrlConfig(['https://www.newbalance.com/men/clothing/pants-and-tights/', 'https://www.newbalance.com/women/clothing/pants-and-tights/']),
    shorts:     toUrlConfig(['https://www.newbalance.com/men/clothing/shorts/', 'https://www.newbalance.com/women/clothing/shorts/']),
    outerwear:  toUrlConfig(['https://www.newbalance.com/men/clothing/jackets-and-vests/', 'https://www.newbalance.com/women/clothing/jackets-and-vests/']),
    shoes:      toUrlConfig(['https://www.newbalance.com/men/shoes/', 'https://www.newbalance.com/women/shoes/']),
    accessories:toUrlConfig(['https://www.newbalance.com/men/accessories/', 'https://www.newbalance.com/women/accessories/']),
  },
  converse: {
    tops:       toUrlConfig(['https://www.converse.com/shop/mens-clothing', 'https://www.converse.com/shop/womens-clothing']),
    shoes:      toUrlConfig(['https://www.converse.com/shop/mens-sneakers', 'https://www.converse.com/shop/womens-sneakers']),
    accessories:toUrlConfig(['https://www.converse.com/shop/bags-and-backpacks']),
  },
  vans: {
    tops:       toUrlConfig(['https://www.vans.com/en-us/categories/mens-clothing-c3702', 'https://www.vans.com/en-us/categories/womens-clothing-c3802']),
    shoes:      toUrlConfig(['https://www.vans.com/en-us/categories/mens-shoes-c5702', 'https://www.vans.com/en-us/categories/womens-shoes-c5802']),
    accessories:toUrlConfig(['https://www.vans.com/en-us/categories/accessories-c22220']),
  },
  puma: {
    tops:       toUrlConfig(['https://us.puma.com/us/en/men/clothing/t-shirts', 'https://us.puma.com/us/en/women/clothing/tops-and-t-shirts']),
    bottoms:    toUrlConfig(['https://us.puma.com/us/en/men/clothing/pants', 'https://us.puma.com/us/en/women/clothing/pants']),
    shorts:     toUrlConfig(['https://us.puma.com/us/en/men/clothing/shorts', 'https://us.puma.com/us/en/women/clothing/shorts']),
    outerwear:  toUrlConfig(['https://us.puma.com/us/en/men/clothing/jackets', 'https://us.puma.com/us/en/women/clothing/jackets']),
    shoes:      toUrlConfig(['https://us.puma.com/us/en/men/shoes', 'https://us.puma.com/us/en/women/shoes']),
    accessories:toUrlConfig(['https://us.puma.com/us/en/men/accessories', 'https://us.puma.com/us/en/women/accessories']),
    activewear: toUrlConfig(['https://us.puma.com/us/en/men/clothing/training']),
  },
  // ── Outdoor & Active ──
  'the north face': {
    tops:       toUrlConfig(['https://www.thenorthface.com/en-us/mens/mens-tops-c211501', 'https://www.thenorthface.com/en-us/womens/womens-tops-c211601'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.thenorthface.com/en-us/mens/mens-bottoms-c211502', 'https://www.thenorthface.com/en-us/womens/womens-bottoms-c211602'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.thenorthface.com/en-us/mens/mens-jackets-and-vests-c211500', 'https://www.thenorthface.com/en-us/womens/womens-jackets-and-vests-c211600'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.thenorthface.com/en-us/mens/mens-footwear-c211504', 'https://www.thenorthface.com/en-us/womens/womens-footwear-c211604'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.thenorthface.com/en-us/mens/mens-accessories-c211506', 'https://www.thenorthface.com/en-us/womens/womens-accessories-c211606'], { waitFor: 3000 }),
    activewear: toUrlConfig(['https://www.thenorthface.com/en-us/activity/running-c100080'], { waitFor: 3000 }),
  },
  patagonia: {
    tops:       toUrlConfig(['https://www.patagonia.com/shop/mens-t-shirts-tanks', 'https://www.patagonia.com/shop/womens-t-shirts']),
    bottoms:    toUrlConfig(['https://www.patagonia.com/shop/mens-pants-jeans', 'https://www.patagonia.com/shop/womens-pants-jeans']),
    shorts:     toUrlConfig(['https://www.patagonia.com/shop/mens-shorts', 'https://www.patagonia.com/shop/womens-shorts']),
    outerwear:  toUrlConfig(['https://www.patagonia.com/shop/mens-jackets-vests', 'https://www.patagonia.com/shop/womens-jackets-vests']),
    accessories:toUrlConfig(['https://www.patagonia.com/shop/mens-hats', 'https://www.patagonia.com/shop/womens-hats']),
    swimwear:   toUrlConfig(['https://www.patagonia.com/shop/mens-boardshorts', 'https://www.patagonia.com/shop/womens-swimwear']),
    dresses:    toUrlConfig(['https://www.patagonia.com/shop/womens-dresses-skirts']),
  },
  lululemon: {
    tops:       toUrlConfig(['https://shop.lululemon.com/c/mens-shirts/_/N-8lu', 'https://shop.lululemon.com/c/women-tops/_/N-1z0xcmk'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://shop.lululemon.com/c/men-pants/_/N-8ti', 'https://shop.lululemon.com/c/womens-leggings/_/N-8r6'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://shop.lululemon.com/c/jackets-and-hoodies-jackets/_/N-8tb', 'https://shop.lululemon.com/c/women-jackets-and-hoodies/_/N-8s0'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://shop.lululemon.com/c/men-shoes/_/N-8vi', 'https://shop.lululemon.com/c/women-shoes/_/N-8z4'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://shop.lululemon.com/c/men-accessories/_/N-8lv', 'https://shop.lululemon.com/c/women-accessories/_/N-8rd'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://shop.lululemon.com/c/men-shorts/_/N-8tc', 'https://shop.lululemon.com/c/women-shorts/_/N-8s7'], { waitFor: 4000 }),
    dresses:    toUrlConfig(['https://shop.lululemon.com/c/women-dresses/_/N-8s2'], { waitFor: 4000 }),
    swimwear:   toUrlConfig(['https://shop.lululemon.com/c/women-swimsuits/_/N-8rz'], { waitFor: 4000 }),
  },
  salomon: {
    shoes:      toUrlConfig(['https://www.salomon.com/en-us/shop/men/shoes/trail-running-shoes.html', 'https://www.salomon.com/en-us/shop/women/shoes/trail-running-shoes.html']),
    outerwear:  toUrlConfig(['https://www.salomon.com/en-us/shop/men/clothing/jackets.html', 'https://www.salomon.com/en-us/shop/women/clothing/jackets.html']),
    accessories:toUrlConfig(['https://www.salomon.com/en-us/shop/men/accessories.html']),
    shorts:     toUrlConfig(['https://www.salomon.com/en-us/shop/men/clothing/shorts.html', 'https://www.salomon.com/en-us/shop/women/clothing/shorts.html']),
    tops:       toUrlConfig(['https://www.salomon.com/en-us/shop/men/clothing/t-shirts-polos.html', 'https://www.salomon.com/en-us/shop/women/clothing/t-shirts-polos.html']),
  },
  // ── Denim & Casual ──
  "levi's": {
    tops:       toUrlConfig(['https://www.levi.com/US/en_US/clothing/men/shirts/c/levi_clothing_men_shirts', 'https://www.levi.com/US/en_US/clothing/women/tops/c/levi_clothing_women_tops']),
    bottoms:    toUrlConfig(['https://www.levi.com/US/en_US/clothing/men/jeans/c/levi_clothing_men_jeans', 'https://www.levi.com/US/en_US/clothing/women/jeans/c/levi_clothing_women_jeans']),
    shorts:     toUrlConfig(['https://www.levi.com/US/en_US/clothing/men/shorts/c/levi_clothing_men_shorts', 'https://www.levi.com/US/en_US/clothing/women/shorts/c/levi_clothing_women_shorts']),
    outerwear:  toUrlConfig(['https://www.levi.com/US/en_US/clothing/men/trucker-jackets/c/levi_clothing_men_702trucker_jackets']),
    accessories:toUrlConfig(['https://www.levi.com/US/en_US/accessories/c/levi_accessories']),
    dresses:    toUrlConfig(['https://www.levi.com/US/en_US/clothing/women/dresses-jumpsuits/c/levi_clothing_women_dresses_jumpsuits']),
    skirts:     toUrlConfig(['https://www.levi.com/US/en_US/clothing/women/skirts/c/levi_clothing_women_skirts']),
  },
  carhartt: {
    tops:       toUrlConfig(['https://www.carhartt.com/search?q=t-shirt&cgid=men-shirts']),
    bottoms:    toUrlConfig(['https://www.carhartt.com/search?q=pants&cgid=men-pants']),
    shorts:     toUrlConfig(['https://www.carhartt.com/search?q=shorts&cgid=men-shorts']),
    outerwear:  toUrlConfig(['https://www.carhartt.com/search?q=jacket&cgid=men-outerwear']),
    accessories:toUrlConfig(['https://www.carhartt.com/men-accessories']),
  },
  // ── Boots & Footwear ──
  'dr. martens': {
    shoes:      toUrlConfig(['https://www.drmartens.com/us/en/boots/c/04010000', 'https://www.drmartens.com/us/en/sandals/c/04030000', 'https://www.drmartens.com/us/en/shoes/c/04020000']),
  },
  birkenstock: {
    shoes:      toUrlConfig(['https://www.birkenstock.com/us/women/sandals/', 'https://www.birkenstock.com/us/men/sandals/', 'https://www.birkenstock.com/us/women/clogs/', 'https://www.birkenstock.com/us/men/boots/'], { waitFor: 3000 }),
  },
  hoka: {
    shoes:      toUrlConfig(['https://www.hoka.com/en/us/mens-road/', 'https://www.hoka.com/en/us/womens-road/', 'https://www.hoka.com/en/us/mens-trail/', 'https://www.hoka.com/en/us/womens-trail/'], { waitFor: 3000 }),
  },
  'steve madden': {
    shoes:      toUrlConfig(['https://www.stevemadden.com/collections/womens-sneakers', 'https://www.stevemadden.com/collections/womens-boots', 'https://www.stevemadden.com/collections/womens-heels', 'https://www.stevemadden.com/collections/mens-shoes', 'https://www.stevemadden.com/collections/womens-sandals'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.stevemadden.com/collections/womens-handbags'], { waitFor: 3000 }),
  },
  ugg: {
    shoes:      toUrlConfig(['https://www.ugg.com/women-boots/', 'https://www.ugg.com/men-boots/', 'https://www.ugg.com/women-slippers/', 'https://www.ugg.com/men-slippers/', 'https://www.ugg.com/women-sandals/', 'https://www.ugg.com/women-sneakers/'], { waitFor: 3000 }),
  },
  // ── Eyewear ──
  'ray-ban': {
    accessories:toUrlConfig(['https://www.ray-ban.com/usa/sunglasses', 'https://www.ray-ban.com/usa/eyeglasses']),
  },
  oakley: {
    accessories:toUrlConfig(['https://www.oakley.com/en-us/category/sunglasses', 'https://www.oakley.com/en-us/category/prescription-eyewear']),
  },
  // ── Jewelry ──
  pandora: {
    accessories:toUrlConfig(['https://us.pandora.net/en/jewelry/', 'https://us.pandora.net/en/jewelry/necklaces/', 'https://us.pandora.net/en/jewelry/bracelets/']),
  },
  mejuri: {
    accessories:toUrlConfig(['https://mejuri.com/shop/t/type/necklaces', 'https://mejuri.com/shop/t/type/rings', 'https://mejuri.com/shop/t/type/earrings', 'https://mejuri.com/shop/t/type/bracelets']),
  },
  'tiffany & co': {
    accessories:toUrlConfig(['https://www.tiffany.com/jewelry/necklaces-pendants/', 'https://www.tiffany.com/jewelry/bracelets/', 'https://www.tiffany.com/jewelry/rings/']),
  },
  cartier: {
    accessories:toUrlConfig(['https://www.cartier.com/en-us/jewelry/bracelets/', 'https://www.cartier.com/en-us/jewelry/rings/', 'https://www.cartier.com/en-us/watches/']),
  },
  // ── Headwear ──
  'new era': {
    accessories:toUrlConfig(['https://www.neweracap.com/collections/59fifty-fitted', 'https://www.neweracap.com/collections/9forty', 'https://www.neweracap.com/collections/beanies']),
  },
  // ── Streetwear ──
  supreme: {
    tops:       toUrlConfig(['https://www.supremenewyork.com/shop/all/tops-sweaters']),
    outerwear:  toUrlConfig(['https://www.supremenewyork.com/shop/all/jackets']),
    bottoms:    toUrlConfig(['https://www.supremenewyork.com/shop/all/pants']),
    accessories:toUrlConfig(['https://www.supremenewyork.com/shop/all/hats', 'https://www.supremenewyork.com/shop/all/bags']),
  },
  palace: {
    tops:       toUrlConfig(['https://www.palaceskateboards.com/range/tops/']),
    outerwear:  toUrlConfig(['https://www.palaceskateboards.com/range/jackets/']),
    bottoms:    toUrlConfig(['https://www.palaceskateboards.com/range/bottoms/']),
    accessories:toUrlConfig(['https://www.palaceskateboards.com/range/hats/', 'https://www.palaceskateboards.com/range/accessories/']),
  },
  "stüssy": {
    tops:       toUrlConfig(['https://www.stussy.com/collections/tops']),
    bottoms:    toUrlConfig(['https://www.stussy.com/collections/bottoms']),
    shorts:     toUrlConfig(['https://www.stussy.com/collections/shorts']),
    outerwear:  toUrlConfig(['https://www.stussy.com/collections/outerwear']),
    accessories:toUrlConfig(['https://www.stussy.com/collections/accessories', 'https://www.stussy.com/collections/headwear']),
  },
  'off-white': {
    tops:       toUrlConfig(['https://www.off---white.com/en-us/collections/man-t-shirts', 'https://www.off---white.com/en-us/collections/woman-t-shirts']),
    outerwear:  toUrlConfig(['https://www.off---white.com/en-us/collections/man-outerwear', 'https://www.off---white.com/en-us/collections/woman-outerwear']),
    shoes:      toUrlConfig(['https://www.off---white.com/en-us/collections/man-shoes', 'https://www.off---white.com/en-us/collections/woman-shoes']),
    accessories:toUrlConfig(['https://www.off---white.com/en-us/collections/man-bags', 'https://www.off---white.com/en-us/collections/woman-bags']),
  },
  essentials: {
    tops:       toUrlConfig(['https://www.essentialsfog.com/collections/tops']),
    bottoms:    toUrlConfig(['https://www.essentialsfog.com/collections/bottoms']),
    outerwear:  toUrlConfig(['https://www.essentialsfog.com/collections/outerwear']),
    shorts:     toUrlConfig(['https://www.essentialsfog.com/collections/shorts']),
  },
  kith: {
    tops:       toUrlConfig(['https://kith.com/collections/mens-tops', 'https://kith.com/collections/womens-tops'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://kith.com/collections/mens-bottoms', 'https://kith.com/collections/womens-bottoms'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://kith.com/collections/mens-outerwear', 'https://kith.com/collections/womens-outerwear'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://kith.com/collections/mens-footwear', 'https://kith.com/collections/womens-footwear'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://kith.com/collections/mens-accessories', 'https://kith.com/collections/womens-accessories'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://kith.com/collections/mens-shorts'], { waitFor: 4000 }),
  },
  // ── Luxury ──
  gucci: {
    tops:       toUrlConfig(['https://www.gucci.com/us/en/ca/men/ready-to-wear/t-shirts-and-polos-c-men-readytowear-t-shirts-polos', 'https://www.gucci.com/us/en/ca/women/ready-to-wear/tops-c-women-readytowear-tops'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.gucci.com/us/en/ca/men/shoes-c-men-shoes', 'https://www.gucci.com/us/en/ca/women/shoes-c-women-shoes'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.gucci.com/us/en/ca/men/accessories/hats-and-gloves-c-men-accessories-hatsgloves', 'https://www.gucci.com/us/en/ca/women/handbags-c-women-handbags'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://www.gucci.com/us/en/ca/men/ready-to-wear/formal-jackets-c-men-readytowear-formaljackets'], { waitFor: 5000 }),
    jewelry:    toUrlConfig(['https://www.gucci.com/us/en/ca/jewelry-watches/jewelry-c-jewelry'], { waitFor: 5000 }),
  },
  prada: {
    tops:       toUrlConfig(['https://www.prada.com/us/en/men/ready-to-wear/t-shirts-and-polos.html'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.prada.com/us/en/men/shoes.html', 'https://www.prada.com/us/en/women/shoes.html'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.prada.com/us/en/men/accessories.html', 'https://www.prada.com/us/en/women/bags.html'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://www.prada.com/us/en/men/ready-to-wear/outerwear-and-coats.html'], { waitFor: 5000 }),
  },
  dior: {
    accessories:toUrlConfig(['https://www.dior.com/en_us/fashion/mens-fashion/bags', 'https://www.dior.com/en_us/fashion/womens-fashion/bags'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.dior.com/en_us/fashion/mens-fashion/shoes', 'https://www.dior.com/en_us/fashion/womens-fashion/shoes'], { waitFor: 5000 }),
    tops:       toUrlConfig(['https://www.dior.com/en_us/fashion/mens-fashion/ready-to-wear/t-shirts-and-polos'], { waitFor: 5000 }),
    jewelry:    toUrlConfig(['https://www.dior.com/en_us/fashion/womens-fashion/jewelry'], { waitFor: 5000 }),
  },
  'louis vuitton': {
    accessories:toUrlConfig(['https://us.louisvuitton.com/eng-us/men/bags/_/N-1eoopfs', 'https://us.louisvuitton.com/eng-us/women/handbags/_/N-tveguxb'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://us.louisvuitton.com/eng-us/men/shoes/_/N-1i09sii', 'https://us.louisvuitton.com/eng-us/women/shoes/_/N-t14g1rp'], { waitFor: 5000 }),
    tops:       toUrlConfig(['https://us.louisvuitton.com/eng-us/men/ready-to-wear/t-shirts/_/N-t1dzcauk'], { waitFor: 5000 }),
    jewelry:    toUrlConfig(['https://us.louisvuitton.com/eng-us/women/jewelry/_/N-t1mj5dtl'], { waitFor: 5000 }),
  },
  balenciaga: {
    shoes:      toUrlConfig(['https://www.balenciaga.com/en-us/men/shoes', 'https://www.balenciaga.com/en-us/women/shoes'], { waitFor: 5000 }),
    tops:       toUrlConfig(['https://www.balenciaga.com/en-us/men/ready-to-wear/t-shirts', 'https://www.balenciaga.com/en-us/women/ready-to-wear/t-shirts'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://www.balenciaga.com/en-us/men/ready-to-wear/coats-and-jackets'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.balenciaga.com/en-us/women/bags'], { waitFor: 5000 }),
  },
  'saint laurent': {
    outerwear:  toUrlConfig(['https://www.ysl.com/en-us/men/ready-to-wear/coats-and-trench-coats'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.ysl.com/en-us/men/shoes', 'https://www.ysl.com/en-us/women/shoes'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.ysl.com/en-us/women/handbags'], { waitFor: 5000 }),
    tops:       toUrlConfig(['https://www.ysl.com/en-us/men/ready-to-wear/t-shirts-and-sweatshirts'], { waitFor: 5000 }),
  },
  versace: {
    tops:       toUrlConfig(['https://www.versace.com/us/en/men/clothing/t-shirts/', 'https://www.versace.com/us/en/women/clothing/t-shirts/'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.versace.com/us/en/men/shoes/', 'https://www.versace.com/us/en/women/shoes/'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.versace.com/us/en/men/accessories/', 'https://www.versace.com/us/en/women/bags/'], { waitFor: 5000 }),
    jewelry:    toUrlConfig(['https://www.versace.com/us/en/women/jewelry/'], { waitFor: 5000 }),
  },
  burberry: {
    outerwear:  toUrlConfig(['https://us.burberry.com/mens-coats-jackets/', 'https://us.burberry.com/womens-coats-jackets/'], { waitFor: 5000 }),
    tops:       toUrlConfig(['https://us.burberry.com/mens-t-shirts/', 'https://us.burberry.com/womens-tops/'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://us.burberry.com/mens-accessories/', 'https://us.burberry.com/womens-bags/'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://us.burberry.com/mens-shoes/', 'https://us.burberry.com/womens-shoes/'], { waitFor: 5000 }),
    scarves:    toUrlConfig(['https://us.burberry.com/scarves/'], { waitFor: 5000 }),
  },
  // ── Women's Fashion ──
  'free people': {
    tops:       toUrlConfig(['https://www.freepeople.com/tops/']),
    dresses:    toUrlConfig(['https://www.freepeople.com/dresses/']),
    outerwear:  toUrlConfig(['https://www.freepeople.com/jackets/']),
    bottoms:    toUrlConfig(['https://www.freepeople.com/jeans/', 'https://www.freepeople.com/pants/']),
    shoes:      toUrlConfig(['https://www.freepeople.com/shoes/']),
    accessories:toUrlConfig(['https://www.freepeople.com/accessories/']),
    swimwear:   toUrlConfig(['https://www.freepeople.com/swimwear/']),
    activewear: toUrlConfig(['https://www.freepeople.com/activewear/']),
    skirts:     toUrlConfig(['https://www.freepeople.com/skirts/']),
  },
  reformation: {
    dresses:    toUrlConfig(['https://www.thereformation.com/categories/dresses'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    tops:       toUrlConfig(['https://www.thereformation.com/categories/tops'], { waitFor: 4000 }),
    bottoms:    toUrlConfig(['https://www.thereformation.com/categories/bottoms'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.thereformation.com/categories/jackets-coats'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://www.thereformation.com/categories/shoes'], { waitFor: 4000 }),
    swimwear:   toUrlConfig(['https://www.thereformation.com/categories/swimwear'], { waitFor: 4000 }),
    skirts:     toUrlConfig(['https://www.thereformation.com/categories/skirts'], { waitFor: 4000 }),
  },
  // ── Additional brands with direct URLs ──
  fabletics: {
    tops:       toUrlConfig(['https://www.fabletics.com/shop/tops'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.fabletics.com/shop/bottoms', 'https://www.fabletics.com/shop/leggings'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.fabletics.com/shop/jackets'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.fabletics.com/shop/shorts'], { waitFor: 4000 }),
    activewear: toUrlConfig(['https://www.fabletics.com/shop/sports-bras'], { waitFor: 4000 }),
  },
  gymshark: {
    tops:       toUrlConfig(['https://www.gymshark.com/collections/t-shirts-tops/mens', 'https://www.gymshark.com/collections/t-shirts-tops/womens'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.gymshark.com/collections/bottoms/mens', 'https://www.gymshark.com/collections/bottoms/womens'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.gymshark.com/collections/shorts/mens', 'https://www.gymshark.com/collections/shorts/womens'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.gymshark.com/collections/hoodies-jackets/mens', 'https://www.gymshark.com/collections/hoodies-jackets/womens'], { waitFor: 4000 }),
    activewear: toUrlConfig(['https://www.gymshark.com/collections/sport-bras/womens'], { waitFor: 4000 }),
  },
  'alo yoga': {
    tops:       toUrlConfig(['https://www.aloyoga.com/collections/mens-tops', 'https://www.aloyoga.com/collections/womens-tops'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.aloyoga.com/collections/mens-pants', 'https://www.aloyoga.com/collections/womens-leggings'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.aloyoga.com/collections/mens-jackets-coats', 'https://www.aloyoga.com/collections/womens-jackets-coats'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.aloyoga.com/collections/mens-shorts', 'https://www.aloyoga.com/collections/womens-shorts'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://www.aloyoga.com/collections/accessories'], { waitFor: 4000 }),
  },
  skims: {
    tops:       toUrlConfig(['https://skims.com/collections/tops'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://skims.com/collections/bottoms'], { waitFor: 4000 }),
    dresses:    toUrlConfig(['https://skims.com/collections/dresses'], { waitFor: 4000 }),
    loungewear: toUrlConfig(['https://skims.com/collections/loungewear'], { waitFor: 4000 }),
    swimwear:   toUrlConfig(['https://skims.com/collections/swim'], { waitFor: 4000 }),
    underwear:  toUrlConfig(['https://skims.com/collections/underwear'], { waitFor: 4000 }),
  },
  everlane: {
    tops:       toUrlConfig(['https://www.everlane.com/collections/womens-tees', 'https://www.everlane.com/collections/mens-tees'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.everlane.com/collections/womens-jeans', 'https://www.everlane.com/collections/mens-jeans'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.everlane.com/collections/womens-outerwear', 'https://www.everlane.com/collections/mens-outerwear'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.everlane.com/collections/womens-shoes', 'https://www.everlane.com/collections/mens-shoes'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.everlane.com/collections/womens-dresses'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.everlane.com/collections/mens-shorts'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.everlane.com/collections/womens-bags', 'https://www.everlane.com/collections/mens-bags'], { waitFor: 3000 }),
  },
  allsaints: {
    tops:       toUrlConfig(['https://www.allsaints.com/men/t-shirts/', 'https://www.allsaints.com/women/tops/'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.allsaints.com/men/leather-jackets/', 'https://www.allsaints.com/women/leather-jackets/', 'https://www.allsaints.com/men/coats/'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.allsaints.com/women/dresses/'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.allsaints.com/men/jeans/', 'https://www.allsaints.com/women/jeans/'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.allsaints.com/men/shoes/', 'https://www.allsaints.com/women/shoes/'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.allsaints.com/women/bags/'], { waitFor: 3000 }),
  },
  vuori: {
    tops:       toUrlConfig(['https://vuori.com/collections/mens-tops', 'https://vuori.com/collections/womens-tops'], { waitFor: 3000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://vuori.com/collections/mens-joggers-pants', 'https://vuori.com/collections/womens-joggers-pants'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://vuori.com/collections/mens-shorts', 'https://vuori.com/collections/womens-shorts'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://vuori.com/collections/mens-hoodies-jackets', 'https://vuori.com/collections/womens-hoodies-jackets'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://vuori.com/collections/womens-dresses-rompers'], { waitFor: 3000 }),
  },
  'buck mason': {
    tops:       toUrlConfig(['https://www.buckmason.com/collections/tees', 'https://www.buckmason.com/collections/shirts'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.buckmason.com/collections/pants', 'https://www.buckmason.com/collections/jeans'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.buckmason.com/collections/jackets'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.buckmason.com/collections/shorts'], { waitFor: 3000 }),
  },
  'on running': {
    shoes:      toUrlConfig(['https://www.on.com/en-us/collection/men/shoes', 'https://www.on.com/en-us/collection/women/shoes'], { waitFor: 4000 }),
    tops:       toUrlConfig(['https://www.on.com/en-us/collection/men/tops', 'https://www.on.com/en-us/collection/women/tops'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.on.com/en-us/collection/men/jackets', 'https://www.on.com/en-us/collection/women/jackets'], { waitFor: 4000 }),
    bottoms:    toUrlConfig(['https://www.on.com/en-us/collection/men/pants', 'https://www.on.com/en-us/collection/women/pants'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.on.com/en-us/collection/men/shorts', 'https://www.on.com/en-us/collection/women/shorts'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://www.on.com/en-us/collection/men/accessories'], { waitFor: 4000 }),
  },
  "arc'teryx": {
    outerwear:  toUrlConfig(['https://arcteryx.com/us/en/c/mens/shell-jackets', 'https://arcteryx.com/us/en/c/mens/insulated-jackets', 'https://arcteryx.com/us/en/c/womens/shell-jackets'], { waitFor: 4000 }),
    tops:       toUrlConfig(['https://arcteryx.com/us/en/c/mens/shirts-and-tops', 'https://arcteryx.com/us/en/c/womens/shirts-and-tops'], { waitFor: 4000 }),
    bottoms:    toUrlConfig(['https://arcteryx.com/us/en/c/mens/pants', 'https://arcteryx.com/us/en/c/womens/pants'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://arcteryx.com/us/en/c/mens/shorts', 'https://arcteryx.com/us/en/c/womens/shorts'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://arcteryx.com/us/en/c/mens/hats-caps', 'https://arcteryx.com/us/en/c/mens/packs-and-bags'], { waitFor: 4000 }),
  },
  untuckit: {
    tops:       toUrlConfig(['https://www.untuckit.com/collections/mens-shirts', 'https://www.untuckit.com/collections/mens-polos', 'https://www.untuckit.com/collections/womens-shirts'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.untuckit.com/collections/mens-pants', 'https://www.untuckit.com/collections/mens-jeans'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.untuckit.com/collections/mens-jackets-blazers'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.untuckit.com/collections/mens-shorts'], { waitFor: 3000 }),
  },
  suitsupply: {
    tops:       toUrlConfig(['https://suitsupply.com/en-us/men/shirts.html'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://suitsupply.com/en-us/men/jackets.html', 'https://suitsupply.com/en-us/men/coats.html'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://suitsupply.com/en-us/men/trousers.html'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://suitsupply.com/en-us/men/shoes.html'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://suitsupply.com/en-us/men/accessories.html'], { waitFor: 3000 }),
  },
  bonobos: {
    tops:       toUrlConfig(['https://bonobos.com/shop/tops/shirts', 'https://bonobos.com/shop/tops/polos', 'https://bonobos.com/shop/tops/tees'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://bonobos.com/shop/bottoms/pants', 'https://bonobos.com/shop/bottoms/jeans'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://bonobos.com/shop/bottoms/shorts'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://bonobos.com/shop/outerwear'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://bonobos.com/shop/swim'], { waitFor: 3000 }),
  },
  abercrombie: {
    tops:       toUrlConfig(['https://www.abercrombie.com/shop/us/mens-tees', 'https://www.abercrombie.com/shop/us/womens-tops'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.abercrombie.com/shop/us/mens-jeans', 'https://www.abercrombie.com/shop/us/womens-jeans'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.abercrombie.com/shop/us/mens-coats-jackets', 'https://www.abercrombie.com/shop/us/womens-coats-jackets'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.abercrombie.com/shop/us/womens-dresses'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.abercrombie.com/shop/us/mens-shorts', 'https://www.abercrombie.com/shop/us/womens-shorts'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://www.abercrombie.com/shop/us/mens-swimwear', 'https://www.abercrombie.com/shop/us/womens-swimwear'], { waitFor: 3000 }),
    activewear: toUrlConfig(['https://www.abercrombie.com/shop/us/womens-activewear'], { waitFor: 3000 }),
  },
  'american eagle': {
    tops:       toUrlConfig(['https://www.ae.com/us/en/c/men/tops/cat4840006', 'https://www.ae.com/us/en/c/women/tops/cat4840004'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.ae.com/us/en/c/men/bottoms/jeans/cat6470041', 'https://www.ae.com/us/en/c/women/bottoms/jeans/cat6470045'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.ae.com/us/en/c/men/tops/jackets-coats/cat4850018'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.ae.com/us/en/c/men/bottoms/shorts/cat6470042'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://www.ae.com/us/en/c/men/bottoms/swim/cat6470044'], { waitFor: 3000 }),
  },
  'tommy hilfiger': {
    tops:       toUrlConfig(['https://usa.tommy.com/en/men/men-shirts', 'https://usa.tommy.com/en/men/men-t-shirts', 'https://usa.tommy.com/en/women/women-tops'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://usa.tommy.com/en/men/men-pants', 'https://usa.tommy.com/en/men/men-jeans'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://usa.tommy.com/en/men/men-outerwear', 'https://usa.tommy.com/en/women/women-outerwear'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://usa.tommy.com/en/men/men-shoes', 'https://usa.tommy.com/en/women/women-shoes'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://usa.tommy.com/en/men/men-accessories', 'https://usa.tommy.com/en/women/women-accessories'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://usa.tommy.com/en/women/women-dresses'], { waitFor: 3000 }),
    underwear:  toUrlConfig(['https://usa.tommy.com/en/men/men-underwear'], { waitFor: 3000 }),
  },
  'calvin klein': {
    tops:       toUrlConfig(['https://www.calvinklein.us/en/mens-clothing-shirts', 'https://www.calvinklein.us/en/womens-clothing-tops'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.calvinklein.us/en/mens-clothing-pants', 'https://www.calvinklein.us/en/mens-clothing-jeans'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.calvinklein.us/en/mens-clothing-jackets-coats', 'https://www.calvinklein.us/en/womens-clothing-jackets-coats'], { waitFor: 3000 }),
    underwear:  toUrlConfig(['https://www.calvinklein.us/en/mens-underwear', 'https://www.calvinklein.us/en/womens-underwear'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.calvinklein.us/en/womens-clothing-dresses'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.calvinklein.us/en/mens-shoes', 'https://www.calvinklein.us/en/womens-shoes'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://www.calvinklein.us/en/womens-clothing-swimwear'], { waitFor: 3000 }),
  },
  'hugo boss': {
    tops:       toUrlConfig(['https://www.hugoboss.com/us/men-t-shirts/', 'https://www.hugoboss.com/us/women-tops/'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.hugoboss.com/us/men-pants/', 'https://www.hugoboss.com/us/women-pants/'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.hugoboss.com/us/men-jackets/', 'https://www.hugoboss.com/us/women-jackets/'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.hugoboss.com/us/men-shoes/', 'https://www.hugoboss.com/us/women-shoes/'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.hugoboss.com/us/women-dresses/'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.hugoboss.com/us/men-accessories/'], { waitFor: 3000 }),
  },
  'mizzen+main': {
    tops:       toUrlConfig(['https://www.mizzenandmain.com/collections/dress-shirts', 'https://www.mizzenandmain.com/collections/polos'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.mizzenandmain.com/collections/pants', 'https://www.mizzenandmain.com/collections/jeans'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.mizzenandmain.com/collections/shorts'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.mizzenandmain.com/collections/jackets'], { waitFor: 3000 }),
  },
  'eileen fisher': {
    tops:       toUrlConfig(['https://www.eileenfisher.com/tops/'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.eileenfisher.com/pants/', 'https://www.eileenfisher.com/skirts/'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.eileenfisher.com/dresses/'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.eileenfisher.com/jackets-coats/'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.eileenfisher.com/accessories/'], { waitFor: 3000 }),
  },
  'girlfriend collective': {
    tops:       toUrlConfig(['https://girlfriend.com/collections/tops'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://girlfriend.com/collections/leggings', 'https://girlfriend.com/collections/shorts'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://girlfriend.com/collections/outerwear'], { waitFor: 3000 }),
    activewear: toUrlConfig(['https://girlfriend.com/collections/sports-bras'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://girlfriend.com/collections/swim'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://girlfriend.com/collections/dresses'], { waitFor: 3000 }),
  },
  rhone: {
    tops:       toUrlConfig(['https://www.rhone.com/collections/mens-shirts'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.rhone.com/collections/mens-pants', 'https://www.rhone.com/collections/mens-joggers'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.rhone.com/collections/mens-shorts'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.rhone.com/collections/mens-outerwear'], { waitFor: 3000 }),
    activewear: toUrlConfig(['https://www.rhone.com/collections/mens-workout-tops'], { waitFor: 3000 }),
  },
  columbia: {
    tops:       toUrlConfig(['https://www.columbia.com/c/mens-shirts/', 'https://www.columbia.com/c/womens-shirts/'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.columbia.com/c/mens-jackets/', 'https://www.columbia.com/c/womens-jackets/'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.columbia.com/c/mens-pants-and-shorts/', 'https://www.columbia.com/c/womens-pants/'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.columbia.com/c/mens-footwear/', 'https://www.columbia.com/c/womens-footwear/'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.columbia.com/c/mens-shorts/', 'https://www.columbia.com/c/womens-shorts/'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.columbia.com/c/mens-accessories/', 'https://www.columbia.com/c/womens-accessories/'], { waitFor: 3000 }),
  },
  'under armour': {
    tops:       toUrlConfig(['https://www.underarmour.com/en-us/c/mens/tops/', 'https://www.underarmour.com/en-us/c/womens/tops/'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.underarmour.com/en-us/c/mens/bottoms/', 'https://www.underarmour.com/en-us/c/womens/bottoms/'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.underarmour.com/en-us/c/mens/shorts/'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.underarmour.com/en-us/c/mens/outerwear/', 'https://www.underarmour.com/en-us/c/womens/outerwear/'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.underarmour.com/en-us/c/mens/shoes/', 'https://www.underarmour.com/en-us/c/womens/shoes/'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.underarmour.com/en-us/c/mens/accessories/'], { waitFor: 3000 }),
  },
  gap: {
    tops:       toUrlConfig(['https://www.gap.com/browse/category.do?cid=5225', 'https://www.gap.com/browse/category.do?cid=8396'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.gap.com/browse/category.do?cid=6998', 'https://www.gap.com/browse/category.do?cid=5664'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.gap.com/browse/category.do?cid=48872'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.gap.com/browse/category.do?cid=8792'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.gap.com/browse/category.do?cid=35754'], { waitFor: 3000 }),
    activewear: toUrlConfig(['https://www.gap.com/browse/category.do?cid=1096862'], { waitFor: 3000 }),
  },
  // ── Department Store & Contemporary ──
  'tory burch': {
    shoes:      toUrlConfig(['https://www.toryburch.com/en-us/shoes/flats/', 'https://www.toryburch.com/en-us/shoes/sandals/', 'https://www.toryburch.com/en-us/shoes/sneakers/'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.toryburch.com/en-us/handbags/', 'https://www.toryburch.com/en-us/jewelry/'], { waitFor: 3000 }),
    tops:       toUrlConfig(['https://www.toryburch.com/en-us/clothing/tops/'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.toryburch.com/en-us/clothing/dresses/'], { waitFor: 3000 }),
  },
  sandro: {
    tops:       toUrlConfig(['https://us.sandro-paris.com/en/womens/clothing/tops/', 'https://us.sandro-paris.com/en/mens/clothing/t-shirts/'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://us.sandro-paris.com/en/womens/clothing/dresses/'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://us.sandro-paris.com/en/mens/clothing/coats-and-jackets/', 'https://us.sandro-paris.com/en/womens/clothing/coats-and-jackets/'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://us.sandro-paris.com/en/mens/clothing/pants/', 'https://us.sandro-paris.com/en/womens/clothing/pants/'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://us.sandro-paris.com/en/womens/accessories/shoes/'], { waitFor: 3000 }),
    skirts:     toUrlConfig(['https://us.sandro-paris.com/en/womens/clothing/skirts/'], { waitFor: 3000 }),
  },
  theory: {
    tops:       toUrlConfig(['https://www.theory.com/mens/tees', 'https://www.theory.com/womens/tops', 'https://www.theory.com/mens/shirts'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.theory.com/mens/pants', 'https://www.theory.com/womens/pants'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.theory.com/mens/outerwear', 'https://www.theory.com/womens/jackets'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.theory.com/womens/dresses'], { waitFor: 3000 }),
    skirts:     toUrlConfig(['https://www.theory.com/womens/skirts'], { waitFor: 3000 }),
  },
  reiss: {
    tops:       toUrlConfig(['https://www.reiss.com/us/mens/clothing/t-shirts/', 'https://www.reiss.com/us/womens/clothing/tops/'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.reiss.com/us/mens/clothing/trousers/', 'https://www.reiss.com/us/womens/clothing/trousers/'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.reiss.com/us/mens/clothing/coats-jackets/', 'https://www.reiss.com/us/womens/clothing/coats-jackets/'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.reiss.com/us/womens/clothing/dresses/'], { waitFor: 3000 }),
    skirts:     toUrlConfig(['https://www.reiss.com/us/womens/clothing/skirts/'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.reiss.com/us/womens/shoes/'], { waitFor: 3000 }),
  },
  'ted baker': {
    tops:       toUrlConfig(['https://www.tedbaker.com/us/mens/clothing/t-shirts', 'https://www.tedbaker.com/us/womens/clothing/tops'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.tedbaker.com/us/mens/clothing/coats-jackets', 'https://www.tedbaker.com/us/womens/clothing/coats-jackets'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.tedbaker.com/us/womens/clothing/dresses'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.tedbaker.com/us/mens/clothing/trousers'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.tedbaker.com/us/mens/shoes', 'https://www.tedbaker.com/us/womens/shoes'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.tedbaker.com/us/womens/bags'], { waitFor: 3000 }),
  },
  'true classic': {
    tops:       toUrlConfig(['https://trueclassictees.com/collections/mens-crew-neck-t-shirts', 'https://trueclassictees.com/collections/mens-v-neck-t-shirts', 'https://trueclassictees.com/collections/mens-polos'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://trueclassictees.com/collections/mens-pants-joggers'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://trueclassictees.com/collections/mens-hoodies-jackets'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://trueclassictees.com/collections/mens-shorts'], { waitFor: 3000 }),
    activewear: toUrlConfig(['https://trueclassictees.com/collections/mens-activewear'], { waitFor: 3000 }),
  },
  coach: {
    accessories:toUrlConfig(['https://www.coach.com/shop/women/bags', 'https://www.coach.com/shop/men/bags'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.coach.com/shop/women/shoes', 'https://www.coach.com/shop/men/shoes'], { waitFor: 3000 }),
    jewelry:    toUrlConfig(['https://www.coach.com/shop/women/jewelry'], { waitFor: 3000 }),
  },
  'kate spade': {
    accessories:toUrlConfig(['https://www.katespade.com/shop/handbags', 'https://www.katespade.com/shop/jewelry'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.katespade.com/shop/shoes'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.katespade.com/shop/clothing/dresses'], { waitFor: 3000 }),
  },
  'michael kors': {
    accessories:toUrlConfig(['https://www.michaelkors.com/women/handbags/_/N-289r', 'https://www.michaelkors.com/women/watches/_/N-28dp', 'https://www.michaelkors.com/men/bags/_/N-289u'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.michaelkors.com/women/shoes/_/N-289v', 'https://www.michaelkors.com/men/shoes/_/N-28at'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.michaelkors.com/women/clothing/dresses/_/N-289p'], { waitFor: 3000 }),
  },
  anthropologie: {
    tops:       toUrlConfig(['https://www.anthropologie.com/tops'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.anthropologie.com/dresses'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.anthropologie.com/jackets-coats'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.anthropologie.com/jewelry'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.anthropologie.com/pants'], { waitFor: 3000 }),
    skirts:     toUrlConfig(['https://www.anthropologie.com/skirts'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.anthropologie.com/shoes'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://www.anthropologie.com/swimwear'], { waitFor: 3000 }),
  },
  // ── Hollister ──
  hollister: {
    tops:       toUrlConfig(['https://www.hollisterco.com/shop/us/guys-t-shirts', 'https://www.hollisterco.com/shop/us/girls-tops'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.hollisterco.com/shop/us/guys-jeans', 'https://www.hollisterco.com/shop/us/girls-jeans'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.hollisterco.com/shop/us/guys-hoodies-sweatshirts'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.hollisterco.com/shop/us/girls-dresses-rompers'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.hollisterco.com/shop/us/guys-shorts'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://www.hollisterco.com/shop/us/guys-swim', 'https://www.hollisterco.com/shop/us/girls-swim'], { waitFor: 3000 }),
  },
  // ── J.Crew ──
  'j.crew': {
    tops:       toUrlConfig(['https://www.jcrew.com/c/mens/clothing/tees', 'https://www.jcrew.com/c/womens/clothing/tees'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.jcrew.com/c/mens/clothing/pants', 'https://www.jcrew.com/c/womens/clothing/pants'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.jcrew.com/c/mens/clothing/jackets-coats', 'https://www.jcrew.com/c/womens/clothing/jackets-blazers'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.jcrew.com/c/mens/shoes', 'https://www.jcrew.com/c/womens/shoes'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www.jcrew.com/c/mens/clothing/shorts'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://www.jcrew.com/c/mens/clothing/swimwear', 'https://www.jcrew.com/c/womens/clothing/swimwear'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.jcrew.com/c/womens/clothing/dresses'], { waitFor: 3000 }),
    skirts:     toUrlConfig(['https://www.jcrew.com/c/womens/clothing/skirts'], { waitFor: 3000 }),
  },
  // ── Ralph Lauren ──
  'ralph lauren': {
    tops:       toUrlConfig(['https://www.ralphlauren.com/men-clothing-t-shirts', 'https://www.ralphlauren.com/women-clothing-blouses-tops'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.ralphlauren.com/men-clothing-pants', 'https://www.ralphlauren.com/women-clothing-pants'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.ralphlauren.com/men-clothing-jackets-coats', 'https://www.ralphlauren.com/women-clothing-jackets-coats'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.ralphlauren.com/men-shoes', 'https://www.ralphlauren.com/women-shoes'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.ralphlauren.com/women-clothing-dresses'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.ralphlauren.com/men-accessories', 'https://www.ralphlauren.com/women-accessories'], { waitFor: 3000 }),
  },
  // ── Mango ──
  mango: {
    tops:       toUrlConfig(['https://shop.mango.com/us/en/men/t-shirts_c17864450', 'https://shop.mango.com/us/en/women/t-shirts_c67864430'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://shop.mango.com/us/en/men/pants_c17864454', 'https://shop.mango.com/us/en/women/pants_c67864434'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://shop.mango.com/us/en/men/jackets_c17864452', 'https://shop.mango.com/us/en/women/jackets_c67864442'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://shop.mango.com/us/en/women/dresses_c67864440'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://shop.mango.com/us/en/men/shoes_c17864462', 'https://shop.mango.com/us/en/women/shoes_c67864460'], { waitFor: 3000 }),
    skirts:     toUrlConfig(['https://shop.mango.com/us/en/women/skirts_c67864438'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://shop.mango.com/us/en/women/bags_c67864464'], { waitFor: 3000 }),
    jewelry:    toUrlConfig(['https://shop.mango.com/us/en/women/jewelry_c67864470'], { waitFor: 3000 }),
  },
  // ── COS ──
  cos: {
    tops:       toUrlConfig(['https://www.cos.com/en_usd/men/tops.html', 'https://www.cos.com/en_usd/women/tops.html'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.cos.com/en_usd/men/trousers.html', 'https://www.cos.com/en_usd/women/trousers.html'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.cos.com/en_usd/men/coats-and-jackets.html', 'https://www.cos.com/en_usd/women/coats-and-jackets.html'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.cos.com/en_usd/women/dresses.html'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.cos.com/en_usd/men/shoes.html', 'https://www.cos.com/en_usd/women/shoes.html'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.cos.com/en_usd/women/bags.html'], { waitFor: 3000 }),
  },
  // ── Charles Tyrwhitt ──
  'charles tyrwhitt': {
    tops:       toUrlConfig(['https://www.ctshirts.com/us/mens-shirts/CLB/', 'https://www.ctshirts.com/us/mens-casual-shirts/CLA/'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.ctshirts.com/us/mens-trousers/CLT/'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.ctshirts.com/us/mens-coats-and-jackets/CLJ/'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.ctshirts.com/us/mens-shoes/SHO/'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.ctshirts.com/us/mens-ties/TIE/', 'https://www.ctshirts.com/us/mens-belts/BEL/'], { waitFor: 3000 }),
  },
  // ── Multi-Brand Retailers (scrape luxury/streetwear from aggregators) ──
  ssense: {
    tops:       toUrlConfig(['https://www.ssense.com/en-us/men/t-shirts', 'https://www.ssense.com/en-us/women/t-shirts'], { waitFor: 5000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.ssense.com/en-us/men/pants', 'https://www.ssense.com/en-us/women/pants'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://www.ssense.com/en-us/men/jackets-coats', 'https://www.ssense.com/en-us/women/jackets-coats'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.ssense.com/en-us/men/sneakers', 'https://www.ssense.com/en-us/women/sneakers', 'https://www.ssense.com/en-us/men/boots', 'https://www.ssense.com/en-us/women/boots'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.ssense.com/en-us/men/bags', 'https://www.ssense.com/en-us/women/bags', 'https://www.ssense.com/en-us/women/jewelry'], { waitFor: 5000 }),
    shorts:     toUrlConfig(['https://www.ssense.com/en-us/men/shorts'], { waitFor: 5000 }),
    dresses:    toUrlConfig(['https://www.ssense.com/en-us/women/dresses'], { waitFor: 5000 }),
  },
  'end clothing': {
    tops:       toUrlConfig(['https://www.endclothing.com/us/clothing/t-shirts', 'https://www.endclothing.com/us/clothing/sweatshirts'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.endclothing.com/us/clothing/pants', 'https://www.endclothing.com/us/clothing/jeans'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.endclothing.com/us/clothing/jackets-coats'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://www.endclothing.com/us/footwear/sneakers', 'https://www.endclothing.com/us/footwear/boots'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://www.endclothing.com/us/accessories/bags', 'https://www.endclothing.com/us/accessories/hats-caps'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.endclothing.com/us/clothing/shorts'], { waitFor: 4000 }),
  },
  'mr porter': {
    tops:       toUrlConfig(['https://www.mrporter.com/en-us/mens/clothing/t-shirts', 'https://www.mrporter.com/en-us/mens/clothing/sweatshirts'], { waitFor: 4000 }),
    bottoms:    toUrlConfig(['https://www.mrporter.com/en-us/mens/clothing/trousers', 'https://www.mrporter.com/en-us/mens/clothing/jeans'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.mrporter.com/en-us/mens/clothing/coats-and-jackets'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://www.mrporter.com/en-us/mens/shoes/sneakers', 'https://www.mrporter.com/en-us/mens/shoes/boots'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://www.mrporter.com/en-us/mens/accessories/bags'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.mrporter.com/en-us/mens/clothing/shorts'], { waitFor: 4000 }),
  },
  // ── New Luxury Brand URLs ──
  balmain: {
    tops:       toUrlConfig(['https://www.balmain.com/us/en/men/ready-to-wear/t-shirts', 'https://www.balmain.com/us/en/women/ready-to-wear/tops'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://www.balmain.com/us/en/men/ready-to-wear/coats-jackets', 'https://www.balmain.com/us/en/women/ready-to-wear/coats-jackets'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.balmain.com/us/en/men/shoes', 'https://www.balmain.com/us/en/women/shoes'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.balmain.com/us/en/women/bags'], { waitFor: 5000 }),
    bottoms:    toUrlConfig(['https://www.balmain.com/us/en/men/ready-to-wear/pants-jeans'], { waitFor: 5000 }),
  },
  'tom ford': {
    tops:       toUrlConfig(['https://www.tomford.com/men/ready-to-wear/t-shirts-polos/'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://www.tomford.com/men/ready-to-wear/outerwear/'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.tomford.com/men/shoes/', 'https://www.tomford.com/women/shoes/'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.tomford.com/women/handbags/', 'https://www.tomford.com/men/accessories/'], { waitFor: 5000 }),
  },
  'palm angels': {
    tops:       toUrlConfig(['https://www.palmangels.com/en-us/men/clothing/t-shirts', 'https://www.palmangels.com/en-us/women/clothing/t-shirts'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://www.palmangels.com/en-us/men/clothing/jackets-coats'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.palmangels.com/en-us/men/shoes', 'https://www.palmangels.com/en-us/women/shoes'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.palmangels.com/en-us/men/accessories', 'https://www.palmangels.com/en-us/women/bags'], { waitFor: 5000 }),
  },
  amiri: {
    tops:       toUrlConfig(['https://amiri.com/collections/mens-tees', 'https://amiri.com/collections/mens-hoodies-sweaters'], { waitFor: 5000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://amiri.com/collections/mens-denim', 'https://amiri.com/collections/mens-pants'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://amiri.com/collections/mens-outerwear'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://amiri.com/collections/mens-footwear'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://amiri.com/collections/mens-accessories'], { waitFor: 5000 }),
  },
  'chrome hearts': {
    accessories:toUrlConfig(['https://www.chromeheartsusa.com/collections/jewelry', 'https://www.chromeheartsusa.com/collections/eyewear'], { waitFor: 5000 }),
  },
  'thom browne': {
    tops:       toUrlConfig(['https://www.thombrowne.com/us/shopping/man-t-shirts-1', 'https://www.thombrowne.com/us/shopping/man-shirts-1'], { waitFor: 5000 }),
    outerwear:  toUrlConfig(['https://www.thombrowne.com/us/shopping/man-coats-1', 'https://www.thombrowne.com/us/shopping/man-jackets-1'], { waitFor: 5000 }),
    bottoms:    toUrlConfig(['https://www.thombrowne.com/us/shopping/man-trousers-shorts-1'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.thombrowne.com/us/shopping/man-shoes-1'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.thombrowne.com/us/shopping/man-bags-1'], { waitFor: 5000 }),
  },
};

// ─── RETAILER DESIGNER-FILTERED URLS ─────────────────────────
// Maps a luxury brand → designer-filtered pages on scrape-friendly
// retailers. Use these as a fallback when direct brand scraping
// returns 403 (LV, Stone Island, Bottega, Arc'teryx, etc.).
//
// Conventions:
//   - Mr Porter  = MENS-only (no women's section exists)
//   - Net-a-Porter = WOMENS-only (sister site to Mr Porter)
//   - Farfetch   = broadest coverage incl. Louis Vuitton
//   - SSENSE     = mens + womens, but does NOT carry LV
//   - END Clothing = strong on streetwear/techwear (UK-stocked)
//
// Keys are lowercase. Callers MUST lowercase-normalize on lookup
// (e.g. RETAILER_DESIGNER_URLS[brand.toLowerCase().trim()]).
//
// WARNING: SSENSE / Mr Porter / Net-a-Porter / Farfetch all use
// Cloudflare bot protection. These URLs ONLY succeed via Firecrawl
// (rendered). Direct HTTP fetch = 403. Verify FIRECRAWL_API_KEY is
// connected before relying on this map.
// ────────────────────────────────────────────────────────────
const RETAILER_DESIGNER_URLS: Record<string, string[]> = {
  // ── Hard-luxury houses ──
  'louis vuitton': [
    'https://www.farfetch.com/shopping/men/louis-vuitton/items.aspx',
    'https://www.farfetch.com/shopping/women/louis-vuitton/items.aspx',
    'https://www.mrporter.com/en-us/mens/designer/louis-vuitton',
  ],
  'gucci': [
    'https://www.ssense.com/en-us/men/designers/gucci',
    'https://www.ssense.com/en-us/women/designers/gucci',
    'https://www.mrporter.com/en-us/mens/designer/gucci',
    'https://www.net-a-porter.com/en-us/shop/designer/gucci',
    'https://www.farfetch.com/shopping/men/gucci/items.aspx',
  ],
  'prada': [
    'https://www.ssense.com/en-us/men/designers/prada',
    'https://www.ssense.com/en-us/women/designers/prada',
    'https://www.mrporter.com/en-us/mens/designer/prada',
    'https://www.net-a-porter.com/en-us/shop/designer/prada',
  ],
  'dior': [
    'https://www.ssense.com/en-us/men/designers/dior-homme',
    'https://www.mrporter.com/en-us/mens/designer/dior-men',
    'https://www.farfetch.com/shopping/women/dior/items.aspx',
  ],
  'bottega veneta': [
    'https://www.ssense.com/en-us/men/designers/bottega-veneta',
    'https://www.ssense.com/en-us/women/designers/bottega-veneta',
    'https://www.mrporter.com/en-us/mens/designer/bottega-veneta',
    'https://www.net-a-porter.com/en-us/shop/designer/bottega-veneta',
  ],
  'versace': [
    'https://www.ssense.com/en-us/men/designers/versace',
    'https://www.ssense.com/en-us/women/designers/versace',
    'https://www.net-a-porter.com/en-us/shop/designer/versace',
  ],
  'saint laurent': [
    'https://www.ssense.com/en-us/men/designers/saint-laurent',
    'https://www.ssense.com/en-us/women/designers/saint-laurent',
    'https://www.mrporter.com/en-us/mens/designer/saint-laurent',
    'https://www.net-a-porter.com/en-us/shop/designer/saint-laurent',
  ],
  'balenciaga': [
    'https://www.ssense.com/en-us/men/designers/balenciaga',
    'https://www.ssense.com/en-us/women/designers/balenciaga',
    'https://www.net-a-porter.com/en-us/shop/designer/balenciaga',
  ],
  'celine': [
    'https://www.ssense.com/en-us/men/designers/celine',
    'https://www.ssense.com/en-us/women/designers/celine',
    'https://www.net-a-porter.com/en-us/shop/designer/celine',
  ],
  'loewe': [
    'https://www.ssense.com/en-us/men/designers/loewe',
    'https://www.ssense.com/en-us/women/designers/loewe',
    'https://www.mrporter.com/en-us/mens/designer/loewe',
    'https://www.net-a-porter.com/en-us/shop/designer/loewe',
  ],
  // ── Techwear / outdoor luxury ──
  'stone island': [
    'https://www.ssense.com/en-us/men/designers/stone-island',
    'https://www.mrporter.com/en-us/mens/designer/stone-island',
    'https://www.endclothing.com/us/brands/stone-island',
  ],
  "arc'teryx": [
    'https://www.ssense.com/en-us/men/designers/arcteryx',
    'https://www.endclothing.com/us/brands/arcteryx',
  ],
  // ── Luxury streetwear bridge ──
  'off-white': [
    'https://www.ssense.com/en-us/men/designers/off-white',
    'https://www.ssense.com/en-us/women/designers/off-white',
    'https://www.endclothing.com/us/brands/off-white',
  ],
  // ── Avant-garde ──
  'rick owens': [
    'https://www.ssense.com/en-us/men/designers/rick-owens',
    'https://www.ssense.com/en-us/women/designers/rick-owens',
    'https://www.net-a-porter.com/en-us/shop/designer/rick-owens',
  ],
  'maison margiela': [
    'https://www.ssense.com/en-us/men/designers/maison-margiela',
    'https://www.ssense.com/en-us/women/designers/maison-margiela',
    'https://www.net-a-porter.com/en-us/shop/designer/maison-margiela',
  ],
  'acne studios': [
    'https://www.ssense.com/en-us/men/designers/acne-studios',
    'https://www.ssense.com/en-us/women/designers/acne-studios',
    'https://www.net-a-porter.com/en-us/shop/designer/acne-studios',
  ],
  'jacquemus': [
    'https://www.ssense.com/en-us/men/designers/jacquemus',
    'https://www.ssense.com/en-us/women/designers/jacquemus',
    'https://www.net-a-porter.com/en-us/shop/designer/jacquemus',
  ],
  'ami paris': [
    'https://www.ssense.com/en-us/men/designers/ami-alexandre-mattiussi',
    'https://www.net-a-porter.com/en-us/shop/designer/ami-paris',
  ],
  'sacai': [
    'https://www.ssense.com/en-us/men/designers/sacai',
    'https://www.ssense.com/en-us/women/designers/sacai',
  ],
  'moncler': [
    'https://www.ssense.com/en-us/men/designers/moncler',
    'https://www.mrporter.com/en-us/mens/designer/moncler',
    'https://www.net-a-porter.com/en-us/shop/designer/moncler',
  ],
  'fendi': [
    'https://www.ssense.com/en-us/men/designers/fendi',
    'https://www.ssense.com/en-us/women/designers/fendi',
    'https://www.net-a-porter.com/en-us/shop/designer/fendi',
  ],
  'burberry': [
    'https://www.ssense.com/en-us/men/designers/burberry',
    'https://www.mrporter.com/en-us/mens/designer/burberry',
    'https://www.net-a-porter.com/en-us/shop/designer/burberry',
  ],
  'valentino': [
    'https://www.ssense.com/en-us/men/designers/valentino',
    'https://www.ssense.com/en-us/women/designers/valentino',
    'https://www.net-a-porter.com/en-us/shop/designer/valentino',
  ],
  'alexander mcqueen': [
    'https://www.ssense.com/en-us/men/designers/alexander-mcqueen',
    'https://www.net-a-porter.com/en-us/shop/designer/alexander-mcqueen',
  ],
  'givenchy': [
    'https://www.ssense.com/en-us/men/designers/givenchy',
    'https://www.net-a-porter.com/en-us/shop/designer/givenchy',
  ],
};

// Brands that block direct scraping — use search fallback
const ANTI_SCRAPE_BRANDS = new Set([
  'hm', 'h&m', 'zara', 'uniqlo', 'shein', 'nike', 'asos',
  'burberry', 'patagonia', 'supreme', 'palace', 'louis vuitton',
  'prada', 'dior', 'balenciaga', 'saint laurent', 'off-white',
  'essentials', 'cartier', 'tiffany & co', 'pandora', 'new era',
  'fendi', 'givenchy', 'valentino', 'alexander mcqueen', 'bottega veneta',
  'celine', 'loewe', 'moncler', 'stone island', 'acne studios',
  'ami paris', 'jacquemus', 'rick owens', 'maison margiela',
  'a bathing ape', 'kith', 'corteiz', 'trapstar', 'fear of god',
  'jordan', 'under armour', 'reebok', 'asics', 'on running', 'hoka', 'saucony',
  'mango', 'cos', '& other stories', 'urban outfitters', 'forever 21',
  'fashion nova', 'prettylittlething', 'boohoo', 'missguided', 'topshop',
  'columbia', 'arc\'teryx', 'gap', 'banana republic', 'old navy',
  'j.crew', 'ralph lauren', 'tommy hilfiger', 'calvin klein', 'hugo boss',
  'nordstrom', 'anthropologie', 'aritzia', 'revolve', 'everlane',
  'abercrombie', 'american eagle', 'hollister',
  'birkenstock', 'crocs', 'timberland', 'steve madden', 'allbirds', 'clarks',
  'swarovski', 'kendra_scott',
  'macys', "macy's", 'bloomingdales', "bloomingdale's", 'jcpenney',
  'target', 'walmart', 'kohls', "kohl's",
  // Additional blocked brands + known timeout offenders
  'fabletics', 'gymshark', 'alo yoga', 'skims', 'allsaints', 'vuori',
  'puma', 'vans', 'gucci',
]);

// ─────────────────────────────────────────────────────────────────────────────
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, options);
      // Retry on 429 (rate limit) and 5xx server errors
      if (resp.status === 429 || resp.status >= 500) {
        const retryAfter = resp.headers.get('retry-after');
        const delayMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[retry] ${resp.status} on attempt ${attempt + 1}, waiting ${Math.round(delayMs)}ms`);
        await resp.text(); // consume body
        await delay(delayMs);
        continue;
      }
      return resp;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[retry] Network error on attempt ${attempt + 1}: ${(err as Error).message}, waiting ${Math.round(delayMs)}ms`);
        await delay(delayMs);
      }
    }
  }
  throw lastError || new Error('All retries exhausted');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP + CRAWL — Firecrawl site discovery & recursive scraping
// ─────────────────────────────────────────────────────────────────────────────

// Brand domain mapping for /v1/map
const BRAND_DOMAINS: Record<string, string> = {
  zara: 'https://www.zara.com', hm: 'https://www2.hm.com', 'h&m': 'https://www2.hm.com',
  uniqlo: 'https://www.uniqlo.com', nike: 'https://www.nike.com', adidas: 'https://www.adidas.com',
  asos: 'https://www.asos.com', shein: 'https://us.shein.com', mango: 'https://shop.mango.com',
  cos: 'https://www.cos.com', gap: 'https://www.gap.com', 'banana republic': 'https://www.bananarepublic.com',
  'old navy': 'https://www.oldnavy.com', 'j.crew': 'https://www.jcrew.com',
  'ralph lauren': 'https://www.ralphlauren.com', 'tommy hilfiger': 'https://www.tommy.com',
  'calvin klein': 'https://www.calvinklein.us', 'hugo boss': 'https://www.hugoboss.com',
  'the north face': 'https://www.thenorthface.com', patagonia: 'https://www.patagonia.com',
  lululemon: 'https://shop.lululemon.com', 'new balance': 'https://www.newbalance.com',
  puma: 'https://us.puma.com', converse: 'https://www.converse.com', vans: 'https://www.vans.com',
  "levi's": 'https://www.levi.com', carhartt: 'https://www.carhartt.com',
  nordstrom: 'https://www.nordstrom.com', anthropologie: 'https://www.anthropologie.com',
  'free people': 'https://www.freepeople.com', reformation: 'https://www.thereformation.com',
  aritzia: 'https://www.aritzia.com', revolve: 'https://www.revolve.com',
  everlane: 'https://www.everlane.com', abercrombie: 'https://www.abercrombie.com',
  'american eagle': 'https://www.ae.com', hollister: 'https://www.hollisterco.com',
  'under armour': 'https://www.underarmour.com', columbia: 'https://www.columbia.com',
  'dr. martens': 'https://www.drmartens.com', birkenstock: 'https://www.birkenstock.com',
  crocs: 'https://www.crocs.com', timberland: 'https://www.timberland.com',
  'steve madden': 'https://www.stevemadden.com', allbirds: 'https://www.allbirds.com',
  vuori: 'https://vuori.com', gymshark: 'https://www.gymshark.com',
  'alo yoga': 'https://www.aloyoga.com', skims: 'https://skims.com',
  allsaints: 'https://www.allsaints.com', fabletics: 'https://www.fabletics.com',
  "stüssy": 'https://www.stussy.com', kith: 'https://kith.com',
  'buck mason': 'https://www.buckmason.com', 'on running': 'https://www.on.com',
  "arc'teryx": 'https://arcteryx.com', untuckit: 'https://www.untuckit.com',
  suitsupply: 'https://suitsupply.com', bonobos: 'https://bonobos.com',
  'tommy hilfiger': 'https://usa.tommy.com', 'calvin klein': 'https://www.calvinklein.us',
  'hugo boss': 'https://www.hugoboss.com', 'mizzen+main': 'https://www.mizzenandmain.com',
  'eileen fisher': 'https://www.eileenfisher.com', 'girlfriend collective': 'https://girlfriend.com',
  rhone: 'https://www.rhone.com', 'under armour': 'https://www.underarmour.com',
  ugg: 'https://www.ugg.com', 'tory burch': 'https://www.toryburch.com',
  sandro: 'https://us.sandro-paris.com', theory: 'https://www.theory.com',
  reiss: 'https://www.reiss.com', 'ted baker': 'https://www.tedbaker.com',
  'true classic': 'https://trueclassictees.com', coach: 'https://www.coach.com',
  'kate spade': 'https://www.katespade.com', 'michael kors': 'https://www.michaelkors.com',
  hoka: 'https://www.hoka.com', 'steve madden': 'https://www.stevemadden.com',
  'fashion nova': 'https://www.fashionnova.com', 'princess polly': 'https://www.princesspolly.com',
  'oh polly': 'https://www.ohpolly.com', 'cider': 'https://www.shopcider.com',
  'cuts': 'https://www.cutsclothing.com', 'good american': 'https://www.goodamerican.com',
  'torrid': 'https://www.torrid.com', 'eloquii': 'https://www.eloquii.com',
  // ── New luxury/streetwear brands ──
  ssense: 'https://www.ssense.com', 'end clothing': 'https://www.endclothing.com',
  'mr porter': 'https://www.mrporter.com', 'net-a-porter': 'https://www.net-a-porter.com',
  balmain: 'https://www.balmain.com', 'tom ford': 'https://www.tomford.com',
  'palm angels': 'https://www.palmangels.com', amiri: 'https://amiri.com',
  'chrome hearts': 'https://www.chromeheartsusa.com', 'thom browne': 'https://www.thombrowne.com',
  represent: 'https://representclo.com', 'eric emanuel': 'https://www.ericemanuel.com',
  'gallery dept': 'https://gallerydept.com', rhude: 'https://www.rhude.com',
  'daily paper': 'https://www.dailypaperclothing.com', 'golden goose': 'https://www.goldengoose.com',
  'dsquared2': 'https://www.dsquared2.com', 'dolce & gabbana': 'https://www.dolcegabbana.com',
  'jw anderson': 'https://www.jwanderson.com', 'brunello cucinelli': 'https://www.brunellocucinelli.com',
  'issey miyake': 'https://www.isseymiyake.com', coperni: 'https://coperni.com',
  alaia: 'https://mafrfrancemaison-alaia.com', 'human made': 'https://humanmade.jp',
  undercover: 'https://www.undercoverism.com', neighborhood: 'https://www.neighborhood.jp',
  needles: 'https://www.needles.jp', 'comme des garcons': 'https://www.commedesgarcons.com',
  vetements: 'https://vetementswebsite.com', sacai: 'https://www.sacai.jp',
  'missing since thursday': 'https://missingsincethursday.com',
};

// ─────────────────────────────────────────────────────────────────────────────
// SHOPIFY /products.json — FREE structured product data, zero credits
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registry of brands powered by Shopify. Maps brand key → Shopify store base URL.
 * These stores expose /products.json and /collections/{handle}/products.json
 * which return fully structured product data with zero scraping cost.
 */
const SHOPIFY_STORES: Record<string, { domain: string; collections?: Record<string, string[]> }> = {
  // ── Streetwear & Hype ──
  "stüssy":             { domain: 'https://www.stussy.com', collections: { tops: ['tops'], bottoms: ['bottoms'], shorts: ['shorts'], outerwear: ['outerwear'], accessories: ['accessories', 'headwear'] } },
  palace:               { domain: 'https://www.palaceskateboards.com', collections: { tops: ['tops'], outerwear: ['jackets'], bottoms: ['bottoms'], accessories: ['hats', 'accessories'] } },
  represent:            { domain: 'https://representclo.com', collections: { tops: ['t-shirts', 'hoodies-sweatshirts'], bottoms: ['trousers', 'jeans'], shorts: ['shorts'], outerwear: ['jackets-coats'], shoes: ['footwear'], accessories: ['headwear'] } },
  'eric emanuel':       { domain: 'https://www.ericemanuel.com', collections: { shorts: ['shorts'], tops: ['t-shirts', 'hoodies'], accessories: ['headwear'] } },
  'gallery dept':       { domain: 'https://gallerydept.com', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['outerwear'], accessories: ['hats'] } },
  'daily paper':        { domain: 'https://www.dailypaperclothing.com', collections: { tops: ['t-shirts', 'hoodies-sweaters'], bottoms: ['pants'], shorts: ['shorts'], outerwear: ['jackets-coats'], accessories: ['hats', 'bags'] } },
  'missing since thursday': { domain: 'https://missingsincethursday.com', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['jackets'], shorts: ['shorts'], accessories: ['headwear'] } },
  'human made':         { domain: 'https://humanmade.jp', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['outer'], shorts: ['shorts'], accessories: ['accessories', 'headwear'] } },
  rhude:                { domain: 'https://www.rhude.com', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['outerwear'], shorts: ['shorts'], accessories: ['accessories'] } },
  'needles':            { domain: 'https://www.needles.jp', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['outerwear'], shorts: ['shorts'] } },
  'aimé leon dore':     { domain: 'https://www.aimeleondore.com', collections: { tops: ['t-shirts', 'shirts', 'sweaters', 'sweatshirts'], bottoms: ['pants', 'denim'], outerwear: ['jackets', 'outerwear'], shorts: ['shorts'], shoes: ['footwear'], accessories: ['hats', 'accessories'] } },
  'aime leon dore':     { domain: 'https://www.aimeleondore.com', collections: { tops: ['t-shirts', 'shirts', 'sweaters', 'sweatshirts'], bottoms: ['pants', 'denim'], outerwear: ['jackets', 'outerwear'], shorts: ['shorts'], shoes: ['footwear'], accessories: ['hats', 'accessories'] } },
  'saturdays nyc':      { domain: 'https://www.saturdaysnyc.com', collections: { tops: ['t-shirts', 'shirts', 'sweatshirts'], bottoms: ['pants'], outerwear: ['outerwear'], shorts: ['shorts'], swimwear: ['swim'], accessories: ['hats', 'accessories'] } },
  // ── Athletic & Active ──
  gymshark:             { domain: 'https://www.gymshark.com', collections: { tops: ['t-shirts-tops'], bottoms: ['joggers', 'leggings'], shorts: ['shorts'], outerwear: ['hoodies-jackets'], accessories: ['accessories'] } },
  'gore wear':          { domain: 'https://www.gorewear.com', collections: { tops: ['mens-jerseys', 'womens-jerseys'], bottoms: ['mens-tights', 'womens-tights'], outerwear: ['mens-jackets', 'womens-jackets'], shorts: ['mens-shorts', 'womens-shorts'], accessories: ['accessories'] } },
  // ── Fashion & Contemporary ──
  reformation:          { domain: 'https://www.thereformation.com', collections: { dresses: ['dresses'], tops: ['tops'], bottoms: ['bottoms'], outerwear: ['jackets-coats'], shoes: ['shoes'], swimwear: ['swimwear'], skirts: ['skirts'] } },
  'colourpop':          { domain: 'https://www.colourpop.com', collections: { accessories: ['face', 'lips', 'eyes'] } },
  "rothy's":            { domain: 'https://www.rothys.com', collections: { shoes: ['womens-flats', 'womens-sneakers', 'mens-shoes'], accessories: ['bags'] } },
  'oliver peoples':     { domain: 'https://www.oliverpeoples.com', collections: { accessories: ['sunglasses', 'eyeglasses'] } },
  // ── Luxury Streetwear (Shopify-based) ──
  'golden goose':       { domain: 'https://www.goldengoose.com', collections: { shoes: ['sneakers'], tops: ['t-shirts'], outerwear: ['jackets'], bottoms: ['jeans'] } },
  'coperni':            { domain: 'https://coperni.com', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['outerwear'], dresses: ['dresses'], accessories: ['bags'] } },
  'amiri':              { domain: 'https://www.amiri.com', collections: { tops: ['t-shirts', 'shirts'], bottoms: ['jeans', 'trousers'], outerwear: ['jackets', 'hoodies-sweatshirts'], shoes: ['sneakers', 'boots'], accessories: ['hats', 'bags'] } },
  'palm angels':        { domain: 'https://www.palmangels.com', collections: { tops: ['t-shirts', 'sweatshirts'], bottoms: ['trousers', 'jeans'], outerwear: ['jackets', 'coats'], shoes: ['sneakers'], accessories: ['hats', 'bags'] } },
  'fear of god':        { domain: 'https://fearofgod.com', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['outerwear'], shoes: ['footwear'], accessories: ['accessories'] } },
  'off-white':          { domain: 'https://www.off---white.com', collections: { tops: ['t-shirts'], bottoms: ['pants'], outerwear: ['jackets'], shoes: ['sneakers'], accessories: ['bags', 'hats'] } },
  'vetements':          { domain: 'https://vetementswebsite.com', collections: { tops: ['t-shirts', 'hoodies'], bottoms: ['pants'], outerwear: ['jackets'] } },
  'sacai':              { domain: 'https://www.sacai.jp', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['outerwear'], dresses: ['dresses'] } },
  'undercover':         { domain: 'https://undercoverism.com', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['outerwear'] } },
  'jacquemus':          { domain: 'https://www.jacquemus.com', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['outerwear'], dresses: ['dresses'], accessories: ['bags', 'hats'] } },
  'ami paris':          { domain: 'https://www.amiparis.com', collections: { tops: ['t-shirts', 'shirts'], bottoms: ['trousers', 'jeans'], outerwear: ['jackets', 'coats', 'knitwear'], shoes: ['shoes'], accessories: ['bags', 'hats'] } },
  'balmain':            { domain: 'https://www.balmain.com', collections: { tops: ['t-shirts'], bottoms: ['jeans', 'trousers'], outerwear: ['jackets', 'coats'], shoes: ['sneakers'], accessories: ['bags'] } },
  'dsquared2':          { domain: 'https://www.dsquared2.com', collections: { tops: ['t-shirts', 'shirts'], bottoms: ['jeans', 'trousers'], outerwear: ['jackets'], shoes: ['sneakers'], accessories: ['hats'] } },
  'corteiz':            { domain: 'https://www.crfrules.com', collections: { tops: ['tops'], bottoms: ['bottoms'], outerwear: ['outerwear'], shorts: ['shorts'], accessories: ['headwear'] } },
  'trapstar':           { domain: 'https://trapstarlondon.com', collections: { tops: ['tops', 't-shirts'], bottoms: ['bottoms'], outerwear: ['jackets', 'tracksuits'], shorts: ['shorts'], accessories: ['hats'] } },
  // ── Menswear ──
  'true classic':       { domain: 'https://trueclassictees.com', collections: { tops: ['mens-crew-neck-t-shirts', 'mens-v-neck-t-shirts', 'mens-polos'], bottoms: ['mens-pants-joggers'], outerwear: ['mens-hoodies-jackets'], shorts: ['mens-shorts'], activewear: ['mens-activewear'] } },
  'todd snyder':        { domain: 'https://www.toddsnyder.com', collections: { tops: ['t-shirts', 'shirts', 'polos'], bottoms: ['pants', 'jeans'], outerwear: ['jackets-coats', 'sweaters'], shorts: ['shorts'], suits: ['suits'] } },
  'taylor stitch':      { domain: 'https://www.taylorstitch.com', collections: { tops: ['shirts', 'tees'], bottoms: ['pants', 'denim'], outerwear: ['outerwear'], shorts: ['shorts'] } },
  'marine layer':       { domain: 'https://www.marinelayer.com', collections: { tops: ['mens-tops', 'womens-tops'], bottoms: ['mens-bottoms', 'womens-bottoms'], outerwear: ['mens-outerwear', 'womens-outerwear'], shorts: ['mens-shorts', 'womens-shorts'], dresses: ['womens-dresses'] } },
  'public rec':         { domain: 'https://www.publicrec.com', collections: { tops: ['tops'], bottoms: ['pants', 'joggers'], shorts: ['shorts'], outerwear: ['outerwear'] } },
  grayers:              { domain: 'https://www.grayers.com', collections: { tops: ['shirts', 'tees', 'polos'], bottoms: ['pants'], outerwear: ['sweaters', 'jackets'], shorts: ['shorts'] } },
  'fresh clean tees':   { domain: 'https://www.freshcleantees.com', collections: { tops: ['t-shirts', 'henleys', 'polos'], bottoms: ['pants', 'joggers'], outerwear: ['hoodies', 'jackets'], shorts: ['shorts'] } },
  "drake's":            { domain: 'https://www.drakes.com', collections: { tops: ['shirts', 't-shirts', 'knitwear', 'sweatshirts'], bottoms: ['trousers', 'denim'], outerwear: ['jackets', 'tailoring'], shorts: ['shorts'], shoes: ['footwear'], accessories: ['ties', 'hats', 'bags'] } },
  'drakes':             { domain: 'https://www.drakes.com', collections: { tops: ['shirts', 't-shirts', 'knitwear', 'sweatshirts'], bottoms: ['trousers', 'denim'], outerwear: ['jackets', 'tailoring'], shorts: ['shorts'], shoes: ['footwear'], accessories: ['ties', 'hats', 'bags'] } },
  'mack weldon':        { domain: 'https://mackweldon.com', collections: { tops: ['t-shirts', 'polos', 'shirts'], bottoms: ['pants', 'joggers'], outerwear: ['hoodies', 'sweatshirts'], shorts: ['shorts'], underwear: ['underwear'] } },
  'norse projects':     { domain: 'https://www.norseprojects.com', collections: { tops: ['t-shirts', 'shirts', 'knitwear', 'sweatshirts'], bottoms: ['trousers', 'denim'], outerwear: ['jackets', 'coats'], shorts: ['shorts'], accessories: ['hats', 'bags'] } },
  // ── Surf & Outdoor ──
  faherty:              { domain: 'https://www.fahertybrand.com', collections: { tops: ['mens-shirts', 'womens-tops'], bottoms: ['mens-pants', 'womens-pants'], outerwear: ['mens-outerwear', 'womens-outerwear'], shorts: ['mens-shorts', 'womens-shorts'], dresses: ['womens-dresses'], swimwear: ['mens-swim', 'womens-swim'] } },
  outerknown:           { domain: 'https://www.outerknown.com', collections: { tops: ['mens-shirts', 'womens-tops'], bottoms: ['mens-pants', 'womens-pants'], outerwear: ['mens-outerwear', 'womens-outerwear'], shorts: ['mens-shorts'], swimwear: ['mens-boardshorts'] } },
  roark:                { domain: 'https://www.roark.com', collections: { tops: ['mens-tops'], bottoms: ['mens-pants'], outerwear: ['mens-outerwear'], shorts: ['mens-shorts'], swimwear: ['mens-boardshorts'] } },
  billabong:            { domain: 'https://www.billabong.com', collections: { tops: ['mens-shirts', 'womens-tops'], bottoms: ['mens-pants', 'womens-pants'], outerwear: ['mens-jackets', 'womens-jackets'], shorts: ['mens-shorts', 'womens-shorts'], swimwear: ['mens-boardshorts', 'womens-swimwear'], dresses: ['womens-dresses'] } },
  rvca:                 { domain: 'https://www.rvca.com', collections: { tops: ['mens-tops', 'womens-tops'], bottoms: ['mens-pants', 'womens-pants'], outerwear: ['mens-jackets', 'womens-jackets'], shorts: ['mens-shorts', 'womens-shorts'], accessories: ['mens-hats', 'womens-hats'] } },
  // NOTE: Tested and blocked /products.json (not included):
  // kith, essentials, alo yoga, girlfriend collective, rhone, outdoor voices,
  // fashion nova, skims, princess polly, oh polly, cider, mizzen+main,
  // untuckit, bonobos, steve madden, everlane, allsaints, fabletics,
  // vuori, allbirds, mejuri, cuts, buck mason, good american,
  // chubbies, tracksmith, ten thousand, tecovas, madewell, flight club
};

/**
 * Fetch products from a Shopify store via the public /products.json API.
 * Pages through results using ?page=N&limit=250.
 * Returns structured RawProduct[].
 */
async function scrapeShopifyProducts(
  brand: string,
  category: string,
): Promise<RawProduct[]> {
  const brandKey = normalizeBrandKey(brand);
  const store = SHOPIFY_STORES[brandKey];
  if (!store) return [];

  const catKey = category.toLowerCase();
  const parentKey = CATEGORY_TO_URL_KEY[catKey] || catKey;

  // Determine which collection handles to fetch
  const collectionHandles = store.collections?.[catKey] || store.collections?.[parentKey] || [];

  const allProducts: RawProduct[] = [];

  if (collectionHandles.length > 0) {
    // Fetch specific collections
    for (const handle of collectionHandles) {
      const products = await fetchShopifyCollection(store.domain, handle, brand, category);
      allProducts.push(...products);
    }
  }
  
  // If collection endpoints returned nothing, fall back to root /products.json
  if (allProducts.length === 0) {
    console.log(`[shopify] Collection endpoints returned 0, falling back to root /products.json for ${brand}`);
    const products = await fetchShopifyAllProducts(store.domain, brand, category);
    allProducts.push(...products);
  }

  console.log(`[shopify] ${brand}/${category}: ${allProducts.length} products via /products.json`);
  return allProducts;
}

async function fetchShopifyCollection(
  domain: string,
  collectionHandle: string,
  brand: string,
  category: string,
): Promise<RawProduct[]> {
  const products: RawProduct[] = [];
  const maxPages = 4; // 250 * 4 = 1000 max products per collection

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `${domain}/collections/${collectionHandle}/products.json?limit=250&page=${page}`;
      console.log(`[shopify] Fetching ${url}`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, {
        headers: {
          'User-Agent': HTTP_USER_AGENT,
          'Accept': 'application/json',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        console.warn(`[shopify] HTTP ${resp.status} for ${url}`);
        break;
      }

      const data = await resp.json();
      const items = data.products || [];
      if (items.length === 0) break;

      for (const item of items) {
        const parsed = parseShopifyProduct(item, brand, category, domain);
        if (parsed) products.push(parsed);
      }

      // If we got fewer than 250, we've hit the last page
      if (items.length < 250) break;
      
      await delay(300); // Be polite
    } catch (err) {
      console.warn(`[shopify] Error fetching collection ${collectionHandle}:`, (err as Error).message);
      break;
    }
  }

  return products;
}

async function fetchShopifyAllProducts(
  domain: string,
  brand: string,
  category: string,
): Promise<RawProduct[]> {
  const products: RawProduct[] = [];
  const maxPages = 3;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `${domain}/products.json?limit=250&page=${page}`;
      console.log(`[shopify] Fetching ${url}`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, {
        headers: {
          'User-Agent': HTTP_USER_AGENT,
          'Accept': 'application/json',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        console.warn(`[shopify] HTTP ${resp.status} for ${url}`);
        break;
      }

      const data = await resp.json();
      const items = data.products || [];
      if (items.length === 0) break;

      for (const item of items) {
        const parsed = parseShopifyProduct(item, brand, category, domain);
        if (parsed) products.push(parsed);
      }

      if (items.length < 250) break;
      await delay(300);
    } catch (err) {
      console.warn(`[shopify] Error fetching products:`, (err as Error).message);
      break;
    }
  }

  // When fetching all products (no collection filter), do category filtering
  const catNorm = normaliseCategory(category);
  const filtered = products.filter(p => {
    const pCat = normaliseCategory(p.category_raw);
    return pCat === catNorm || pCat === 'other'; // Keep 'other' as they may match
  });

  return filtered.length > 0 ? filtered : products.slice(0, 50);
}

function parseShopifyProduct(
  item: any,
  brand: string,
  category: string,
  domain: string,
): RawProduct | null {
  const title = item.title;
  if (!title || title.length < 5) return null;
  if (isListingPageName(title)) return null;

  // Build product URL from handle
  const handle = item.handle;
  if (!handle) return null;
  const productUrl = `${domain}/products/${handle}`;

  // Extract images
  const imageUrls: string[] = [];
  if (item.images && Array.isArray(item.images)) {
    for (const img of item.images.slice(0, 8)) {
      const src = typeof img === 'string' ? img : img.src;
      if (src && src.startsWith('http')) {
        imageUrls.push(src);
      }
    }
  }
  // Fallback to featured image
  if (imageUrls.length === 0 && item.image?.src) {
    imageUrls.push(item.image.src);
  }
  if (imageUrls.length === 0) return null;

  // Extract price from first variant
  let priceCents: number | null = null;
  if (item.variants && item.variants.length > 0) {
    const price = parseFloat(item.variants[0].price);
    if (price > 0) priceCents = Math.round(price * 100);
  }

  // Detect category from product_type or tags
  const categoryRaw = item.product_type || category;

  // Extract colour from first variant option
  let colour: string | null = null;
  if (item.options && Array.isArray(item.options)) {
    const colorOption = item.options.find((o: any) =>
      /color|colour/i.test(o.name)
    );
    if (colorOption?.values?.[0]) {
      colour = colorOption.values[0];
    }
  }

  // Extract description from body_html
  let description: string | null = null;
  if (item.body_html && typeof item.body_html === 'string') {
    const plain = item.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.length > 15) description = plain.slice(0, 500);
  }

  return {
    name: title,
    brand: item.vendor || brand,
    product_url: productUrl,
    price_cents: priceCents,
    currency: 'USD',
    image_urls: imageUrls,
    category_raw: categoryRaw,
    colour,
    description,
  };
}

// Category keywords for map search filtering
const MAP_CATEGORY_KEYWORDS: Record<string, string[]> = {
  tops: ['t-shirt', 'tee', 'top', 'shirt', 'polo', 'hoodie', 'sweatshirt', 'blouse', 'tank'],
  bottoms: ['pant', 'trouser', 'jean', 'denim', 'chino', 'cargo', 'jogger', 'legging', 'tight'],
  shorts: ['short'],
  skirts: ['skirt'],
  outerwear: ['jacket', 'coat', 'blazer', 'vest', 'puffer', 'windbreaker', 'parka', 'outerwear'],
  dresses: ['dress', 'gown', 'jumpsuit', 'romper'],
  shoes: ['shoe', 'sneaker', 'boot', 'sandal', 'loafer', 'heel', 'footwear', 'trainer'],
  accessories: ['accessori', 'bag', 'hat', 'cap', 'sunglasses', 'belt', 'jewelry', 'watch', 'scarf'],
  swimwear: ['swim', 'bikini', 'trunk'],
  activewear: ['active', 'workout', 'gym', 'training', 'sport'],
  loungewear: ['lounge', 'pajama', 'sleep', 'robe'],
};

/**
 * Use Firecrawl /v1/map to discover product category URLs on a brand's website.
 * Returns URLs that match the target category.
 */
async function mapBrandUrls(
  brand: string,
  category: string,
  firecrawlApiKey: string
): Promise<string[]> {
  const brandKey = normalizeBrandKey(brand);
  const domain = BRAND_DOMAINS[brandKey];
  if (!domain) return [];

  const catKey = category.toLowerCase();
  const parentKey = CATEGORY_TO_URL_KEY[catKey] || catKey;
  const keywords = MAP_CATEGORY_KEYWORDS[parentKey] || MAP_CATEGORY_KEYWORDS[catKey] || [category];

  console.log(`[map] Discovering URLs on ${domain} for ${category} (keywords: ${keywords.join(',')})`);

  try {
    const resp = await fetchWithRetry('https://api.firecrawl.dev/v2/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: domain,
        search: keywords.join(' '),
        limit: 200,
        includeSubdomains: true,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.warn(`[map] Firecrawl map error: ${JSON.stringify(data).slice(0, 300)}`);
      return [];
    }

    const links: string[] = data.links || data.data?.links || [];
    console.log(`[map] Found ${links.length} total URLs on ${domain}`);

    // Filter to product-like URLs matching the category
    const productUrls = links.filter(url => {
      const lower = url.toLowerCase();
      // Must contain at least one category keyword
      const hasKeyword = keywords.some(kw => lower.includes(kw));
      // Looks like a product page (has path segments, not just a collection/category index)
      const pathSegments = new URL(url).pathname.split('/').filter(Boolean);
      const isProductPage = pathSegments.length >= 2;
      // Skip non-product patterns
      const isExcluded = /\/search|\/cart|\/checkout|\/account|\/login|\/help|\/faq|\/about|\/blog|\/press|\/careers|\/legal|\/privacy|\/terms/i.test(lower);
      return hasKeyword && isProductPage && !isExcluded;
    });

    console.log(`[map] Filtered to ${productUrls.length} category-relevant URLs`);
    return productUrls.slice(0, 50); // Cap to avoid excessive crawling
  } catch (err) {
    console.warn(`[map] Error mapping ${domain}:`, err);
    return [];
  }
}

/**
 * Use Firecrawl /v1/crawl to recursively scrape product pages from discovered URLs.
 * Returns parsed RawProduct[].
 */
async function crawlBrandCategory(
  brand: string,
  category: string,
  startUrls: string[],
  firecrawlApiKey: string
): Promise<RawProduct[]> {
  if (!startUrls.length) return [];

  const brandKey = normalizeBrandKey(brand);
  const domain = BRAND_DOMAINS[brandKey];
  
  // Use the brand domain root as crawl entry (not a deep product URL)
  // and use includePaths from the discovered URLs to scope the crawl
  const crawlUrl = domain || new URL(startUrls[0]).origin;

  // Build includePaths from discovered URLs' common path prefixes
  const includePaths = [...new Set(startUrls.map(u => {
    try { 
      const path = new URL(u).pathname;
      // Use the first 2-3 path segments as category-level paths
      const segments = path.split('/').filter(Boolean);
      if (segments.length >= 2) return '/' + segments.slice(0, 2).join('/');
      return '/' + segments[0];
    } catch { return ''; }
  }).filter(Boolean))].slice(0, 10);

  console.log(`[crawl] Crawling ${crawlUrl} with ${includePaths.length} include paths, limit 30`);

  try {
    const resp = await fetchWithRetry('https://api.firecrawl.dev/v2/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: crawlUrl,
        limit: 30,
        maxDiscoveryDepth: 2,
        includePaths,
        excludePaths: ['/cart', '/checkout', '/account', '/login', '/search', '/help', '/blog'],
        scrapeOptions: {
          formats: ['markdown', 'rawHtml'],
          onlyMainContent: true,
          waitFor: 3000,
        },
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.warn(`[crawl] Firecrawl crawl error: ${JSON.stringify(data).slice(0, 300)}`);
      return [];
    }

    // Crawl may return immediately with a job ID for async crawling,
    // or return results directly for small jobs
    let pages = data.data || [];
    
    // If async job, poll for results (up to 60s)
    if (data.id && data.status === 'scraping') {
      console.log(`[crawl] Async job ${data.id}, polling for results...`);
      const jobId = data.id;
      for (let poll = 0; poll < 12; poll++) {
        await delay(5000);
        try {
          const pollResp = await fetchWithRetry(`https://api.firecrawl.dev/v2/crawl/${jobId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${firecrawlApiKey}` },
          });
          const pollData = await pollResp.json();
          if (pollData.status === 'completed') {
            pages = pollData.data || [];
            console.log(`[crawl] Job completed with ${pages.length} pages`);
            break;
          }
          if (pollData.status === 'failed') {
            console.warn(`[crawl] Job failed`);
            return [];
          }
          console.log(`[crawl] Poll ${poll + 1}: status=${pollData.status}, completed=${pollData.completed}/${pollData.total}`);
        } catch (e) {
          console.warn(`[crawl] Poll error:`, e);
        }
      }
    } else {
      console.log(`[crawl] Got ${pages.length} pages directly`);
    }

    // Parse crawled pages into products
    const allProducts: RawProduct[] = [];
    for (const page of pages) {
      const pageUrl = page.metadata?.sourceURL || page.url || '';
      const markdown = page.markdown || '';
      const rawHtml = page.rawHtml || page.html || '';

      // Skip non-product pages (expanded patterns)
      if (/\/search|\/category|\/collection[s]?\/?$|\/shop\/?$|\/c\/[^\/]*$|\/cat\/?$|page=\d|\/sale\/?$|\/browse|\/all\/?$/i.test(pageUrl)) continue;

      // Extract price
      const priceMatch = markdown.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      const priceCents = priceMatch ? Math.round(parseFloat(priceMatch[1].replace(',', '')) * 100) : null;

      // Extract product name from page title
      let productName = (page.metadata?.title || '')
        .replace(/\s*[-|]\s*(Zara|H&M|Nike|Adidas|Nordstrom|ASOS|Uniqlo|Gap|Lululemon|Puma|Converse|Vans).*$/i, '')
        .trim();

      if (!productName || productName.length < 8) continue;
      if (isListingPageName(productName)) continue;

      // Extract images from rawHtml
      const imageUrls = rawHtml ? extractImageUrlsFromHtml(rawHtml) : [];
      
      // Also extract from markdown
      const mdImgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
      let imgMatch;
      while ((imgMatch = mdImgRegex.exec(markdown)) !== null) {
        if (!/logo|icon|sprite|favicon/i.test(imgMatch[1])) {
          imageUrls.push(imgMatch[1]);
        }
      }

      if (page.metadata?.ogImage) imageUrls.unshift(page.metadata.ogImage);

      allProducts.push({
        name: productName,
        brand,
        product_url: pageUrl,
        price_cents: priceCents,
        currency: 'USD',
        image_urls: [...new Set(imageUrls)].slice(0, 8),
        category_raw: category,
        colour: null,
      description: null,
      });
    }

    console.log(`[crawl] Parsed ${allProducts.length} products from ${pages.length} crawled pages`);
    return allProducts;
  } catch (err) {
    console.warn(`[crawl] Error:`, err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGES 1+2 — Firecrawl scrapes + extracts structured product data
// ─────────────────────────────────────────────────────────────────────────────

// Map granular category keys to parent URL keys used in CATEGORY_MAP
const CATEGORY_TO_URL_KEY: Record<string, string> = {
  't-shirts': 'tops', shirts: 'tops', hoodies: 'tops', polos: 'tops', sweaters: 'tops',
  jeans: 'bottoms', pants: 'bottoms', shorts: 'shorts', skirts: 'bottoms', leggings: 'bottoms',
  jackets: 'outerwear', coats: 'outerwear', blazers: 'outerwear', vests: 'outerwear',
  jumpsuits: 'dresses',
  sneakers: 'shoes', boots: 'shoes', sandals: 'shoes', loafers: 'shoes', heels: 'shoes',
  bags: 'accessories', hats: 'accessories', sunglasses: 'accessories', jewelry: 'accessories',
  watches: 'accessories', belts: 'accessories', scarves: 'accessories',
  swimwear: 'tops', activewear: 'tops', loungewear: 'tops', underwear: 'tops',
};

// Normalize brand names for CATEGORY_MAP lookup
const BRAND_ALIASES: Record<string, string> = {
  'h&m': 'hm', 'h and m': 'hm', 'hennes & mauritz': 'hm',
  "levi's": "levi's", 'levis': "levi's",
  'dr martens': 'dr. martens', 'doc martens': 'dr. martens',
  'ray ban': 'ray-ban',
  'north face': 'the north face',
  'stussy': 'stüssy', 'stüssy': 'stüssy',
  'alo': 'alo yoga',
};

function normalizeBrandKey(brand: string): string {
  const lower = brand.toLowerCase().trim();
  return BRAND_ALIASES[lower] || lower;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL BRAND/RETAILER NAMES — normalizes casing at insert time
// Maps lowercase → proper display casing. Any brand not in this map keeps
// its original casing (first-letter capitalized as fallback).
// ─────────────────────────────────────────────────────────────────────────────
const CANONICAL_NAMES: Record<string, string> = {
  // Luxury
  'gucci': 'Gucci', 'louis vuitton': 'Louis Vuitton', 'prada': 'Prada',
  'balenciaga': 'Balenciaga', 'dior': 'Dior', 'burberry': 'Burberry',
  'versace': 'Versace', 'saint laurent': 'Saint Laurent', 'givenchy': 'Givenchy',
  'fendi': 'Fendi', 'bottega veneta': 'Bottega Veneta', 'valentino': 'Valentino',
  'alexander mcqueen': 'Alexander McQueen', 'loewe': 'Loewe', 'celine': 'Celine',
  'moncler': 'Moncler', 'acne studios': 'Acne Studios', 'ami paris': 'AMI Paris',
  'jacquemus': 'Jacquemus', 'maison margiela': 'Maison Margiela',
  'rick owens': 'Rick Owens', 'stone island': 'Stone Island',
  // Streetwear
  'supreme': 'Supreme', 'off-white': 'Off-White', 'stüssy': 'Stüssy',
  'a bathing ape': 'A Bathing Ape', 'palace': 'Palace',
  'palace skateboards': 'Palace Skateboards', 'fear of god': 'Fear of God',
  'kith': 'Kith', 'essentials': 'Essentials', 'corteiz': 'Corteiz',
  'trapstar': 'Trapstar',
  // New luxury/streetwear
  'balmain': 'Balmain', 'tom ford': 'Tom Ford', 'dsquared2': 'Dsquared2',
  'dolce & gabbana': 'Dolce & Gabbana', 'amiri': 'AMIRI', 'palm angels': 'Palm Angels',
  'golden goose': 'Golden Goose', 'chrome hearts': 'Chrome Hearts',
  'jw anderson': 'JW Anderson', 'thom browne': 'Thom Browne',
  'brunello cucinelli': 'Brunello Cucinelli', 'issey miyake': 'Issey Miyake',
  'coperni': 'Coperni', 'alaia': 'Alaïa',
  'represent': 'Represent', 'eric emanuel': 'Eric Emanuel',
  'gallery dept': 'Gallery Dept', 'rhude': 'Rhude', 'human made': 'HUMAN MADE',
  'undercover': 'UNDERCOVER', 'neighborhood': 'NEIGHBORHOOD', 'needles': 'Needles',
  'comme des garcons': 'Comme des Garçons', 'vetements': 'Vetements', 'sacai': 'Sacai',
  'daily paper': 'Daily Paper', 'missing since thursday': 'Missing Since Thursday',
  // Multi-brand retailers
  'ssense': 'SSENSE', 'end clothing': 'END. Clothing', 'mr porter': 'MR PORTER',
  // Athletic
  'nike': 'Nike', 'adidas': 'Adidas', 'puma': 'Puma', 'lululemon': 'Lululemon',
  'gymshark': 'Gymshark', 'under armour': 'Under Armour', 'new balance': 'New Balance',
  'on running': 'On Running', 'hoka': 'HOKA', 'salomon': 'Salomon',
  'fabletics': 'Fabletics', 'alo yoga': 'Alo Yoga', 'vuori': 'Vuori',
  'girlfriend collective': 'Girlfriend Collective', 'rhone': 'Rhone',
  // Mass-market & fast fashion
  'shein': 'SHEIN', 'zara': 'Zara', 'h&m': 'H&M', 'hm': 'H&M',
  'gap': 'Gap', 'old navy': 'Old Navy', 'banana republic': 'Banana Republic',
  'uniqlo': 'Uniqlo', 'mango': 'Mango', 'forever 21': 'Forever 21',
  'boohoo': 'Boohoo', 'prettylittlething': 'PrettyLittleThing',
  'fashion nova': 'Fashion Nova', 'target': 'Target', 'topshop': 'Topshop',
  // Department & multi-brand
  'nordstrom': 'Nordstrom', 'asos': 'ASOS', 'revolve': 'Revolve',
  'amazon fashion': 'Amazon Fashion', 'urban outfitters': 'Urban Outfitters',
  'abercrombie & fitch': 'Abercrombie & Fitch', 'j.crew': 'J.Crew',
  'net-a-porter': 'Net-a-Porter', 'ssense': 'SSENSE', 'farfetch': 'Farfetch',
  'saks': 'Saks', 'macys': 'Macys',
  // DTC & specialty
  'reformation': 'Reformation', 'everlane': 'Everlane', 'cos': 'COS',
  'allsaints': 'AllSaints', 'free people': 'Free People', 'skims': 'SKIMS',
  'aritzia': 'Aritzia', 'carhartt': 'Carhartt', 'vans': 'Vans',
  'converse': 'Converse', 'dr. martens': 'Dr. Martens', 'birkenstock': 'Birkenstock',
  'anthropologie': 'Anthropologie', 'tory burch': 'Tory Burch',
  'michael kors': 'Michael Kors', 'coach': 'Coach', 'kate spade': 'Kate Spade',
  'ted baker': 'Ted Baker', 'reiss': 'Reiss', 'theory': 'Theory',
  "levi's": "Levi's", 'ralph lauren': 'Ralph Lauren',
  'calvin klein': 'Calvin Klein', 'tommy hilfiger': 'Tommy Hilfiger',
  'hugo boss': 'Hugo Boss', 'steve madden': 'Steve Madden',
  'eileen fisher': 'Eileen Fisher', 'bonobos': 'Bonobos',
  'charles tyrwhitt': 'Charles Tyrwhitt', 'columbia': 'Columbia',
  'patagonia': 'Patagonia', 'the north face': 'The North Face',
  'american eagle': 'American Eagle', 'new era': 'New Era',
  'eloquii': 'Eloquii', 'savage x fenty': 'Savage X Fenty',
  'mizzen+main': 'Mizzen+Main',
  // Surf & Skate
  'o5 billabong': 'O5 Billabong', 'rvca': 'RVCA',
  'world industries': 'World Industries',
  // DTC brands in catalog
  'faherty': 'Faherty', 'taylor stitch': 'Taylor Stitch',
  'marine layer': 'Marine Layer', "rothy's": "Rothy's",
  'true classic': 'True Classic', 'fresh clean threads': 'Fresh Clean Threads',
  'fresh clean tees': 'Fresh Clean Tees', 'grayers': 'Grayers',
  'roark': 'Roark', 'radial': 'Radial', 'public rec 2.0': 'Public Rec 2.0',
  'recurate': 'Recurate', 'todd snyder': 'Todd Snyder',
  'ok mens': 'OK Mens', 'ok womens': 'OK Womens', 'ok unisex': 'OK Unisex',
  'ok accessories': 'OK Accessories', 'custom club': 'Custom Club',
  'trove': 'Trove', 'schott': 'Schott', 'mark bodē': 'Mark Bodē',
  'cutler and gross': 'Cutler And Gross',
};

/**
 * Normalize a brand or retailer name to its canonical display casing.
 * Falls back to title-casing if not in the map.
 */
function canonicalName(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (CANONICAL_NAMES[lower]) return CANONICAL_NAMES[lower];
  // Fallback: keep original casing (don't auto-title-case to avoid breaking unknowns)
  return trimmed;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT HTTP SCRAPING — zero Firecrawl credits, uses plain fetch + HTML parsing
// ─────────────────────────────────────────────────────────────────────────────

// Rotate User-Agent strings to reduce bot detection
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchPageHtml(url: string, timeoutMs = 12000, retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff with jitter between retries
        await delay(1000 * attempt + Math.random() * 1500);
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const ua = randomUA();
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Chromium";v="125", "Not=A?Brand";v="8", "Google Chrome";v="125"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'DNT': '1',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      // Retry on 403/429, give up on other errors
      if (resp.status === 429 || resp.status === 403) {
        await resp.text(); // consume body
        if (attempt < retries) {
          console.log(`[direct] HTTP ${resp.status} for ${url}, retrying (${attempt + 1}/${retries})...`);
          continue;
        }
        console.warn(`[direct] HTTP ${resp.status} for ${url} after ${retries + 1} attempts`);
        return null;
      }

      if (!resp.ok) {
        console.warn(`[direct] HTTP ${resp.status} for ${url}`);
        await resp.text();
        return null;
      }

      // Read up to 500KB
      const reader = resp.body?.getReader();
      if (!reader) return null;
      let html = '';
      const decoder = new TextDecoder();
      let totalBytes = 0;
      const MAX = 500000;
      while (totalBytes < MAX) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        totalBytes += value.length;
      }
      reader.cancel().catch(() => {});
      return html;
    } catch (err) {
      if (attempt < retries) {
        console.log(`[direct] Fetch error for ${url}, retrying (${attempt + 1}/${retries})...`);
        continue;
      }
      console.warn(`[direct] Fetch error for ${url}: ${(err as Error).message}`);
      return null;
    }
  }
  return null;
}

/**
 * Parse products from raw HTML using JSON-LD structured data and meta tags.
 * Works for most modern e-commerce sites without needing JS rendering.
 */
function parseProductsFromHtml(html: string, brand: string, category: string, pageUrl: string): RawProduct[] {
  const products: RawProduct[] = [];

  // 1) Extract JSON-LD blocks — most reliable source
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch;
  while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(ldMatch[1]);
      extractProductsFromJsonLd(parsed, products, brand, category, pageUrl);
    } catch { /* skip invalid JSON-LD */ }
  }

  // 2) Extract from __NEXT_DATA__ or similar SSR data blobs
  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      extractProductsFromNextData(nextData, products, brand, category, pageUrl);
    } catch { /* skip */ }
  }

  // 3) Extract from common window.__INITIAL_STATE__ / window.__PRELOADED_STATE__ patterns
  const statePatterns = [
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/,
    /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/,
    /window\.__STORE_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/,
    /window\.__APP_INITIAL_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/,
  ];
  for (const pat of statePatterns) {
    const m = html.match(pat);
    if (m) {
      try {
        const state = JSON.parse(m[1]);
        extractProductsFromStateBlob(state, products, brand, category, pageUrl);
      } catch { /* skip */ }
    }
  }

  // 4) Extract from window.dataLayer product impressions (GA/GTM)
  if (products.length === 0) {
    extractProductsFromDataLayer(html, products, brand, category, pageUrl);
  }

  // 5) Extract from SSR-rendered product tiles (data-product-name, aria-label patterns)
  if (products.length === 0) {
    extractProductsFromSsrTiles(html, products, brand, category, pageUrl);
  }

  // 6) Parse product links + images from HTML product grid patterns
  if (products.length === 0) {
    extractProductsFromHtmlGrid(html, products, brand, category, pageUrl);
  }

  return products;
}

function extractProductsFromJsonLd(data: any, products: RawProduct[], brand: string, category: string, pageUrl: string): void {
  if (!data) return;
  if (Array.isArray(data)) {
    data.forEach(item => extractProductsFromJsonLd(item, products, brand, category, pageUrl));
    return;
  }
  if (data['@graph']) {
    extractProductsFromJsonLd(data['@graph'], products, brand, category, pageUrl);
  }
  // ItemList with ListItems
  if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
    for (const el of data.itemListElement) {
      const item = el.item || el;
      if (item['@type'] === 'Product' || item.name) {
        addProductFromStructuredData(item, products, brand, category, pageUrl);
      }
    }
  }
  // Direct Product
  if (data['@type'] === 'Product') {
    addProductFromStructuredData(data, products, brand, category, pageUrl);
  }
  // ProductGroup
  if (data['@type'] === 'ProductGroup' && Array.isArray(data.hasVariant)) {
    for (const variant of data.hasVariant) {
      addProductFromStructuredData(variant, products, brand, category, pageUrl);
    }
  }
}

function addProductFromStructuredData(item: any, products: RawProduct[], brand: string, category: string, pageUrl: string): void {
  const name = item.name;
  if (!name || name.length < 5) return;
  if (isListingPageName(name)) return;

  let image = '';
  if (typeof item.image === 'string') image = item.image;
  else if (Array.isArray(item.image)) image = typeof item.image[0] === 'string' ? item.image[0] : item.image[0]?.url || '';
  else if (item.image?.url) image = item.image.url;

  if (image.startsWith('//')) image = 'https:' + image;
  if (!image.startsWith('http')) image = '';

  let productUrl = item.url || '';
  if (productUrl && !productUrl.startsWith('http')) {
    try {
      productUrl = new URL(productUrl, pageUrl).href;
    } catch { productUrl = ''; }
  }
  if (!productUrl) productUrl = pageUrl;

  let priceCents: number | null = null;
  const offers = item.offers || item.offer;
  if (offers) {
    const offer = Array.isArray(offers) ? offers[0] : offers;
    const price = parseFloat(offer?.price || offer?.lowPrice || '0');
    if (price > 0) priceCents = Math.round(price * 100);
  }

  // Skip duplicates within same parse
  if (products.some(p => p.name === name && p.product_url === productUrl)) return;

  products.push({
    name,
    brand,
    product_url: productUrl,
    price_cents: priceCents,
    currency: 'USD',
    image_urls: image ? [image] : [],
    category_raw: category,
    colour: null,
      description: null,
  });
}

function extractProductsFromNextData(data: any, products: RawProduct[], brand: string, category: string, pageUrl: string): void {
  // Traverse deeply looking for product-like arrays
  const visited = new WeakSet();
  function walk(obj: any, depth: number): void {
    if (!obj || typeof obj !== 'object' || depth > 8 || visited.has(obj)) return;
    visited.add(obj);
    if (Array.isArray(obj)) {
      // Check if this looks like a product array
      if (obj.length > 2 && obj[0]?.name && (obj[0]?.url || obj[0]?.href || obj[0]?.product_url || obj[0]?.pdpUrl)) {
        for (const item of obj.slice(0, 50)) {
          const name = item.name || item.title;
          if (!name || name.length < 5 || isListingPageName(name)) continue;
          let img = item.image || item.imageUrl || item.img || item.thumbnail || '';
          if (typeof img === 'object') img = img.url || img.src || '';
          if (img.startsWith('//')) img = 'https:' + img;
          let url = item.url || item.href || item.pdpUrl || item.product_url || '';
          if (url && !url.startsWith('http')) {
            try { url = new URL(url, pageUrl).href; } catch { url = ''; }
          }
          const price = parseFloat(item.price || item.salePrice || item.currentPrice || '0');
          products.push({
            name, brand,
            product_url: url || pageUrl,
            price_cents: price > 0 ? Math.round(price * 100) : null,
            currency: 'USD',
            image_urls: img && img.startsWith('http') ? [img] : [],
            category_raw: category,
            colour: item.color || item.colour || null,
          });
        }
        return;
      }
      obj.forEach(el => walk(el, depth + 1));
    } else {
      Object.values(obj).forEach(val => walk(val, depth + 1));
    }
  }
  walk(data, 0);
}

function extractProductsFromStateBlob(data: any, products: RawProduct[], brand: string, category: string, pageUrl: string): void {
  extractProductsFromNextData(data, products, brand, category, pageUrl);
}
/**
 * Extract products from window.dataLayer push events (Google Analytics / GTM).
 * Many e-commerce sites push product impression data to dataLayer.
 */
function extractProductsFromDataLayer(html: string, products: RawProduct[], brand: string, category: string, pageUrl: string): void {
  // Match dataLayer.push calls with ecommerce impressions
  const dlPushRegex = /dataLayer\.push\(({[\s\S]*?})\);/g;
  let m;
  while ((m = dlPushRegex.exec(html)) !== null) {
    try {
      const obj = JSON.parse(m[1]);
      const impressions = obj?.ecommerce?.impressions || obj?.ecommerce?.items || [];
      for (const item of impressions) {
        const name = item.name || item.item_name;
        if (!name || name.length < 5 || isListingPageName(name)) continue;
        const itemBrand = item.brand || item.item_brand || brand;
        let img = item.image || item.image_url || '';
        if (img.startsWith('//')) img = 'https:' + img;
        let url = item.url || item.item_url || '';
        if (url && !url.startsWith('http')) {
          try { url = new URL(url, pageUrl).href; } catch { url = ''; }
        }
        const price = parseFloat(item.price || item.item_price || '0');
        if (products.some(p => p.name === name)) continue;
        products.push({
          name, brand: itemBrand,
          product_url: url || pageUrl,
          price_cents: price > 0 ? Math.round(price * 100) : null,
          currency: item.currency || 'USD',
          image_urls: img && img.startsWith('http') ? [img] : [],
          category_raw: item.category || category,
          colour: null,
      description: null,
        });
      }
    } catch { /* skip invalid JSON */ }
  }
}

/**
 * Extract products from SSR-rendered product tiles.
 * Parses data-product-name, aria-label, product-tile class patterns,
 * and <picture> srcset elements common in Next.js/Nuxt SSR sites.
 */
function extractProductsFromSsrTiles(html: string, products: RawProduct[], brand: string, category: string, pageUrl: string): void {
  const seen = new Set<string>();

  // Pattern 1: data-product-name + nearby href (Lululemon, etc.)
  const dataProdRegex = /<[^>]*data-product-(?:name|id)=["']([^"']+)["'][^>]*>[\s\S]*?href=["']([^"']+)["']/gi;
  let m;
  while ((m = dataProdRegex.exec(html)) !== null && products.length < 80) {
    const [, nameOrId, href] = m;
    let url = href;
    if (!url.startsWith('http')) {
      try { url = new URL(url, pageUrl).href; } catch { continue; }
    }
    if (seen.has(url)) continue;
    seen.add(url);

    // Try to find name from data-product-name or aria-label nearby
    const name = nameOrId.length > 5 && !/^\d+$/.test(nameOrId) ? nameOrId : '';
    if (!name || isListingPageName(name)) continue;

    // Find nearest image in srcset
    const nearbyHtml = html.substring(Math.max(0, m.index - 500), m.index + 2000);
    const srcsetMatch = nearbyHtml.match(/srcset=["']([^"']+)["']/);
    let img = '';
    if (srcsetMatch) {
      // Extract first URL from srcset
      const firstUrl = srcsetMatch[1].split(/[,\s]+/).find(s => s.startsWith('http'));
      if (firstUrl) img = firstUrl.split('?')[0]; // Strip query params for cleaner URL
    }
    if (!img) {
      const imgMatch = nearbyHtml.match(/(?:src|data-src)=["'](https?:\/\/[^"']+\.(jpg|jpeg|png|webp)[^"']*)["']/i);
      if (imgMatch) img = imgMatch[1];
    }

    products.push({
      name, brand,
      product_url: url,
      price_cents: null,
      currency: 'USD',
      image_urls: img ? [img] : [],
      category_raw: category,
      colour: null,
      description: null,
    });
  }

  // Pattern 2: aria-label="View details of X" with href (Lululemon pattern)
  if (products.length === 0) {
    const ariaRegex = /<a[^>]*aria-label=["'](?:View details of |Shop |Buy )([^"']+)["'][^>]*href=["']([^"']+)["']/gi;
    while ((m = ariaRegex.exec(html)) !== null && products.length < 80) {
      const [, name, href] = m;
      let url = href;
      if (!url.startsWith('http')) {
        try { url = new URL(url, pageUrl).href; } catch { continue; }
      }
      if (seen.has(url)) continue;
      seen.add(url);
      if (name.length < 5 || isListingPageName(name)) continue;

      // Find nearest image
      const nearbyHtml = html.substring(m.index, m.index + 3000);
      const imgMatch = nearbyHtml.match(/(?:src|srcset)=["'](https?:\/\/[^"'\s,]+\.(jpg|jpeg|png|webp)[^"'\s,]*)["'\s,]/i);
      const img = imgMatch?.[1] || '';

      products.push({
        name, brand,
        product_url: url,
        price_cents: null,
        currency: 'USD',
        image_urls: img ? [img] : [],
        category_raw: category,
        colour: null,
      description: null,
      });
    }
  }

  // Pattern 3: product-card / product-tile class with nested link + image
  if (products.length === 0) {
    const tileRegex = /<(?:div|article|li)[^>]*class=["'][^"']*(?:product[-_]?card|product[-_]?tile|product[-_]?item|plp[-_]?card)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|article|li)>/gi;
    while ((m = tileRegex.exec(html)) !== null && products.length < 80) {
      const tileHtml = m[1];
      const linkMatch = tileHtml.match(/<a[^>]*href=["']([^"']+)["']/);
      const imgMatch = tileHtml.match(/(?:src|data-src|srcset)=["'](https?:\/\/[^"'\s,]+\.(jpg|jpeg|png|webp)[^"'\s,]*)["'\s,]/i);
      const nameMatch = tileHtml.match(/alt=["']([^"']{5,})["']/i) || tileHtml.match(/title=["']([^"']{5,})["']/i);
      
      if (!linkMatch || !nameMatch) continue;
      let url = linkMatch[1];
      if (!url.startsWith('http')) {
        try { url = new URL(url, pageUrl).href; } catch { continue; }
      }
      if (seen.has(url)) continue;
      seen.add(url);
      
      const name = nameMatch[1];
      if (isListingPageName(name)) continue;
      const img = imgMatch?.[1] || '';

      products.push({
        name, brand,
        product_url: url,
        price_cents: null,
        currency: 'USD',
        image_urls: img ? [img] : [],
        category_raw: category,
        colour: null,
      description: null,
      });
    }
  }
}

function extractProductsFromHtmlGrid(html: string, products: RawProduct[], brand: string, category: string, pageUrl: string): void {
  // Match product card patterns: <a href="/product/..." with nearby <img>
  // This is a heuristic approach for sites without JSON-LD
  const productCardRegex = /<a\s[^>]*href=["']([^"']*(?:\/p\/|\/product|\/shop\/[^"']*?-)[^"']*)["'][^>]*>[\s\S]*?<img[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*(?:alt=["']([^"']+)["'])?/gi;
  let m;
  const seen = new Set<string>();
  while ((m = productCardRegex.exec(html)) !== null && products.length < 50) {
    let [, href, imgSrc, alt] = m;
    if (!href || !imgSrc) continue;
    if (href.startsWith('//')) href = 'https:' + href;
    if (!href.startsWith('http')) {
      try { href = new URL(href, pageUrl).href; } catch { continue; }
    }
    if (imgSrc.startsWith('//')) imgSrc = 'https:' + imgSrc;
    if (!imgSrc.startsWith('http')) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    
    const name = alt || '';
    if (name.length < 5 || isListingPageName(name)) continue;
    if (/logo|icon|sprite|banner/i.test(imgSrc)) continue;

    products.push({
      name, brand,
      product_url: href,
      price_cents: null,
      currency: 'USD',
      image_urls: [imgSrc],
      category_raw: category,
      colour: null,
      description: null,
    });
  }
}

/**
 * Direct HTTP scraping — fetches category pages and parses products from HTML.
 * Zero Firecrawl credits used. Works for sites that serve HTML/SSR content.
 */
async function scrapeDirectHttp(
  brand: string,
  category: string,
): Promise<RawProduct[]> {
  const brandKey = normalizeBrandKey(brand);
  const brandUrls = CATEGORY_MAP[brandKey];
  
  if (!brandUrls) {
    console.log(`[direct] No URL config for ${brand}, skipping direct scrape`);
    return [];
  }

  const catKey = category.toLowerCase();
  const parentKey = CATEGORY_TO_URL_KEY[catKey] || catKey;
  const urlConfigs = brandUrls[catKey] || brandUrls[parentKey];
  
  if (!urlConfigs?.length) {
    console.log(`[direct] No URLs for ${brand}/${category}`);
    return [];
  }

  const allProducts: RawProduct[] = [];
  
  for (const urlConfig of urlConfigs) {
    console.log(`[direct] Fetching ${urlConfig.url}`);
    const html = await fetchPageHtml(urlConfig.url);
    if (!html) continue;
    
    const pageProducts = parseProductsFromHtml(html, brand, category, urlConfig.url);
    console.log(`[direct] Parsed ${pageProducts.length} products from ${urlConfig.url}`);
    allProducts.push(...pageProducts);
    
    // Small delay between pages
    await delay(500);
  }

  // Also try to enrich products missing images
  const withImages = allProducts.filter(p => p.image_urls.length > 0);
  const withoutImages = allProducts.filter(p => p.image_urls.length === 0);
  
  if (withoutImages.length > 0 && withoutImages.length <= 20) {
    console.log(`[direct] Enriching ${withoutImages.length} products without images via og:image`);
    const enriched = await enrichProductImages(withoutImages);
    withImages.push(...enriched);
  }

  console.log(`[direct] Total: ${withImages.length} products with images for ${brand}/${category}`);
  return withImages;
}

/**
 * Check Firecrawl credit balance. Returns remaining credits or null on error.
 */
async function checkFirecrawlCredits(apiKey: string): Promise<number | null> {
  try {
    const resp = await fetch('https://api.firecrawl.dev/v2/team/credit-usage', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!resp.ok) {
      await resp.text();
      return null;
    }
    const data = await resp.json();
    return data?.data?.remaining_credits ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRECRAWL SCRAPE — single-URL HTML fetch with JS rendering (Cloudflare-safe)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scrape a single URL via Firecrawl /v1/scrape and return raw HTML.
 * Use this for Cloudflare-protected retailers (SSENSE / Mr Porter / END / etc.)
 * where plain `fetchPageHtml` returns 403.
 *
 * Returns null on any failure (logs the reason).
 */
async function firecrawlScrape(
  url: string,
  apiKey: string,
  opts: { waitFor?: number; onlyMainContent?: boolean; timeoutMs?: number } = {},
): Promise<string | null> {
  if (!apiKey) {
    console.warn(`[firecrawl-scrape] no API key, skipping ${url}`);
    return null;
  }
  const waitFor = opts.waitFor ?? 4000;
  const onlyMainContent = opts.onlyMainContent ?? false;
  const timeoutMs = opts.timeoutMs ?? 30000;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const resp = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['html'],
        onlyMainContent,
        waitFor,
      }),
      signal: ac.signal,
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.success) {
      console.warn(
        `[firecrawl-scrape] ${url} HTTP ${resp.status}: ${JSON.stringify(data ?? {}).slice(0, 240)}`,
      );
      return null;
    }
    const html = data?.data?.html || data?.data?.rawHtml || '';
    if (!html) {
      console.warn(`[firecrawl-scrape] ${url} returned no html field`);
      return null;
    }
    return html as string;
  } catch (err) {
    const e = err as Error;
    console.warn(`[firecrawl-scrape] ${url} threw (${e.name}): ${e.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRECRAWL v2 JSON-SCHEMA PRODUCT EXTRACTION
// Single /v2/scrape call with formats:[{type:'json',schema}] returns an array
// of typed products from a retailer listing page. ~5–9 credits per page (vs.
// ~10–20+ for the legacy HTML+JSON-LD+PDP-loop approach). Required for
// Cloudflare-protected luxury retailers (SSENSE / Mr Porter / Farfetch /
// Mytheresa) — those need `proxy: 'stealth'` (+4 credits) to bypass the WAF.
// ─────────────────────────────────────────────────────────────────────────────

// Hosts where the listing pages sit behind Cloudflare / heavy bot protection
// and require Firecrawl's stealth proxy.
const STEALTH_RETAILER_HOSTS = new Set<string>([
  'ssense.com',
  'mrporter.com',
  'farfetch.com',
  'mytheresa.com',
  'net-a-porter.com',
  'matchesfashion.com',
]);

function shouldUseStealth(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    for (const h of STEALTH_RETAILER_HOSTS) {
      if (host === h || host.endsWith(`.${h}`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

interface FirecrawlExtractedProduct {
  name?: string | null;
  brand?: string | null;
  price_usd?: number | null;
  product_url?: string | null;
  image_url?: string | null;
  color?: string | null;
  category?: string | null;
}

async function firecrawlScrapeProducts(
  url: string,
  apiKey: string,
  opts: { brandHint?: string; useStealth?: boolean; timeoutMs?: number } = {},
): Promise<FirecrawlExtractedProduct[]> {
  if (!apiKey) {
    console.warn(`[firecrawl-json] no API key, skipping ${url}`);
    return [];
  }
  // JSON-mode + stealth on a heavy listing page legitimately needs 60–120s
  // (waitFor + JS render + LLM extraction over the page). Default to 120s.
  const timeoutMs = opts.timeoutMs ?? 120000;
  const useStealth = opts.useStealth ?? false;

  const schema = {
    type: 'object',
    properties: {
      products: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full product name as shown on the page' },
            brand: { type: ['string', 'null'], description: 'Designer or brand name' },
            price_usd: {
              type: ['number', 'null'],
              description: 'Current USD selling price as a number, not a string. Null if not visible.',
            },
            product_url: { type: ['string', 'null'], description: 'Direct URL to the product detail page' },
            image_url: {
              type: ['string', 'null'],
              description: 'Primary product image URL at highest available resolution',
            },
            color: { type: ['string', 'null'], description: 'Primary product color' },
            category: {
              type: ['string', 'null'],
              description: 'Category: t-shirt, hoodie, jacket, trousers, sneakers, etc.',
            },
          },
          required: ['name'],
        },
      },
    },
    required: ['products'],
  };

  const prompt = opts.brandHint
    ? `Extract every product visible on this page. Only include products where the brand or designer is "${opts.brandHint}". Do not skip any.`
    : 'Extract every product visible on this page. Do not skip any.';

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const resp = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: [{ type: 'json', schema, prompt }],
        onlyMainContent: false,
        waitFor: 4000,
        ...(useStealth ? { proxy: 'stealth' } : {}),
      }),
      signal: ac.signal,
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(
        `[firecrawl-json] ${url}: HTTP ${resp.status} (stealth=${useStealth}) — ${errText.slice(0, 240)}`,
      );
      return [];
    }
    const body = await resp.json().catch(() => null);
    const products = body?.data?.json?.products;
    if (!Array.isArray(products)) {
      console.warn(
        `[firecrawl-json] ${url}: response had no products array — ${JSON.stringify(body ?? {}).slice(0, 240)}`,
      );
      return [];
    }
    console.log(
      `[firecrawl-json] ${url}: ${products.length} products extracted (stealth=${useStealth})`,
    );
    return products as FirecrawlExtractedProduct[];
  } catch (err) {
    const e = err as Error;
    console.error(`[firecrawl-json] ${url}: ${e.name} — ${e.message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RETAILER-FIRST SCRAPING — for hard-luxury brands behind Cloudflare WAF
// New (2026): single /v2/scrape call per listing with JSON-schema array
// extraction. ~5–9 credits per page; no PDP follow-up loop needed.
// Legacy HTML + JSON-LD + __NEXT_DATA__ parsers remain in this file because
// they're still used by the Shopify-direct path (where they cost 0 credits).
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeBrandViaRetailer(
  brand: string,
  category: string,
  firecrawlApiKey: string,
): Promise<RawProduct[]> {
  const brandKey = brand.toLowerCase().trim();
  const retailerUrls = RETAILER_DESIGNER_URLS[brandKey];
  if (!retailerUrls?.length) return [];
  if (!firecrawlApiKey) {
    console.warn(`[retailer] ${brand}: Firecrawl key missing, skipping`);
    return [];
  }

  const brandTokens = brandKey.split(/\s+/).filter((t) => t.length > 2);
  const matchesBrand = (name: string, brandField: string | null | undefined): boolean => {
    const hay = `${(brandField || '').toLowerCase()} ${(name || '').toLowerCase()}`;
    return brandTokens.some((t) => hay.includes(t));
  };

  const RETAILER_THROTTLE_MS = 2000;
  const allProducts: RawProduct[] = [];

  for (const listingUrl of retailerUrls) {
    // Stagger retailer requests to avoid WAF clustering.
    await new Promise((r) => setTimeout(r, RETAILER_THROTTLE_MS + Math.random() * 1500));

    const useStealth = shouldUseStealth(listingUrl);
    const extracted = await firecrawlScrapeProducts(listingUrl, firecrawlApiKey, {
      brandHint: brand,
      useStealth,
    });

    if (!extracted.length) {
      console.warn(`[retailer] ${listingUrl}: 0 products (stealth=${useStealth})`);
      continue;
    }

    // Strict brand filter — discard cross-brand carousel pollution.
    const onBrand = extracted.filter((p) => matchesBrand(p.name || '', p.brand));
    console.log(
      `[retailer] ${listingUrl}: extracted=${extracted.length} on-brand=${onBrand.length}`,
    );

    for (const p of onBrand) {
      const name = (p.name || '').trim();
      if (!name) continue;
      const rawUrl = (p.product_url || '').trim();
      const productUrl = rawUrl
        ? (rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, listingUrl).toString())
        : listingUrl;
      const imageUrl = (p.image_url || '').trim();
      allProducts.push({
        name,
        brand, // canonical brand, ignore retailer spelling
        product_url: productUrl,
        price_cents: typeof p.price_usd === 'number' && Number.isFinite(p.price_usd)
          ? Math.round(p.price_usd * 100)
          : null,
        currency: 'USD',
        image_urls: imageUrl ? [imageUrl] : [],
        category_raw: (p.category || category) ?? category,
        colour: p.color || null,
        description: null, // not extracted from listing
        _method: 'retailer_firecrawl_json',
      });
    }
  }

  // Dedupe by product_url.
  const seen = new Set<string>();
  const deduped = allProducts.filter((p) => {
    const k = (p.product_url || '').toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.log(
    `[retailer] ${brand}/${category} FINAL: ${deduped.length} products via firecrawl_json`,
  );
  return deduped;
}

async function scrapeProducts(
  brand: string,
  category: string,
  firecrawlApiKey: string,
  useFirecrawl = true,
): Promise<RawProduct[]> {
  // Helper to tag all products in an array with their source method
  const tag = (products: RawProduct[], method: ScrapeMethod): RawProduct[] => {
    for (const p of products) p._method = p._method || method;
    return products;
  };

  // ── STEP 0: Try Shopify /products.json first (free, structured, reliable) ──
  const shopifyProducts = tag(await scrapeShopifyProducts(brand, category), 'shopify');
  if (shopifyProducts.length >= 3) {
    console.log(`[scrape] Shopify API found ${shopifyProducts.length} products, skipping other methods`);
    return shopifyProducts;
  }

  // ── STEP 1: Always try direct HTTP next (free) ──
  const directProducts = tag(await scrapeDirectHttp(brand, category), 'direct');
  // Merge any Shopify results with direct results
  const mergedDirect = [...shopifyProducts, ...directProducts];
  if (mergedDirect.length >= 3) {
    console.log(`[scrape] Shopify(${shopifyProducts.length}) + Direct(${directProducts.length}) = ${mergedDirect.length} products, skipping Firecrawl`);
    return mergedDirect;
  }

  // ── STEP 1.5: Retailer-first for hard-luxury brands behind Cloudflare ──
  // Routes via Firecrawl (the only thing that bypasses SSENSE/Mr Porter/END WAFs).
  // Only fires if the brand is mapped in RETAILER_DESIGNER_URLS AND a Firecrawl
  // key is present AND useFirecrawl is on.
  const _retailerKey = brand.toLowerCase().trim();
  if (useFirecrawl && firecrawlApiKey && RETAILER_DESIGNER_URLS[_retailerKey]) {
    console.log(`[scrape] Retailer-first for ${brand}/${category}`);
    const retailerProducts = await scrapeBrandViaRetailer(brand, category, firecrawlApiKey);
    if (retailerProducts.length > 0) {
      const merged = [...mergedDirect, ...retailerProducts];
      const seen = new Set<string>();
      const deduped = merged.filter((p) => {
        const k = (p.product_url || '').toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (deduped.length >= 3) {
        console.log(`[scrape] Retailer-first returned ${retailerProducts.length}, total ${deduped.length} — skipping Google/search`);
        return deduped;
      }
      mergedDirect.push(...retailerProducts.filter((p) => !mergedDirect.some((d) => d.product_url.toLowerCase() === p.product_url.toLowerCase())));
      console.log(`[scrape] Retailer-first returned ${retailerProducts.length}, falling through to Google/search`);
    } else {
      console.log(`[scrape] Retailer-first returned 0, falling through`);
    }
  }

  // ── STEP 2: Try Google Custom Search (free, 100 queries/day) ──
  const googleApiKey = Deno.env.get('GOOGLE_SEARCH_API_KEY');
  const googleCx = Deno.env.get('GOOGLE_SEARCH_CX');
  if (googleApiKey && googleCx) {
    console.log(`[scrape] Trying Google Custom Search for ${brand}/${category}`);
    const googleProducts = tag(await searchGoogleProducts(brand, category, googleApiKey, googleCx), 'search');
    const allWithGoogle = [...mergedDirect, ...googleProducts];
    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const deduped = allWithGoogle.filter(p => {
      const key = p.product_url.toLowerCase();
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    });
    if (deduped.length >= 3) {
      console.log(`[scrape] Google Search found ${googleProducts.length}, total ${deduped.length} — skipping Firecrawl`);
      return deduped;
    }
    // If Google didn't find enough, merge and continue to Firecrawl
    mergedDirect.push(...googleProducts.filter(p => !mergedDirect.some(d => d.product_url.toLowerCase() === p.product_url.toLowerCase())));
  }

  if (!useFirecrawl) {
    console.log(`[scrape] Firecrawl disabled, returning ${mergedDirect.length} direct results`);
    return mergedDirect;
  }

  // ── STEP 3: Fall back to Firecrawl search (cheap, 1-2 credits) ──
  const brandKey = normalizeBrandKey(brand);

  // All brands now use search-only strategy (no extract/scrape)
  console.log(`[scrape] Using search-only strategy for ${brand}/${category}`);
  const searchResults = tag(await searchProducts(brand, category, firecrawlApiKey), 'search');
  const existingUrls = new Set(searchResults.map(p => p.product_url.toLowerCase()));
  for (const p of mergedDirect) {
    if (!existingUrls.has(p.product_url.toLowerCase())) searchResults.push(p);
  }

  return searchResults;
}



// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE CUSTOM SEARCH — Free tier (100 queries/day), primary search provider
// ─────────────────────────────────────────────────────────────────────────────

async function searchGoogleProducts(
  brand: string,
  category: string,
  apiKey: string,
  cx: string,
): Promise<RawProduct[]> {
  const catTerms = CATEGORY_TERMS[category.toLowerCase()] || category;
  const brandLower = brand.toLowerCase();

  const brandKey = normalizeBrandKey(brand);
  const siteOverride = BRAND_SITE_OVERRIDES[brandKey] || BRAND_SITE_OVERRIDES[brandLower];

  let query = `${brand} ${catTerms}`;
  if (siteOverride) {
    query = `${brand} ${catTerms} ${siteOverride}`;
  } else {
    const isLuxury = LUXURY_SEARCH_BRANDS.has(brandLower);
    const isAthletic = ATHLETIC_BRANDS.has(brandLower);
    const isWomens = WOMENS_BRANDS.has(brandLower);
    const sites = isLuxury ? LUXURY_SITES : isAthletic ? ATHLETIC_SITES : isWomens ? WOMENS_SITES : GENERAL_SITES;
    query = `${brand} ${catTerms} ${sites}`;
  }

  console.log(`[google-search] Query: "${query.slice(0, 120)}..."`);

  const allProducts: RawProduct[] = [];

  for (let startIndex = 1; startIndex <= 11; startIndex += 10) {
    try {
      const params = new URLSearchParams({
        key: apiKey,
        cx,
        q: query,
        num: '10',
        start: String(startIndex),
      });

      const resp = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`[google-search] HTTP ${resp.status}: ${errText.slice(0, 200)}`);
        if (resp.status === 429 || resp.status === 403) break;
        continue;
      }

      const data = await resp.json();
      const items = data.items || [];
      console.log(`[google-search] Page ${Math.ceil(startIndex / 10)}: ${items.length} results`);

      for (const item of items) {
        const url = item.link;
        if (!url) continue;

        const urlLower = url.toLowerCase();
        if (/\/search|\/category|\/collection[s]?\/?$|\/shop\/?$|\/c\/[^\/]*$|page=\d|\/sale\/?$|\/browse|\/all\/?$/i.test(urlLower)) continue;

        let productName = (item.title || '')
          .replace(/\s*[-|]\s*(SSENSE|Farfetch|Nordstrom|NET-A-PORTER|MR PORTER|Macy's|Macys|Zappos|Amazon|Target|Kohl's|Saks|Revolve|ASOS|Shopbop|Mytheresa|END\.|Foot Locker|Dick's|REI).*$/i, '')
          .replace(/\s*Buy\s.*$/i, '')
          .trim();

        if (!productName || productName.length < 8) continue;
        if (isListingPageName(productName)) continue;

        const brandSearchable = brandLower.replace(/&/g, '').replace(/[^a-z0-9]/g, '');
        const isRetailerBrand = ['nordstrom', 'macys', "macy's", 'target', 'revolve', 'asos'].includes(brandLower);
        const titleLower = (item.title || '').toLowerCase();
        const brandInResult = titleLower.includes(brandLower) || titleLower.replace(/[^a-z0-9]/g, '').includes(brandSearchable);
        const brandDomainMatch = urlLower.includes(`${brandSearchable}.com`);
        if (!isRetailerBrand && !brandInResult && !brandDomainMatch) continue;

        const imageUrls: string[] = [];
        const pagemap = item.pagemap || {};
        if (pagemap.cse_image?.[0]?.src) imageUrls.push(pagemap.cse_image[0].src);
        if (pagemap.metatags?.[0]?.['og:image']) {
          const ogImg = pagemap.metatags[0]['og:image'];
          if (!imageUrls.includes(ogImg)) imageUrls.push(ogImg);
        }
        if (pagemap.cse_thumbnail?.[0]?.src) {
          const thumb = pagemap.cse_thumbnail[0].src;
          if (!imageUrls.includes(thumb)) imageUrls.push(thumb);
        }

        const snippet = item.snippet || '';
        const priceMatch = snippet.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
        const priceCents = priceMatch ? Math.round(parseFloat(priceMatch[1].replace(',', '')) * 100) : null;

        allProducts.push({
          name: productName,
          brand,
          product_url: url,
          price_cents: priceCents,
          currency: 'USD',
          image_urls: imageUrls.slice(0, 8),
          category_raw: category,
          colour: null,
      description: null,
        });
      }

      if (items.length < 10) break;
      await delay(200);
    } catch (err) {
      console.warn(`[google-search] Error:`, (err as Error).message);
      break;
    }
  }

  if (allProducts.length > 0) {
    const withImages = allProducts.filter(p => p.image_urls.length > 0);
    const withoutImages = allProducts.filter(p => p.image_urls.length === 0);
    const validated = await validateProductImages(withImages);
    
    if (withoutImages.length > 0 && withoutImages.length <= 15) {
      const enriched = await enrichProductImages(withoutImages);
      validated.push(...enriched);
    }
    
    console.log(`[google-search] Final: ${validated.length} products for ${brand}/${category}`);
    return validated;
  }

  console.log(`[google-search] No products found for ${brand}/${category}`);
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH FALLBACK — Enhanced with shopping-intent queries + expanded sites
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_TERMS: Record<string, string> = {
  tops: 'buy t-shirt shirt top hoodie sweatshirt polo tank',
  't-shirts': 'buy t-shirt tee graphic-tee shop',
  shirts: 'buy shirt button-down oxford flannel dress-shirt shop',
  hoodies: 'buy hoodie sweatshirt pullover crewneck fleece shop',
  polos: 'buy polo shirt pique shop',
  sweaters: 'buy sweater knit cardigan pullover turtleneck shop',
  bottoms: 'buy pants jeans trousers shorts joggers shop',
  jeans: 'buy jeans denim skinny straight slim bootcut shop',
  pants: 'buy pants trousers chinos cargo dress-pants shop',
  shorts: 'buy shorts swim-trunks board-shorts cargo-shorts shop',
  skirts: 'buy skirt mini-skirt midi-skirt maxi-skirt shop',
  leggings: 'buy leggings tights yoga-pants shop',
  outerwear: 'buy jacket coat blazer puffer vest windbreaker parka shop',
  jackets: 'buy jacket bomber denim-jacket trucker varsity shop',
  coats: 'buy coat trench overcoat peacoat wool-coat shop',
  blazers: 'buy blazer sport-coat suit-jacket shop',
  vests: 'buy vest gilet puffer-vest down-vest shop',
  dresses: 'buy dress gown jumpsuit romper maxi midi mini shop',
  'jumpsuits': 'buy jumpsuit romper overalls playsuit shop',
  shoes: 'buy shoes sneakers boots loafers sandals shop',
  sneakers: 'buy sneakers trainers running-shoes athletic-shoes shop',
  boots: 'buy boots ankle-boots chelsea-boots combat-boots shop',
  sandals: 'buy sandals slides flip-flops mules shop',
  loafers: 'buy loafers moccasins slip-on driving-shoes shop',
  heels: 'buy heels pumps stilettos wedges platforms shop',
  accessories: 'buy bag belt hat sunglasses wallet shop',
  bags: 'buy bag handbag tote crossbody backpack clutch shop',
  hats: 'buy hat cap beanie bucket-hat snapback shop',
  sunglasses: 'buy sunglasses eyewear aviator wayfarer shop',
  jewelry: 'buy jewelry necklace bracelet ring earrings pendant shop',
  watches: 'buy watch timepiece chronograph shop',
  belts: 'buy belt leather-belt woven-belt shop',
  scarves: 'buy scarf shawl wrap bandana shop',
  swimwear: 'buy swimsuit bikini swim-trunks one-piece shop',
  activewear: 'buy activewear gym workout training sports-bra shop',
  loungewear: 'buy loungewear pajamas robe sleepwear shop',
  underwear: 'buy underwear boxers briefs bra lingerie shop',
};

// Luxury brands that are sold on multi-brand aggregators
const LUXURY_SEARCH_BRANDS = new Set([
  'gucci', 'prada', 'dior', 'balenciaga', 'saint laurent', 'louis vuitton',
  'fendi', 'givenchy', 'valentino', 'alexander mcqueen', 'bottega veneta',
  'celine', 'loewe', 'moncler', 'stone island', 'acne studios',
  'ami paris', 'jacquemus', 'rick owens', 'maison margiela', 'versace',
  'burberry', 'off-white', 'fear of god', 'essentials', 'a bathing ape',
  'kith', 'supreme', 'palace', 'corteiz', 'trapstar',
  'cartier', 'tiffany & co', 'pandora', 'swarovski',
  // New luxury/streetwear brands
  'balmain', 'tom ford', 'dsquared2', 'dolce & gabbana', 'amiri',
  'palm angels', 'golden goose', 'chrome hearts', 'jw anderson',
  'thom browne', 'brunello cucinelli', 'issey miyake', 'coperni', 'alaia',
  'represent', 'eric emanuel', 'gallery dept', 'rhude', 'human made',
  'undercover', 'neighborhood', 'needles', 'comme des garcons',
  'vetements', 'sacai', 'daily paper', 'missing since thursday',
]);

// Expanded site lists for better coverage
const LUXURY_SITES = 'site:ssense.com OR site:farfetch.com OR site:nordstrom.com OR site:net-a-porter.com OR site:mrporter.com OR site:saksoff5th.com OR site:bloomingdales.com OR site:mytheresa.com OR site:matchesfashion.com OR site:endclothing.com';
const GENERAL_SITES = 'site:nordstrom.com OR site:macys.com OR site:zappos.com OR site:amazon.com OR site:target.com OR site:kohls.com OR site:revolve.com OR site:asos.com';
const ATHLETIC_SITES = 'site:nordstrom.com OR site:zappos.com OR site:dickssportinggoods.com OR site:amazon.com OR site:footlocker.com OR site:finishline.com';
const WOMENS_SITES = 'site:nordstrom.com OR site:revolve.com OR site:asos.com OR site:shopbop.com OR site:net-a-porter.com OR site:freepeople.com OR site:anthropologie.com';

// Athletic brands need sport-specific search sites
const ATHLETIC_BRANDS = new Set([
  'nike', 'adidas', 'puma', 'under armour', 'reebok', 'asics',
  'on running', 'hoka', 'saucony', 'new balance', 'jordan',
  'lululemon', 'gymshark', 'alo yoga', 'fabletics', 'vuori',
  'girlfriend collective', 'outdoor voices',
]);

const WOMENS_BRANDS = new Set([
  'reformation', 'free people', 'anthropologie', 'aritzia',
  'skims', 'fabletics', 'girlfriend collective', 'eloquii',
  'eileen fisher', 'savage x fenty', "victoria's secret",
]);

// Expanded brand-specific site overrides for all major anti-scrape brands
const BRAND_SITE_OVERRIDES: Record<string, string> = {
  'hm': 'site:hm.com OR site:nordstrom.com OR site:macys.com',
  'h&m': 'site:hm.com OR site:nordstrom.com OR site:macys.com',
  'zara': 'site:zara.com OR site:nordstrom.com',
  'uniqlo': 'site:uniqlo.com OR site:nordstrom.com',
  'shein': 'site:shein.com OR site:us.shein.com',
  'nike': 'site:nike.com OR site:nordstrom.com OR site:zappos.com OR site:footlocker.com',
  'asos': 'site:asos.com OR site:us.asos.com',
  'gap': 'site:gap.com OR site:nordstrom.com',
  'banana republic': 'site:bananarepublic.com OR site:nordstrom.com',
  'old navy': 'site:oldnavy.com OR site:amazon.com',
  'j.crew': 'site:jcrew.com OR site:nordstrom.com',
  'ralph lauren': 'site:ralphlauren.com OR site:nordstrom.com OR site:macys.com',
  'tommy hilfiger': 'site:tommy.com OR site:nordstrom.com OR site:macys.com',
  'calvin klein': 'site:calvinklein.us OR site:nordstrom.com OR site:macys.com',
  'hugo boss': 'site:hugoboss.com OR site:nordstrom.com',
  'mango': 'site:shop.mango.com OR site:nordstrom.com',
  'cos': 'site:cos.com OR site:nordstrom.com',
  'urban outfitters': 'site:urbanoutfitters.com',
  'forever 21': 'site:forever21.com OR site:amazon.com',
  'fashion nova': 'site:fashionnova.com',
  'prettylittlething': 'site:prettylittlething.us',
  'boohoo': 'site:us.boohoo.com',
  'abercrombie': 'site:abercrombie.com OR site:nordstrom.com',
  'american eagle': 'site:ae.com OR site:nordstrom.com',
  'hollister': 'site:hollisterco.com',
  'nordstrom': 'site:nordstrom.com',
  'anthropologie': 'site:anthropologie.com',
  'aritzia': 'site:aritzia.com OR site:nordstrom.com',
  'revolve': 'site:revolve.com',
  'everlane': 'site:everlane.com OR site:nordstrom.com',
  'under armour': 'site:underarmour.com OR site:nordstrom.com OR site:zappos.com',
  'lululemon': 'site:lululemon.com OR site:nordstrom.com',
  'gymshark': 'site:gymshark.com OR site:nordstrom.com',
  'alo yoga': 'site:aloyoga.com OR site:nordstrom.com',
  'fabletics': 'site:fabletics.com OR site:nordstrom.com OR site:amazon.com',
  'vuori': 'site:vuori.com OR site:nordstrom.com',
  'skims': 'site:skims.com OR site:nordstrom.com',
  'allsaints': 'site:allsaints.com OR site:nordstrom.com',
  'columbia': 'site:columbia.com OR site:nordstrom.com OR site:zappos.com',
  "arc'teryx": 'site:arcteryx.com OR site:nordstrom.com OR site:moosejaw.com',
  'birkenstock': 'site:birkenstock.com OR site:nordstrom.com OR site:zappos.com',
  'crocs': 'site:crocs.com OR site:nordstrom.com OR site:zappos.com',
  'dr. martens': 'site:drmartens.com OR site:nordstrom.com OR site:zappos.com',
  'reformation': 'site:thereformation.com OR site:nordstrom.com OR site:revolve.com',
  'kith': 'site:kith.com OR site:ssense.com OR site:endclothing.com',
  'fear of god': 'site:fearofgod.com OR site:ssense.com OR site:nordstrom.com',
  // ── New luxury/streetwear brands ──
  'balmain': 'site:balmain.com OR site:ssense.com OR site:farfetch.com OR site:nordstrom.com',
  'tom ford': 'site:tomford.com OR site:nordstrom.com OR site:ssense.com',
  'dsquared2': 'site:dsquared2.com OR site:ssense.com OR site:farfetch.com',
  'dolce & gabbana': 'site:dolcegabbana.com OR site:ssense.com OR site:farfetch.com OR site:nordstrom.com',
  'amiri': 'site:amiri.com OR site:ssense.com OR site:farfetch.com OR site:nordstrom.com',
  'palm angels': 'site:palmangels.com OR site:ssense.com OR site:farfetch.com OR site:endclothing.com',
  'golden goose': 'site:goldengoose.com OR site:ssense.com OR site:nordstrom.com',
  'chrome hearts': 'site:chromeheartsusa.com OR site:ssense.com',
  'jw anderson': 'site:jwanderson.com OR site:ssense.com OR site:farfetch.com',
  'thom browne': 'site:thombrowne.com OR site:ssense.com OR site:farfetch.com OR site:nordstrom.com',
  'brunello cucinelli': 'site:brunellocucinelli.com OR site:nordstrom.com OR site:farfetch.com',
  'issey miyake': 'site:isseymiyake.com OR site:ssense.com OR site:farfetch.com',
  'coperni': 'site:coperni.com OR site:ssense.com OR site:farfetch.com',
  'alaia': 'site:maison-alaia.com OR site:ssense.com OR site:farfetch.com OR site:net-a-porter.com',
  'represent': 'site:representclo.com OR site:ssense.com OR site:endclothing.com',
  'eric emanuel': 'site:ericemanuel.com OR site:ssense.com',
  'gallery dept': 'site:gallerydept.com OR site:ssense.com OR site:farfetch.com',
  'rhude': 'site:rhude.com OR site:ssense.com OR site:farfetch.com OR site:nordstrom.com',
  'human made': 'site:humanmade.jp OR site:ssense.com OR site:endclothing.com',
  'undercover': 'site:undercoverism.com OR site:ssense.com OR site:endclothing.com',
  'neighborhood': 'site:neighborhood.jp OR site:ssense.com OR site:endclothing.com',
  'needles': 'site:needles.jp OR site:ssense.com OR site:endclothing.com',
  'comme des garcons': 'site:commedesgarcons.com OR site:ssense.com OR site:endclothing.com OR site:doverstreetmarket.com',
  'vetements': 'site:vetementswebsite.com OR site:ssense.com OR site:farfetch.com',
  'sacai': 'site:sacai.jp OR site:ssense.com OR site:endclothing.com',
  'daily paper': 'site:dailypaperclothing.com OR site:ssense.com OR site:endclothing.com',
  'missing since thursday': 'site:missingsincethursday.com OR site:endclothing.com',
  'moncler': 'site:moncler.com OR site:ssense.com OR site:farfetch.com OR site:nordstrom.com',
  'stone island': 'site:stoneisland.com OR site:ssense.com OR site:endclothing.com OR site:farfetch.com',
  'acne studios': 'site:acnestudios.com OR site:ssense.com OR site:nordstrom.com',
  'ami paris': 'site:amiparis.com OR site:ssense.com OR site:farfetch.com OR site:nordstrom.com',
  'jacquemus': 'site:jacquemus.com OR site:ssense.com OR site:farfetch.com OR site:nordstrom.com',
  'rick owens': 'site:rickowens.eu OR site:ssense.com OR site:farfetch.com',
  'maison margiela': 'site:maisonmargiela.com OR site:ssense.com OR site:farfetch.com OR site:nordstrom.com',
};

const FIRECRAWL_SEARCH_WITH_MARKDOWN = Deno.env.get('FIRECRAWL_SEARCH_WITH_MARKDOWN') === 'true';

function getSearchLimit(envKey: string, fallback: number): number {
  const raw = Number(Deno.env.get(envKey));
  const value = Number.isFinite(raw) ? raw : fallback;
  return Math.max(1, Math.min(10, Math.floor(value)));
}

const FIRECRAWL_SEARCH_PRIMARY_LIMIT = getSearchLimit('FIRECRAWL_SEARCH_PRIMARY_LIMIT', 4);
const FIRECRAWL_SEARCH_FALLBACK_LIMIT = getSearchLimit('FIRECRAWL_SEARCH_FALLBACK_LIMIT', 2);

function shouldSkipFallbackForError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /all retries exhausted|429|rate limit/i.test(message);
}

async function searchProducts(
  brand: string,
  category: string,
  firecrawlApiKey: string
): Promise<RawProduct[]> {
  const catTerms = CATEGORY_TERMS[category.toLowerCase()] || category;
  const brandLower = brand.toLowerCase();
  const isLuxury = LUXURY_SEARCH_BRANDS.has(brandLower);
  const isAthletic = ATHLETIC_BRANDS.has(brandLower);
  const isWomens = WOMENS_BRANDS.has(brandLower);

  const brandKey = normalizeBrandKey(brand);
  const effectiveSites = BRAND_SITE_OVERRIDES[brandKey]
    || BRAND_SITE_OVERRIDES[brandLower]
    || (isLuxury ? LUXURY_SITES : isAthletic ? ATHLETIC_SITES : isWomens ? WOMENS_SITES : GENERAL_SITES);

  // Shopping-intent query, metadata-only by default (1 credit/search)
  const searchQuery = `${brand} ${catTerms} ${effectiveSites}`;
  console.log(`[search-fallback] Query: "${searchQuery}"`);

  try {
    const payload: Record<string, unknown> = {
      query: searchQuery,
      limit: FIRECRAWL_SEARCH_PRIMARY_LIMIT,
      lang: 'en',
      country: 'us',
    };

    // Opt-in only: markdown scraping costs significantly more credits.
    if (FIRECRAWL_SEARCH_WITH_MARKDOWN) {
      payload.scrapeOptions = { formats: ['markdown'] };
    }

    const resp = await fetchWithRetry('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.warn(`[search-fallback] Firecrawl search error [${resp.status}]: ${JSON.stringify(data).slice(0, 300)}`);
      if (resp.status === 402 || resp.status === 429) return [];
      return searchProductsFallback(brand, category, firecrawlApiKey);
    }

    // Firecrawl v2 returns { data: { web: [...] } }; v1 returned { data: [...] }
    const results: any[] = Array.isArray(data?.data) ? data.data : (data?.data?.web || []);
    const approxCredits = FIRECRAWL_SEARCH_WITH_MARKDOWN ? results.length + 1 : 1;
    console.log(`[search-fallback] Got ${results.length} search results (~${approxCredits} credits)`);

    const allProducts = parseSearchResults(results, brand, category);

    // Try broader query only when primary returned very little.
    if (allProducts.length < 2) {
      console.log(`[search-fallback] Only ${allProducts.length} results, trying broader query`);
      const fallbackProducts = await searchProductsFallback(brand, category, firecrawlApiKey);
      const existingUrls = new Set(allProducts.map(p => p.product_url.toLowerCase()));
      for (const p of fallbackProducts) {
        if (!existingUrls.has(p.product_url.toLowerCase())) {
          allProducts.push(p);
        }
      }
    }

    // Validate images with HEAD requests (free)
    const productsWithImages = allProducts.filter(p => p.image_urls.length > 0);
    const productsWithoutImages = allProducts.filter(p => p.image_urls.length === 0);

    let validated: RawProduct[];
    if (productsWithImages.length > 0) {
      validated = await validateProductImages(productsWithImages);
    } else {
      validated = [];
    }

    // Enrich image-less products from product-page og:image/twitter:image (free)
    if (productsWithoutImages.length > 0) {
      console.log(`[search-fallback] ${productsWithoutImages.length} products without images, fetching og:image from product URLs`);
      const enriched = await enrichProductImages(productsWithoutImages);
      validated.push(...enriched);
    }

    console.log(`[search-fallback] Final: ${validated.length} products for ${brand}/${category}`);
    return validated;
  } catch (err) {
    console.warn(`[search-fallback] Error:`, err);
    if (shouldSkipFallbackForError(err)) {
      console.warn(`[search-fallback] Skipping broad fallback due to sustained rate-limit/retry exhaustion`);
      return [];
    }
    return searchProductsFallback(brand, category, firecrawlApiKey);
  }
}

// Broader fallback search without site restrictions — catches products on any retailer
async function searchProductsFallback(
  brand: string,
  category: string,
  firecrawlApiKey: string
): Promise<RawProduct[]> {
  const catTerms = CATEGORY_TERMS[category.toLowerCase()] || category;
  const searchQuery = `"${brand}" ${catTerms} buy online`;

  console.log(`[search-fallback-broad] Query: "${searchQuery}"`);

  try {
    const payload: Record<string, unknown> = {
      query: searchQuery,
      limit: FIRECRAWL_SEARCH_FALLBACK_LIMIT,
      lang: 'en',
      country: 'us',
    };

    if (FIRECRAWL_SEARCH_WITH_MARKDOWN) {
      payload.scrapeOptions = { formats: ['markdown'] };
    }

    const resp = await fetchWithRetry('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.warn(`[search-fallback-broad] Error [${resp.status}]: ${JSON.stringify(data).slice(0, 200)}`);
      return [];
    }

    // Firecrawl v2 returns { data: { web: [...] } }; v1 returned { data: [...] }
    const results: any[] = Array.isArray(data?.data) ? data.data : (data?.data?.web || []);
    const approxCredits = FIRECRAWL_SEARCH_WITH_MARKDOWN ? results.length + 1 : 1;
    console.log(`[search-fallback-broad] Got ${results.length} results (~${approxCredits} credits)`);
    return parseSearchResults(results, brand, category);
  } catch (err) {
    console.warn(`[search-fallback-broad] Error:`, err);
    return [];
  }
}

// ─── Gender detection from URL path ─────────────────────────────────────────
const SCRAPE_URL_WOMENS = [
  "/women/", "/womens/", "/woman/", "/women-", "/womens-", "/woman-",
  "women+clothing", "women+apparel", "women-clothing", "women-apparel",
  "/ladies/", "/ladies-", "/female/", "shopping/women", "/womenswear/",
  "cat/women", "/womens-", "/w/womens", "/girls/", "/her/",
];
const SCRAPE_URL_MENS = [
  "/men/", "/mens/", "/man/", "/men-", "/mens-", "/man-",
  "men+clothing", "men+apparel", "men-clothing", "men-apparel",
  "/male/", "shopping/men", "/menswear/", "cat/men",
  "/m/mens", "/guys/", "/him/",
];

function detectGenderFromProductUrl(url: string | null): "mens" | "womens" | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  const wHits = SCRAPE_URL_WOMENS.filter(p => lower.includes(p)).length;
  const mHits = SCRAPE_URL_MENS.filter(p => lower.includes(p)).length;
  if (wHits > 0 && mHits === 0) return "womens";
  if (mHits > 0 && wHits === 0) return "mens";
  return null;
}

// ─── Gender detection from product name keywords ────────────────────────────
const NAME_WOMENS_KEYWORDS = [
  "women's", "womens ", "for women", "for her", "ladies",
  "dress", "skirt", "bralette", "bikini", "lingerie", "maternity",
  "bodysuit", "heel", "stiletto", "wedge", "camisole", "pumps",
  "sports bra", "yoga pant", "crop top", "tankini", "romper", "legging",
  "midi ", "maxi ", "mini ", "wrap dress", "slip dress",
  "tote bag", "clutch", "crossbody", "satchel",
  "ballerina", "ballet flat", "mule", "kitten heel", "platform heel",
  "blouse", "peplum", "babydoll", "corset", "bustier",
  "jumpsuit", "playsuit", "culottes", "shapewear", "bodycon",
  "off shoulder", "smocked", "ruched", "sarong", "kaftan",
];
const NAME_MENS_KEYWORDS = [
  "men's", "mens ", "for men", "for him",
  "boxer", "brief", "chino", "dress shirt", "tuxedo", "waistcoat",
  "swim trunk", "swim short", "board short",
  "oxford shirt", "henley ", "muscle tee", "muscle fit",
  "flat front", "cargo short", "necktie", "bow tie", "suspender",
  "compression short", "athletic supporter",
];

function detectGenderFromName(name: string): "mens" | "womens" | null {
  const lower = ` ${name.toLowerCase()} `;
  const wHits = NAME_WOMENS_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const mHits = NAME_MENS_KEYWORDS.filter(kw => lower.includes(kw)).length;
  if (wHits > mHits && wHits >= 1) return "womens";
  if (mHits > wHits && mHits >= 1) return "mens";
  return null;
}

// ─── Extract description snippet from markdown content ──────────────────────
function extractDescription(markdown: string, productName: string): string | null {
  if (!markdown || markdown.length < 20) return null;
  const lines = markdown.split('\n').filter(l => l.trim().length > 20);
  // Look for lines that mention sizing, material, fit, or the product name
  const descKeywords = ['fit', 'material', 'cotton', 'polyester', 'fabric', 'style', 'design', 
    'comfortable', 'casual', 'formal', 'slim', 'relaxed', 'regular', 'tailored',
    'elastic', 'stretch', 'breathable', 'lightweight', 'heavyweight'];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (descKeywords.some(kw => lower.includes(kw))) {
      return line.trim().slice(0, 300);
    }
  }
  // Fallback: return first substantial line that's not a heading
  const first = lines.find(l => !l.startsWith('#') && l.length > 30);
  return first ? first.trim().slice(0, 300) : null;
}

// ─── Extract breadcrumb / navigation path from markdown ─────────────────────
function extractBreadcrumb(markdown: string): string | null {
  if (!markdown) return null;
  // Common breadcrumb patterns: "Home > Men > Tops > T-Shirts" or "Home / Women / Dresses"
  const bcMatch = markdown.match(/(?:Home|Shop)\s*[>\/»→]\s*([^\n]{5,100})/i);
  if (bcMatch) return bcMatch[0].trim();
  // Also check for navigation-style lines at the top
  const lines = markdown.split('\n').slice(0, 10);
  for (const line of lines) {
    if (/[>\/»→]/.test(line) && line.length < 120 && line.length > 10) {
      return line.trim();
    }
  }
  return null;
}

function detectGenderFromBreadcrumb(breadcrumb: string | null): "mens" | "womens" | null {
  if (!breadcrumb) return null;
  const lower = breadcrumb.toLowerCase();
  const hasW = /\bwomen|woman|ladies|her\b/.test(lower);
  const hasM = /\bmen\b|man\b|guys|his\b/.test(lower);
  if (hasW && !hasM) return "womens";
  if (hasM && !hasW) return "mens";
  return null;
}

// Shared parser for search results — now extracts gender from URL + name + breadcrumb
function parseSearchResults(results: any[], brand: string, category: string): RawProduct[] {
  const allProducts: RawProduct[] = [];

  for (const result of results) {
    if (!result.url) { console.log(`[parse] skip: no url`); continue; }

    const url = result.url.toLowerCase();
    if (/\/search|\/category|\/collection[s]?\/?$|\/shop\/?$|\/c\/|\/cat\/?$|page=\d|\/sale\/?$|\/browse|\/all\/?$/i.test(url)) {
      console.log(`[parse] skip url-block: ${result.url}`); continue;
    }

    const title = result.title || '';
    const markdown = result.markdown || result.description || '';

    const priceMatch = markdown.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
    const priceCents = priceMatch ? Math.round(parseFloat(priceMatch[1].replace(',', '')) * 100) : null;

    const imageUrls: string[] = [];
    if (result.metadata?.ogImage) imageUrls.push(result.metadata.ogImage);
    if (result.markdown) {
      const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(result.markdown)) !== null) {
        const imgUrl = imgMatch[1];
        if (!/logo|icon|sprite|favicon|banner|pixel|tracking/i.test(imgUrl)) imageUrls.push(imgUrl);
      }
    }

    let productName = title
      .replace(/\s*[-|]\s*(SSENSE|Farfetch|Nordstrom|NET-A-PORTER|MR PORTER|Macy's|Macys|Zappos|Amazon|Target|Kohl's|Saks|Revolve|ASOS|Shopbop|Mytheresa|END\.|Foot Locker|Dick's|REI).*$/i, '')
      .replace(/\s*Buy\s.*$/i, '')
      .trim();

    if (!productName || productName.length < 8) { console.log(`[parse] skip short: "${productName}"`); continue; }
    if (isListingPageName(productName)) { console.log(`[parse] skip listing-name: "${productName}"`); continue; }

    const brandLower = brand.toLowerCase();
    const brandSearchable = brandLower.replace(/&/g, '').replace(/[^a-z0-9]/g, '');
    const isRetailerBrand = ['nordstrom', 'macys', "macy's", 'bloomingdales', "bloomingdale's", 'target', 'kohls', "kohl's", 'jcpenney', 'walmart', 'saks', 'net-a-porter', 'revolve', 'asos'].includes(brandLower);
    const titleLower = title.toLowerCase();
    const nameLower = productName.toLowerCase();
    const urlLower = (result.url || '').toLowerCase();
    const brandInResult = nameLower.includes(brandLower) || titleLower.includes(brandLower)
      || nameLower.replace(/[^a-z0-9]/g, '').includes(brandSearchable)
      || titleLower.replace(/[^a-z0-9]/g, '').includes(brandSearchable);
    const brandDomainMatch = urlLower.includes(`${brandSearchable}.com`) || urlLower.includes(`${brandSearchable}.co`);
    if (!isRetailerBrand && !brandInResult && !brandDomainMatch) {
      console.log(`[parse] skip brand-mismatch: "${productName}" (looking for ${brandLower})`); continue;
    }

    const description = extractDescription(markdown, productName);

    console.log(`[parse] PASS: "${productName}" url=${result.url}`);
    allProducts.push({
      name: productName,
      brand,
      product_url: result.url,
      price_cents: priceCents,
      currency: 'USD',
      image_urls: imageUrls.slice(0, 8),
      category_raw: category,
      colour: null,
      description,
    });
  }

  return allProducts;
}

// Extract all image URLs from raw HTML
function extractImageUrlsFromHtml(rawHtml: string): string[] {
  const allImageUrls: string[] = [];
  const imgRegex = /(?:src|data-src|srcset|data-srcset|content)=["']([^"']*?(?:\.jpg|\.jpeg|\.png|\.webp|\.avif)[^"']*?)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(rawHtml)) !== null) {
    let imgUrl = match[1].split(/[,\s]/)[0]; // Take first URL from srcset
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
    if (imgUrl.startsWith('http')) allImageUrls.push(imgUrl);
  }
  // Background images
  const bgRegex = /url\(["']?([^"')]*?(?:\.jpg|\.jpeg|\.png|\.webp|\.avif)[^"')]*?)["']?\)/gi;
  while ((match = bgRegex.exec(rawHtml)) !== null) {
    let imgUrl = match[1];
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
    if (imgUrl.startsWith('http')) allImageUrls.push(imgUrl);
  }
  // Also extract from JSON-LD structured data (many modern sites embed product images here)
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = jsonLdRegex.exec(rawHtml)) !== null) {
    try {
      const jsonData = JSON.parse(match[1]);
      extractImagesFromJsonLd(jsonData, allImageUrls);
    } catch { /* ignore invalid JSON-LD */ }
  }
  // Filter out tiny icons, sprites, logos
  const filtered = [...new Set(allImageUrls)].filter(url => {
    const lower = url.toLowerCase();
    return !/logo|icon|sprite|favicon|banner|promo|placeholder|pixel|tracking|analytics|1x1/i.test(lower);
  });
  return filtered;
}

// Extract images from JSON-LD structured data
function extractImagesFromJsonLd(data: any, images: string[]): void {
  if (!data) return;
  if (Array.isArray(data)) {
    data.forEach(item => extractImagesFromJsonLd(item, images));
    return;
  }
  if (typeof data === 'object') {
    if (data.image) {
      const imgs = Array.isArray(data.image) ? data.image : [data.image];
      for (const img of imgs) {
        const url = typeof img === 'string' ? img : img?.url;
        if (url && url.startsWith('http')) images.push(url);
      }
    }
    if (data['@graph']) extractImagesFromJsonLd(data['@graph'], images);
  }
}

// Match page image URLs to a specific product using URL slug patterns
function matchImagesToProduct(
  productUrl: string, 
  productName: string, 
  imageLinks: string[], 
  brand: string
): string[] {
  // Extract product ID / slug from product URL
  const slugs = extractProductIdentifiers(productUrl, brand);
  
  if (!slugs.length) {
    // Fallback: try name-based matching
    const nameTokens = productName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(t => t.length > 2);
    if (nameTokens.length === 0) return [];
    
    return imageLinks.filter(img => {
      const imgLower = img.toLowerCase();
      return nameTokens.filter(t => imgLower.includes(t)).length >= Math.min(2, nameTokens.length);
    }).slice(0, 8);
  }

  // Match images that contain any of the product identifiers
  const matched = imageLinks.filter(img => {
    const imgLower = img.toLowerCase();
    return slugs.some(slug => imgLower.includes(slug));
  });

  return matched.slice(0, 8);
}

function extractProductIdentifiers(productUrl: string, brand: string): string[] {
  const ids: string[] = [];
  const lower = productUrl.toLowerCase();
  const b = brand.toLowerCase();

  try {
    const u = new URL(productUrl);
    const path = u.pathname;

    if (b === 'zara') {
      const m = path.match(/p(\d{7,})/);
      if (m) ids.push(`p${m[1]}`, m[1]);
    } else if (b === 'hm' || b === 'h&m') {
      const m = path.match(/(\d{7,})/);
      if (m) ids.push(m[1]);
      const m2 = path.match(/(\d{6,})/);
      if (m2 && !ids.includes(m2[1])) ids.push(m2[1]);
    } else if (b === 'uniqlo') {
      const m = path.match(/(E?\d{6,})/i);
      if (m) ids.push(m[1].toLowerCase());
    } else if (b === 'shein') {
      const m = path.match(/p(\d{5,})/);
      if (m) ids.push(`p${m[1]}`, m[1]);
    } else if (b === 'nike') {
      const m = path.match(/([A-Z0-9]{6,}-[A-Z0-9]{3})/i);
      if (m) ids.push(m[1].toLowerCase());
    } else if (b === 'asos') {
      const m = path.match(/\/(\d{6,})/);
      if (m) ids.push(m[1]);
    } else if (b === 'nordstrom') {
      // Nordstrom: /s/product-name/XXXXXXX
      const m = path.match(/\/s\/[^\/]+\/(\d{5,})/);
      if (m) ids.push(m[1]);
    } else if (b === 'ssense') {
      // SSENSE: /product/brand/name-XXXXXXXX
      const m = path.match(/(\d{6,})/);
      if (m) ids.push(m[1]);
    } else if (b === 'farfetch') {
      // Farfetch: /shopping/.../itemXXXXXXXX.aspx
      const m = path.match(/item(\d{6,})/);
      if (m) ids.push(m[1]);
    }

    // Generic: last path segment slug
    if (!ids.length) {
      const segments = path.split('/').filter(Boolean);
      const last = segments[segments.length - 1]?.replace(/\.[^.]+$/, '');
      if (last && last.length > 3) ids.push(last.toLowerCase());
    }
  } catch { /* ignore */ }

  return ids;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3 — Deterministic image URL scoring (no LLM needed)
// ─────────────────────────────────────────────────────────────────────────────

function selectBestImage(product: RawProduct): ClassifiedProduct | null {
  if (!product.image_urls?.length) return null;

  let bestUrl = '';
  let bestScore = -1;
  let bestPresentation: 'ghost_mannequin' | 'flat_lay' | 'model_shot' = 'model_shot';

  for (const url of product.image_urls) {
    const lower = url.toLowerCase();
    let score = 0;
    let presentation: 'ghost_mannequin' | 'flat_lay' | 'model_shot' = 'model_shot';

    // REJECT patterns
    if (/-detail|-close|-texture|-zoom|thumb|_swatch|collage|runway|editorial|banner|logo|icon|sprite/i.test(lower)) {
      continue;
    }

    // RANK 1: Ghost mannequin / packshot signals
    if (/-main|_main|-front|_front|-p00|_p00|-hero|_hero|\/packshot|\/studio|\/catalog/i.test(lower)) {
      score += 10;
      presentation = 'ghost_mannequin';
    }
    if (/static\.zara\.net/i.test(lower) && /-e\d+/i.test(lower)) {
      score += 5;
      presentation = 'ghost_mannequin';
    }
    if (/lp2\.hm\.com/i.test(lower) && /main/i.test(lower)) {
      score += 8;
      presentation = 'ghost_mannequin';
    }
    if (/image\.uniqlo/i.test(lower) && !/-sub/i.test(lower)) {
      score += 6;
      presentation = 'ghost_mannequin';
    }

    // RANK 2: Flat lay signals
    if (/-flat|-lay|-top/i.test(lower)) {
      score += 7;
      presentation = 'flat_lay';
    }

    // RANK 3: Model shot (default)
    if (/-model|-worn|-look|-p01|_2\.|_b\./i.test(lower)) {
      score += 3;
      presentation = 'model_shot';
    }

    // Prefer larger images
    const widthMatch = lower.match(/[?&]w(?:idth)?=(\d+)/);
    if (widthMatch && parseInt(widthMatch[1]) >= 500) score += 2;

    // Prefer first image in sequence
    if (/[_-]0?1\b/i.test(lower)) score += 4;

    score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestUrl = url;
      bestPresentation = presentation;
    }
  }

  if (!bestUrl) {
    bestUrl = product.image_urls[0];
    bestPresentation = 'model_shot';
    bestScore = 1;
  }

  // Collect additional images (up to 5, excluding best and rejected URLs)
  const REJECT_PATTERN = /-detail|-close|-texture|-zoom|thumb|_swatch|collage|runway|editorial|banner|logo|icon|sprite/i;
  const additionalImages = product.image_urls
    .filter(u => u !== bestUrl && !REJECT_PATTERN.test(u.toLowerCase()))
    .slice(0, 5);

  return {
    ...product,
    image_url: bestUrl,
    additional_images: additionalImages,
    presentation: bestPresentation,
    confidence: Math.min((bestScore + (additionalImages.length >= 3 ? 2 : 0)) / 15, 1.0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────

function deduplicateProducts(products: ClassifiedProduct[]): ClassifiedProduct[] {
  const seen = new Map<string, ClassifiedProduct>();

  for (const product of products) {
    const urlKey   = normaliseUrl(product.product_url);
    const imageKey = normaliseUrl(product.image_url);
    const nameKey  = nameFingerprint(product.name, product.brand);

    if (seen.has(urlKey)) {
      const existing = seen.get(urlKey)!;
      if (imagePriority(product.presentation) > imagePriority(existing.presentation)) {
        seen.set(urlKey, product);
      }
      continue;
    }
    if ([...seen.values()].some(p => normaliseUrl(p.image_url) === imageKey)) continue;

    const byName = [...seen.values()].find(p => nameFingerprint(p.name, p.brand) === nameKey);
    if (byName) {
      if (imagePriority(product.presentation) > imagePriority(byName.presentation)) {
        seen.delete(normaliseUrl(byName.product_url));
        seen.set(urlKey, product);
      }
      continue;
    }

    seen.set(urlKey, product);
  }

  return [...seen.values()];
}

async function filterExistingProducts(
  products: ClassifiedProduct[],
  supabase: ReturnType<typeof createClient>
): Promise<ClassifiedProduct[]> {
  if (!products.length) return [];

  const productUrls = products.map(p => normaliseUrl(p.product_url));
  const { data: existingByUrl } = await supabase
    .from('product_catalog')
    .select('product_url')
    .in('product_url', productUrls);

  const existingUrlSet = new Set((existingByUrl ?? []).map((r: any) => normaliseUrl(r.product_url)));
  let filtered = products.filter(p => !existingUrlSet.has(normaliseUrl(p.product_url)));

  const imageUrls = filtered.map(p => normaliseUrl(p.image_url));
  const { data: existingByImage } = await supabase
    .from('product_catalog')
    .select('image_url')
    .in('image_url', imageUrls);

  const existingImageSet = new Set((existingByImage ?? []).map((r: any) => normaliseUrl(r.image_url)));
  filtered = filtered.filter(p => !existingImageSet.has(normaliseUrl(p.image_url)));

  console.log(`[dedup] ${products.length} → ${filtered.length} new`);
  return filtered;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function normaliseUrl(url: string): string {
  try {
    const u = new URL(url);
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',
     'sessionid','sid','token','ref','referer','source','clickid',
     'gclid','fbclid','msclkid','ttclid'].forEach(k => u.searchParams.delete(k));
    u.hostname = u.hostname.toLowerCase();
    u.searchParams.sort();
    return u.toString();
  } catch { return url.toLowerCase().trim(); }
}

function nameFingerprint(name: string, brand: string): string {
  return `${brand}|${name}`.toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9| ]/g, '').trim();
}

function imagePriority(p: string | null): number {
  if (p === 'ghost_mannequin') return 3;
  if (p === 'flat_lay') return 2;
  if (p === 'model_shot') return 1;
  return 0;
}

function normaliseCategory(raw: string | null): string {
  if (!raw) return 'other';
  const r = raw.toLowerCase();
  if (/\bt-?shirt|tee\b/.test(r)) return 't-shirts';
  if (/\bhoodie|sweatshirt|fleece|crewneck\b/.test(r)) return 'hoodies';
  if (/\bsweater|knit|cardigan|turtleneck|pullover\b/.test(r)) return 'sweaters';
  if (/\bpolo\b/.test(r)) return 'polos';
  if (/\bshirt|button.?down|oxford|flannel|blouse|chambray\b/.test(r)) return 'shirts';
  if (/\btop|bodysuit|tank|crop|henley|camisole|tunic|peplum\b/.test(r)) return 'tops';
  if (/\bjean|denim\b/.test(r)) return 'jeans';
  if (/\bshort\b/.test(r)) return 'shorts';
  if (/\bskirt|mini.?skirt|midi.?skirt|maxi.?skirt|pencil.?skirt|pleated.?skirt\b/.test(r)) return 'skirts';
  if (/\blegging|tight|yoga\b/.test(r)) return 'leggings';
  if (/\bpant|trouser|chino|cargo|jogger|sweatpant|culottes|palazzo\b/.test(r)) return 'pants';
  if (/\bbottom\b/.test(r)) return 'bottoms';
  if (/\bblazer|sport.?coat|suit.?jacket\b/.test(r)) return 'blazers';
  if (/\bvest|gilet|waistcoat\b/.test(r)) return 'vests';
  if (/\bcoat|trench|overcoat|peacoat|parka|topcoat|duffle\b/.test(r)) return 'coats';
  if (/\bjacket|bomber|puffer|windbreaker|anorak|shacket|overshirt\b/.test(r)) return 'jackets';
  if (/\bouterwear\b/.test(r)) return 'outerwear';
  if (/\bjumpsuit|romper|overall|playsuit|catsuit\b/.test(r)) return 'jumpsuits';
  if (/\bdress|gown|maxi|midi|mini.?dress|wrap.?dress|slip.?dress|shift.?dress\b/.test(r)) return 'dresses';
  if (/\bsneaker|trainer|running.?shoe|athletic|tennis.?shoe\b/.test(r)) return 'sneakers';
  if (/\bboot|chelsea|combat|hiking|ankle.?boot|knee.?boot|work.?boot\b/.test(r)) return 'boots';
  if (/\bsandal|slide|flip.?flop|mule|espadrille|gladiator\b/.test(r)) return 'sandals';
  if (/\bloafer|moccasin|slip.?on|driving|penny.?loafer\b/.test(r)) return 'loafers';
  if (/\bheel|pump|stiletto|wedge|platform|kitten.?heel|block.?heel\b/.test(r)) return 'heels';
  if (/\bshoe|footwear|flat|oxford|derby|clog\b/.test(r)) return 'shoes';
  if (/\bbag|handbag|tote|crossbody|backpack|clutch|purse|satchel|duffel|messenger\b/.test(r)) return 'bags';
  if (/\bhat|cap|beanie|bucket|snapback|fedora|beret|visor|trucker\b/.test(r)) return 'hats';
  if (/\bsunglass|eyewear|aviator|wayfarer\b/.test(r)) return 'sunglasses';
  if (/\bjewel|necklace|bracelet|ring|earring|pendant|chain|anklet|brooch|choker\b/.test(r)) return 'jewelry';
  if (/\bwatch|timepiece|chronograph\b/.test(r)) return 'watches';
  if (/\bbelt|suspender\b/.test(r)) return 'belts';
  if (/\bscarf|shawl|wrap|bandana|neckerchief\b/.test(r)) return 'scarves';
  if (/\bswim|bikini|trunk|boardshort|rashguard|one.?piece|tankini\b/.test(r)) return 'swimwear';
  if (/\bactive|gym|workout|training|sports?.bra|compression|performance\b/.test(r)) return 'activewear';
  if (/\blounge|pajama|robe|sleepwear|nightgown|nightwear\b/.test(r)) return 'loungewear';
  if (/\bunderwear|boxer|brief|bra|lingerie|sock|hosiery|shapewear|thermal\b/.test(r)) return 'underwear';
  if (/\baccessor|wallet|key.?chain|hair.?clip|headband|glove|mitten\b/.test(r)) return 'accessories';
  return 'other';
}

function buildTags(p: ClassifiedProduct): string[] {
  const tags: string[] = [];
  if (p.brand) tags.push(p.brand.toLowerCase());
  if (p.colour) tags.push(p.colour.toLowerCase());
  if (p.category_raw) tags.push(p.category_raw.toLowerCase());
  if (p.presentation) tags.push(p.presentation);
  return [...new Set(tags)];
}

// ─────────────────────────────────────────────────────────────────────────────
// FABRIC & FIT EXTRACTION — Regex-based physical garment data extraction
// ─────────────────────────────────────────────────────────────────────────────

const FIT_REGEX = /(oversized|boxy|relaxed\s*fit|slim\s*fit|regular\s*fit|heavyweight|lightweight|cropped|tapered|drop\s*shoulder|straight\s*fit|loose\s*fit|skinny\s*fit|athletic\s*fit|classic\s*fit|modern\s*fit|tailored\s*fit|muscle\s*fit|oversize)/gi;

const FABRIC_REGEX = /(\d{1,3}%\s?[a-zA-Z\s\-]+(?:\s?(?:and|,)\s?\d{1,3}%\s?[a-zA-Z\s\-]+)*)|(french\s*terry|fleece|selvedge\s*denim|nylon\s*blend|organic\s*cotton|recycled\s*polyester|merino\s*wool|modal|tencel|lyocell|viscose|spandex|elastane|linen\s*blend|cotton\s*blend|ponte|jersey|terry\s*cloth|satin|silk|velvet|corduroy|twill|chambray|poplin|ripstop|mesh|piqué|waffle\s*knit|sherpa|faux\s*leather)/gi;

function extractFitProfile(text: string): string[] {
  const matches = text.match(FIT_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.toLowerCase().trim()))];
}

function extractFabricComposition(text: string): string[] {
  const matches = text.match(FABRIC_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.toLowerCase().trim()).filter(m => m.length > 2))];
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE HEAD VALIDATION — verify images resolve (free, no Firecrawl credits)
// ─────────────────────────────────────────────────────────────────────────────

async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    // Try HEAD first, fall back to GET with range header for CDNs that block HEAD
    let resp = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);
    // Many CDNs return 403/405 for HEAD — accept the URL if it looks like an image URL
    if (resp.status === 405 || resp.status === 403) {
      // Trust URLs that have image extensions
      return /\.(jpg|jpeg|png|webp|avif)/i.test(url);
    }
    if (!resp.ok) return false;
    const ct = resp.headers.get('content-type') || '';
    // Accept if content-type is image OR if URL has image extension (some CDNs return octet-stream)
    return ct.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif)/i.test(url);
  } catch {
    // On timeout/network error, trust URLs with image extensions
    return /\.(jpg|jpeg|png|webp|avif)/i.test(url);
  }
}

async function validateProductImages(products: RawProduct[]): Promise<RawProduct[]> {
  if (!products.length) return [];
  
  const validated: RawProduct[] = [];
  const batchSize = 5;
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (p) => {
        if (!p.image_urls.length) return null;
        const isValid = await validateImageUrl(p.image_urls[0]);
        if (isValid) return p;
        for (let j = 1; j < Math.min(p.image_urls.length, 3); j++) {
          const altValid = await validateImageUrl(p.image_urls[j]);
          if (altValid) {
            const working = p.image_urls[j];
            p.image_urls.splice(j, 1);
            p.image_urls.unshift(working);
            return p;
          }
        }
        return null;
      })
    );
    validated.push(...results.filter((p): p is RawProduct => p !== null));
  }
  
  return validated;
}

/**
 * For products without images, fetch the product page and extract og:image.
 * Uses a full GET with timeout (Range headers are blocked by most CDNs).
 */
async function enrichProductImages(products: RawProduct[]): Promise<RawProduct[]> {
  const enriched: RawProduct[] = [];
  const batchSize = 5;
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
          const resp = await fetch(p.product_url, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: controller.signal,
            redirect: 'follow',
          });
          clearTimeout(timeout);
          
          if (!resp.ok) return null;
          
          // Read response as stream and only consume first ~80KB
          const reader = resp.body?.getReader();
          if (!reader) return null;
          
          let html = '';
          const decoder = new TextDecoder();
          const MAX_BYTES = 80000;
          let totalBytes = 0;
          
          while (totalBytes < MAX_BYTES) {
            const { done, value } = await reader.read();
            if (done) break;
            html += decoder.decode(value, { stream: true });
            totalBytes += value.length;
          }
          reader.cancel().catch(() => {});
          
          // Try og:image (both attribute orders)
          const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
          
          if (ogMatch?.[1] && ogMatch[1].startsWith('http')) {
            p.image_urls = [ogMatch[1]];
            return p;
          }
          
          // Try twitter:image
          const twMatch = html.match(/<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:image["']/i);
          if (twMatch?.[1] && twMatch[1].startsWith('http')) {
            p.image_urls = [twMatch[1]];
            return p;
          }
          
          // Try first product image from structured data (JSON-LD)
          const ldMatch = html.match(/"image"\s*:\s*"(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i)
            || html.match(/"image"\s*:\s*\[\s*"(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
          if (ldMatch?.[1]) {
            p.image_urls = [ldMatch[1]];
            return p;
          }
          
          return null;
        } catch {
          return null;
        }
      })
    );
    enriched.push(...results.filter((p): p is RawProduct => p !== null));
  }
  
  console.log(`[enrich] Found images for ${enriched.length}/${products.length} products via og:image`);
  return enriched;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-SCRAPE CHECK — skip brand/category if recently scraped with good results
// ─────────────────────────────────────────────────────────────────────────────

// Categories with <150 products that need priority Firecrawl access
const THIN_CATEGORIES = new Set([
  'loungewear', 'bottoms', 'heels', 'jumpsuits', 'skirts', 'activewear',
  'outerwear', 'accessories', 'watches', 'underwear', 'scarves',
  'loafers', 'vests', 'leggings', 'coats', 'boots', 'shoes', 'tops',
  'blazers',
]);

function isThinCategory(category: string): boolean {
  const normCat = normaliseCategory(category);
  return THIN_CATEGORIES.has(normCat);
}

async function hasRecentProducts(
  brand: string,
  category: string,
  supabase: ReturnType<typeof createClient>,
  hoursThreshold = 24
): Promise<{ skip: boolean; count: number }> {
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();
  const normCat = normaliseCategory(category);
  
  const { count, error } = await supabase
    .from('product_catalog')
    .select('*', { count: 'exact', head: true })
    .ilike('brand', brand)
    .eq('category', normCat)
    .eq('is_active', true)
    .gte('scraped_at', cutoff);
  
  if (error) {
    console.warn(`[pre-check] Error checking recent products:`, error.message);
    return { skip: false, count: 0 };
  }
  
  const c = count ?? 0;
  // Thin categories: skip only if 3+ recent (we need growth)
  // Well-stocked categories: skip if 2+ recent (save credits)
  const threshold = isThinCategory(category) ? 3 : 2;
  return { skip: c >= threshold, count: c };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, category } = await req.json();

    if (!brand || !category) {
      return new Response(JSON.stringify({ error: 'brand and category are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── FIRECRAWL AUTH ──────────────────────────────────────────────
    const FIRECRAWL_API_KEY =
      Deno.env.get('FIRECRAWL_API_KEY_1') || Deno.env.get('FIRECRAWL_API_KEY') || '';
    if (FIRECRAWL_API_KEY) {
      console.log(`[auth] Firecrawl ENABLED — full pipeline (Shopify, Direct HTTP, Google, Firecrawl)`);
    } else {
      console.log(`[auth] Firecrawl DISABLED — no key found, using free methods only`);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const runId = crypto.randomUUID();
    const results = { runId, brand, category, scraped: 0, extracted: 0, classified: 0, deduped: 0, inserted: 0, withImages: 0, skipped: false };
    console.log(`[run:${runId}] Starting: ${brand}/${category}`);

    // ── PRE-CHECK: skip if we already have recent products ───────────
    const { skip, count: recentCount } = await hasRecentProducts(brand, category, supabase);
    if (skip) {
      console.log(`[run:${runId}] Skipping — already have ${recentCount} recent products for ${brand}/${category}`);
      return successResponse({ ...results, skipped: true, recentCount, message: `Already have ${recentCount} recent products, skipping to save credits` }, 200, corsHeaders);
    }

    // Small jitter reduces burst collisions when many jobs start simultaneously
    const jitterMs = Math.floor(Math.random() * 1200);
    if (jitterMs > 0) {
      console.log(`[run:${runId}] Jitter ${jitterMs}ms before Firecrawl calls`);
      await delay(jitterMs);
    }

    // ── CHECK FIRECRAWL CREDITS & THIN-CATEGORY GATE ─────────────
    let useFirecrawl = true;
    const credits = await checkFirecrawlCredits(FIRECRAWL_API_KEY);
    if (credits !== null && credits <= 0) {
      console.log(`[run:${runId}] Firecrawl credits exhausted (${credits}), using direct HTTP only`);
      useFirecrawl = false;
    } else if (!isThinCategory(category)) {
      // Well-stocked categories: skip Firecrawl to save credits
      console.log(`[run:${runId}] Category "${category}" is well-stocked, skipping Firecrawl (credits: ${credits ?? 'unknown'})`);
      useFirecrawl = false;
    } else {
      console.log(`[run:${runId}] Thin category "${category}" — Firecrawl enabled (credits: ${credits ?? 'unknown'})`);
    }

    // ── STAGES 1+2: Direct HTTP + optional Firecrawl scraping ────────
    const creditsBefore = credits;
    const rawProducts = await scrapeProducts(brand, category, FIRECRAWL_API_KEY, useFirecrawl);
    results.extracted = rawProducts.length;
    results.scraped = rawProducts.length > 0 ? 1 : 0;
    results.withImages = rawProducts.filter(p => p.image_urls.length > 0).length;

    // ── CREDIT BUDGET ALERT ──────────────────────────────────────────
    if (useFirecrawl && creditsBefore !== null) {
      const creditsAfter = await checkFirecrawlCredits(FIRECRAWL_API_KEY);
      if (creditsAfter !== null) {
        const spent = creditsBefore - creditsAfter;
        (results as any).creditsSpent = spent;
        if (spent > 500) {
          console.error(`[CREDIT ALERT] ${brand}/${category} spent ${spent} Firecrawl credits in a single run! (before: ${creditsBefore}, after: ${creditsAfter})`);
        } else if (spent > 100) {
          console.warn(`[CREDIT WARNING] ${brand}/${category} spent ${spent} Firecrawl credits (before: ${creditsBefore}, after: ${creditsAfter})`);
        } else {
          console.log(`[run:${runId}] Credits spent: ${spent} (${creditsBefore} → ${creditsAfter})`);
        }
      }
    }

    console.log(`[run:${runId}] Extracted ${rawProducts.length} products (${results.withImages} with images)`);

    if (!rawProducts.length) {
      return new Response(JSON.stringify({ ...results, warning: 'No products extracted.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── STAGE 3: Deterministic image scoring (no LLM) ────────────────
    const classified: ClassifiedProduct[] = [];
    for (const product of rawProducts) {
      const result = selectBestImage(product);
      if (result) classified.push(result);
    }
    results.classified = classified.length;
    console.log(`[run:${runId}] Classified ${classified.length} images`);

    // ── DEDUPLICATION ────────────────────────────────────────────────
    const withinRun = deduplicateProducts(classified);
    const JUNK_URL_PATTERNS = [
      "fls-na.amazon.com", "doubleclick.net", "/risk/challenge",
      "/page-designer/", "/uedata", "/captcha", "/batch/1/",
      "/pixel", "/tracking", "static.zara.net", "googleads.",
      "googlesyndication.", "facebook.com/tr", "bat.bing.com",
    ];
    const cleanProducts = withinRun.filter(p => {
      const lower = p.image_url.toLowerCase();
      return !JUNK_URL_PATTERNS.some(pat => lower.includes(pat));
    });
    if (cleanProducts.length < withinRun.length) {
      console.log(`[run:${runId}] Filtered ${withinRun.length - cleanProducts.length} junk image URLs`);
    }
    const newProducts = await filterExistingProducts(cleanProducts, supabase);
    results.deduped = newProducts.length;

    // ── DB INSERT (with URL+name-based gender detection) ────────────
    if (newProducts.length > 0) {
      const rows = newProducts.map(p => {
        // Multi-signal gender detection at insert time
        const urlGender = detectGenderFromProductUrl(p.product_url);
        const nameGender = detectGenderFromName(p.name);
        // Priority: URL > name > default unisex
        const gender = urlGender || nameGender || 'unisex';
        
        // Extract fit & fabric from product name + raw category
        const textForExtraction = `${p.name} ${p.category_raw || ''}`;
        const fitProfile = extractFitProfile(textForExtraction);
        const fabricComposition = extractFabricComposition(textForExtraction);

        return {
          name: p.name,
          brand: canonicalName(p.brand),
          retailer: canonicalName(p.brand),
          product_url: normaliseUrl(p.product_url),
          image_url: normaliseUrl(p.image_url),
          additional_images: (p.additional_images || []).map(u => normaliseUrl(u)),
          price_cents: p.price_cents,
          currency: p.currency ?? 'USD',
          category: normaliseCategory(p.category_raw),
          tags: buildTags(p),
          presentation: p.presentation,
          image_confidence: p.confidence,
          gender,
          fit_profile: fitProfile,
          fabric_composition: fabricComposition,
          description: p.description || null,
          scrape_source: `${p._method || 'unknown'}:${runId}`,
          scraped_at: new Date().toISOString(),
          is_active: true,
        };
      });

      const { error } = await supabase.from('product_catalog').insert(rows);

      if (error) {
        if (error.code === '23505') {
          console.warn(`[run:${runId}] Some skipped (unique constraint)`);
        } else {
          throw error;
        }
      }
      results.inserted = rows.length;

      // Fire-and-forget: trigger QC pipeline
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const qcHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      };

      fetch(`${supabaseUrl}/functions/v1/categorize-products`, {
        method: 'POST',
        headers: qcHeaders,
        body: JSON.stringify({ batch_size: 15, only_unchecked: true }),
      }).catch(e => console.warn(`[run:${runId}] Categorize trigger failed:`, e));

      fetch(`${supabaseUrl}/functions/v1/backfill-gender`, {
        method: 'POST',
        headers: qcHeaders,
        body: JSON.stringify({ batch_size: 300 }),
      }).catch(e => console.warn(`[run:${runId}] Gender backfill trigger failed:`, e));

      // Fire-and-forget: scrape size charts for this brand if missing
      if (brand) {
        const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        fetch(`${supabaseUrl}/functions/v1/scrape-size-charts`, {
          method: 'POST',
          headers: qcHeaders,
          body: JSON.stringify({ brand_slug: brandSlug, batch_size: 8 }),
        }).catch(e => console.warn(`[run:${runId}] Size chart trigger failed:`, e));
      }

      // Fire-and-forget: audit product URLs for broken images
      fetch(`${supabaseUrl}/functions/v1/audit-product-urls`, {
        method: 'POST',
        headers: qcHeaders,
        body: JSON.stringify({ batch_size: 50, brand: brand || undefined }),
      }).catch(e => console.warn(`[run:${runId}] Audit URLs trigger failed:`, e));

      // Fire-and-forget: cleanup catalog (deactivate junk, normalize brands)
      fetch(`${supabaseUrl}/functions/v1/cleanup-catalog`, {
        method: 'POST',
        headers: qcHeaders,
        body: JSON.stringify({}),
      }).catch(e => console.warn(`[run:${runId}] Cleanup catalog trigger failed:`, e));
    }

    console.log(`[run:${runId}] Done. Inserted ${results.inserted}`);
    return successResponse(results, 200, corsHeaders);

  } catch (err: any) {
    console.error('Pipeline error:', err);
    return errorResponse(err.message, "INTERNAL_ERROR", 500, corsHeaders);
  }
});
