import { successResponse, errorResponse, getCorsHeaders } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// All brand/category combos — using granular, website-standard category terms
import { requireServiceRole } from "../_shared/require-service-role.ts";
const BRAND_CATEGORIES: Record<string, string[]> = {
  // ── Fast Fashion & Mass Market ──
  zara:           ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'jeans', 'pants', 'shorts', 'skirts', 'jackets', 'coats', 'blazers', 'dresses', 'jumpsuits', 'sneakers', 'boots', 'sandals', 'bags', 'hats', 'belts', 'swimwear'],
  hm:             ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'jeans', 'pants', 'shorts', 'skirts', 'jackets', 'coats', 'dresses', 'jumpsuits', 'sneakers', 'sandals', 'bags', 'hats', 'swimwear', 'activewear', 'loungewear'],
  uniqlo:         ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'polos', 'jeans', 'pants', 'shorts', 'leggings', 'jackets', 'coats', 'vests', 'dresses', 'sneakers', 'bags', 'belts', 'underwear', 'loungewear'],
  shein:          ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'jeans', 'pants', 'shorts', 'skirts', 'leggings', 'jackets', 'dresses', 'jumpsuits', 'sneakers', 'sandals', 'heels', 'bags', 'jewelry', 'sunglasses', 'swimwear'],
  asos:           ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'jeans', 'pants', 'shorts', 'skirts', 'jackets', 'coats', 'blazers', 'dresses', 'jumpsuits', 'sneakers', 'boots', 'sandals', 'loafers', 'bags', 'hats', 'jewelry', 'watches', 'swimwear', 'activewear'],
  mango:          ['t-shirts', 'shirts', 'sweaters', 'jeans', 'pants', 'skirts', 'jackets', 'coats', 'blazers', 'dresses', 'jumpsuits', 'heels', 'sandals', 'bags', 'jewelry', 'scarves'],
  'cos':          ['t-shirts', 'shirts', 'sweaters', 'pants', 'jeans', 'skirts', 'jackets', 'coats', 'dresses', 'bags', 'scarves'],
  'urban outfitters': ['t-shirts', 'hoodies', 'sweaters', 'jeans', 'pants', 'shorts', 'jackets', 'dresses', 'hats', 'sunglasses'],
  'fashion nova':  ['t-shirts', 'hoodies', 'jeans', 'pants', 'shorts', 'skirts', 'leggings', 'dresses', 'jumpsuits', 'heels', 'sandals', 'bags', 'jewelry', 'swimwear'],
  'prettylittlething': ['t-shirts', 'shirts', 'hoodies', 'jeans', 'pants', 'skirts', 'leggings', 'dresses', 'jumpsuits', 'heels', 'boots', 'bags', 'jewelry', 'swimwear'],
  boohoo:         ['t-shirts', 'shirts', 'hoodies', 'jeans', 'pants', 'skirts', 'dresses', 'jumpsuits', 'heels', 'boots', 'bags', 'jewelry', 'swimwear'],
  'forever 21':   ['t-shirts', 'shirts', 'hoodies', 'jeans', 'pants', 'shorts', 'skirts', 'dresses', 'jumpsuits', 'jackets', 'sneakers', 'sandals', 'bags', 'jewelry', 'swimwear'],
  topshop:        ['t-shirts', 'shirts', 'jeans', 'pants', 'skirts', 'dresses', 'jackets', 'coats', 'boots', 'heels', 'bags', 'jewelry'],
  nastygal:       ['t-shirts', 'shirts', 'hoodies', 'jeans', 'pants', 'skirts', 'dresses', 'jumpsuits', 'jackets', 'boots', 'heels', 'bags', 'jewelry', 'swimwear'],

  // ── Sportswear & Athletic ──
  nike:           ['t-shirts', 'hoodies', 'polos', 'pants', 'shorts', 'leggings', 'jackets', 'vests', 'sneakers', 'sandals', 'hats', 'bags', 'socks', 'activewear', 'swimwear'],
  adidas:         ['t-shirts', 'hoodies', 'polos', 'pants', 'shorts', 'leggings', 'jackets', 'vests', 'sneakers', 'sandals', 'hats', 'bags', 'activewear'],
  'new balance':  ['t-shirts', 'hoodies', 'pants', 'shorts', 'jackets', 'sneakers', 'sandals', 'hats', 'bags', 'activewear'],
  puma:           ['t-shirts', 'hoodies', 'pants', 'shorts', 'leggings', 'jackets', 'sneakers', 'sandals', 'hats', 'bags', 'activewear'],
  'under armour': ['t-shirts', 'hoodies', 'polos', 'pants', 'shorts', 'leggings', 'jackets', 'sneakers', 'hats', 'bags', 'activewear'],
  reebok:         ['t-shirts', 'hoodies', 'pants', 'shorts', 'sneakers', 'activewear'],
  asics:          ['sneakers', 't-shirts', 'shorts', 'activewear'],
  'on running':   ['sneakers', 't-shirts', 'shorts', 'jackets', 'activewear'],
  'hoka':         ['sneakers', 'sandals'],
  converse:       ['t-shirts', 'hoodies', 'sneakers', 'bags', 'hats'],
  vans:           ['t-shirts', 'hoodies', 'sneakers', 'sandals', 'hats', 'bags'],
  'jordan':       ['t-shirts', 'hoodies', 'shorts', 'pants', 'sneakers', 'hats'],

  // ── Outdoor & Active ──
  'the north face': ['t-shirts', 'hoodies', 'sweaters', 'pants', 'shorts', 'jackets', 'coats', 'vests', 'boots', 'sneakers', 'hats', 'bags', 'activewear'],
  patagonia:      ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'pants', 'shorts', 'jackets', 'vests', 'hats', 'bags', 'swimwear'],
  lululemon:      ['t-shirts', 'hoodies', 'polos', 'pants', 'shorts', 'leggings', 'jackets', 'vests', 'sneakers', 'bags', 'hats', 'activewear'],
  salomon:        ['sneakers', 'boots', 'jackets', 'shorts', 'hats'],
  columbia:       ['t-shirts', 'shirts', 'hoodies', 'pants', 'shorts', 'jackets', 'coats', 'vests', 'boots', 'sneakers', 'hats'],
  'arc\'teryx':   ['jackets', 'coats', 'vests', 'hoodies', 'pants', 'shorts', 'hats', 'bags'],

  // ── Denim & Casual ──
  "levi's":       ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'jeans', 'shorts', 'skirts', 'jackets', 'vests', 'belts'],
  carhartt:       ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'pants', 'shorts', 'jackets', 'vests', 'hats', 'belts'],
  gap:            ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'polos', 'jeans', 'pants', 'shorts', 'skirts', 'jackets', 'coats', 'dresses', 'activewear', 'loungewear'],
  'banana republic': ['t-shirts', 'shirts', 'sweaters', 'pants', 'jeans', 'shorts', 'skirts', 'jackets', 'blazers', 'coats', 'dresses'],
  'old navy':     ['t-shirts', 'shirts', 'hoodies', 'jeans', 'pants', 'shorts', 'skirts', 'jackets', 'dresses', 'activewear', 'swimwear'],
  'j.crew':       ['t-shirts', 'shirts', 'sweaters', 'polos', 'jeans', 'pants', 'shorts', 'skirts', 'blazers', 'jackets', 'coats', 'dresses', 'sneakers', 'loafers', 'belts', 'swimwear'],
  'ralph lauren': ['t-shirts', 'shirts', 'polos', 'sweaters', 'jeans', 'pants', 'shorts', 'jackets', 'blazers', 'coats', 'sneakers', 'loafers', 'belts', 'hats', 'watches', 'bags'],
  'tommy hilfiger': ['t-shirts', 'shirts', 'polos', 'hoodies', 'sweaters', 'jeans', 'pants', 'shorts', 'jackets', 'coats', 'sneakers', 'loafers', 'belts', 'watches', 'bags', 'underwear'],
  'calvin klein': ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'jeans', 'pants', 'shorts', 'jackets', 'dresses', 'sneakers', 'bags', 'belts', 'watches', 'underwear', 'swimwear'],
  'hugo boss':    ['t-shirts', 'shirts', 'polos', 'sweaters', 'pants', 'jeans', 'shorts', 'jackets', 'blazers', 'coats', 'sneakers', 'loafers', 'belts', 'watches', 'bags'],

  // ── Department Store & Contemporary ──
  nordstrom:      ['t-shirts', 'shirts', 'sweaters', 'jeans', 'pants', 'skirts', 'jackets', 'blazers', 'coats', 'dresses', 'jumpsuits', 'sneakers', 'boots', 'sandals', 'heels', 'loafers', 'bags', 'jewelry', 'watches', 'sunglasses'],
  anthropologie:  ['t-shirts', 'shirts', 'sweaters', 'jeans', 'pants', 'skirts', 'dresses', 'jumpsuits', 'jackets', 'bags', 'jewelry', 'scarves'],
  'free people':  ['t-shirts', 'sweaters', 'jeans', 'pants', 'skirts', 'dresses', 'jumpsuits', 'jackets', 'boots', 'sandals', 'jewelry'],
  reformation:    ['dresses', 't-shirts', 'sweaters', 'jeans', 'pants', 'skirts', 'jumpsuits', 'sandals'],
  aritzia:        ['t-shirts', 'shirts', 'sweaters', 'hoodies', 'pants', 'jeans', 'skirts', 'shorts', 'jackets', 'coats', 'blazers', 'dresses', 'jumpsuits', 'activewear'],
  revolve:        ['t-shirts', 'shirts', 'sweaters', 'jeans', 'pants', 'skirts', 'shorts', 'jackets', 'blazers', 'dresses', 'jumpsuits', 'sneakers', 'heels', 'sandals', 'bags', 'jewelry', 'sunglasses', 'swimwear'],
  everlane:       ['t-shirts', 'shirts', 'sweaters', 'jeans', 'pants', 'shorts', 'jackets', 'coats', 'dresses', 'sneakers', 'loafers', 'sandals', 'bags', 'belts'],
  abercrombie:    ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'jeans', 'pants', 'shorts', 'skirts', 'jackets', 'coats', 'dresses', 'jumpsuits', 'swimwear', 'activewear'],
  'american eagle': ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'jeans', 'pants', 'shorts', 'skirts', 'jackets', 'dresses', 'swimwear'],
  hollister:      ['t-shirts', 'shirts', 'hoodies', 'sweaters', 'jeans', 'pants', 'shorts', 'jackets', 'dresses', 'swimwear'],

  // ── Footwear Specialists ──
  'dr. martens':  ['boots', 'sandals', 'loafers'],
  birkenstock:    ['sandals', 'boots', 'loafers'],
  crocs:          ['sandals', 'sneakers'],
  timberland:     ['boots', 'sneakers', 'jackets', 'hoodies'],
  'steve madden': ['sneakers', 'boots', 'sandals', 'heels', 'loafers', 'bags'],
  allbirds:       ['sneakers', 'loafers'],
  clarks:         ['boots', 'loafers', 'sandals'],

  // ── Eyewear ──
  'ray-ban':      ['sunglasses'],
  oakley:         ['sunglasses'],

  // ── Jewelry & Accessories ──
  pandora:        ['jewelry'],
  mejuri:         ['jewelry'],
  'tiffany & co': ['jewelry'],
  cartier:        ['jewelry', 'watches'],
  swarovski:      ['jewelry'],
  kendra_scott:   ['jewelry'],

  // ── Headwear ──
  'new era':      ['hats'],

  // ── Streetwear ──
  supreme:        ['t-shirts', 'hoodies', 'sweaters', 'jackets', 'pants', 'shorts', 'hats', 'bags'],
  palace:         ['t-shirts', 'hoodies', 'sweaters', 'jackets', 'pants', 'shorts', 'hats'],
  "stüssy":       ['t-shirts', 'hoodies', 'sweaters', 'pants', 'shorts', 'jackets', 'hats', 'bags'],
  'off-white':    ['t-shirts', 'hoodies', 'jackets', 'pants', 'sneakers', 'bags'],
  essentials:     ['t-shirts', 'hoodies', 'sweaters', 'pants', 'shorts', 'jackets'],
  'a bathing ape': ['t-shirts', 'hoodies', 'jackets', 'pants', 'shorts', 'sneakers', 'hats', 'bags'],
  kith:           ['t-shirts', 'hoodies', 'sweaters', 'pants', 'shorts', 'jackets', 'sneakers', 'hats'],
  corteiz:        ['t-shirts', 'hoodies', 'pants', 'shorts', 'jackets', 'hats'],
  trapstar:       ['t-shirts', 'hoodies', 'jackets', 'pants', 'hats', 'bags'],
  'fear of god':  ['t-shirts', 'hoodies', 'sweaters', 'pants', 'shorts', 'jackets', 'coats', 'sneakers', 'boots'],

  // ── Luxury ──
  gucci:          ['t-shirts', 'shirts', 'sweaters', 'jackets', 'coats', 'sneakers', 'loafers', 'sandals', 'bags', 'belts', 'hats', 'sunglasses', 'jewelry', 'watches'],
  prada:          ['t-shirts', 'shirts', 'sweaters', 'jackets', 'coats', 'sneakers', 'loafers', 'boots', 'bags', 'belts', 'sunglasses', 'hats'],
  dior:           ['t-shirts', 'shirts', 'sweaters', 'jackets', 'sneakers', 'boots', 'bags', 'belts', 'sunglasses', 'jewelry'],
  'louis vuitton': ['t-shirts', 'shirts', 'sweaters', 'jackets', 'sneakers', 'boots', 'loafers', 'bags', 'belts', 'watches', 'sunglasses'],
  balenciaga:     ['t-shirts', 'hoodies', 'jackets', 'pants', 'sneakers', 'boots', 'bags', 'hats', 'sunglasses'],
  'saint laurent': ['t-shirts', 'shirts', 'jackets', 'coats', 'jeans', 'sneakers', 'boots', 'heels', 'bags', 'belts', 'sunglasses'],
  versace:        ['t-shirts', 'shirts', 'sweaters', 'jackets', 'jeans', 'sneakers', 'loafers', 'bags', 'belts', 'watches', 'sunglasses', 'jewelry'],
  burberry:       ['t-shirts', 'shirts', 'sweaters', 'jackets', 'coats', 'sneakers', 'boots', 'bags', 'belts', 'scarves', 'hats', 'sunglasses'],
  fendi:          ['t-shirts', 'sweaters', 'jackets', 'sneakers', 'loafers', 'bags', 'belts', 'sunglasses'],
  givenchy:       ['t-shirts', 'hoodies', 'sweaters', 'jackets', 'sneakers', 'boots', 'bags', 'sunglasses'],
  valentino:      ['t-shirts', 'sweaters', 'jackets', 'sneakers', 'heels', 'bags', 'belts', 'sunglasses'],
  'alexander mcqueen': ['t-shirts', 'sweaters', 'jackets', 'sneakers', 'boots', 'bags', 'scarves'],
  'bottega veneta': ['sweaters', 'jackets', 'boots', 'loafers', 'sandals', 'bags', 'belts', 'sunglasses'],
  celine:         ['t-shirts', 'jackets', 'jeans', 'sneakers', 'boots', 'bags', 'sunglasses'],
  loewe:          ['sweaters', 'jackets', 'sneakers', 'sandals', 'bags', 'belts', 'sunglasses'],
  moncler:        ['jackets', 'coats', 'vests', 'hoodies', 'sweaters', 't-shirts', 'sneakers', 'boots', 'hats', 'scarves'],
  'stone island':  ['t-shirts', 'hoodies', 'sweaters', 'jackets', 'coats', 'vests', 'pants', 'shorts', 'hats'],
  'acne studios':  ['t-shirts', 'shirts', 'sweaters', 'hoodies', 'jeans', 'pants', 'jackets', 'coats', 'sneakers', 'boots', 'bags', 'scarves'],
  'ami paris':     ['t-shirts', 'shirts', 'sweaters', 'hoodies', 'pants', 'jackets', 'coats', 'sneakers', 'bags', 'hats'],
  'jacquemus':     ['t-shirts', 'shirts', 'sweaters', 'pants', 'shorts', 'dresses', 'jackets', 'sandals', 'bags', 'hats', 'sunglasses'],
  'rick owens':    ['t-shirts', 'hoodies', 'jackets', 'coats', 'pants', 'shorts', 'sneakers', 'boots', 'bags'],
  'maison margiela': ['t-shirts', 'sweaters', 'jackets', 'pants', 'sneakers', 'boots', 'bags', 'jewelry'],

  // ── New Luxury ──
  'tom ford':       ['t-shirts', 'shirts', 'jackets', 'blazers', 'pants', 'sneakers', 'loafers', 'bags', 'belts', 'sunglasses'],
  'balmain':        ['t-shirts', 'hoodies', 'jackets', 'blazers', 'jeans', 'pants', 'sneakers', 'boots', 'bags', 'belts'],
  'dsquared2':      ['t-shirts', 'hoodies', 'jackets', 'jeans', 'pants', 'sneakers', 'boots', 'hats', 'belts'],
  'dolce & gabbana': ['t-shirts', 'shirts', 'jackets', 'blazers', 'pants', 'sneakers', 'loafers', 'bags', 'belts', 'sunglasses'],
  'amiri':          ['t-shirts', 'hoodies', 'jackets', 'jeans', 'pants', 'sneakers', 'boots', 'bags', 'hats'],
  'palm angels':    ['t-shirts', 'hoodies', 'jackets', 'pants', 'sneakers', 'bags', 'hats', 'sunglasses'],
  'golden goose':   ['sneakers', 't-shirts', 'hoodies', 'jackets', 'jeans', 'bags'],
  'chrome hearts':  ['t-shirts', 'hoodies', 'jackets', 'jeans', 'jewelry', 'hats', 'belts', 'sunglasses'],
  'jw anderson':    ['t-shirts', 'sweaters', 'jackets', 'pants', 'bags', 'scarves'],
  'thom browne':    ['shirts', 'sweaters', 'blazers', 'pants', 'shorts', 'jackets', 'coats', 'sneakers', 'bags'],
  'brunello cucinelli': ['t-shirts', 'shirts', 'sweaters', 'pants', 'jackets', 'coats', 'blazers', 'loafers', 'bags', 'belts'],
  'issey miyake':   ['t-shirts', 'sweaters', 'pants', 'jackets', 'bags'],
  'coperni':        ['t-shirts', 'sweaters', 'dresses', 'jackets', 'pants', 'bags'],
  'alaia':          ['dresses', 'jackets', 'pants', 'heels', 'boots', 'bags', 'belts'],

  // ── New Streetwear ──
  'represent':      ['t-shirts', 'hoodies', 'sweaters', 'jackets', 'jeans', 'pants', 'shorts', 'sneakers', 'hats'],
  'eric emanuel':   ['shorts', 't-shirts', 'hoodies', 'hats'],
  'gallery dept':   ['t-shirts', 'hoodies', 'jackets', 'jeans', 'pants', 'shorts', 'hats'],
  'rhude':          ['t-shirts', 'hoodies', 'jackets', 'pants', 'shorts', 'sneakers', 'hats', 'sunglasses'],
  'human made':     ['t-shirts', 'hoodies', 'sweaters', 'jackets', 'pants', 'shorts', 'hats', 'bags'],
  'undercover':     ['t-shirts', 'hoodies', 'jackets', 'pants', 'sneakers', 'bags'],
  'neighborhood':   ['t-shirts', 'hoodies', 'jackets', 'pants', 'boots', 'hats', 'bags'],
  'needles':        ['t-shirts', 'shirts', 'sweaters', 'jackets', 'pants', 'shorts', 'hats'],
  'comme des garcons': ['t-shirts', 'shirts', 'sweaters', 'jackets', 'pants', 'sneakers', 'bags'],
  'vetements':      ['t-shirts', 'hoodies', 'jackets', 'jeans', 'pants', 'sneakers', 'boots', 'hats'],
  'sacai':          ['t-shirts', 'sweaters', 'jackets', 'coats', 'pants', 'sneakers', 'bags'],
  'daily paper':    ['t-shirts', 'hoodies', 'sweaters', 'jackets', 'pants', 'shorts', 'hats', 'bags'],
  'missing since thursday': ['t-shirts', 'hoodies', 'pants', 'shorts', 'jackets', 'hats'],

  // ── Mens-Only Retailers ──
  bonobos:        ['t-shirts', 'shirts', 'polos', 'sweaters', 'pants', 'jeans', 'shorts', 'jackets', 'blazers', 'coats', 'sneakers', 'loafers', 'belts', 'swimwear'],
  'buck mason':   ['t-shirts', 'shirts', 'sweaters', 'jeans', 'pants', 'shorts', 'jackets', 'coats', 'boots'],
  'bylt basics':  ['t-shirts', 'polos', 'hoodies', 'pants', 'shorts', 'joggers'],
  'charles tyrwhitt': ['shirts', 'polos', 'sweaters', 'pants', 'blazers', 'coats', 'belts', 'ties'],
  'cuts clothing': ['t-shirts', 'polos', 'hoodies', 'pants', 'shorts', 'jackets'],
  huckberry:      ['t-shirts', 'shirts', 'sweaters', 'hoodies', 'jeans', 'pants', 'shorts', 'jackets', 'coats', 'vests', 'boots', 'sneakers', 'belts', 'hats', 'bags'],
  indochino:      ['shirts', 'blazers', 'pants', 'coats'],
  'jos. a. bank': ['shirts', 'polos', 'sweaters', 'pants', 'blazers', 'coats', 'belts', 'ties'],
  "men's wearhouse": ['shirts', 'pants', 'blazers', 'coats', 'belts', 'ties'],
  'mizzen+main':  ['shirts', 'polos', 'pants', 'shorts', 'jackets'],
  'mr porter':    ['t-shirts', 'shirts', 'sweaters', 'hoodies', 'jeans', 'pants', 'shorts', 'jackets', 'blazers', 'coats', 'sneakers', 'boots', 'loafers', 'bags', 'belts', 'watches', 'sunglasses'],
  'peter manning': ['t-shirts', 'shirts', 'polos', 'sweaters', 'pants', 'jeans', 'shorts', 'jackets', 'blazers'],
  'proper cloth':  ['shirts', 'pants', 'blazers'],
  rhone:          ['t-shirts', 'polos', 'hoodies', 'pants', 'shorts', 'jackets', 'activewear'],
  suitsupply:     ['shirts', 'blazers', 'pants', 'coats', 'belts', 'ties', 'sneakers', 'loafers'],
  'todd snyder':  ['t-shirts', 'shirts', 'sweaters', 'hoodies', 'jeans', 'pants', 'shorts', 'jackets', 'blazers', 'coats', 'sneakers', 'boots', 'bags'],
  'true classic': ['t-shirts', 'polos', 'hoodies', 'pants', 'shorts', 'jackets', 'activewear'],
  untuckit:       ['shirts', 'polos', 'sweaters', 'pants', 'shorts', 'jackets', 'blazers'],
  vuori:          ['t-shirts', 'hoodies', 'pants', 'shorts', 'jackets', 'activewear', 'joggers'],

  // ── Womens-Only Retailers ──
  'net-a-porter':  ['t-shirts', 'shirts', 'sweaters', 'jeans', 'pants', 'skirts', 'dresses', 'jumpsuits', 'jackets', 'coats', 'blazers', 'heels', 'boots', 'sandals', 'bags', 'jewelry', 'sunglasses'],
  "victoria's secret": ['bras', 'underwear', 'loungewear', 'sleepwear', 'swimwear', 'activewear'],
  fabletics:      ['leggings', 't-shirts', 'hoodies', 'shorts', 'jackets', 'activewear', 'swimwear'],
  torrid:         ['t-shirts', 'shirts', 'sweaters', 'hoodies', 'jeans', 'pants', 'shorts', 'skirts', 'dresses', 'jumpsuits', 'jackets', 'coats', 'swimwear', 'activewear', 'loungewear'],
  'lane bryant':  ['t-shirts', 'shirts', 'sweaters', 'jeans', 'pants', 'skirts', 'dresses', 'jackets', 'coats', 'swimwear', 'activewear', 'loungewear'],
  'eileen fisher': ['t-shirts', 'shirts', 'sweaters', 'pants', 'skirts', 'dresses', 'jackets', 'coats', 'scarves'],
  'girlfriend collective': ['leggings', 't-shirts', 'hoodies', 'shorts', 'jackets', 'activewear', 'swimwear'],
  'rent the runway': ['dresses', 'jumpsuits', 'jackets', 'coats', 'blazers', 'skirts', 'pants', 'tops', 'bags', 'jewelry'],
  thirdlove:      ['bras', 'underwear', 'loungewear', 'sleepwear'],
  'savage x fenty': ['bras', 'underwear', 'loungewear', 'sleepwear', 'activewear'],
  eloquii:        ['t-shirts', 'shirts', 'sweaters', 'jeans', 'pants', 'skirts', 'dresses', 'jumpsuits', 'jackets', 'coats', 'swimwear'],
  "altar'd state": ['t-shirts', 'sweaters', 'jeans', 'pants', 'skirts', 'dresses', 'jackets', 'jewelry', 'bags'],
  'white house black market': ['t-shirts', 'shirts', 'sweaters', 'pants', 'jeans', 'skirts', 'dresses', 'jumpsuits', 'jackets', 'blazers', 'coats'],
  'ann taylor':   ['t-shirts', 'shirts', 'sweaters', 'pants', 'jeans', 'skirts', 'dresses', 'jackets', 'blazers', 'coats'],
  loft:           ['t-shirts', 'shirts', 'sweaters', 'pants', 'jeans', 'skirts', 'dresses', 'jackets', 'blazers'],
  "chico's":      ['t-shirts', 'shirts', 'sweaters', 'pants', 'jeans', 'skirts', 'dresses', 'jackets', 'coats', 'jewelry', 'scarves'],
  'lucy paris':   ['t-shirts', 'sweaters', 'pants', 'skirts', 'dresses', 'jumpsuits', 'jackets'],
  skims:          ['t-shirts', 'leggings', 'dresses', 'loungewear', 'underwear', 'swimwear'],

  // ── Additional brands (re-scrape coverage) ──
  ugg:            ['boots', 'sandals', 'loafers', 'sneakers'],
  'tory burch':   ['bags', 'shoes', 'jewelry', 't-shirts', 'dresses'],
  sandro:         ['t-shirts', 'shirts', 'sweaters', 'dresses', 'jackets', 'coats', 'pants'],
  coach:          ['bags', 'shoes', 'belts', 'sunglasses'],
  'kate spade':   ['bags', 'jewelry', 'shoes', 'dresses'],
  'michael kors': ['bags', 'shoes', 'watches', 'dresses'],
  theory:         ['t-shirts', 'shirts', 'sweaters', 'pants', 'jackets', 'blazers', 'dresses'],
  reiss:          ['t-shirts', 'shirts', 'sweaters', 'pants', 'jackets', 'coats', 'dresses'],
  'ted baker':    ['t-shirts', 'shirts', 'sweaters', 'pants', 'jackets', 'dresses', 'bags'],
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const _auth = requireServiceRole(req);
  if (!_auth.ok) return _auth.response;

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Categories with <150 products that need priority growth
    const THIN_CATEGORIES = new Set([
      'loungewear', 'bottoms', 'heels', 'jumpsuits', 'skirts', 'activewear',
      'outerwear', 'accessories', 'watches', 'underwear', 'scarves',
      'loafers', 'vests', 'leggings', 'coats', 'boots', 'shoes', 'tops',
      'blazers',
    ]);

    // Support batch params to process a slice of jobs (0-indexed batch number)
    let batchNumber = 0;
    let batchTotal = 1;
    let dispatchDelayMs = 1500;
    let thinOnly = false;
    try {
      const body = await req.json();
      batchNumber = Number(body.batch ?? 0);
      batchTotal = Number(body.totalBatches ?? 1);
      dispatchDelayMs = Number(body.dispatchDelayMs ?? 1500);
      thinOnly = body.thinOnly === true;
    } catch { /* no body = run all */ }

    batchTotal = Number.isFinite(batchTotal) && batchTotal > 0 ? Math.floor(batchTotal) : 1;
    batchNumber = Number.isFinite(batchNumber) && batchNumber >= 0 ? Math.floor(batchNumber) : 0;
    dispatchDelayMs = Number.isFinite(dispatchDelayMs)
      ? Math.max(250, Math.min(5000, Math.floor(dispatchDelayMs)))
      : 1500;

    // Womenswear-priority brands — boost coverage by running these first
    const WOMEN_PRIORITY = new Set([
      'shein', 'fashion nova', 'prettylittlething', 'boohoo', 'forever 21',
      'topshop', 'nastygal', 'mango', 'cos', 'zara', 'hm', 'asos', 'free people',
      'reformation', 'aritzia', 'revolve', 'anthropologie', 'reiss', 'theory',
      'tory burch', 'kate spade', 'michael kors', 'sandro', 'ted baker',
    ]);

    // Build all jobs (optionally filtered to thin categories only)
    const allJobs: { brand: string; category: string }[] = [];
    for (const [brand, categories] of Object.entries(BRAND_CATEGORIES)) {
      for (const category of categories) {
        if (thinOnly && !THIN_CATEGORIES.has(category)) continue;
        allJobs.push({ brand, category });
      }
    }
    // Stable sort: women-priority brands first
    allJobs.sort((a, b) => {
      const aw = WOMEN_PRIORITY.has(a.brand) ? 0 : 1;
      const bw = WOMEN_PRIORITY.has(b.brand) ? 0 : 1;
      return aw - bw;
    });

    if (thinOnly) {
      console.log(`[scrape-all] thinOnly=true: filtered to ${allJobs.length} thin-category jobs`);
    }

    // Slice for this batch
    const jobsPerBatch = Math.ceil(allJobs.length / batchTotal);
    const start = batchNumber * jobsPerBatch;
    const batchJobs = allJobs.slice(start, start + jobsPerBatch);

    console.log(
      `[scrape-all] Batch ${batchNumber + 1}/${batchTotal}: dispatching ${batchJobs.length} jobs with ${dispatchDelayMs}ms stagger (of ${allJobs.length} total)`
    );

    // Runtime budget warning (Option B): edge function runtime caps are
    // ~150s on Free, ~400s on Pro. At dispatchDelayMs per job, batches
    // larger than ~265 jobs on Pro will exceed the cap mid-dispatch.
    const estimatedRuntimeSec = (batchJobs.length * dispatchDelayMs) / 1000;
    if (estimatedRuntimeSec > 380) {
      console.warn(
        `[scrape-all] WARN: ${batchJobs.length} jobs × ${dispatchDelayMs}ms = ` +
        `${estimatedRuntimeSec.toFixed(0)}s. Edge runtime cap is ~400s on Pro. ` +
        `Consider increasing totalBatches or reducing job count to avoid mid-run timeout.`
      );
    }

    // Awaited dispatch with 429/5xx retry + body drain.
    // We await each dispatch (just the request send, not the scrape work)
    // so we can detect rate-limit responses and back off, instead of
    // silently dropping jobs as fire-and-forget would.
    let dispatched = 0;
    let retried = 0;
    let failed = 0;
    for (let i = 0; i < batchJobs.length; i++) {
      const job = batchJobs[i];
      const url = `${SUPABASE_URL}/functions/v1/scrape-products`;
      const init: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ brand: job.brand, category: job.category }),
      };

      let attempt = 0;
      const maxAttempts = 3;
      let ok = false;
      while (attempt < maxAttempts && !ok) {
        attempt++;
        try {
          const resp = await fetch(url, init);
          // Drain body to free the connection (Deno will leak otherwise)
          resp.body?.cancel().catch(() => {});

          if (resp.status === 429 || (resp.status >= 500 && resp.status < 600)) {
            if (attempt < maxAttempts) {
              retried++;
              const backoffMs = 1000 * attempt; // 1s, 2s
              console.warn(
                `[scrape-all] ${job.brand}/${job.category} got ${resp.status}, ` +
                `retry ${attempt}/${maxAttempts - 1} after ${backoffMs}ms`
              );
              await new Promise(r => setTimeout(r, backoffMs));
              continue;
            }
            failed++;
            console.warn(
              `[scrape-all] ${job.brand}/${job.category} gave up after ${maxAttempts} attempts (${resp.status})`
            );
          } else {
            ok = true;
          }
        } catch (err: any) {
          if (attempt < maxAttempts) {
            retried++;
            const backoffMs = 1000 * attempt;
            console.warn(
              `[scrape-all] ${job.brand}/${job.category} dispatch error: ${err.message}, ` +
              `retry ${attempt}/${maxAttempts - 1} after ${backoffMs}ms`
            );
            await new Promise(r => setTimeout(r, backoffMs));
            continue;
          }
          failed++;
          console.warn(
            `[scrape-all] ${job.brand}/${job.category} dispatch failed permanently: ${err.message}`
          );
        }
      }
      dispatched++;

      // Stagger between jobs (skip after the last one)
      if (i < batchJobs.length - 1) {
        await new Promise(r => setTimeout(r, dispatchDelayMs));
      }
    }

    // Brief flush before returning so the last fire-and-forget request
    // has time to leave the runtime before the function exits.
    await new Promise(r => setTimeout(r, 500));

    console.log(
      `[scrape-all] Batch ${batchNumber + 1} dispatched ${dispatched} jobs ` +
      `(retried=${retried}, failed=${failed})`
    );

    // Insert a scrape_runs row so pg_cron handles post-processing
    const estimatedSeconds = Math.max(Math.ceil(dispatched * dispatchDelayMs * 0.5 / 1000), 30);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error: insertErr } = await supabase.from('scrape_runs').insert({
      batch_number: batchNumber,
      total_jobs: dispatched,
      status: 'scraping',
      post_process_at: new Date(Date.now() + estimatedSeconds * 1000).toISOString(),
    });
    if (insertErr) {
      console.warn('[scrape-all] Failed to insert scrape_runs row:', insertErr.message);
    }

    return successResponse({
      batch: batchNumber,
      totalBatches: batchTotal,
      totalJobs: batchJobs.length,
      dispatched,
      dispatchDelayMs,
      postProcessingVia: 'pg_cron',
      postProcessAfterSeconds: estimatedSeconds,
      message: `Dispatched ${dispatched} scrape jobs. Post-processing (categorize, gender, audit, cleanup) will be triggered by pg_cron after ~${estimatedSeconds}s.`,
    }, 200, corsHeaders);
  } catch (err: any) {
    console.error('[scrape-all] Error:', err);
    return errorResponse(err.message, "INTERNAL_ERROR", 500, corsHeaders);
  }
});
