import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { successResponse, errorResponse, getCorsHeaders } from "../_shared/validation.ts";

interface RetailerConfig {
  brand_name: string;
  url: string;
  categories: string[];
  gender?: string;     // 'men' | 'women' | 'unisex' (default: 'unisex')
  size_type?: string;  // 'regular' | 'tall' | 'petite' | 'plus' (default: 'regular')
}

const RETAILERS: Record<string, RetailerConfig> = {
  // ── Fast Fashion & Mass Market ──
  zara: {
    brand_name: "Zara",
    url: "https://www.zara.com/us/en/help/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear", "suits", "swimwear", "underwear", "knitwear"],
  },
  hm: {
    brand_name: "H&M",
    url: "https://www2.hm.com/en_us/women/editorial/size-guide.html",
    categories: ["tops", "bottoms", "dresses", "outerwear", "activewear", "swimwear", "underwear", "sleepwear", "suits"],
  },
  uniqlo: {
    brand_name: "Uniqlo",
    url: "https://www.uniqlo.com/us/en/size-chart",
    categories: ["tops", "bottoms", "outerwear", "innerwear", "loungewear", "knitwear"],
  },
  shein: {
    brand_name: "SHEIN",
    url: "https://us.shein.com/Size-Guide-a-281.html",
    categories: ["tops", "bottoms", "dresses", "outerwear", "activewear", "swimwear", "underwear", "sleepwear", "jumpsuits"],
  },
  "forever-21": {
    brand_name: "Forever 21",
    url: "https://www.forever21.com/us/size-guide",
    categories: ["tops", "bottoms", "dresses", "swimwear", "activewear"],
  },
  boohoo: {
    brand_name: "Boohoo",
    url: "https://us.boohoo.com/page/size-guide.html",
    categories: ["tops", "bottoms", "dresses", "swimwear", "jumpsuits"],
  },
  prettylittlething: {
    brand_name: "PrettyLittleThing",
    url: "https://www.prettylittlething.us/size-guide",
    categories: ["tops", "bottoms", "dresses", "swimwear", "jumpsuits", "underwear"],
  },
  "fashion-nova": {
    brand_name: "Fashion Nova",
    url: "https://www.fashionnova.com/pages/size-chart",
    categories: ["tops", "bottoms", "dresses", "swimwear", "jumpsuits", "activewear"],
  },
  mango: {
    brand_name: "Mango",
    url: "https://shop.mango.com/us/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear", "suits", "knitwear", "swimwear"],
  },
  cos: {
    brand_name: "COS",
    url: "https://www.cos.com/en_usd/customer-service/size-guide.html",
    categories: ["tops", "bottoms", "dresses", "knitwear", "outerwear"],
  },

  // ── Mid-Range / Mall Brands ──
  gap: {
    brand_name: "Gap",
    url: "https://www.gap.com/browse/sizeChart.do",
    categories: ["tops", "bottoms", "dresses", "outerwear", "activewear", "sleepwear", "swimwear"],
  },
  "old-navy": {
    brand_name: "Old Navy",
    url: "https://oldnavy.gap.com/browse/sizeChart.do",
    categories: ["tops", "bottoms", "dresses", "activewear", "swimwear", "sleepwear"],
  },
  "banana-republic": {
    brand_name: "Banana Republic",
    url: "https://bananarepublic.gap.com/browse/sizeChart.do",
    categories: ["tops", "bottoms", "dresses", "suits", "outerwear", "knitwear"],
  },
  abercrombie: {
    brand_name: "Abercrombie & Fitch",
    url: "https://www.abercrombie.com/shop/us/size-charts",
    categories: ["tops", "bottoms", "dresses", "outerwear", "swimwear", "activewear"],
  },
  hollister: {
    brand_name: "Hollister",
    url: "https://www.hollisterco.com/shop/us/size-charts",
    categories: ["tops", "bottoms", "dresses", "swimwear", "activewear"],
  },
  "american-eagle": {
    brand_name: "American Eagle",
    url: "https://www.ae.com/us/en/content/help/men-size-chart",
    categories: ["tops", "bottoms", "swimwear", "underwear", "activewear"],
  },
  jcrew: {
    brand_name: "J.Crew",
    url: "https://www.jcrew.com/r/size-charts",
    categories: ["tops", "bottoms", "dresses", "suits", "outerwear", "swimwear", "knitwear"],
  },
  "calvin-klein": {
    brand_name: "Calvin Klein",
    url: "https://www.calvinklein.us/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear", "underwear", "swimwear", "suits", "sleepwear"],
  },
  "ralph-lauren": {
    brand_name: "Ralph Lauren",
    url: "https://www.ralphlauren.com/size-charts",
    categories: ["tops", "bottoms", "outerwear", "suits", "dresses", "knitwear", "swimwear"],
  },
  "hugo-boss": {
    brand_name: "Hugo Boss",
    url: "https://www.hugoboss.com/us/size-guide/",
    categories: ["tops", "bottoms", "outerwear", "suits", "knitwear", "underwear"],
  },
  everlane: {
    brand_name: "Everlane",
    url: "https://www.everlane.com/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear", "knitwear", "jumpsuits"],
  },
  anthropologie: {
    brand_name: "Anthropologie",
    url: "https://www.anthropologie.com/help/size-charts",
    categories: ["tops", "dresses", "bottoms", "swimwear", "jumpsuits", "sleepwear"],
  },
  "free-people": {
    brand_name: "Free People",
    url: "https://www.freepeople.com/size-chart/",
    categories: ["tops", "dresses", "bottoms", "activewear", "swimwear", "jumpsuits"],
  },
  reformation: {
    brand_name: "Reformation",
    url: "https://www.thereformation.com/pages/size-chart",
    categories: ["tops", "bottoms", "dresses", "swimwear", "jumpsuits", "knitwear"],
  },
  aritzia: {
    brand_name: "Aritzia",
    url: "https://www.aritzia.com/en/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear", "activewear", "knitwear", "jumpsuits"],
  },
  nordstrom: {
    brand_name: "Nordstrom",
    url: "https://www.nordstrom.com/browse/content/size-charts",
    categories: ["tops", "bottoms", "dresses", "outerwear", "swimwear", "suits", "activewear", "underwear"],
  },
  jcpenney: {
    brand_name: "JCPenney",
    url: "https://www.jcpenney.com/m/size-charts",
    categories: ["tops", "bottoms", "dresses", "suits", "swimwear", "sleepwear"],
  },

  // ── Denim ──
  levis: {
    brand_name: "Levi's",
    url: "https://www.levi.com/US/en_US/size-charts/",
    categories: ["tops", "bottoms", "outerwear", "dresses", "jumpsuits"],
  },

  // ── Sportswear / Activewear ──
  nike: {
    brand_name: "Nike",
    url: "https://www.nike.com/size-fit/womens-apparel",
    categories: ["tops", "bottoms", "activewear", "footwear", "outerwear", "swimwear", "sports-bras", "hoodies"],
  },
  adidas: {
    brand_name: "Adidas",
    url: "https://www.adidas.com/us/help/size_charts",
    categories: ["tops", "bottoms", "activewear", "footwear", "outerwear", "swimwear", "sports-bras", "hoodies"],
  },
  puma: {
    brand_name: "Puma",
    url: "https://us.puma.com/us/en/size-guide",
    categories: ["tops", "activewear", "footwear", "outerwear", "bottoms", "swimwear", "hoodies"],
  },
  "new-balance": {
    brand_name: "New Balance",
    url: "https://www.newbalance.com/size-chart",
    categories: ["tops", "bottoms", "activewear", "footwear", "outerwear", "sports-bras", "hoodies"],
  },
  champion: {
    brand_name: "Champion",
    url: "https://www.champion.com/size-chart",
    categories: ["tops", "bottoms", "activewear", "outerwear", "hoodies", "underwear"],
  },
  lululemon: {
    brand_name: "Lululemon",
    url: "https://shop.lululemon.com/help/size-guide",
    categories: ["tops", "bottoms", "activewear", "sports-bras", "outerwear", "swimwear", "dresses"],
  },
  "the-north-face": {
    brand_name: "The North Face",
    url: "https://www.thenorthface.com/help/size-chart.html",
    categories: ["tops", "outerwear", "activewear", "bottoms", "footwear", "fleece"],
  },
  patagonia: {
    brand_name: "Patagonia",
    url: "https://www.patagonia.com/size-fit-guide.html",
    categories: ["tops", "outerwear", "bottoms", "activewear", "swimwear", "fleece"],
  },
  arcteryx: {
    brand_name: "Arc'teryx",
    url: "https://arcteryx.com/us/en/help/size-chart",
    categories: ["tops", "bottoms", "outerwear", "activewear", "footwear", "fleece"],
  },
  "under-armour": {
    brand_name: "Under Armour",
    url: "https://www.underarmour.com/en-us/size-charts",
    categories: ["tops", "bottoms", "activewear", "footwear", "sports-bras", "hoodies", "outerwear"],
  },

  // ── Streetwear ──
  stussy: {
    brand_name: "Stüssy",
    url: "https://www.stussy.com/pages/size-guide",
    categories: ["tops", "bottoms", "outerwear", "hoodies", "knitwear"],
  },
  supreme: {
    brand_name: "Supreme",
    url: "https://www.supremenewyork.com/shop/sizing",
    categories: ["tops", "bottoms", "outerwear", "hoodies", "knitwear"],
  },
  kith: {
    brand_name: "Kith",
    url: "https://kith.com/pages/size-guide",
    categories: ["tops", "bottoms", "outerwear", "hoodies", "knitwear", "footwear"],
  },
  "carhartt-wip": {
    brand_name: "Carhartt WIP",
    url: "https://www.carhartt-wip.com/en/size-guide",
    categories: ["tops", "bottoms", "outerwear", "hoodies"],
  },
  "fear-of-god": {
    brand_name: "Fear of God",
    url: "https://fearofgod.com/pages/size-guide",
    categories: ["tops", "bottoms", "outerwear", "hoodies", "knitwear"],
  },
  "off-white": {
    brand_name: "Off-White",
    url: "https://www.off---white.com/en-us/size-guide",
    categories: ["tops", "outerwear", "hoodies", "bottoms", "knitwear"],
  },

  // ── Luxury / Designer ──
  gucci: {
    brand_name: "Gucci",
    url: "https://www.gucci.com/us/en/st/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear", "suits", "knitwear", "swimwear", "footwear"],
  },
  "louis-vuitton": {
    brand_name: "Louis Vuitton",
    url: "https://us.louisvuitton.com/eng-us/stories/size-guide",
    categories: ["tops", "bottoms", "outerwear", "knitwear", "suits", "footwear"],
  },
  prada: {
    brand_name: "Prada",
    url: "https://www.prada.com/us/en/customer-service/size-guide.html",
    categories: ["tops", "outerwear", "bottoms", "knitwear", "footwear", "dresses"],
  },
  burberry: {
    brand_name: "Burberry",
    url: "https://us.burberry.com/c/size-guide/",
    categories: ["tops", "outerwear", "bottoms", "dresses", "knitwear", "suits"],
  },
  dior: {
    brand_name: "Dior",
    url: "https://www.dior.com/en_us/fashion/size-guide",
    categories: ["tops", "dresses", "outerwear", "suits", "knitwear", "footwear"],
  },
  "saint-laurent": {
    brand_name: "Saint Laurent",
    url: "https://www.ysl.com/en-us/size-guide",
    categories: ["tops", "outerwear", "bottoms", "dresses", "footwear", "knitwear"],
  },
  balenciaga: {
    brand_name: "Balenciaga",
    url: "https://www.balenciaga.com/en-us/size-guide",
    categories: ["tops", "bottoms", "outerwear", "hoodies", "knitwear", "footwear", "dresses"],
  },
  fendi: {
    brand_name: "Fendi",
    url: "https://www.fendi.com/us-en/size-guide",
    categories: ["tops", "outerwear", "bottoms", "knitwear", "dresses", "footwear"],
  },
  givenchy: {
    brand_name: "Givenchy",
    url: "https://www.givenchy.com/us/en-US/size-guide",
    categories: ["tops", "outerwear", "bottoms", "knitwear", "dresses", "footwear"],
  },
  moncler: {
    brand_name: "Moncler",
    url: "https://www.moncler.com/en-us/size-guide.html",
    categories: ["tops", "outerwear", "bottoms", "knitwear", "footwear"],
  },
  "acne-studios": {
    brand_name: "Acne Studios",
    url: "https://www.acnestudios.com/us/en/size-guide.html",
    categories: ["tops", "bottoms", "outerwear", "knitwear", "dresses", "footwear"],
  },
  "ami-paris": {
    brand_name: "AMI Paris",
    url: "https://www.amiparis.com/us/size-guide",
    categories: ["tops", "outerwear", "bottoms", "knitwear"],
  },
  jacquemus: {
    brand_name: "Jacquemus",
    url: "https://www.jacquemus.com/size-guide",
    categories: ["tops", "dresses", "bottoms", "knitwear", "swimwear"],
  },
  versace: {
    brand_name: "Versace",
    url: "https://www.versace.com/us/en/size-guide/",
    categories: ["tops", "bottoms", "outerwear", "dresses", "swimwear", "knitwear", "footwear"],
  },
  valentino: {
    brand_name: "Valentino",
    url: "https://www.valentino.com/en-us/size-guide",
    categories: ["tops", "dresses", "outerwear", "knitwear", "footwear"],
  },
  "stone-island": {
    brand_name: "Stone Island",
    url: "https://www.stoneisland.com/en-us/size-guide",
    categories: ["tops", "bottoms", "outerwear", "knitwear", "hoodies", "fleece"],
  },

  // ── Multi-Brand Retailers ──
  asos: {
    brand_name: "ASOS",
    url: "https://www.asos.com/us/discover/size-charts/",
    categories: ["tops", "bottoms", "dresses", "outerwear", "suits", "swimwear", "underwear", "activewear", "jumpsuits"],
  },
  revolve: {
    brand_name: "Revolve",
    url: "https://www.revolve.com/content/sizechart",
    categories: ["tops", "bottoms", "dresses", "swimwear", "jumpsuits", "activewear"],
  },
  simons: {
    brand_name: "Simons",
    url: "https://www.simons.ca/en/size-charts",
    categories: ["tops", "bottoms", "outerwear", "suits", "swimwear", "underwear"],
  },

  // ── Additional brands ──
  topshop: {
    brand_name: "Topshop",
    url: "https://www.asos.com/us/discover/topshop-size-guide/",
    categories: ["tops", "bottoms", "dresses", "swimwear", "jumpsuits"],
  },
  tommy: {
    brand_name: "Tommy Hilfiger",
    url: "https://usa.tommy.com/en/size-guide",
    categories: ["tops", "bottoms", "outerwear", "suits", "underwear", "swimwear", "dresses", "activewear"],
  },
  vans: {
    brand_name: "Vans",
    url: "https://www.vans.com/size-chart",
    categories: ["tops", "footwear", "hoodies", "bottoms"],
  },
  converse: {
    brand_name: "Converse",
    url: "https://www.converse.com/size-chart",
    categories: ["footwear", "tops", "hoodies"],
  },
  reebok: {
    brand_name: "Reebok",
    url: "https://www.reebok.com/us/size_charts",
    categories: ["tops", "activewear", "footwear", "bottoms", "sports-bras", "hoodies"],
  },
  "urban-outfitters": {
    brand_name: "Urban Outfitters",
    url: "https://www.urbanoutfitters.com/help/size-charts",
    categories: ["tops", "bottoms", "dresses", "swimwear", "jumpsuits", "underwear"],
  },
  zara_man: {
    brand_name: "Zara Man",
    url: "https://www.zara.com/us/en/help/size-guide",
    categories: ["tops", "bottoms", "outerwear", "suits", "knitwear", "swimwear"],
  },

  // ── New: Previously uncovered brands ──
  loewe: {
    brand_name: "Loewe",
    url: "https://www.loewe.com/eur/en/size-guide",
    categories: ["tops", "bottoms", "outerwear", "knitwear", "dresses", "footwear"],
  },
  ugg: {
    brand_name: "UGG",
    url: "https://www.ugg.com/size-fit-guide.html",
    categories: ["footwear", "tops", "outerwear", "loungewear"],
  },
  gymshark: {
    brand_name: "Gymshark",
    url: "https://www.gymshark.com/pages/size-guide",
    categories: ["tops", "bottoms", "activewear", "sports-bras", "hoodies", "shorts"],
  },

  // ── Extended Sizing: Tall ──
  "asos-tall": {
    brand_name: "ASOS",
    url: "https://www.asos.com/us/discover/size-charts/tall/",
    categories: ["tops", "bottoms", "dresses", "jeans", "outerwear"],
    size_type: "tall",
  },
  "gap-tall": {
    brand_name: "Gap",
    url: "https://www.gap.com/browse/sizeChart.do?sizeChartId=tall",
    categories: ["tops", "bottoms", "dresses", "jeans", "outerwear"],
    size_type: "tall",
  },
  "old-navy-tall": {
    brand_name: "Old Navy",
    url: "https://oldnavy.gap.com/browse/sizeChart.do?sizeChartId=tall",
    categories: ["tops", "bottoms", "dresses", "jeans"],
    size_type: "tall",
  },
  "banana-republic-tall": {
    brand_name: "Banana Republic",
    url: "https://bananarepublic.gap.com/browse/sizeChart.do?sizeChartId=tall",
    categories: ["tops", "bottoms", "dresses", "blazers"],
    size_type: "tall",
  },
  "abercrombie-tall": {
    brand_name: "Abercrombie & Fitch",
    url: "https://www.abercrombie.com/shop/us/size-charts?sizeType=tall",
    categories: ["tops", "bottoms", "jeans", "dresses"],
    size_type: "tall",
  },
  "american-eagle-tall": {
    brand_name: "American Eagle",
    url: "https://www.ae.com/us/en/content/help/men-size-chart",
    categories: ["tops", "bottoms", "jeans"],
    size_type: "tall",
  },
  "jcrew-tall": {
    brand_name: "J.Crew",
    url: "https://www.jcrew.com/r/size-charts?fit=tall",
    categories: ["tops", "bottoms", "dresses", "blazers"],
    size_type: "tall",
  },
  "nordstrom-tall": {
    brand_name: "Nordstrom",
    url: "https://www.nordstrom.com/browse/content/size-charts?type=tall",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
    size_type: "tall",
  },

  // ── Extended Sizing: Petite ──
  "asos-petite": {
    brand_name: "ASOS",
    url: "https://www.asos.com/us/discover/size-charts/petite/",
    categories: ["tops", "bottoms", "dresses", "jeans", "outerwear"],
    size_type: "petite",
    gender: "women",
  },
  "gap-petite": {
    brand_name: "Gap",
    url: "https://www.gap.com/browse/sizeChart.do?sizeChartId=petite",
    categories: ["tops", "bottoms", "dresses", "jeans"],
    size_type: "petite",
    gender: "women",
  },
  "old-navy-petite": {
    brand_name: "Old Navy",
    url: "https://oldnavy.gap.com/browse/sizeChart.do?sizeChartId=petite",
    categories: ["tops", "bottoms", "dresses", "jeans"],
    size_type: "petite",
    gender: "women",
  },
  "banana-republic-petite": {
    brand_name: "Banana Republic",
    url: "https://bananarepublic.gap.com/browse/sizeChart.do?sizeChartId=petite",
    categories: ["tops", "bottoms", "dresses", "blazers"],
    size_type: "petite",
    gender: "women",
  },
  "abercrombie-petite": {
    brand_name: "Abercrombie & Fitch",
    url: "https://www.abercrombie.com/shop/us/size-charts?sizeType=petite",
    categories: ["tops", "bottoms", "jeans", "dresses"],
    size_type: "petite",
    gender: "women",
  },
  "jcrew-petite": {
    brand_name: "J.Crew",
    url: "https://www.jcrew.com/r/size-charts?fit=petite",
    categories: ["tops", "bottoms", "dresses", "blazers"],
    size_type: "petite",
    gender: "women",
  },
  "nordstrom-petite": {
    brand_name: "Nordstrom",
    url: "https://www.nordstrom.com/browse/content/size-charts?type=petite",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
    size_type: "petite",
    gender: "women",
  },
  "anthropologie-petite": {
    brand_name: "Anthropologie",
    url: "https://www.anthropologie.com/help/size-charts?fit=petite",
    categories: ["tops", "dresses", "bottoms"],
    size_type: "petite",
    gender: "women",
  },
  "free-people-petite": {
    brand_name: "Free People",
    url: "https://www.freepeople.com/size-chart/?fit=petite",
    categories: ["tops", "dresses", "bottoms"],
    size_type: "petite",
    gender: "women",
  },
  "reformation-petite": {
    brand_name: "Reformation",
    url: "https://www.thereformation.com/pages/size-chart?fit=petite",
    categories: ["tops", "bottoms", "dresses"],
    size_type: "petite",
    gender: "women",
  },

  // ── Extended Sizing: Plus ──
  "asos-plus": {
    brand_name: "ASOS",
    url: "https://www.asos.com/us/discover/size-charts/plus-size/",
    categories: ["tops", "bottoms", "dresses", "jeans", "outerwear"],
    size_type: "plus",
  },
  "shein-plus": {
    brand_name: "SHEIN",
    url: "https://us.shein.com/Size-Guide-a-281.html",
    categories: ["tops", "bottoms", "dresses", "jeans", "outerwear"],
    size_type: "plus",
  },
  "fashion-nova-plus": {
    brand_name: "Fashion Nova",
    url: "https://www.fashionnova.com/pages/size-chart",
    categories: ["tops", "bottoms", "dresses", "jeans"],
    size_type: "plus",
    gender: "women",
  },
  "old-navy-plus": {
    brand_name: "Old Navy",
    url: "https://oldnavy.gap.com/browse/sizeChart.do?sizeChartId=plus",
    categories: ["tops", "bottoms", "dresses", "jeans"],
    size_type: "plus",
  },
  "gap-plus": {
    brand_name: "Gap",
    url: "https://www.gap.com/browse/sizeChart.do?sizeChartId=plus",
    categories: ["tops", "bottoms", "dresses"],
    size_type: "plus",
  },
  "nordstrom-plus": {
    brand_name: "Nordstrom",
    url: "https://www.nordstrom.com/browse/content/size-charts?type=plus",
    categories: ["tops", "bottoms", "dresses", "outerwear"],
    size_type: "plus",
  },

  // ── Niche Extended-Sizing Specialists ──

  // Plus-size specialists
  torrid: {
    brand_name: "Torrid",
    url: "https://www.torrid.com/size-guide.html",
    categories: ["tops", "bottoms", "dresses", "outerwear", "swimwear", "activewear", "underwear", "sleepwear", "jumpsuits"],
    size_type: "plus",
    gender: "women",
  },
  eloquii: {
    brand_name: "Eloquii",
    url: "https://www.eloquii.com/size-chart",
    categories: ["tops", "bottoms", "dresses", "outerwear", "swimwear", "jumpsuits"],
    size_type: "plus",
    gender: "women",
  },
  "universal-standard": {
    brand_name: "Universal Standard",
    url: "https://www.universalstandard.com/pages/size-guides",
    categories: ["tops", "bottoms", "dresses", "outerwear", "activewear", "knitwear", "jumpsuits"],
    size_type: "plus",
    gender: "women",
  },
  "lane-bryant": {
    brand_name: "Lane Bryant",
    url: "https://www.lanebryant.com/size-chart",
    categories: ["tops", "bottoms", "dresses", "outerwear", "swimwear", "underwear", "activewear", "sleepwear"],
    size_type: "plus",
    gender: "women",
  },
  "city-chic": {
    brand_name: "City Chic",
    url: "https://www.citychiconline.com/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear", "swimwear"],
    size_type: "plus",
    gender: "women",
  },
  "good-american": {
    brand_name: "Good American",
    url: "https://www.goodamerican.com/pages/size-chart",
    categories: ["tops", "bottoms", "dresses", "swimwear", "activewear", "jeans"],
    size_type: "plus",
    gender: "women",
  },
  "girlfriend-collective": {
    brand_name: "Girlfriend Collective",
    url: "https://girlfriend.com/pages/size-guide",
    categories: ["tops", "bottoms", "activewear", "sports-bras", "dresses", "swimwear"],
    size_type: "plus",
    gender: "women",
  },
  "savage-x-fenty": {
    brand_name: "Savage X Fenty",
    url: "https://www.savagex.com/size-guide",
    categories: ["underwear", "sleepwear", "swimwear", "activewear", "tops"],
    size_type: "plus",
    gender: "women",
  },
  skims: {
    brand_name: "SKIMS",
    url: "https://skims.com/pages/size-guide",
    categories: ["underwear", "loungewear", "tops", "bottoms", "dresses", "swimwear", "activewear"],
    size_type: "plus",
    gender: "women",
  },
  "yours-clothing": {
    brand_name: "Yours Clothing",
    url: "https://www.yoursclothing.com/pages/size-guide",
    categories: ["tops", "bottoms", "dresses", "outerwear", "swimwear", "activewear"],
    size_type: "plus",
    gender: "women",
  },

  // Tall specialists
  tallmoi: {
    brand_name: "TallMoi",
    url: "https://www.tallmoi.com/en-de/pages/size-guide-1",
    categories: ["tops", "bottoms", "dresses", "jeans", "outerwear"],
    size_type: "tall",
    gender: "women",
  },
  "american-tall": {
    brand_name: "American Tall",
    url: "https://americantall.com/pages/size-chart",
    categories: ["tops", "bottoms", "jeans", "outerwear", "hoodies", "activewear"],
    size_type: "tall",
  },
  "alloy-apparel": {
    brand_name: "Alloy Apparel",
    url: "https://www.alloyapparel.com/pages/size-chart",
    categories: ["tops", "bottoms", "jeans", "dresses"],
    size_type: "tall",
    gender: "women",
  },
  "long-tall-sally": {
    brand_name: "Long Tall Sally",
    url: "https://www.longtallsally.com/size-guide",
    categories: ["tops", "bottoms", "dresses", "jeans", "outerwear", "swimwear", "activewear"],
    size_type: "tall",
    gender: "women",
  },

  // Petite specialists
  "petite-studio": {
    brand_name: "Petite Studio",
    url: "https://www.petitestudionyc.com/pages/size-chart",
    categories: ["tops", "bottoms", "dresses", "outerwear", "knitwear", "jumpsuits"],
    size_type: "petite",
    gender: "women",
  },
  "loft-petite": {
    brand_name: "LOFT",
    url: "https://www.loft.com/size-chart?fit=petite",
    categories: ["tops", "bottoms", "dresses", "outerwear", "jumpsuits"],
    size_type: "petite",
    gender: "women",
  },
  "ann-taylor-petite": {
    brand_name: "Ann Taylor",
    url: "https://www.anntaylor.com/size-chart?fit=petite",
    categories: ["tops", "bottoms", "dresses", "outerwear", "suits"],
    size_type: "petite",
    gender: "women",
  },
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

const SYSTEM_PROMPT = `You are a fashion size chart data extraction specialist. Extract size chart measurement data from HTML into a structured JSON array. Rules: Extract ONLY data present in the HTML — never invent or estimate measurements. Convert all measurements to centimetres (multiply inches by 2.54). Use null for any measurement not found. Return ONLY a valid JSON array with no markdown, no code fences, no prose.`;

function buildUserPrompt(category: string, brandName: string, html: string, sizeType?: string): string {
  const sizeTypeHint = sizeType && sizeType !== 'regular'
    ? ` Look specifically for the ${sizeType.toUpperCase()} size chart (not the regular/standard chart). ${sizeType === 'tall' ? 'Tall sizing typically has longer inseams and torso lengths.' : sizeType === 'petite' ? 'Petite sizing typically has shorter inseams and proportions for 5\'4" and under.' : 'Plus sizing typically covers sizes 1X-4X or 14W+.'} If no ${sizeType}-specific chart is found, return [].`
    : '';
  return `Extract the ${category} size chart from this HTML for ${brandName} (US sizing).${sizeTypeHint}
Return a JSON array where each element is one size:
[{ "label": string, "chest_min": number|null, "chest_max": number|null, "waist_min": number|null, "waist_max": number|null, "hips_min": number|null, "hips_max": number|null, "inseam_min": number|null, "inseam_max": number|null, "shoulder_min": number|null, "shoulder_max": number|null, "shoe_length_min": number|null, "shoe_length_max": number|null, "unit": "cm" }]
If no size chart found for this category in the HTML, return [].
HTML: ${html.slice(0, 50000)}`;
}

function stripFences(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return cleaned.trim();
}

// Attempt to repair truncated JSON arrays by closing open brackets
function repairJson(text: string): string {
  let s = text.trim();
  // If it starts with [ but doesn't end with ], try to close it
  if (s.startsWith("[") && !s.endsWith("]")) {
    // Remove trailing incomplete object (after last })
    const lastBrace = s.lastIndexOf("}");
    if (lastBrace > 0) {
      s = s.slice(0, lastBrace + 1) + "]";
    }
  }
  return s;
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const filterSlug: string | undefined = body.brand_slug;
    const filterCategory: string | undefined = body.category;
    // Optional batch_size to limit how many items to process per run (useful for cron to stay under timeout)
    const batchSize: number = body.batch_size ?? 999;

    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const aiEndpoint = lovableKey
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";
    const aiKey = lovableKey || openRouterKey;

    if (!aiKey) {
      return errorResponse("No AI API key configured (LOVABLE_API_KEY or OPENROUTER_API_KEY)", "CONFIG_ERROR", 500, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build work list
    const workList: { slug: string; configSlug: string; config: RetailerConfig; category: string }[] = [];
    for (const [configSlug, config] of Object.entries(RETAILERS)) {
      if (filterSlug && configSlug !== filterSlug) continue;
      // Strip extended sizing suffixes to get base brand slug for DB
      const baseSlug = configSlug.replace(/-(tall|petite|plus)$/, "");
      for (const cat of config.categories) {
        if (filterCategory && cat !== filterCategory) continue;
        workList.push({ slug: baseSlug, configSlug, config, category: cat });
      }
    }

    let scraped = 0;
    let inserted = 0;
    let skipped = 0;
    const failed: string[] = [];

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY") || Deno.env.get("FIRECRAWL_API_KEY_1");

    // Fetch HTML via Firecrawl (handles JS + anti-bot), fallback to raw fetch
    async function fetchPageHtml(url: string): Promise<string | null> {
      // Try Firecrawl first
      if (firecrawlKey) {
        try {
          const fcResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url,
              formats: ["html", "rawHtml"],
              onlyMainContent: false,
              waitFor: 5000,
            }),
          });
          if (fcResp.ok) {
            const fcData = await fcResp.json();
            const html = fcData?.data?.rawHtml || fcData?.data?.html || fcData?.rawHtml || fcData?.html;
            if (html && html.length > 200) {
              console.log(`Firecrawl OK for ${url} (${html.length} chars)`);
              return html;
            }
          } else {
            const errText = await fcResp.text();
            console.warn(`Firecrawl ${fcResp.status} for ${url}: ${errText.slice(0, 100)}`);
          }
        } catch (fcErr) {
          console.warn(`Firecrawl error for ${url}:`, fcErr);
        }
      }

      // Fallback: raw fetch
      try {
        const resp = await fetch(url, { headers: FETCH_HEADERS });
        if (!resp.ok) {
          console.error(`Raw fetch failed for ${url}: ${resp.status}`);
          return null;
        }
        return await resp.text();
      } catch (fetchErr) {
        console.error(`Raw fetch error for ${url}:`, fetchErr);
        return null;
      }
    }

    // Cache fetched HTML per URL to avoid re-fetching for same brand with multiple categories
    const htmlCache: Record<string, string | null> = {};

    for (const item of workList) {
      if (scraped >= batchSize) break;
      scraped++;
      const key = `${item.slug}/${item.category}`;

      try {
        // Fetch HTML (with cache)
        let html = htmlCache[item.config.url];
        if (html === undefined) {
          htmlCache[item.config.url] = await fetchPageHtml(item.config.url);
          html = htmlCache[item.config.url];
        }

        if (!html) {
          failed.push(key);
          continue;
        }

        // Call AI
        const aiResp = await fetch(aiEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${aiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            max_tokens: 4096,
            temperature: 0.0,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: buildUserPrompt(item.category, item.config.brand_name, html, item.config.size_type) },
            ],
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error(`AI error for ${key}: ${aiResp.status} ${errText}`);
          failed.push(key);
          await delay(1500);
          continue;
        }

        const aiData = await aiResp.json();
        const rawContent = aiData.choices?.[0]?.message?.content || "";
        const cleaned = stripFences(rawContent);

        let parsed: any[];
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          // Try repairing truncated JSON
          try {
            parsed = JSON.parse(repairJson(cleaned));
            console.log(`Repaired truncated JSON for ${key}`);
          } catch {
            console.error(`JSON parse failed for ${key}:`, cleaned.slice(0, 200));
            failed.push(key);
            await delay(1500);
            continue;
          }
        }

        if (!Array.isArray(parsed) || parsed.length < 2) {
          console.log(`Skipped ${key}: only ${Array.isArray(parsed) ? parsed.length : 0} entries`);
          skipped++;
          await delay(1500);
          continue;
        }

        // Normalize size_data keys
        const normalizedData = parsed.map((entry: any) => ({
          label: entry.label,
          chest_min: entry.chest_min ?? null,
          chest_max: entry.chest_max ?? null,
          waist_min: entry.waist_min ?? null,
          waist_max: entry.waist_max ?? null,
          hip_min: entry.hips_min ?? entry.hip_min ?? null,
          hip_max: entry.hips_max ?? entry.hip_max ?? null,
          inseam_min: entry.inseam_min ?? null,
          inseam_max: entry.inseam_max ?? null,
          shoulder_min: entry.shoulder_min ?? null,
          shoulder_max: entry.shoulder_max ?? null,
          shoe_length_min: entry.shoe_length_min ?? null,
          shoe_length_max: entry.shoe_length_max ?? null,
        }));

        // Upsert
        const gender = item.config.gender || "unisex";
        const sizeType = item.config.size_type || "regular";
        const { error: upsertErr } = await supabase.from("brand_size_charts").upsert(
          {
            brand_slug: item.slug,
            brand_name: item.config.brand_name,
            category: item.category,
            region: "US",
            gender,
            size_type: sizeType,
            size_data: normalizedData,
            scraped_at: new Date().toISOString(),
            is_active: true,
            size_system: "alpha",
            confidence: 0.8,
            source_url: item.config.url,
          },
          { onConflict: "brand_slug,category,region,gender,size_type" }
        );

        if (upsertErr) {
          console.error(`Upsert error for ${key}:`, upsertErr);
          failed.push(key);
        } else {
          inserted++;
          console.log(`Inserted ${key}: ${normalizedData.length} sizes`);
        }
      } catch (err) {
        console.error(`Error processing ${key}:`, err);
        failed.push(key);
      }

      await delay(1500);
    }

    return successResponse({ scraped, inserted, skipped, failed, total_brands: Object.keys(RETAILERS).length }, 200, corsHeaders);
  } catch (e) {
    console.error("scrape-size-charts error:", e);
    return errorResponse((e as any).message || "Internal server error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
