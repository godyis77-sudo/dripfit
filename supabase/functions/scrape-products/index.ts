import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface RawProduct {
  name: string;
  brand: string;
  product_url: string;
  price_cents: number | null;
  currency: string;
  image_urls: string[];
  category_raw: string | null;
  colour: string | null;
}

interface ClassifiedProduct extends RawProduct {
  image_url: string;
  presentation: 'ghost_mannequin' | 'flat_lay' | 'model_shot';
  confidence: number;
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
    accessories:toUrlConfig(['https://www.zara.com/us/en/man-accessories-l4734.html'], { waitFor: 5000 }),
    scarves:    toUrlConfig(['https://www.zara.com/us/en/woman-accessories-scarves-l1412.html'], { waitFor: 5000 }),
  },
  hm: {
    tops:       toUrlConfig(['https://www2.hm.com/en_us/men/products/t-shirts-and-tanks.html?sort=stock&image-size=small&image=model&offset=0&page-size=72', 'https://www2.hm.com/en_us/women/products/tops.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www2.hm.com/en_us/men/products/pants.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://www2.hm.com/en_us/men/products/shorts.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    skirts:     toUrlConfig(['https://www2.hm.com/en_us/women/products/skirts.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    swimwear:   toUrlConfig(['https://www2.hm.com/en_us/men/products/swimwear.html?sort=stock&image-size=small&image=model&offset=0&page-size=72', 'https://www2.hm.com/en_us/women/products/swimwear.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    loungewear: toUrlConfig(['https://www2.hm.com/en_us/men/products/loungewear.html?sort=stock&image-size=small&image=model&offset=0&page-size=72', 'https://www2.hm.com/en_us/women/products/loungewear.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www2.hm.com/en_us/men/products/jackets-and-coats.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www2.hm.com/en_us/women/products/dresses.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www2.hm.com/en_us/men/products/shoes.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www2.hm.com/en_us/men/products/accessories.html?sort=stock&image-size=small&image=model&offset=0&page-size=72'], { waitFor: 3000 }),
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
    accessories:toUrlConfig(['https://us.shein.com/Men-Accessories-c-12214.html'], { waitFor: 5000 }),
    loungewear: toUrlConfig(['https://us.shein.com/Women-Loungewear-c-2189.html'], { waitFor: 5000 }),
  },
  nike: {
    tops:       toUrlConfig(['https://www.nike.com/w/mens-tops-t-shirts-9om13zav4s6', 'https://www.nike.com/w/womens-tops-t-shirts-5e1x6z9om13'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.nike.com/w/mens-pants-tights-2kq19z6o5re', 'https://www.nike.com/w/womens-pants-tights-2kq19z5e1x6'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.nike.com/w/mens-shorts-38fphz6o5re', 'https://www.nike.com/w/womens-shorts-38fphz5e1x6'], { waitFor: 4000 }),
    swimwear:   toUrlConfig(['https://www.nike.com/w/mens-swimwear-3glsmz6o5re'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.nike.com/w/mens-jackets-vests-50r7yz6o5re', 'https://www.nike.com/w/womens-jackets-vests-50r7yz5e1x6'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://www.nike.com/w/mens-shoes-nik1zy7ok', 'https://www.nike.com/w/womens-shoes-5e1x6zy7ok'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://www.nike.com/w/mens-accessories-equipment-6o5rezawwv'], { waitFor: 4000 }),
    skirts:     toUrlConfig(['https://www.nike.com/w/womens-skirts-dresses-5e1x6z8y3qp'], { waitFor: 4000 }),
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
    accessories:toUrlConfig(['https://www.asos.com/us/men/accessories/cat/?cid=4210'], { waitFor: 3000 }),
  },
  // ── Sportswear & Athletic ──
  adidas: {
    tops:       toUrlConfig(['https://www.adidas.com/us/men-t_shirts'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.adidas.com/us/men-pants'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.adidas.com/us/men-jackets'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://www.adidas.com/us/men-shoes'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://www.adidas.com/us/men-accessories'], { waitFor: 4000 }),
  },
  'new balance': {
    tops:       toUrlConfig(['https://www.newbalance.com/men/clothing/tops/']),
    bottoms:    toUrlConfig(['https://www.newbalance.com/men/clothing/pants-and-tights/']),
    outerwear:  toUrlConfig(['https://www.newbalance.com/men/clothing/jackets-and-vests/']),
    shoes:      toUrlConfig(['https://www.newbalance.com/men/shoes/']),
    accessories:toUrlConfig(['https://www.newbalance.com/men/accessories/']),
  },
  converse: {
    tops:       toUrlConfig(['https://www.converse.com/shop/mens-clothing']),
    shoes:      toUrlConfig(['https://www.converse.com/shop/mens-sneakers']),
    accessories:toUrlConfig(['https://www.converse.com/shop/bags-and-backpacks']),
  },
  vans: {
    tops:       toUrlConfig(['https://www.vans.com/en-us/categories/mens-clothing-c3702']),
    shoes:      toUrlConfig(['https://www.vans.com/en-us/categories/mens-shoes-c5702']),
    accessories:toUrlConfig(['https://www.vans.com/en-us/categories/accessories-c22220']),
  },
  puma: {
    tops:       toUrlConfig(['https://us.puma.com/us/en/men/clothing/t-shirts']),
    bottoms:    toUrlConfig(['https://us.puma.com/us/en/men/clothing/pants']),
    shoes:      toUrlConfig(['https://us.puma.com/us/en/men/shoes']),
    accessories:toUrlConfig(['https://us.puma.com/us/en/men/accessories']),
  },
  // ── Outdoor & Active ──
  'the north face': {
    tops:       toUrlConfig(['https://www.thenorthface.com/en-us/mens/mens-tops-c211501'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.thenorthface.com/en-us/mens/mens-bottoms-c211502'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.thenorthface.com/en-us/mens/mens-jackets-and-vests-c211500'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.thenorthface.com/en-us/mens/mens-footwear-c211504'], { waitFor: 3000 }),
    accessories:toUrlConfig(['https://www.thenorthface.com/en-us/mens/mens-accessories-c211506'], { waitFor: 3000 }),
  },
  patagonia: {
    tops:       toUrlConfig(['https://www.patagonia.com/shop/mens-t-shirts-tanks']),
    bottoms:    toUrlConfig(['https://www.patagonia.com/shop/mens-pants-jeans']),
    outerwear:  toUrlConfig(['https://www.patagonia.com/shop/mens-jackets-vests']),
    accessories:toUrlConfig(['https://www.patagonia.com/shop/mens-hats']),
  },
  lululemon: {
    tops:       toUrlConfig(['https://shop.lululemon.com/c/men-tops/_/N-8r6'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://shop.lululemon.com/c/mens-pants/_/N-8s3'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://shop.lululemon.com/c/men-outerwear/_/N-8q3'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://shop.lululemon.com/c/men-shoes/_/N-8r8'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://shop.lululemon.com/c/men-accessories/_/N-8q5'], { waitFor: 4000 }),
  },
  salomon: {
    shoes:      toUrlConfig(['https://www.salomon.com/en-us/shop/men/shoes/trail-running-shoes.html']),
    outerwear:  toUrlConfig(['https://www.salomon.com/en-us/shop/men/clothing/jackets.html']),
    accessories:toUrlConfig(['https://www.salomon.com/en-us/shop/men/accessories.html']),
  },
  // ── Denim & Casual ──
  "levi's": {
    tops:       toUrlConfig(['https://www.levi.com/US/en_US/clothing/men/shirts/c/levi_clothing_men_shirts']),
    bottoms:    toUrlConfig(['https://www.levi.com/US/en_US/clothing/men/jeans/c/levi_clothing_men_jeans']),
    outerwear:  toUrlConfig(['https://www.levi.com/US/en_US/clothing/men/trucker-jackets/c/levi_clothing_men_702trucker_jackets']),
    accessories:toUrlConfig(['https://www.levi.com/US/en_US/accessories/c/levi_accessories']),
  },
  carhartt: {
    tops:       toUrlConfig(['https://www.carhartt.com/search?q=t-shirt&cgid=men-shirts']),
    bottoms:    toUrlConfig(['https://www.carhartt.com/search?q=pants&cgid=men-pants']),
    outerwear:  toUrlConfig(['https://www.carhartt.com/search?q=jacket&cgid=men-outerwear']),
    accessories:toUrlConfig(['https://www.carhartt.com/men-accessories']),
  },
  // ── Boots & Footwear ──
  'dr. martens': {
    shoes:      toUrlConfig(['https://www.drmartens.com/us/en/boots/c/04010000']),
  },
  // ── Eyewear ──
  'ray-ban': {
    accessories:toUrlConfig(['https://www.ray-ban.com/usa/sunglasses']),
  },
  oakley: {
    accessories:toUrlConfig(['https://www.oakley.com/en-us/category/sunglasses']),
  },
  // ── Jewelry ──
  pandora: {
    accessories:toUrlConfig(['https://us.pandora.net/en/jewelry/']),
  },
  mejuri: {
    accessories:toUrlConfig(['https://mejuri.com/shop/t/type/necklaces']),
  },
  'tiffany & co': {
    accessories:toUrlConfig(['https://www.tiffany.com/jewelry/necklaces-pendants/']),
  },
  cartier: {
    accessories:toUrlConfig(['https://www.cartier.com/en-us/jewelry/bracelets/']),
  },
  // ── Headwear ──
  'new era': {
    accessories:toUrlConfig(['https://www.neweracap.com/collections/59fifty-fitted']),
  },
  // ── Streetwear ──
  supreme: {
    tops:       toUrlConfig(['https://www.supremenewyork.com/shop/all/tops-sweaters']),
    outerwear:  toUrlConfig(['https://www.supremenewyork.com/shop/all/jackets']),
    accessories:toUrlConfig(['https://www.supremenewyork.com/shop/all/hats']),
  },
  palace: {
    tops:       toUrlConfig(['https://www.palaceskateboards.com/range/tops/']),
    outerwear:  toUrlConfig(['https://www.palaceskateboards.com/range/jackets/']),
    accessories:toUrlConfig(['https://www.palaceskateboards.com/range/hats/']),
  },
  "stüssy": {
    tops:       toUrlConfig(['https://www.stussy.com/collections/tops']),
    bottoms:    toUrlConfig(['https://www.stussy.com/collections/bottoms']),
    outerwear:  toUrlConfig(['https://www.stussy.com/collections/outerwear']),
    accessories:toUrlConfig(['https://www.stussy.com/collections/accessories']),
  },
  'off-white': {
    tops:       toUrlConfig(['https://www.off---white.com/en-us/collections/man-t-shirts']),
    outerwear:  toUrlConfig(['https://www.off---white.com/en-us/collections/man-outerwear']),
    shoes:      toUrlConfig(['https://www.off---white.com/en-us/collections/man-shoes']),
  },
  essentials: {
    tops:       toUrlConfig(['https://www.essentialsfog.com/collections/tops']),
    bottoms:    toUrlConfig(['https://www.essentialsfog.com/collections/bottoms']),
    outerwear:  toUrlConfig(['https://www.essentialsfog.com/collections/outerwear']),
  },
  // ── Luxury ──
  gucci: {
    tops:       toUrlConfig(['https://www.gucci.com/us/en/ca/men/ready-to-wear/t-shirts-and-polos-c-men-readytowear-t-shirts-polos'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.gucci.com/us/en/ca/men/shoes-c-men-shoes'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.gucci.com/us/en/ca/men/accessories/hats-and-gloves-c-men-accessories-hatsgloves'], { waitFor: 5000 }),
  },
  prada: {
    shoes:      toUrlConfig(['https://www.prada.com/us/en/men/shoes.html'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.prada.com/us/en/men/accessories.html'], { waitFor: 5000 }),
  },
  dior: {
    accessories:toUrlConfig(['https://www.dior.com/en_us/fashion/mens-fashion/bags'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.dior.com/en_us/fashion/mens-fashion/shoes'], { waitFor: 5000 }),
  },
  'louis vuitton': {
    accessories:toUrlConfig(['https://us.louisvuitton.com/eng-us/men/bags/_/N-1eoopfs'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://us.louisvuitton.com/eng-us/men/shoes/_/N-1i09sii'], { waitFor: 5000 }),
  },
  balenciaga: {
    shoes:      toUrlConfig(['https://www.balenciaga.com/en-us/men/shoes'], { waitFor: 5000 }),
    tops:       toUrlConfig(['https://www.balenciaga.com/en-us/men/ready-to-wear/t-shirts'], { waitFor: 5000 }),
  },
  'saint laurent': {
    outerwear:  toUrlConfig(['https://www.ysl.com/en-us/men/ready-to-wear/coats-and-trench-coats'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.ysl.com/en-us/men/shoes'], { waitFor: 5000 }),
  },
  versace: {
    tops:       toUrlConfig(['https://www.versace.com/us/en/men/clothing/t-shirts/'], { waitFor: 5000 }),
    shoes:      toUrlConfig(['https://www.versace.com/us/en/men/shoes/'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://www.versace.com/us/en/men/accessories/'], { waitFor: 5000 }),
  },
  burberry: {
    outerwear:  toUrlConfig(['https://us.burberry.com/mens-coats-jackets/'], { waitFor: 5000 }),
    tops:       toUrlConfig(['https://us.burberry.com/mens-t-shirts/'], { waitFor: 5000 }),
    accessories:toUrlConfig(['https://us.burberry.com/mens-accessories/'], { waitFor: 5000 }),
  },
  // ── Women's Fashion ──
  'free people': {
    tops:       toUrlConfig(['https://www.freepeople.com/tops/']),
    dresses:    toUrlConfig(['https://www.freepeople.com/dresses/']),
    outerwear:  toUrlConfig(['https://www.freepeople.com/jackets/']),
  },
  reformation: {
    dresses:    toUrlConfig(['https://www.thereformation.com/categories/dresses'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    tops:       toUrlConfig(['https://www.thereformation.com/categories/tops'], { waitFor: 4000 }),
    bottoms:    toUrlConfig(['https://www.thereformation.com/categories/bottoms'], { waitFor: 4000 }),
  },
  // ── Additional brands with direct URLs ──
  'fabletics': {
    tops:       toUrlConfig(['https://www.fabletics.com/shop/tops'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.fabletics.com/shop/bottoms'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.fabletics.com/shop/jackets'], { waitFor: 4000 }),
  },
  'kith': {
    tops:       toUrlConfig(['https://kith.com/collections/mens-tops'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://kith.com/collections/mens-bottoms'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://kith.com/collections/mens-outerwear'], { waitFor: 4000 }),
    shoes:      toUrlConfig(['https://kith.com/collections/mens-footwear'], { waitFor: 4000 }),
    accessories:toUrlConfig(['https://kith.com/collections/mens-accessories'], { waitFor: 4000 }),
  },
  'gymshark': {
    tops:       toUrlConfig(['https://www.gymshark.com/collections/t-shirts-tops/mens'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.gymshark.com/collections/bottoms/mens'], { waitFor: 4000 }),
    shorts:     toUrlConfig(['https://www.gymshark.com/collections/shorts/mens'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.gymshark.com/collections/hoodies-jackets/mens'], { waitFor: 4000 }),
  },
  'alo yoga': {
    tops:       toUrlConfig(['https://www.aloyoga.com/collections/mens-tops'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://www.aloyoga.com/collections/mens-pants'], { waitFor: 4000 }),
    outerwear:  toUrlConfig(['https://www.aloyoga.com/collections/mens-jackets-coats'], { waitFor: 4000 }),
  },
  'skims': {
    tops:       toUrlConfig(['https://skims.com/collections/tops'], { waitFor: 4000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://skims.com/collections/bottoms'], { waitFor: 4000 }),
    dresses:    toUrlConfig(['https://skims.com/collections/dresses'], { waitFor: 4000 }),
  },
  'everlane': {
    tops:       toUrlConfig(['https://www.everlane.com/collections/womens-tees', 'https://www.everlane.com/collections/mens-tees'], { waitFor: 3000 }),
    bottoms:    toUrlConfig(['https://www.everlane.com/collections/womens-jeans', 'https://www.everlane.com/collections/mens-jeans'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.everlane.com/collections/womens-outerwear', 'https://www.everlane.com/collections/mens-outerwear'], { waitFor: 3000 }),
    shoes:      toUrlConfig(['https://www.everlane.com/collections/womens-shoes', 'https://www.everlane.com/collections/mens-shoes'], { waitFor: 3000 }),
  },
  'allsaints': {
    tops:       toUrlConfig(['https://www.allsaints.com/men/t-shirts/', 'https://www.allsaints.com/women/tops/'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://www.allsaints.com/men/leather-jackets/', 'https://www.allsaints.com/women/leather-jackets/'], { waitFor: 3000 }),
    dresses:    toUrlConfig(['https://www.allsaints.com/women/dresses/'], { waitFor: 3000 }),
  },
  'vuori': {
    tops:       toUrlConfig(['https://vuori.com/collections/mens-tops'], { waitFor: 3000, actions: SCROLL_TO_LOAD }),
    bottoms:    toUrlConfig(['https://vuori.com/collections/mens-joggers-pants'], { waitFor: 3000 }),
    shorts:     toUrlConfig(['https://vuori.com/collections/mens-shorts'], { waitFor: 3000 }),
    outerwear:  toUrlConfig(['https://vuori.com/collections/mens-hoodies-jackets'], { waitFor: 3000 }),
  },
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
};

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
    const resp = await fetchWithRetry('https://api.firecrawl.dev/v1/map', {
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
    const resp = await fetchWithRetry('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: crawlUrl,
        limit: 30,
        maxDepth: 2,
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
          const pollResp = await fetchWithRetry(`https://api.firecrawl.dev/v1/crawl/${jobId}`, {
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

      // Skip non-product pages
      if (/\/search|\/category|\/collection|\/shop\/?$/i.test(pageUrl)) continue;

      // Extract price
      const priceMatch = markdown.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      const priceCents = priceMatch ? Math.round(parseFloat(priceMatch[1].replace(',', '')) * 100) : null;

      // Extract product name from page title
      let productName = (page.metadata?.title || '')
        .replace(/\s*[-|]\s*(Zara|H&M|Nike|Adidas|Nordstrom|ASOS|Uniqlo|Gap|Lululemon|Puma|Converse|Vans).*$/i, '')
        .trim();

      if (!productName || productName.length < 3) continue;

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

async function scrapeProducts(
  brand: string,
  category: string,
  firecrawlApiKey: string
): Promise<RawProduct[]> {
  const brandKey = normalizeBrandKey(brand);

  // Anti-scrape brands: go straight to search (map+crawl too slow for edge fn timeout)
  if (ANTI_SCRAPE_BRANDS.has(brandKey)) {
    console.log(`[scrape] ${brand} is anti-scrape, using search fallback`);
    return searchProducts(brand, category, firecrawlApiKey);
  }

  const brandUrls = CATEGORY_MAP[brandKey];
  if (!brandUrls) {
    console.log(`[scrape] No URL config for ${brand} (key: ${brandKey}), trying map→scrape`);
    const mapUrls = await mapBrandUrls(brand, category, firecrawlApiKey);
    if (mapUrls.length > 0) {
      // Scrape the top 3 discovered category pages directly (faster than crawl)
      const categoryPages = mapUrls.filter(u => /\/c\/|\/cat\/|\/collection|\/shop\/|\/category/i.test(u)).slice(0, 3);
      if (categoryPages.length > 0) {
        // Use these as urlConfigs for the standard scrape pipeline
        const urlConfigs = categoryPages.map(url => ({ url, waitFor: 3000 }));
        const mapProducts = await scrapeUrlConfigs(brand, category, urlConfigs, firecrawlApiKey);
        if (mapProducts.length > 0) return mapProducts;
      }
    }
    console.log(`[scrape] Map yielded nothing, falling back to search`);
    return searchProducts(brand, category, firecrawlApiKey);
  }

  // Try exact category key first, then parent key
  const catKey = category.toLowerCase();
  const parentKey = CATEGORY_TO_URL_KEY[catKey] || catKey;
  const urlConfigs = brandUrls[catKey] || brandUrls[parentKey];
  if (!urlConfigs?.length) {
    console.log(`[scrape] No URLs for ${brand}/${category} (tried ${catKey}→${parentKey}), using search fallback`);
    return searchProducts(brand, category, firecrawlApiKey);
  }

  const allProducts = await scrapeUrlConfigs(brand, category, urlConfigs, firecrawlApiKey);

  // If direct scrape returned nothing, try map→scrape then search
  if (!allProducts.length) {
    console.log(`[scrape] Direct scrape returned 0 for ${brand}/${category}, trying map→scrape`);
    const mapUrls = await mapBrandUrls(brand, category, firecrawlApiKey);
    const categoryPages = mapUrls.filter(u => /\/c\/|\/cat\/|\/collection|\/shop\/|\/category/i.test(u)).slice(0, 3);
    if (categoryPages.length > 0) {
      const mapConfigs = categoryPages.map(url => ({ url, waitFor: 3000 }));
      const mapProducts = await scrapeUrlConfigs(brand, category, mapConfigs, firecrawlApiKey);
      if (mapProducts.length > 0) return mapProducts;
    }
    console.log(`[scrape] Map yielded nothing, falling back to search`);
    return searchProducts(brand, category, firecrawlApiKey);
  }

  return allProducts;
}

// Reusable: scrape a list of CategoryUrl configs and extract products
async function scrapeUrlConfigs(
  brand: string,
  category: string,
  urlConfigs: CategoryUrl[],
  firecrawlApiKey: string
): Promise<RawProduct[]> {
  const allProducts: RawProduct[] = [];

  const jsonSchema = {
    type: 'object',
    properties: {
      products: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:         { type: 'string', description: 'Exact product name as shown on page' },
            product_url:  { type: 'string', description: 'Absolute URL to the product detail page' },
            price_cents:  { type: ['integer', 'null'], description: 'Price in cents (e.g. $89.99 = 8999)' },
            currency:     { type: 'string', description: '3-letter currency code' },
            category_raw: { type: ['string', 'null'], description: 'Category label from the page' },
            colour:       { type: ['string', 'null'], description: 'Colour from product name/label' },
          },
          required: ['name', 'product_url'],
        },
      },
    },
    required: ['products'],
  };

  for (const urlConfig of urlConfigs) {
    try {
      console.log(`[scrape] Firecrawl extract+links: ${urlConfig.url}`);

      const scrapeBody: Record<string, unknown> = {
        url: urlConfig.url,
        formats: ['extract', 'rawHtml'],
        waitFor: urlConfig.waitFor ?? 3000,
        timeout: 45000,
        extract: {
          schema: jsonSchema,
          prompt: `Extract all fashion products visible on this ${brand} category page. For each product, get the exact product name, product detail page URL (absolute), price in cents, category, and colour. Include items loaded via infinite scroll or lazy loading.`,
        },
      };

      if (urlConfig.actions?.length) {
        scrapeBody.actions = urlConfig.actions;
      }

      const resp = await fetchWithRetry('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scrapeBody),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.warn(`[scrape] Firecrawl error for ${urlConfig.url}: ${JSON.stringify(data).slice(0, 300)}`);
        continue;
      }

      const extracted = data.data?.extract || data.extract || {};
      const products = extracted?.products || [];
      
      const rawHtml = data.data?.rawHtml || data.rawHtml || '';
      const allImageUrls = extractImageUrlsFromHtml(rawHtml);
      
      console.log(`[scrape] extracted ${products.length} products, ${allImageUrls.length} image URLs from rawHtml of ${urlConfig.url}`);

      const usedImages = new Set<string>();
      
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (!p.name || !p.product_url) continue;

        let productImages = matchImagesToProduct(p.product_url, p.name, allImageUrls, brand);
        
        if (!productImages.length && allImageUrls.length > 0) {
          const imagesPerProduct = Math.max(1, Math.floor(allImageUrls.length / Math.max(products.length, 1)));
          const start = i * imagesPerProduct;
          const end = Math.min(start + imagesPerProduct, allImageUrls.length);
          productImages = allImageUrls.slice(start, end).filter(img => !usedImages.has(img));
        }
        
        productImages = productImages.filter(img => !usedImages.has(img));
        productImages.forEach(img => usedImages.add(img));

        if (productImages.length > 0) {
          allProducts.push({
            name: p.name,
            brand,
            product_url: p.product_url,
            price_cents: p.price_cents ?? null,
            currency: p.currency ?? 'USD',
            image_urls: productImages.slice(0, 8),
            category_raw: p.category_raw ?? category,
            colour: p.colour ?? null,
          });
        }
      }
    } catch (err) {
      console.warn(`[scrape] failed for ${urlConfig.url}:`, err);
    }

    await delay(1500);
  }

  return allProducts;
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
};

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
  
  // Use shopping-intent query format for better product results
  const searchQuery = `${brand} ${catTerms} ${effectiveSites}`;

  console.log(`[search-fallback] Query: "${searchQuery}"`);

  try {
    const resp = await fetchWithRetry('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 30,
        lang: 'en',
        country: 'us',
        scrapeOptions: {
          formats: ['markdown', 'links'],
          onlyMainContent: true,
        },
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.warn(`[search-fallback] Firecrawl search error: ${JSON.stringify(data).slice(0, 300)}`);
      // If primary search fails, try a simplified query without site restrictions
      return searchProductsFallback(brand, category, firecrawlApiKey);
    }

    const results = data.data || [];
    console.log(`[search-fallback] Got ${results.length} search results`);

    const allProducts = parseSearchResults(results, brand, category);

    // If we got very few results, try the fallback query too
    if (allProducts.length < 3) {
      console.log(`[search-fallback] Only ${allProducts.length} results, trying broader query`);
      const fallbackProducts = await searchProductsFallback(brand, category, firecrawlApiKey);
      // Merge without duplication
      const existingUrls = new Set(allProducts.map(p => p.product_url.toLowerCase()));
      for (const p of fallbackProducts) {
        if (!existingUrls.has(p.product_url.toLowerCase())) {
          allProducts.push(p);
        }
      }
    }

    console.log(`[search-fallback] Extracted ${allProducts.length} products for ${brand}/${category}`);
    return allProducts;
  } catch (err) {
    console.warn(`[search-fallback] Error:`, err);
    // Try fallback on error
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
  // Simple shopping-intent query without site restrictions
  const searchQuery = `"${brand}" ${catTerms} buy online`;

  console.log(`[search-fallback-broad] Query: "${searchQuery}"`);

  try {
    const resp = await fetchWithRetry('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 20,
        lang: 'en',
        country: 'us',
        scrapeOptions: {
          formats: ['markdown', 'links'],
          onlyMainContent: true,
        },
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.warn(`[search-fallback-broad] Error: ${JSON.stringify(data).slice(0, 200)}`);
      return [];
    }

    const results = data.data || [];
    return parseSearchResults(results, brand, category);
  } catch (err) {
    console.warn(`[search-fallback-broad] Error:`, err);
    return [];
  }
}

// Shared parser for search results
function parseSearchResults(results: any[], brand: string, category: string): RawProduct[] {
  const allProducts: RawProduct[] = [];

  for (const result of results) {
    if (!result.url) continue;

    // Skip non-product pages
    const url = result.url.toLowerCase();
    if (/\/search|\/category|\/collection|\/shop\/?$/i.test(url)) continue;

    // Extract product info from the search result
    const title = result.title || '';
    const markdown = result.markdown || '';

    // Try to extract price from markdown
    const priceMatch = markdown.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
    const priceCents = priceMatch ? Math.round(parseFloat(priceMatch[1].replace(',', '')) * 100) : null;

    // Extract image URLs from markdown
    const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
    const imageUrls: string[] = [];
    let imgMatch;
    while ((imgMatch = imgRegex.exec(markdown)) !== null) {
      const imgUrl = imgMatch[1];
      if (!/logo|icon|sprite|favicon|banner|pixel|tracking/i.test(imgUrl)) {
        imageUrls.push(imgUrl);
      }
    }

    // Also check result metadata for og:image
    if (result.metadata?.ogImage) {
      imageUrls.unshift(result.metadata.ogImage);
    }

    // Clean the product name from the title
    let productName = title
      .replace(/\s*[-|]\s*(SSENSE|Farfetch|Nordstrom|NET-A-PORTER|MR PORTER|Macy's|Macys|Zappos|Amazon|Target|Kohl's|Saks|Revolve|ASOS|Shopbop|Mytheresa|END\.|Foot Locker|Dick's|REI).*$/i, '')
      .replace(/\s*Buy\s.*$/i, '')
      .trim();

    if (!productName || productName.length < 3) continue;

    // For luxury brands, require brand name in the product listing
    const brandLower = brand.toLowerCase();
    const brandSearchable = brandLower.replace(/&/g, '').replace(/[^a-z0-9]/g, '');
    const isRetailerBrand = ['nordstrom', 'macys', "macy's", 'bloomingdales', "bloomingdale's", 'target', 'kohls', "kohl's", 'jcpenney', 'walmart', 'saks', 'net-a-porter', 'revolve', 'asos'].includes(brandLower);
    const titleLower = title.toLowerCase();
    const nameLower = productName.toLowerCase();
    const brandInResult = nameLower.includes(brandLower) || titleLower.includes(brandLower) 
      || nameLower.replace(/[^a-z0-9]/g, '').includes(brandSearchable) 
      || titleLower.replace(/[^a-z0-9]/g, '').includes(brandSearchable);
    if (!isRetailerBrand && !brandInResult) {
      continue;
    }

    allProducts.push({
      name: productName,
      brand,
      product_url: result.url,
      price_cents: priceCents,
      currency: 'USD',
      image_urls: imageUrls.slice(0, 8),
      category_raw: category,
      colour: null,
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

  return {
    ...product,
    image_url: bestUrl,
    presentation: bestPresentation,
    confidence: Math.min(bestScore / 15, 1.0),
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
  if (/\bshirt|button.?down|oxford|flannel|blouse\b/.test(r)) return 'shirts';
  if (/\btop|bodysuit|tank|crop|henley\b/.test(r)) return 'tops';
  if (/\bjean|denim\b/.test(r)) return 'jeans';
  if (/\bshort\b/.test(r)) return 'shorts';
  if (/\bskirt\b/.test(r)) return 'skirts';
  if (/\blegging|tight|yoga\b/.test(r)) return 'leggings';
  if (/\bpant|trouser|chino|cargo|jogger\b/.test(r)) return 'pants';
  if (/\bbottom\b/.test(r)) return 'bottoms';
  if (/\bblazer|sport.?coat\b/.test(r)) return 'blazers';
  if (/\bvest|gilet\b/.test(r)) return 'vests';
  if (/\bcoat|trench|overcoat|peacoat|parka\b/.test(r)) return 'coats';
  if (/\bjacket|bomber|puffer|windbreaker\b/.test(r)) return 'jackets';
  if (/\bouterwear\b/.test(r)) return 'outerwear';
  if (/\bjumpsuit|romper|overall|playsuit\b/.test(r)) return 'jumpsuits';
  if (/\bdress|gown|maxi|midi\b/.test(r)) return 'dresses';
  if (/\bsneaker|trainer|running.?shoe|athletic\b/.test(r)) return 'sneakers';
  if (/\bboot|chelsea|combat|hiking\b/.test(r)) return 'boots';
  if (/\bsandal|slide|flip.?flop|mule\b/.test(r)) return 'sandals';
  if (/\bloafer|moccasin|slip.?on|driving\b/.test(r)) return 'loafers';
  if (/\bheel|pump|stiletto|wedge|platform\b/.test(r)) return 'heels';
  if (/\bshoe|footwear\b/.test(r)) return 'shoes';
  if (/\bbag|handbag|tote|crossbody|backpack|clutch|purse\b/.test(r)) return 'bags';
  if (/\bhat|cap|beanie|bucket|snapback\b/.test(r)) return 'hats';
  if (/\bsunglass|eyewear\b/.test(r)) return 'sunglasses';
  if (/\bjewel|necklace|bracelet|ring|earring|pendant|chain\b/.test(r)) return 'jewelry';
  if (/\bwatch|timepiece|chronograph\b/.test(r)) return 'watches';
  if (/\bbelt\b/.test(r)) return 'belts';
  if (/\bscarf|shawl|wrap|bandana\b/.test(r)) return 'scarves';
  if (/\bswim|bikini|trunk|boardshort|rashguard\b/.test(r)) return 'swimwear';
  if (/\bactive|gym|workout|training|sports?.bra|compression\b/.test(r)) return 'activewear';
  if (/\blounge|pajama|robe|sleepwear\b/.test(r)) return 'loungewear';
  if (/\bunderwear|boxer|brief|bra|lingerie|sock\b/.test(r)) return 'underwear';
  if (/\baccessor\b/.test(r)) return 'accessories';
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

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
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

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const runId = crypto.randomUUID();
    const results = { runId, brand, category, scraped: 0, extracted: 0, classified: 0, deduped: 0, inserted: 0, withImages: 0 };
    console.log(`[run:${runId}] Starting: ${brand}/${category}`);

    // ── STAGES 1+2: Firecrawl scrape + rawHtml image extraction ──────
    const rawProducts = await scrapeProducts(brand, category, FIRECRAWL_API_KEY);
    results.extracted = rawProducts.length;
    results.scraped = rawProducts.length > 0 ? 1 : 0;
    results.withImages = rawProducts.filter(p => p.image_urls.length > 0).length;
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

    // ── DB INSERT ────────────────────────────────────────────────────
    if (newProducts.length > 0) {
      const rows = newProducts.map(p => ({
        name: p.name,
        brand: p.brand,
        retailer: p.brand,
        product_url: normaliseUrl(p.product_url),
        image_url: normaliseUrl(p.image_url),
        price_cents: p.price_cents,
        currency: p.currency ?? 'USD',
        category: normaliseCategory(p.category_raw),
        tags: buildTags(p),
        presentation: p.presentation,
        image_confidence: p.confidence,
        scrape_source: runId,
        scraped_at: new Date().toISOString(),
        is_active: true,
      }));

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
    }

    console.log(`[run:${runId}] Done. Inserted ${results.inserted}`);
    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Pipeline error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
