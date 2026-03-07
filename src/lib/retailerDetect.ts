const RETAILERS: Record<string, string> = {
  // Fast fashion & mass market
  'zara': 'Zara',
  'hm': 'H&M',
  'shein': 'SHEIN',
  'uniqlo': 'Uniqlo',
  'mango': 'Mango',
  'fashionnova': 'Fashion Nova',
  'prettylittlething': 'PrettyLittleThing',
  'boohoo': 'Boohoo',
  'forever21': 'Forever 21',
  'primark': 'Primark',
  'bershka': 'Bershka',
  'pullandbear': 'Pull & Bear',
  'stradivarius': 'Stradivarius',
  'massimo': 'Massimo Dutti',
  'topshop': 'Topshop',
  'misguided': 'Missguided',
  'nastygal': 'Nasty Gal',
  'romwe': 'Romwe',
  'cider': 'Cider',
  'temu': 'Temu',

  // Department stores & multi-brand
  'nordstrom': 'Nordstrom',
  'macys': "Macy's",
  'bloomingdales': "Bloomingdale's",
  'saksfifthavenue': 'Saks',
  'saks': 'Saks',
  'neimanmarcus': 'Neiman Marcus',
  'jcpenney': 'JCPenney',
  'kohls': "Kohl's",
  'dillards': "Dillard's",
  'selfridges': 'Selfridges',
  'harrods': 'Harrods',
  'debenhams': 'Debenhams',
  'johnlewis': 'John Lewis',
  'houseoffraser': 'House of Fraser',
  'thebay': 'Hudson\'s Bay',

  // Online multi-brand
  'asos': 'ASOS',
  'revolve': 'Revolve',
  'farfetch': 'Farfetch',
  'ssense': 'SSENSE',
  'mrporter': 'Mr Porter',
  'net-a-porter': 'Net-a-Porter',
  'matchesfashion': 'Matches',
  'mytheresa': 'Mytheresa',
  'luisaviaroma': 'Luisaviaroma',
  'shopbop': 'Shopbop',
  'yoox': 'YOOX',
  '24s': '24S',
  'endclothing': 'END.',
  'sneakersnstuff': 'SNS',
  'dtlr': 'DTLR',
  'footlocker': 'Foot Locker',
  'finishline': 'Finish Line',
  'zappos': 'Zappos',

  // General & big box
  'amazon': 'Amazon',
  'target': 'Target',
  'walmart': 'Walmart',
  'costco': 'Costco',

  // Gap Inc.
  'gap': 'Gap',
  'oldnavy': 'Old Navy',
  'bananarepublic': 'Banana Republic',
  'athleta': 'Athleta',

  // A&F Corp & similar
  'abercrombie': 'Abercrombie',
  'hollister': 'Hollister',
  'americaneagle': 'American Eagle',
  'ae': 'American Eagle',
  'pacsun': 'PacSun',

  // J.Crew / preppy
  'jcrew': 'J.Crew',
  'brooksbrothers': 'Brooks Brothers',
  'ralphlauren': 'Ralph Lauren',
  'tommyhilfiger': 'Tommy Hilfiger',
  'calvinklein': 'Calvin Klein',
  'lacoste': 'Lacoste',

  // Urban / street / casual
  'urbanoutfitters': 'Urban Outfitters',
  'freepeople': 'Free People',
  'anthropologie': 'Anthropologie',
  'huf': 'HUF',
  'stussy': 'Stüssy',
  'supremenewyork': 'Supreme',
  'palace': 'Palace',
  'bape': 'BAPE',
  'kith': 'Kith',
  'fearofgod': 'Fear of God',
  'essentials': 'Essentials',

  // Activewear & sportswear
  'nike': 'Nike',
  'adidas': 'Adidas',
  'puma': 'Puma',
  'lululemon': 'Lululemon',
  'underarmour': 'Under Armour',
  'reebok': 'Reebok',
  'newbalance': 'New Balance',
  'asics': 'ASICS',
  'fila': 'FILA',
  'champion': 'Champion',
  'gymshark': 'Gymshark',
  'alo': 'Alo Yoga',
  'vuori': 'Vuori',
  'outdoorvoices': 'Outdoor Voices',
  'on-running': 'On',
  'hoka': 'HOKA',
  'salomon': 'Salomon',
  'theNorthface': 'The North Face',
  'thenorthface': 'The North Face',
  'patagonia': 'Patagonia',
  'columbia': 'Columbia',
  'arcteryx': "Arc'teryx",

  // Denim
  'levis': "Levi's",
  'levi': "Levi's",
  'wrangler': 'Wrangler',
  'diesel': 'Diesel',
  'trueReligion': 'True Religion',
  'agolde': 'AGOLDE',
  'citizensofhumanity': 'Citizens of Humanity',
  'frame': 'FRAME',
  'motherDenim': 'Mother',

  // Luxury fashion houses
  'gucci': 'Gucci',
  'louisvuitton': 'Louis Vuitton',
  'chanel': 'Chanel',
  'dior': 'Dior',
  'prada': 'Prada',
  'burberry': 'Burberry',
  'balenciaga': 'Balenciaga',
  'versace': 'Versace',
  'givenchy': 'Givenchy',
  'fendi': 'Fendi',
  'valentino': 'Valentino',
  'bottegaveneta': 'Bottega Veneta',
  'saintlaurent': 'Saint Laurent',
  'ysl': 'YSL',
  'celine': 'Celine',
  'loewe': 'Loewe',
  'alexandermcqueen': 'Alexander McQueen',
  'stellamccartney': 'Stella McCartney',
  'tomford': 'Tom Ford',
  'dolcegabbana': 'Dolce & Gabbana',
  'moncler': 'Moncler',
  'amiri': 'Amiri',
  'offwhite': 'Off-White',
  'jacquemus': 'Jacquemus',
  'isabelmarant': 'Isabel Marant',
  'acnestudios': 'Acne Studios',
  'maxmara': 'Max Mara',
  'marni': 'Marni',
  'jilsander': 'Jil Sander',
  'maison': 'Maison Margiela',
  'thom': 'Thom Browne',
  'rick': 'Rick Owens',
  'commedesgarcons': 'Comme des Garçons',
  'sacai': 'Sacai',

  // Watches & accessories
  'timex': 'Timex',
  'casio': 'Casio',
  'fossil': 'Fossil',
  'danielwellington': 'Daniel Wellington',
  'swatch': 'Swatch',
  'omega': 'Omega',
  'rolex': 'Rolex',
  'tagheuer': 'TAG Heuer',
  'tissot': 'Tissot',
  'cartier': 'Cartier',
  'tiffany': 'Tiffany & Co.',
  'pandora': 'Pandora',
  'swarovski': 'Swarovski',
  'mejuri': 'Mejuri',
  'kendrascott': 'Kendra Scott',
  'davidyurman': 'David Yurman',
  'rayban': 'Ray-Ban',
  'warbyparker': 'Warby Parker',

  // Resale & consignment
  'ebay': 'eBay',
  'depop': 'Depop',
  'grailed': 'Grailed',
  'therealreal': 'The RealReal',
  'vestiaire': 'Vestiaire',
  'poshmark': 'Poshmark',
  'thredup': 'ThredUp',
  'mercari': 'Mercari',
  'stockx': 'StockX',
  'goat': 'GOAT',

  // Canadian
  'aritzia': 'Aritzia',
  'simons': 'Simons',
  'roots': 'Roots',
  'frank': 'Frank And Oak',
  'lolë': 'Lolë',

  // Beauty / cosmetics (common in fashion URLs)
  'sephora': 'Sephora',
  'ulta': 'Ulta',

  // Other popular
  'cos': 'COS',
  'arket': 'ARKET',
  'everlane': 'Everlane',
  'reformation': 'Reformation',
  'allsaints': 'AllSaints',
  'tedBaker': 'Ted Baker',
  'tedbaker': 'Ted Baker',
  'reiss': 'Reiss',
  'superdry': 'Superdry',
  'scotch': 'Scotch & Soda',
  'hugoboss': 'Hugo Boss',
  'boss': 'BOSS',
  'armani': 'Armani',
  'michaelkors': 'Michael Kors',
  'coach': 'Coach',
  'katespade': 'Kate Spade',
  'toryburch': 'Tory Burch',
  'marcjacobs': 'Marc Jacobs',
  'kenzo': 'Kenzo',
  'carhartt': 'Carhartt',
  'dickies': 'Dickies',
  'vans': 'Vans',
  'converse': 'Converse',
  'birkenstock': 'Birkenstock',
  'drmartens': 'Dr. Martens',
  'crocs': 'Crocs',
  'ugg': 'UGG',
  'stuartweitzman': 'Stuart Weitzman',
  'jimmychoo': 'Jimmy Choo',
  'manoloblahnik': 'Manolo Blahnik',
  'louboutin': 'Louboutin',
  'skims': 'SKIMS',
  'savagexfenty': 'Savage X Fenty',
  'victoriassecret': "Victoria's Secret",
  'spanx': 'Spanx',
};

export function detectRetailer(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    // Check known retailers first
    for (const [key, label] of Object.entries(RETAILERS)) {
      if (hostname.includes(key)) return label;
    }
    // Fallback: extract a clean brand name from the domain
    const parts = hostname.replace(/^www\d?\./, '').split('.');
    const domain = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    if (domain && domain.length > 2) {
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    return 'Shop';
  } catch {
    return null;
  }
}

// Multi-brand retailers where brand info lives in the URL path
const MULTI_BRAND_RETAILERS = ['farfetch', 'nordstrom', 'ssense', 'mrporter', 'net-a-porter', 'mytheresa', 'matchesfashion', 'asos', 'revolve', 'shopbop', 'saksfifthavenue', 'saks', 'neimanmarcus', 'bloomingdales', 'macys'];

/**
 * Extract a brand label from a URL. For multi-brand retailers (Farfetch, Nordstrom, etc.),
 * attempts to parse the brand/designer from the URL path. Falls back to the retailer name.
 */
export function detectBrandFromUrl(url: string): { brand: string; retailer: string | null; url: string } {
  const retailer = detectRetailer(url);
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = decodeURIComponent(parsed.pathname.toLowerCase());

    // Check if it's a multi-brand retailer
    const isMultiBrand = MULTI_BRAND_RETAILERS.some(r => hostname.includes(r));
    if (!isMultiBrand) return { brand: retailer || 'Shop', retailer, url };

    // Farfetch: /shopping/.../designer-{brand}/... or /{brand}-...
    const farfetchDesigner = path.match(/\/designer-([a-z0-9-]+)\//);
    if (farfetchDesigner) {
      const raw = farfetchDesigner[1].replace(/-/g, ' ');
      return { brand: titleCase(raw), retailer, url };
    }

    // Farfetch pre-owned: /shopping/.../christian-dior-pre-owned/...
    const farfetchPreOwned = path.match(/\/([a-z][\w-]+)-pre-owned/);
    if (farfetchPreOwned) {
      const raw = farfetchPreOwned[1].replace(/-/g, ' ');
      return { brand: titleCase(raw), retailer, url };
    }

    // Farfetch product slug: /shopping/men/{brand}-{product}-item-{id}.aspx
    // Also handles /ca/shopping/... or /us/shopping/...
    if (hostname.includes('farfetch')) {
      const itemSlug = path.match(/\/([a-z][a-z0-9-]+-item-\d+)/);
      if (itemSlug) {
        const slug = itemSlug[1];
        // Try to match known brands from the slug
        for (const [key, label] of Object.entries(RETAILERS)) {
          if (slug.startsWith(key + '-') || slug.includes('-' + key + '-')) {
            return { brand: label, retailer, url };
          }
        }
        // Fall back to first word(s) before common product terms
        const productTerms = ['logo', 'print', 'hoodie', 'jacket', 'shirt', 'pants', 'dress', 'top', 'coat', 'sneakers', 'boots', 'bag', 'belt', 'scarf', 'sweater', 'cardigan', 'blazer', 'shorts', 'skirt', 'polo', 'tee', 'knit', 'wool', 'cotton', 'leather', 'denim', 'slim', 'wide', 'long', 'short', 'mini', 'midi', 'maxi', 'zip', 'button', 'crew', 'v-neck', 'round', 'item'];
        const parts = slug.split('-');
        let brandParts: string[] = [];
        for (const part of parts) {
          if (productTerms.includes(part)) break;
          brandParts.push(part);
        }
        if (brandParts.length > 0 && brandParts.length <= 3) {
          return { brand: titleCase(brandParts.join(' ')), retailer, url };
        }
      }
    }

    // Nordstrom: filterByBrand=... in query string
    const brandParam = parsed.searchParams.get('filterByBrand');
    if (brandParam) {
      return { brand: titleCase(brandParam.replace(/-/g, ' ')), retailer, url };
    }

    // Nordstrom product page: /s/{product-name}/{id} — try to find known brands in the slug
    const nordstromProduct = path.match(/\/s\/([a-z0-9-]+)\//);
    if (nordstromProduct) {
      const slug = nordstromProduct[1];
      for (const [key, label] of Object.entries(RETAILERS)) {
        if (slug.includes(key)) return { brand: label, retailer, url };
      }
    }

    // SSENSE: /en-ca/men/product/{brand}/...
    const ssenseMatch = path.match(/\/product\/([a-z0-9-]+)\//);
    if (ssenseMatch) {
      return { brand: titleCase(ssenseMatch[1].replace(/-/g, ' ')), retailer, url };
    }

    return { brand: retailer || 'Shop', retailer, url };
  } catch {
    return { brand: retailer || 'Shop', retailer, url };
  }
}

function titleCase(str: string): string {
  return str
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Map of URL slug keywords to canonical wardrobe categories */
const CATEGORY_SLUG_MAP: Record<string, string> = {
  hoodie: 'hoodies', hoodies: 'hoodies', sweatshirt: 'hoodies',
  jacket: 'jackets', jackets: 'jackets',
  coat: 'coats', coats: 'coats', parka: 'coats', trench: 'coats',
  blazer: 'blazers', blazers: 'blazers',
  vest: 'vests', vests: 'vests', gilet: 'vests',
  shirt: 'shirts', shirts: 'shirts', blouse: 'shirts',
  polo: 'polos', polos: 'polos',
  sweater: 'sweaters', sweaters: 'sweaters', cardigan: 'sweaters', pullover: 'sweaters', jumper: 'sweaters',
  tee: 't-shirts', tshirt: 't-shirts',
  jeans: 'jeans', jean: 'jeans',
  pants: 'pants', trouser: 'pants', trousers: 'pants', chino: 'pants', chinos: 'pants',
  shorts: 'shorts', short: 'shorts',
  skirt: 'skirts', skirts: 'skirts',
  legging: 'leggings', leggings: 'leggings',
  dress: 'dresses', dresses: 'dresses', gown: 'dresses',
  jumpsuit: 'jumpsuits', jumpsuits: 'jumpsuits', romper: 'jumpsuits',
  sneaker: 'sneakers', sneakers: 'sneakers', trainer: 'sneakers', trainers: 'sneakers',
  boot: 'boots', boots: 'boots',
  sandal: 'sandals', sandals: 'sandals',
  loafer: 'loafers', loafers: 'loafers', moccasin: 'loafers',
  heel: 'heels', heels: 'heels', pump: 'heels', pumps: 'heels',
  bag: 'bags', bags: 'bags', tote: 'bags', backpack: 'bags', clutch: 'bags', handbag: 'bags',
  hat: 'hats', hats: 'hats', cap: 'hats', beanie: 'hats',
  sunglasses: 'sunglasses',
  belt: 'belts', belts: 'belts',
  scarf: 'scarves', scarves: 'scarves',
  swimsuit: 'swimwear', bikini: 'swimwear', swimwear: 'swimwear', trunks: 'swimwear',
};

/**
 * Attempt to detect clothing category from a product URL slug.
 * Returns a canonical category string or null if undetectable.
 */
export function detectCategoryFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname.toLowerCase());
    const slugParts = path.replace(/\.[^.]+$/, '').split(/[\/-]/);
    for (const part of slugParts) {
      const match = CATEGORY_SLUG_MAP[part];
      if (match) return match;
    }
    return null;
  } catch {
    return null;
  }
}
