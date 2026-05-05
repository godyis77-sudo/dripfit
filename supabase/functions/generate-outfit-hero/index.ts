import { getCorsHeaders } from "../_shared/validation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// deno-lint-ignore no-explicit-any
import { requireServiceRole } from "../_shared/require-service-role.ts";
declare const EdgeRuntime: any;

/**
 * generate-outfit-hero v3 — Campaign-referenced editorial image generation.
 * Uses waitUntil pattern to avoid edge function timeouts.
 *
 * POST body:
 *   outfit_id: string           — single outfit
 *   week_id?: string            — batch all outfits in a week
 *   regenerate?: boolean        — overwrite existing hero images
 *   heroes_only?: boolean       — only generate for is_hero=true outfits
 */

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

/* ══════════════════════════════════════════════════════════════════
   SHARED TRY-ON PROMPT LOGIC (mirrors virtual-tryon)
   - Intimate / swimwear sanitization to avoid safety refusals
   - Per-item garment classification (top-only, bottom-only, swim, set,
     intimate, footwear, accessory) so each reference image gets a
     correct shape-lock + scope rule
   ══════════════════════════════════════════════════════════════════ */

const INTIMATE_SANITIZE_MAP: Array<[RegExp, string]> = [
  [/\b(lingerie|underwear|panties|briefs|boxers)\b/gi, "base-layer"],
  [/\b(swimwear|swimsuit|bikini|one-piece|one piece|tankini)\b/gi, "activewear"],
  [/\b(sports bra|bra|bralette)\b/gi, "support top"],
  [/\b(open cup|open-cup|thong|g-string|pasties)\b/gi, "full-coverage"],
  [/\b(sheer|see-through|see through|transparent)\b/gi, "opaque"],
  [/\b(lace|lacey|lacy)\b/gi, "textured fabric"],
  [/\b(mesh)\b/gi, "textured fabric"],
  [/\b(plunge|deep-v|deep v|plunging)\b/gi, "v-neck"],
  [/\b(cleavage|bust|bosom|decolletage)\b/gi, "neckline area"],
  [/\b(skin|flesh|body|bare|naked|nude|exposed)\b/gi, "fabric"],
  [/\b(corset|bustier)\b/gi, "structured bodice"],
  [/\b(teddy|chemise|negligee|nightgown)\b/gi, "fitted dress"],
  [/\b(bodysuit)\b/gi, "fitted one-piece"],
  [/\b(crotch|groin)\b/gi, "lower panel"],
  [/\b(nipple|areola)\b/gi, "front panel"],
  [/\b(provocative|seductive|sexy|sensual)\b/gi, "stylish"],
  [/\b(intimate|intimates)\b/gi, "athletic"],
  [/\b(minimal coverage|very little coverage|revealing)\b/gi, "streamlined fit"],
  [/\b(string (bottoms?|briefs?)|high-cut|high cut)\b/gi, "athletic lower garment"],
];

function sanitizeIntimateText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of INTIMATE_SANITIZE_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/\s+/g, " ").trim();
}

interface GarmentTraits {
  isSwim: boolean;
  isUnderwear: boolean;
  isIntimate: boolean;
  isCropOrSportsBra: boolean;
  isTopOnly: boolean;
  isBottomOnly: boolean;
  isSet: boolean;
  isFootwear: boolean;
  isAccessory: boolean;
  isBag: boolean;
  isOuterwear: boolean;
}

function classifyGarment(item: { product_name?: string; category?: string | null }): GarmentTraits {
  const ctx = `${item.category || ""} ${item.product_name || ""}`.toLowerCase();
  const has = (re: RegExp) => re.test(ctx);

  const isSwim = has(/\b(swim|bikini|board ?short|trunk|rash ?guard|one[- ]?piece|tankini|monokini|swimsuit|swimwear)\b/);
  const isUnderwearRaw = has(/\b(lingerie|underwear|panties|briefs|boxers|thong|g-string)\b/);
  const isCropOrSportsBra = has(/\b(sports?\s*bra|crop\s*top|cropped\s*top|crop\s*tank|cropped\s*tank|crop\s*cami|cropped\s*cami|bralette|support\s*top|seamless\s*bra|longline\s*bra|bandeau|tube\s*top)\b/);
  const isUnderwear = isUnderwearRaw && !isCropOrSportsBra;
  const isIntimate = (has(/\b(robe|kimono|pajama|pj|sleep|chemise|negligee|nightgown|teddy|corset|bustier)\b/) || isSwim || isUnderwear) && !isCropOrSportsBra;

  const isSet = has(/\b(set|two piece|2 piece|2-piece|matching|coord|co-ord|co ord|combo|bundle)\b/);
  const isFootwear = has(/\b(shoe|sneaker|boot|slipper|sandal|loafer|heel|pump|mule|flat|espadrille|slingback|moccasin|trainer)\b/);
  const isBag = has(/\b(bag|tote|clutch|purse|backpack|handbag|pouch|crossbody|shoulder bag|satchel)\b/);
  const isAccessory = isBag || has(/\b(belt|jewelry|earring|necklace|bracelet|watch|sunglasses|hat|cap|beanie|scarf)\b/);
  const isOuterwear = has(/\b(jacket|coat|blazer|outerwear|cardigan|parka|trench|puffer|bomber|overcoat)\b/);

  const isTopLike = has(/\b(top|tank|cami|camisole|tee|t\s*shirt|shirt|blouse|halter|bandeau|tube\s*top|bralette|sports?\s*bra|support\s*top|sweater|hoodie|knit)\b/);
  const isBottomLike = has(/\b(pants|jean|jeans|trouser|trousers|short|shorts|skirt|legging|leggings|joggers|sweatpants|bottom|bottoms)\b/);
  const isOnePiece = has(/\b(dress|jumpsuit|romper|one[- ]?piece|monokini|bodysuit)\b/);

  const isTopOnly = !isSet && !isOnePiece && (isCropOrSportsBra || (isTopLike && !isBottomLike));
  const isBottomOnly = !isSet && !isOnePiece && isBottomLike && !isTopLike;

  return {
    isSwim, isUnderwear, isIntimate, isCropOrSportsBra,
    isTopOnly, isBottomOnly, isSet,
    isFootwear, isAccessory, isBag, isOuterwear,
  };
}

function shapeLockFor(name: string, traits: GarmentTraits): string | null {
  if (traits.isSwim && traits.isTopOnly) {
    return `"${name}" — SHORT cropped bandeau/triangle swim top ending at the upper ribcage. NOT a tank top, NOT a one-piece, NOT a bodysuit. Do NOT extend the fabric downward.`;
  }
  if (traits.isCropOrSportsBra) {
    return `"${name}" — SHORT crop top / sports bra ending above the waist. Do NOT render as a full-length shirt or tank top.`;
  }
  if (traits.isSwim && !traits.isTopOnly && !traits.isSet) {
    return `"${name}" — render as ONE swimsuit only. Never stack a bikini under a one-piece. Never cover with pants/jeans.`;
  }
  if (traits.isSet) {
    return `"${name}" — MATCHING SET (top AND bottom). Both pieces must appear; do not show only one half.`;
  }
  if (traits.isTopOnly) {
    return `"${name}" — TOP-only garment; do not extend it into a one-piece or substitute the bottoms.`;
  }
  if (traits.isBottomOnly) {
    return `"${name}" — BOTTOM-only garment; render only as a lower-body piece.`;
  }
  if (traits.isFootwear) {
    return `"${name}" — render as the EXACT footwear shown in its reference image. Match color, shape, sole, branding precisely.`;
  }
  if (traits.isBag) {
    return `"${name}" — exactly ONE bag carried naturally. Do not duplicate, do not add a second bag.`;
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   CAMPAIGN REFERENCES — Top fashion house editorial anchors
   ══════════════════════════════════════════════════════════════════ */

interface CampaignRef {
  reference: string;
  location: string;
  architecture: string;
  camera: string;
  lighting: string;
  colorGrade: string;
  negative: string;
  styling: string;
  footwearGuide: string;
}

const CAMPAIGNS: Record<string, CampaignRef> = {
  night_out: {
    reference: "Tom Ford Noir meets Bottega Veneta evening editorial",
    location: "Grand European hotel lobby entrance at night. Polished black marble floors reflecting warm amber light. Tall art deco doors with brass handles ajar. Rain-wet cobblestones visible through entrance.",
    architecture: "Art deco meets Milanese palazzo. Travertine columns, fluted pilasters, geometric brass inlays in the marble floor.",
    camera: "Shot on Leica M11 with Noctilux 50mm f/0.95 wide open. Medium-wide shot. Camera at hip height angled 5° upward for subtle power framing. Extremely shallow depth of field.",
    lighting: "Warm practical chandelier as key light from above-right (3200K amber). Cool blue-grey fill from rain-wet exterior (6500K). Strong rim light from behind-left catching shoulder and hair edge.",
    colorGrade: "Rich amber-gold highlights, deep espresso shadows. Lifted blacks to 8%. Skin tones warm and luminous. Background 10% teal shift. 35mm film grain at 12%. Overall: Tom Ford Noir meets Wong Kar-Wai.",
    negative: "No neon. No club lighting. No harsh flash. No visible logos overlaid. No selfie angle. No smiling at camera. No casual posture.",
    styling: "Intentional nightlife layering — open jacket over a statement piece, accessories catching warm light. Confident, unhurried energy.",
    footwearGuide: "sleek pointed-toe boots or premium low-profile sneakers with polished finish",
  },
  beach_day: {
    reference: "Jacquemus La Riviera meets Loro Piana Summer Walk",
    location: "Whitewashed Mediterranean terrace overlooking turquoise sea at golden hour. Bougainvillea cascading over weathered stone walls. Warm honeyed sunlight.",
    architecture: "Greek island minimalism. Rough lime-washed walls, hand-cut limestone steps, terracotta accents. Natural materials only.",
    camera: "Shot on Hasselblad X2D with XCD 65mm f/2.8. Full-body environmental portrait. Camera at eye level, slight upward tilt. Subject fills 60% of frame with sea horizon visible.",
    lighting: "Golden hour sun as key from camera-right (3800K warm). Bounced fill from white walls. Soft rim light from behind catching fabric texture and hair.",
    colorGrade: "Sun-bleached warmth. Highlights pushed to cream-gold. Shadows in soft terracotta. Lifted midtones. Grain at 8%. Overall: Slim Aarons meets Jacquemus campaign.",
    negative: "No harsh midday sun. No sunglasses on head. No pool party energy. No cluttered background. No printed towels or umbrellas.",
    styling: "Relaxed luxury resort — effortless drape, rolled sleeves or untucked layers, premium casual silhouette. Everything looks lived-in but expensive.",
    footwearGuide: "premium slides, espadrilles, or clean low-cut canvas shoes — never heavy boots",
  },
  lunch_date: {
    reference: "The Row SS26 meets COS Atelier editorial",
    location: "Upscale Parisian sidewalk café. Dappled afternoon sunlight filtering through plane trees. Marble-top bistro table with espresso. Haussmann building facade behind.",
    architecture: "Classic Parisian. Wrought-iron balconies, cream limestone facade, dark green café awning. Zinc countertop visible inside. Newspapers on the table.",
    camera: "Shot on Fujifilm GFX100S with GF 80mm f/1.7. Medium shot with environmental context. Subject at slight 3/4 angle. Shallow DOF with beautiful bokeh on café interior.",
    lighting: "Dappled natural sunlight through tree canopy as key (5500K). Soft bounced fill from cream building facade. Hair light from sun patches.",
    colorGrade: "Warm neutral palette. Champagne highlights, soft sage shadows. Skin luminous and natural. Subtle film emulation — Portra 400. Grain at 6%.",
    negative: "No harsh shadows. No tourist crowd. No bright colors. No fast-food setting. No over-styled hair. No over-accessorized.",
    styling: "Polished elevated casual — clean proportions, thoughtful layering, mixing textures like knit over cotton. Effortless but intentional.",
    footwearGuide: "clean minimalist leather loafers, ballet flats, or designer sneakers",
  },
  // weekend_casual definition lives further below (enriched version)

  office: {
    reference: "Prada FW26 meets Hugo Boss Modern Tailoring",
    location: "Sleek glass-walled corner office with panoramic city skyline view at dusk. Soft directional window light. Minimal furniture — a Mies van der Rohe chair, single orchid.",
    architecture: "International style corporate. Floor-to-ceiling curtain wall glass, polished concrete floor, brass drawer handles. Power architecture.",
    camera: "Shot on Phase One XF IQ4 with Schneider 80mm f/2.8. Full-body power portrait. Camera at waist height angled upward 3° for authority framing. Tack sharp subject, city bokeh behind.",
    lighting: "Large window as soft key light from camera-right (5000K neutral). Warm desk lamp as accent from below-left (2800K). Subtle rim light from secondary window behind.",
    colorGrade: "Cool power palette. Steel-blue highlights, warm shadows. High contrast. Skin tones neutral and refined. Minimal grain. Overall: Prada campaign meets architectural digest.",
    negative: "No fluorescent lighting. No cubicle. No casual Friday. No wrinkled clothing. No backpack. No messy desk.",
    styling: "Power-casual editorial — tailored pieces mixed with one streetwear element, confident silhouette. Looks like a CEO who skateboards.",
    footwearGuide: "monk-strap shoes, leather chelsea boots, or clean minimal sneakers",
  },
  festival: {
    reference: "Balenciaga SS26 meets Palace Skateboards editorial",
    location: "Vibrant desert festival at dusk. Warm stage glow mixed with purple-orange sunset. Dust particles catching golden backlight. Art installations visible in background.",
    architecture: "Festival industrial. Steel stage scaffolding, LED light rigs, fabric canopy structures. Burning Man meets Coachella VIP.",
    camera: "Shot on Canon R5 with RF 50mm f/1.2. Dynamic action shot. Camera low and wide. Subject mid-stride with festival energy. Dramatic lens flare from sunset.",
    lighting: "Sunset rim light from behind (3200K amber-pink). Cool LED fill from stage left (4500K cyan). Dust particles in backlight creating atmosphere.",
    colorGrade: "Saturated warm palette. Orange-magenta highlights, deep purple shadows. Boosted contrast. Skin warm and glowing. Film grain at 15%. Overall: Balenciaga meets Burning Man editorial.",
    negative: "No corporate fashion. No clean background. No studio lighting. No formal posture. No pristine clothing. No overhead noon sun.",
    styling: "Statement streetwear maximalism — bold layering, mixed textures, festival-ready but high-fashion. Clothes that make people stop and ask 'what are you wearing?'",
    footwearGuide: "chunky platform boots, bold designer sneakers, or statement sandals",
  },
  brunch: {
    reference: "Totême Spring meets Aesop store aesthetic",
    location: "Sunlit greenhouse café with lush tropical plants. Soft diffused morning light through glass ceiling. Brass plant stands, terrazzo floor, marble counter visible.",
    architecture: "Scandinavian greenhouse. Steel-frame glass structure, whitewashed brick base, hanging ferns, fiddle-leaf figs. Clean organic luxury.",
    camera: "Shot on Nikon Z9 with 58mm f/0.95 Noct. Environmental portrait in natural setting. Camera at eye level. Subject relaxed with plant foliage framing. Creamy bokeh.",
    lighting: "Diffused greenhouse sunlight as key (5500K soft). Green-filtered fill from plants. Warm accent from brass fixtures. Overall: even, flattering, botanical.",
    colorGrade: "Soft botanical palette. Cream-green highlights, warm earth shadows. Lifted midtones. Skin luminous and dewy. Grain at 4%. Overall: Cereal Magazine meets Kinfolk.",
    negative: "No harsh light. No crowded restaurant. No food in frame. No over-saturated colors. No stark white background. No posed smile.",
    styling: "Effortless luxury casual — soft textures, relaxed fits, earthy or pastel palette. Looks like they woke up looking this good.",
    footwearGuide: "clean white sneakers, espadrilles, mules, or strappy sandals",
  },
  gym: {
    reference: "Nike × Jacquemus collab meets Arc'teryx System_A",
    location: "Premium private gym with floor-to-ceiling windows overlooking a city at dawn. Concrete walls, steel equipment, rubber flooring. Light streaming in.",
    architecture: "Athletic industrial. Exposed ductwork, polished concrete, steel cable machines. Clean and minimal — no clutter, no mirrors with fingerprints.",
    camera: "Shot on Sony A1 with 24mm f/1.4 GM. Dynamic wide shot. Camera low for power perspective. Subject mid-movement or post-workout stance. Sharp throughout.",
    lighting: "Dawn window light as key from camera-right (5800K cool-warm). Hard overhead gym light creating dramatic shadow (4000K). Rim light from secondary window.",
    colorGrade: "Clean athletic palette. Cool highlights, warm skin tones. High contrast. Desaturated background, saturated clothing. Minimal grain. Overall: Nike campaign meets architectural photography.",
    negative: "No sweaty mess. No dirty gym. No mirror selfie. No fluorescent green. No baggy everything. No headband. No towel around neck.",
    styling: "Technical athleisure — clean performance pieces styled as a cohesive look, not gym-random. Every piece is intentional.",
    footwearGuide: "performance running shoes or cross-training sneakers",
  },
  date_night: {
    reference: "Saint Laurent by Night meets The Row evening editorial",
    location: "Intimate high-end cocktail bar. Moody dramatic lighting with warm tungsten highlights. Dark velvet banquettes, smoked mirror wall, single candle on marble bar.",
    architecture: "Art deco speakeasy. Fluted glass panels, oxidized brass bar rail, dark walnut paneling, geometric floor tile. Intimate and luxurious.",
    camera: "Shot on Leica SL3 with Summilux 50mm f/1.4. Tight environmental portrait. Camera at chest height. Shallow DOF with bar interior melting into warm bokeh.",
    lighting: "Single candle as practical key (2700K warm amber). Cool mirror reflection as fill from behind. Overhead spot creating hair light and shoulder definition.",
    colorGrade: "Moody warm palette. Amber highlights, deep black shadows. Crushed blacks at 5%. Rich skin tones. Heavy grain at 18%. Overall: Wong Kar-Wai meets Tom Ford.",
    negative: "No bright lights. No sports bar. No beer. No casual dining. No loud colors. No group shot. No phone visible.",
    styling: "Sharp contemporary layering — structured outerwear over fitted pieces, monochromatic or tonal color story. Dressed to impress one person.",
    footwearGuide: "heeled boots, pointed-toe shoes, or elevated dress sneakers",
  },
  wedding: {
    reference: "Brunello Cucinelli meets Ralph Lauren Purple Label",
    location: "Elegant estate garden at golden hour. Soft romantic backlight through old-growth trees. Stone balustrade, manicured hedges, petal-strewn gravel path.",
    architecture: "English country estate. Cotswold stone, climbing roses, wrought-iron gates, weathered sundial. Timeless and romantic.",
    camera: "Shot on Hasselblad 907X with XCD 90mm f/2.5. Three-quarter portrait. Camera at eye level with gentle upward angle. Subject framed between garden elements. Gorgeous bokeh.",
    lighting: "Golden hour backlight (3500K amber). Soft reflector fill from below-right. Rim light catching fabric drape and hair wisps. Overall: romantic, warm, cinematic.",
    colorGrade: "Romantic warm palette. Golden highlights, soft rose shadows. Lifted midtones. Skin glowing and warm. Fine grain at 6%. Overall: Vogue Weddings meets Brunello Cucinelli.",
    negative: "No flash photography. No reception hall. No group photo. No corsage. No dated styling. No stiff posture.",
    styling: "Elevated formal with personality — tailored foundation with one unexpected luxury accent piece. Stands out without trying.",
    footwearGuide: "polished leather dress shoes, heeled sandals, or satin pumps",
  },
  gallery_opening: {
    reference: "Celine Phoebe Philo era meets Off-White downtown editorial",
    location: "Cavernous downtown art gallery during evening opening. Polished concrete floors, white-cube walls hung with large-scale abstract canvases, single oversized sculpture in mid-floor. Soft museum-grade track lighting.",
    architecture: "Industrial-luxury gallery. Twenty-foot ceilings, exposed steel I-beams painted matte black, raw concrete columns, frameless glass entrance. Tribeca/Mayfair aesthetic.",
    camera: "Shot on Leica Q3 with 28mm f/1.7. Wide environmental shot. Camera at slightly low angle for architectural drama. Subject mid-frame with art piece partially visible behind, deep focus.",
    lighting: "Crisp museum track-lighting as key from above (4500K neutral). Soft cool fill from skylights (6000K). Single warm spot on artwork creating background depth.",
    colorGrade: "Refined neutral palette. Cool white highlights, warm graphite shadows. Skin tones true and matte. Tight contrast. Almost no grain. Overall: Document Journal meets Celine campaign.",
    negative: "No crowd. No champagne flutes in hand. No phone. No casual streetwear. No bright accent walls. No selfie energy. No smiling at camera.",
    styling: "Intellectual downtown layering — sculptural outerwear, considered proportions, monochrome or tonal palette. Looks like the artist, not the buyer.",
    footwearGuide: "minimalist leather boots, loafers, or architectural designer sneakers",
  },
  travel_lounge: {
    reference: "The Row Resort meets Loro Piana Voyage editorial",
    location: "Private terminal first-class lounge at dusk. Floor-to-ceiling windows overlooking tarmac with a parked private jet. Camel leather club chairs, walnut bar, single architect lamp on side table.",
    architecture: "Mid-century luxury aviation. Walnut paneling, brushed brass fixtures, travertine floors, low slung Saarinen-style seating. Warm but minimal.",
    camera: "Shot on Mamiya 7 with 80mm f/4. Editorial environmental portrait. Camera at eye level. Subject standing or seated near window, jet softly defocused behind. Cinematic widescreen feel.",
    lighting: "Last light from windows as warm key (3600K amber). Tungsten lamp practical from camera-left. Subtle blue-grey rim from cool tarmac lights through glass.",
    colorGrade: "Warm camel-and-graphite palette. Honeyed highlights, deep walnut shadows. Lifted midtones, true skin. Fine grain at 5%. Overall: The Row campaign meets Wes Anderson aviation.",
    negative: "No crowded gate. No rolling carry-on visible. No boarding pass. No bright airport signage. No casual sweatpants energy. No phone or earbuds.",
    styling: "Travel-luxury layering — soft cashmere over relaxed tailoring, easy fluid trousers, refined accessories. Made to look effortless on a 12-hour flight.",
    footwearGuide: "soft leather loafers, cashmere-lined slippers, or premium minimalist sneakers",
  },
  weekend_casual: {
    reference: "Fear of God Essentials meets Aritzia Super World",
    location: "Sun-drenched modernist concrete terrace overlooking a coastal city at late afternoon. Clean architectural lines. Warm golden light.",
    architecture: "Brutalist-meets-California modern. Poured concrete, floor-to-ceiling glass, steel railings. Succulent garden in background.",
    camera: "Shot on Sony A7RV with 35mm f/1.4 GM. Medium-wide environmental shot. Camera at natural eye level. Subject walking through frame with urban backdrop.",
    lighting: "Low afternoon sun as strong key from camera-left (4200K warm). Soft fill bounced from concrete surfaces. Strong backlight creating clothing edge definition.",
    colorGrade: "Warm concrete tones. Highlights in soft gold. Shadows in cool grey-blue. Lifted blacks. Clean and modern. Grain at 5%. Overall: Aritzia campaign meets architectural photography.",
    negative: "No gym clothes. No loungewear energy. No bedroom. No couch. No messy background. No logo-heavy styling.",
    styling: "Premium streetwear layering — oversized over fitted, brand-mixing done intentionally, sneakers styled up. Everything looks casual but costs serious money.",
    footwearGuide: "fresh designer sneakers, lifestyle runners, or premium mules",
  },
  beach_tropical: {
    reference: "Zimmermann Resort meets Orlebar Brown campaign",
    location: "A pristine tropical beach at golden hour with powdery white sand, turquoise water lapping the shore, and a lone palm tree leaning over a wooden jetty. Superyacht faintly visible on the horizon.",
    architecture: "Barefoot luxury resort. Weathered teak boardwalk, natural rope railings, driftwood accents. Nothing man-made in the landscape except the dock beneath the feet.",
    camera: "Shot on Hasselblad X2D with XCD 55mm f/2.5. Full-body environmental portrait. Camera at eye level, slight upward tilt with ocean horizon at chest line. Shallow DOF, turquoise water melting into creamy bokeh.",
    lighting: "Golden hour sun as warm key from camera-right (3600K honeyed). Soft bounce from white sand. Rim light from water reflection catching hair and fabric edges.",
    colorGrade: "Sun-drenched resort palette. Highlights in cream-gold, mid-tones in warm sand, shadows in soft teal. Lifted blacks. Fine grain at 6%. Overall: Slim Aarons meets Zimmermann campaign.",
    negative: "No crowded beach. No umbrellas or towels. No tourist clutter. No sunscreen shine. No pool party energy. No bright synthetic colors.",
    styling: "Barefoot luxury resortwear — flowy linen, silk kaftans or open shirts, everything drapes naturally in the salt breeze. Looks expensive and lived-in.",
    footwearGuide: "leather slides, espadrilles, or clean low-cut canvas shoes — never heavy boots",
  },
  wilderness_hiking: {
    reference: "Arc'teryx Veilance meets Aimé Leon Dore Outdoors",
    location: "A mossy old-growth forest trail with towering redwoods and cedars, shafts of golden morning sun cutting through a soft mist, wild ferns carpeting the forest floor. A rough-hewn wooden footbridge crosses a small stream in the mid-distance.",
    architecture: "Pure Pacific Northwest wilderness. No buildings. Massive trunks with dramatic bark texture, moss-draped branches, natural rock formations. Primal and untouched.",
    camera: "Shot on Leica SL3 with 35mm f/1.4 Summilux. Wide environmental portrait. Camera low at hip height for scale with trees towering above. Deep focus pulling the eye through the forest corridor.",
    lighting: "Morning sun god-rays as dramatic backlight filtered by canopy (4200K cool-warm). Cool ambient fill from misty forest shadows (6000K). Subject caught in a warm shaft of light.",
    colorGrade: "Cinematic forest palette. Highlights in warm moss-gold, mid-tones in deep jade, shadows in cool charcoal-green. Lifted midtones. Grain at 10%. Overall: Wes Anderson wilderness meets Arc'teryx campaign.",
    negative: "No tourist hiking gear. No bright safety colors. No campsite clutter. No selfie stick. No overly manicured trail. No harsh flash.",
    styling: "Technical luxury outdoors — refined functional layers, waxed canvas or sherpa over merino, earthy tonal palette. Dressed for the trail but cut like a campaign.",
    footwearGuide: "heritage leather hiking boots, trail runners, or waxed canvas field boots",
  },
  mountain_lakes: {
    reference: "Loro Piana Mountain meets The Row Alpine editorial",
    location: "A breathtaking alpine lake at golden hour with mirror-still water reflecting snow-dusted granite peaks. A weathered wooden dock extends a few feet into the water. Wildflowers and silver larch trees along the shoreline.",
    architecture: "High-altitude alpine minimalism. No buildings — just natural stone, weathered wood, and a distant glacier. Scale and silence are the architecture.",
    camera: "Shot on Phase One IQ4 with Schneider 80mm f/2.8. Wide environmental full-body shot. Camera at eye level with full reflection visible in lake. Perfect sharpness throughout.",
    lighting: "Low golden-hour alpine sun as directional key from camera-left (3500K amber). Cool high-altitude sky fill (6500K) on shadow side. Rim light skimming mountain peaks and the subject's edge.",
    colorGrade: "Crisp alpine palette. Highlights in warm cashmere-gold, mid-tones in glacial blue, shadows in deep slate. Slightly boosted clarity. Fine grain at 4%. Overall: Loro Piana Mountain meets Peter Lindbergh Alps.",
    negative: "No ski resort signage. No tourist viewpoint. No neon ski jackets. No cable cars. No snow boots in summer settings. No corporate outdoor branding.",
    styling: "Quiet alpine luxury — cashmere over fine merino, soft suede or boiled wool, natural neutrals. Dressed for the mountain but refined as Milan.",
    footwearGuide: "suede chelsea boots, refined leather mountain boots, or premium trail loafers",
  },
};


/* ── Gender model variation pools ─────────────────────────────── */
/* Each outfit gets a UNIQUE model — varied ethnicity, age, hair, and
   features. We rotate through deep pools (deterministic per outfit id)
   so the same face/look never repeats across the weekly drop. */

const MENS_MODELS: string[] = [
  "a tall East Asian male model, late 20s, sharp cheekbones, jet-black undercut, clean-shaven, lean athletic build, calm confident expression",
  "a Black male model, mid-20s, close-cropped natural hair, defined jawline, deep brown skin, broad shoulders, quietly intense gaze",
  "a Latino male model, early 30s, wavy dark brown hair swept back, neatly trimmed beard, olive skin, lean build, easy charisma",
  "a Scandinavian male model, mid-20s, ash-blonde tousled hair, light stubble, fair skin with subtle freckles, slim runway build",
  "a South Asian male model, late 20s, thick black hair with a side part, full beard, warm brown skin, athletic frame, magnetic stare",
  "a mixed-race male model, early 20s, curly dark brown hair, hazel eyes, golden-tan skin, swimmer's build, soft confident smile",
  "a Middle Eastern male model, late 20s, dark wavy hair, neatly groomed beard, deep olive skin, broad chest, sculptural features",
  "a Korean male model, early 20s, soft straight black hair with a curtain fringe, smooth fair skin, slender frame, refined editorial energy",
  "a French male model, early 30s, salt-and-pepper short hair, fine stubble, fair skin, elegant lean build, intellectual gaze",
  "a Brazilian male model, mid-20s, sun-kissed brown skin, dark curly hair, athletic surfer build, relaxed confident posture",
  "a Pacific Islander male model, late 20s, long black hair tied back, broad-shouldered, warm brown skin, grounded quiet presence",
  "a redheaded Irish male model, mid-20s, copper hair, freckled fair skin, lean wiry build, sharp blue eyes, understated cool",
];

const WOMENS_MODELS: string[] = [
  "a Black female model, mid-20s, natural curly afro, deep brown skin, long limbs, high cheekbones, serene editorial gaze",
  "a East Asian female model, early 20s, sleek straight black hair past shoulders, porcelain skin, delicate features, minimalist elegance",
  "a Latina female model, late 20s, long wavy chestnut hair, bronzed skin, warm brown eyes, soft hourglass silhouette",
  "a Scandinavian female model, mid-20s, platinum blonde blunt bob, fair skin, sharp jaw, slim runway frame, cool unbothered stare",
  "a South Asian female model, late 20s, glossy black hair half-up, deep golden-brown skin, defined brows, graceful tall posture",
  "a mixed-race female model, early 20s, voluminous curly chestnut hair, golden-tan skin, freckled nose, athletic feminine build",
  "a Middle Eastern female model, mid-20s, long dark brown hair with subtle waves, olive skin, striking dark eyes, refined poise",
  "a Korean female model, early 20s, glossy short bob with curtain bangs, smooth fair skin, dewy minimal makeup, soft confident posture",
  "a French female model, late 20s, undone shoulder-length brunette hair, fair skin, slim frame, effortless Parisian cool",
  "a Brazilian female model, mid-20s, long honey-brown beach waves, sun-kissed skin, athletic curves, radiant easy smile",
  "a Pacific Islander female model, late 20s, long black wavy hair, warm brown skin, full features, grounded sensual presence",
  "a redheaded Scottish female model, early 20s, long copper waves, freckled porcelain skin, slender build, quietly intense gaze",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickModelDescription(genderKey: "mens" | "womens", outfitId: string): string {
  const pool = genderKey === "womens" ? WOMENS_MODELS : MENS_MODELS;
  const idx = hashString(outfitId || Math.random().toString()) % pool.length;
  return pool[idx];
}

/* ── Pose pool ────────────────────────────────────────────────── */

const POSE_POOL = [
  "walking mid-stride with one hand adjusting collar, slight 3/4 turn to camera",
  "leaning against a wall with arms crossed, looking off-camera with a slight smirk",
  "standing with weight on back foot, one hand in pocket, direct eye contact",
  "caught mid-motion turning around, looking over shoulder at camera",
  "sitting on a low ledge with legs extended, relaxed editorial energy",
  "power stance with feet shoulder-width apart, hands at sides, strong eye contact",
  "walking toward camera with confident stride, slight wind in clothing",
  "perched on stairs, one knee up, arm resting casually, looking upward",
  "standing profile view with head turned toward camera, dramatic silhouette",
  "crouching low with elbows on knees, streetwear editorial energy",
  "leaning forward slightly with hands in jacket pockets, intimate close-distance feel",
  "standing tall with chin up, one arm raised adjusting sunglasses or hat",
];

/* ── Color extraction ─────────────────────────────────────────── */

function extractColorHints(items: OutfitItem[]): string {
  const names = items.map(i => `${i.product_name} ${i.brand || ""}`).join(" ").toLowerCase();
  const colorKeywords = [
    "black", "white", "cream", "ivory", "navy", "blue", "indigo",
    "red", "burgundy", "maroon", "green", "olive", "sage", "khaki",
    "grey", "gray", "charcoal", "beige", "tan", "camel",
    "brown", "chocolate", "pink", "blush", "coral",
    "orange", "rust", "yellow", "gold", "purple", "lavender",
  ];
  const found = [...new Set(colorKeywords.filter(c => names.includes(c)))];
  if (found.length === 0) return "";
  return `\nDOMINANT COLOR PALETTE: ${found.join(", ")}. Ensure the outfit reflects these exact tones cohesively.`;
}

/* ── Types ─────────────────────────────────────────────────────── */

interface OutfitItem {
  product_name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  price_cents: number | null;
}

/* ── v3 Prompt builder — 8-layer editorial system ─────────────── */

function buildPrompt(
  items: OutfitItem[],
  occasion: string,
  gender: string | null,
  poseIndex?: number,
  outfitId?: string,
): { text: string; imageUrls: string[] } {
  const campaign = CAMPAIGNS[occasion] || CAMPAIGNS.weekend_casual;
  const genderKey = gender === "womens" ? "womens" : "mens";
  const modelDesc = pickModelDescription(genderKey, outfitId || `${occasion}-${Math.random()}`);
  const pose = POSE_POOL[(poseIndex ?? Math.floor(Math.random() * POSE_POOL.length)) % POSE_POOL.length];

  const brands = [...new Set(items.map(i => i.brand).filter(Boolean))];
  const brandContext = brands.length > 0
    ? `This is a curated ${brands.join(" × ")} look.`
    : "This is a curated multi-brand look.";

  // Decode HTML entities so the prompt reads "Women's" instead of "Women&#x27;s".
  const decode = (s: string) =>
    s.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

  // Detect footwear in items
  const hasFootwear = items.some(i => {
    const c = `${i.category || ""} ${i.product_name || ""}`.toLowerCase();
    return /shoe|sneaker|boot|slipper|sandal|loafer|heel|pump|mule|flat|espadrille|slingback|moccasin|trainer/.test(c);
  });

  // ── Per-item garment classification (mirrors virtual-tryon prompt logic)
  const itemTraits = items.map(i => ({ item: i, traits: classifyGarment(i) }));
  const hasIntimate = itemTraits.some(({ traits }) => traits.isSwim || traits.isUnderwear || traits.isIntimate);

  // Build wardrobe layer with layering context
  const ROLE_ORDER = ["outerwear", "top", "bottom", "footwear", "accessory"];
  const wardrobeLines = itemTraits.map(({ item, traits }, i) => {
    const brand = item.brand ? ` by ${item.brand}` : "";
    const price = item.price_cents ? ` $${(item.price_cents / 100).toFixed(0)}` : "";
    const cat = item.category ? ` [${item.category}]` : "";
    const rawName = decode(item.product_name);
    // Sanitize names only when intimate/swim items are present, to avoid
    // safety refusals from the image model on the entire prompt.
    const name = (traits.isSwim || traits.isUnderwear || traits.isIntimate)
      ? sanitizeIntimateText(rawName)
      : rawName;
    return `  ${i + 1}. ${name}${brand}${price}${cat}`;
  }).join("\n");

  // Per-item shape locks (top-only stays top-only, bikini top stays cropped, etc.)
  const shapeLockLines = itemTraits
    .map(({ item, traits }) => shapeLockFor(decode(item.product_name), traits))
    .filter((s): s is string => !!s);
  const shapeLockBlock = shapeLockLines.length === 0
    ? ""
    : `\n\n═══ GARMENT SHAPE LOCK (per item) ═══\n${shapeLockLines.map(l => `- ${l}`).join("\n")}`;

  const colorHints = extractColorHints(items);

  const footwearInstruction = hasFootwear
    ? "The outfit includes specific footwear — the model MUST wear the exact shoes listed. Match design precisely from reference images."
    : `No footwear specified — style with ${campaign.footwearGuide} that complement the look.`;

  const imageUrls = items
    .map(i => i.image_url)
    .filter((url): url is string => !!url);

  const itemCount = items.length;
  const bagCount = itemTraits.filter(({ traits }) => traits.isBag).length;
  const bagInstruction = bagCount === 0
    ? "NO bags of any kind — the model is NOT holding, carrying, or wearing any bag, tote, clutch, purse, backpack, or handbag. Hands are empty or resting naturally."
    : `EXACTLY ${bagCount} bag${bagCount === 1 ? "" : "s"} total — the model carries only the listed bag${bagCount === 1 ? "" : "s"}. Never add a second bag, extra clutch, tote, or handbag.`;

  // Beach / swimwear anti-stacking: if there is a swim piece, force the AI
  // to render it as the BASE layer with no extra swimsuits, no pants/sweatpants
  // layered over, and at most one light open cover-up.
  const swimItems = itemTraits.filter(({ traits }) => traits.isSwim);
  const swimInstruction = swimItems.length === 0
    ? ""
    : `

═══ SWIMWEAR LAYERING RULE (ABSOLUTE) ═══
This is a beachwear look. The model wears EXACTLY ONE swimsuit (the listed swim piece) as the base layer.
- NEVER stack a bikini under a one-piece. NEVER show two swimsuits on the same body.
- NEVER cover the swimsuit with sweatpants, jeans, or trousers — only open lightweight cover-ups (linen shirt, kaftan, sarong, sheer cardigan) are allowed over swim.
- If a "pants" item is listed, render it as a beach cover-up worn OPEN at the side or rolled, NEVER pulled fully over the swimsuit.
- Show the swimsuit clearly visible — at least the top half is uncovered.`;

  // Safety mode for intimate/swim — keep output commercially appropriate
  const safetyBlock = hasIntimate
    ? `\n\n═══ COMMERCIAL SAFETY MODE ═══
- Render any base-layer / swimwear / activewear pieces as commercially appropriate, fully-styled retail editorial.
- Preserve exact color, pattern, logo/waistband cues, neckline, straps, and silhouette family.
- Do NOT depict exposed intimate anatomy, sheer/transparent coverage, or minimal-coverage styling.
- Keep the result retail-safe and natural.`
    : "";


  const text = `You are a world-class fashion photographer shooting for ${campaign.reference}.

═══ LAYER 1: PRODUCT FIDELITY (ABSOLUTE PRIORITY — COMPOSITION LOCK) ═══
Reference product images are attached, one per listed item, in the SAME ORDER as the wardrobe list. The model MUST wear items VISUALLY IDENTICAL to those references:
- EXACT same colors, prints, graphics, logos, and text
- EXACT same silhouette, cut, proportions, neckline, straps, sleeves, hem, and length
- Brand logos/text ON garments must match reference photos precisely
- Do NOT substitute, reinterpret, or create "inspired by" versions — COPY exactly
- If a reference image shows MULTIPLE models, a collage, or a multi-figure layout, extract ONLY the garment and IGNORE all people/figures from the reference
- Show EXACTLY ${itemCount} garment piece${itemCount === 1 ? "" : "s"} on the model — no extra jackets, no extra shoes, no held bags or shopping accessories that aren't in the list
- The model wears ONE pair of shoes (the listed footwear) and is NOT carrying a second pair
- BAGS: ${bagInstruction}
- ABSOLUTE LAYOUT RULE: Output EXACTLY ONE single image panel. NEVER generate a triptych, diptych, side-by-side, before/after, or multi-panel grid.${shapeLockBlock}

═══ LAYER 2: WARDROBE ═══
${brandContext}

OUTFIT PIECES (every item must be worn and recognizable; nothing else may appear):
${wardrobeLines}

STYLING: ${campaign.styling}
FOOTWEAR: ${footwearInstruction}
${colorHints}
${swimInstruction}${safetyBlock}

═══ LAYER 3: MODEL ═══
${modelDesc}
POSE: ${pose}
Dynamic natural energy — NOT stiff or mannequin-like. ${genderKey === "womens" ? "Feminine silhouette, natural curves." : "Masculine build, clean lines."}

ANATOMY LOCK (non-negotiable):
- EXACTLY one head, one neck, one torso, two arms, two hands with five fingers each, two legs, two feet.
- Feet point in the natural forward direction of the leg they are attached to — NEVER backward, sideways, or detached.
- Knees and elbows bend in anatomically correct directions only. No double joints, no inverted limbs.
- Hands have correct finger count and natural proportions — no fused, missing, extra, or warped fingers.
- Eyes are level and symmetrical. Ears match. No facial distortion, no melted features, no doubled faces.
- Body proportions are realistic — no extra limbs, no floating limbs, no limbs passing through clothing or the body.

═══ LAYER 4: LOCATION + ARCHITECTURE ═══
${campaign.location}
${campaign.architecture}

═══ LAYER 5: CAMERA ═══
${campaign.camera}

FRAMING OVERRIDE (non-negotiable, supersedes any conflicting camera note above):
- TRUE FULL BODY: the entire model from the very top of the head down to BELOW THE SOLES OF THE SHOES must be inside the frame.
- Both feet and the full footwear must be fully visible with clear ground/floor padding beneath them.
- Leave at least 8% empty space below the shoes and 4% above the head — never crop ankles, shins, knees, or hair.
- If the chosen pose would crop the feet, adjust the camera distance backward until the shoes are fully in frame.

═══ LAYER 6: LIGHTING ═══
${campaign.lighting}

═══ LAYER 7: COLOR GRADE ═══
${campaign.colorGrade}

═══ LAYER 8: NEGATIVE DIRECTION ═══
${campaign.negative}
No text overlays. No watermarks. No mannequins. No flat-lay. No product-only shots. Only styled on-body editorial.
ANATOMY NEGATIVES: No backward feet, no rotated/twisted ankles, no extra fingers, no missing fingers, no fused fingers, no extra limbs, no missing limbs, no detached limbs, no floating limbs, no warped hands, no deformed face, no asymmetric eyes, no melted features, no doubled heads, no second face, no body horror, no anatomical impossibilities, no limbs clipping through fabric or body.

═══ FINAL CHECK ═══
Portrait orientation (3:4). Confirm BEFORE rendering: (1) head fully in frame with breathing room above, (2) BOTH FEET AND FULL SHOES visible with floor padding beneath them — no ankle/toe crop, (3) every listed garment matches its reference image in color, pattern, graphic, and silhouette AND respects its per-item shape lock, (4) accessory count is exact — ${bagCount === 0 ? "ZERO bags visible" : `exactly ${bagCount} bag${bagCount === 1 ? "" : "s"}`} and ONE pair of shoes only, (5) anatomy is correct — feet point forward, hands have five natural fingers, no extra/missing limbs, no rotated joints, no facial distortion.`;

  return { text, imageUrls };
}

/* ── Image accessibility check ────────────────────────────────── */

async function checkImageAccessible(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

/* ── AI image generation ──────────────────────────────────────── */

async function generateHeroImage(
  prompt: { text: string; imageUrls: string[] },
  apiKey: string
): Promise<string | null> {
  const sanitizedUrls = prompt.imageUrls.slice(0, 6).map(url => {
    try {
      const u = new URL(url);
      u.pathname = u.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
      return u.toString();
    } catch {
      return url;
    }
  });

  const accessChecks = await Promise.all(
    sanitizedUrls.map(async (url) => ({ url, ok: await checkImageAccessible(url) }))
  );
  const accessibleUrls = accessChecks.filter(c => c.ok).map(c => c.url);
  console.log(`Image accessibility: ${accessibleUrls.length}/${prompt.imageUrls.length} accessible`);

  for (const useImages of [true, false]) {
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: prompt.text },
    ];
    if (useImages && accessibleUrls.length > 0) {
      for (const url of accessibleUrls) {
        content.push({ type: "image_url", image_url: { url } });
      }
    } else if (useImages) {
      continue;
    }

    if (!useImages) {
      console.log("Retrying without image URLs (text-only prompt)");
    }

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`AI gateway error ${res.status}:`, errText);
      if (res.status === 429) throw new Error("RATE_LIMITED");
      if (res.status === 402) throw new Error("PAYMENT_REQUIRED");
      if (res.status === 400 && useImages) {
        console.log("Got 400 with images, will retry text-only...");
        continue;
      }
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  }

  return null;
}

/* ── Storage upload ───────────────────────────────────────────── */

async function uploadHero(
  sb: ReturnType<typeof createClient>,
  base64Data: string,
  outfitId: string
): Promise<string | null> {
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const bytes = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));
  const version = Date.now();
  const fileName = `outfit-heroes/${outfitId}-${version}.png`;

  const { error } = await sb.storage
    .from("backgrounds-curated")
    .upload(fileName, bytes, { contentType: "image/png", upsert: false });

  if (error) {
    console.error("Storage upload error:", error);
    return null;
  }

  return sb.storage.from("backgrounds-curated").getPublicUrl(fileName).data.publicUrl;
}

/* ── Editorial scene-only (clean background) generation ──────── */

const EDITORIAL_BG_CAP = 500;

function buildScenePrompt(occasion: string): { text: string; imageUrls: string[] } {
  const campaign = CAMPAIGNS[occasion] || CAMPAIGNS.weekend_casual;
  const text = `You are a world-class fashion photographer shooting an EMPTY editorial location plate for ${campaign.reference}.

═══ ABSOLUTE RULE ═══
NO PEOPLE. NO MODELS. NO MANNEQUINS. NO CLOTHING. NO BODY PARTS.
This is a CLEAN ENVIRONMENT-ONLY plate — the location and architecture only, with NO subject in frame.
Treat it as a behind-the-scenes "before the talent walks on set" shot.

═══ LOCATION ═══
${campaign.location}
${campaign.architecture}

═══ CAMERA ═══
${campaign.camera}
Frame the scene as if a model would stand center-frame — leave that center area UNOBSTRUCTED and well-lit so a person could be composited in later. Do not place objects in the standing zone.

═══ LIGHTING ═══
${campaign.lighting}

═══ COLOR GRADE ═══
${campaign.colorGrade}

═══ NEGATIVE DIRECTION ═══
${campaign.negative}
NO people. NO models. NO mannequins. NO crowds. NO silhouettes. NO body parts of any kind. NO clothing on display. NO floating garments. NO text overlays. NO watermarks.

═══ FINAL CHECK ═══
Portrait orientation (3:4). Confirm BEFORE rendering: (1) absolutely zero people or human figures, (2) the center of the frame is an open, unobstructed standing zone with clean floor/ground, (3) editorial lighting and architectural detail are dialed in for a luxury campaign backplate.`;
  return { text, imageUrls: [] };
}

async function uploadEditorialScene(
  sb: ReturnType<typeof createClient>,
  base64Data: string,
  outfitId: string
): Promise<string | null> {
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const bytes = Uint8Array.from(atob(base64Clean), (c) => c.charCodeAt(0));
  const version = Date.now();
  const fileName = `editorial-scenes/${outfitId}-${version}.png`;

  const { error } = await sb.storage
    .from("backgrounds-curated")
    .upload(fileName, bytes, { contentType: "image/png", upsert: false });

  if (error) {
    console.error("Editorial scene upload error:", error);
    return null;
  }

  return fileName; // store the storage_path; UI generates the public URL
}

/**
 * Generates a clean (model-free) editorial scene matched to the outfit's occasion
 * and inserts it into the `backgrounds` table under the `editorial` category.
 * Hard-capped at EDITORIAL_BG_CAP total backgrounds across the system.
 *
 * Returns true if a new scene was generated and saved; false otherwise (cap hit, error, etc.).
 */
async function generateEditorialScene(
  // deno-lint-ignore no-explicit-any
  sb: any,
  outfitId: string,
  occasion: string,
  outfitTitle: string,
  apiKey: string
): Promise<boolean> {
  // Cap check — count total backgrounds (across all categories)
  const { count: totalBgs, error: countErr } = await sb
    .from("backgrounds")
    .select("id", { count: "exact", head: true });

  if (countErr) {
    console.error("Editorial cap count error:", countErr);
    return false;
  }
  if ((totalBgs ?? 0) >= EDITORIAL_BG_CAP) {
    console.log(`[Editorial] Cap reached (${totalBgs}/${EDITORIAL_BG_CAP}) — skipping clean scene for ${outfitId}`);
    return false;
  }

  // Look up the editorial category id
  const { data: cat, error: catErr } = await sb
    .from("background_categories")
    .select("id")
    .eq("slug", "editorial")
    .single();

  if (catErr || !cat) {
    console.error("Editorial category missing:", catErr);
    return false;
  }

  const prompt = buildScenePrompt(occasion);
  const base64 = await generateHeroImage(prompt, apiKey);
  if (!base64) {
    console.warn(`[Editorial] Generation returned no image for ${outfitId}`);
    return false;
  }

  const storagePath = await uploadEditorialScene(sb, base64, outfitId);
  if (!storagePath) return false;

  const friendlyName = `${outfitTitle} — Scene`;
  const { error: insertErr } = await sb.from("backgrounds").insert({
    category_id: cat.id,
    name: friendlyName,
    storage_path: storagePath,
    source: "editorial-pipeline",
    source_id: outfitId,
    is_active: true,
    is_premium: false,
    tags: ["editorial", "weekly-drip", occasion],
  });

  if (insertErr) {
    console.error("[Editorial] Insert failed:", insertErr);
    return false;
  }

  console.log(`[Editorial] ✅ Saved clean scene for "${outfitTitle}" (${(totalBgs ?? 0) + 1}/${EDITORIAL_BG_CAP})`);
  return true;
}

/* ── Process single outfit ────────────────────────────────────── */

async function processOutfit(
  // deno-lint-ignore no-explicit-any
  sb: any,
  outfitId: string,
  apiKey: string,
  regenerate = false,
  poseIndex?: number
): Promise<{ success: boolean; outfit_id: string; hero_url?: string; error?: string; skipped?: boolean }> {
  const { data: outfit, error: oErr } = await sb
    .from("weekly_outfits")
    .select("id, occasion, title, hero_image_url, gender")
    .eq("id", outfitId)
    .single();

  if (oErr || !outfit) {
    return { success: false, outfit_id: outfitId, error: "Outfit not found" };
  }

  if (outfit.hero_image_url && !regenerate) {
    return { success: true, outfit_id: outfitId, hero_url: String(outfit.hero_image_url), skipped: true };
  }

  const { data: items } = await sb
    .from("weekly_outfit_items")
    .select("product_name, brand, category, image_url, price_cents")
    .eq("outfit_id", outfitId)
    .order("position", { ascending: true });

  if (!items || items.length === 0) {
    return { success: false, outfit_id: outfitId, error: "No items in outfit" };
  }

  console.log(`Generating v3 hero for "${outfit.title}" (${items.length} items, ${outfit.gender || "unisex"}, occasion: ${outfit.occasion})`);

  // deno-lint-ignore no-explicit-any
  const prompt = buildPrompt(items as any, outfit.occasion, outfit.gender, poseIndex, outfitId);
  const base64 = await generateHeroImage(prompt, apiKey);

  if (!base64) {
    return { success: false, outfit_id: outfitId, error: "Image generation failed" };
  }

  const publicUrl = await uploadHero(sb, base64, outfitId);
  if (!publicUrl) {
    return { success: false, outfit_id: outfitId, error: "Upload failed" };
  }

  const { error: updateErr } = await sb
    .from("weekly_outfits")
    .update({ hero_image_url: publicUrl })
    .eq("id", outfitId);

  if (updateErr) {
    return { success: false, outfit_id: outfitId, error: updateErr.message };
  }

  // ── Dual-generation: produce a matching clean editorial scene ──
  // Runs after the hero so a failure here doesn't block the hero result.
  // Internally caps at EDITORIAL_BG_CAP (500) total backgrounds.
  try {
    // Small delay to avoid back-to-back rate limiting on the image model
    await new Promise(r => setTimeout(r, 4000));
    await generateEditorialScene(sb, outfitId, outfit.occasion, outfit.title, apiKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.warn(`[Editorial] Scene generation skipped for ${outfitId}: ${msg}`);
  }

  return { success: true, outfit_id: outfitId, hero_url: publicUrl };
}

/* ── Background processing for batch jobs ─────────────────────── */

async function processBatchInBackground(
  outfitIds: string[],
  apiKey: string,
  regenerate: boolean
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  for (let idx = 0; idx < outfitIds.length; idx++) {
    const outfitId = outfitIds[idx];
    try {
      const result = await processOutfit(sb, outfitId, apiKey, regenerate, idx);
      console.log(`[${idx + 1}/${outfitIds.length}] ${result.success ? "✅" : "❌"} ${outfitId}: ${result.hero_url || result.error || "skipped"}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown";
      console.error(`[${idx + 1}/${outfitIds.length}] ❌ ${outfitId}: ${msg}`);
      if (msg === "RATE_LIMITED") {
        console.log("Rate limited, waiting 60s...");
        await new Promise(r => setTimeout(r, 60000));
        // Retry this one
        try {
          await processOutfit(sb, outfitId, apiKey, regenerate, idx);
        } catch (e2) {
          console.error(`Retry failed for ${outfitId}: ${e2 instanceof Error ? e2.message : "Unknown"}`);
        }
      }
    }
    // Wait between generations to avoid rate limits
    if (idx < outfitIds.length - 1) {
      await new Promise(r => setTimeout(r, 15000));
    }
  }
  console.log(`[Background] Batch complete: ${outfitIds.length} outfits processed`);
}

/* ── HTTP handler ─────────────────────────────────────────────── */

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const _auth = requireServiceRole(req);
  if (!_auth.ok) return _auth.response;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { outfit_id?: string; week_id?: string; regenerate?: boolean; heroes_only?: boolean } = {};
  try { body = await req.json(); } catch { /* defaults */ }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  // Single outfit — process in background to avoid timeout
  if (body.outfit_id) {
    const outfitId = body.outfit_id;
    const regen = body.regenerate ?? false;

    const bgTask = async () => {
      const bgSb = createClient(supabaseUrl, supabaseKey);
      try {
        const result = await processOutfit(bgSb, outfitId, apiKey, regen);
        console.log(`[Single] ${result.success ? "✅" : "❌"} ${outfitId}: ${result.hero_url || result.error}`);
      } catch (e) {
        console.error(`[Single] ❌ ${outfitId}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    };

    // @ts-ignore: EdgeRuntime.waitUntil
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(bgTask());
    } else {
      bgTask();
    }

    return new Response(JSON.stringify({
      status: "processing",
      message: `Started generating hero for outfit ${outfitId} in background`,
      outfit_id: outfitId,
    }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Batch by week — use waitUntil to process in background
  if (body.week_id) {
    let query = sb
      .from("weekly_outfits")
      .select("id")
      .eq("week_id", body.week_id)
      .eq("is_active", true);

    if (body.heroes_only) {
      query = query.eq("is_hero", true);
    }

    const { data: outfits } = await query;

    if (!outfits || outfits.length === 0) {
      return new Response(JSON.stringify({ error: "No outfits found", week_id: body.week_id }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outfitIds = outfits.map(o => o.id);

    // Fire and forget — process in background
    // @ts-ignore: EdgeRuntime.waitUntil is available in Supabase edge runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processBatchInBackground(outfitIds, apiKey, body.regenerate ?? false));
    } else {
      // Fallback: just start the promise (it'll run until the runtime kills it)
      processBatchInBackground(outfitIds, apiKey, body.regenerate ?? false);
    }

    // Return immediately with 202
    return new Response(JSON.stringify({
      status: "processing",
      message: `Started generating heroes for ${outfitIds.length} outfits in background`,
      week_id: body.week_id,
      outfit_count: outfitIds.length,
    }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    version: "v3-editorial-async",
    usage: "POST with { outfit_id: 'uuid' } or { week_id: '2026-W15' }",
    options: { regenerate: true, heroes_only: true },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
