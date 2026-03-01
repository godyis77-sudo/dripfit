const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// All brand/category combos to scrape — expanded for 3000+ target
const BRAND_CATEGORIES: Record<string, string[]> = {
  // ── Fast Fashion & Mass Market ──
  zara:           ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  hm:             ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  uniqlo:         ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  shein:          ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  asos:           ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  mango:          ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  'cos':          ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  '& other stories': ['tops', 'bottoms', 'outerwear', 'dresses', 'accessories'],
  'urban outfitters': ['tops', 'bottoms', 'outerwear', 'dresses', 'accessories'],
  'forever 21':   ['tops', 'bottoms', 'dresses', 'shoes', 'accessories'],
  'fashion nova':  ['tops', 'bottoms', 'dresses', 'shoes', 'accessories'],
  'prettylittlething': ['tops', 'bottoms', 'dresses', 'shoes', 'accessories'],
  boohoo:         ['tops', 'bottoms', 'dresses', 'shoes', 'accessories'],
  missguided:     ['tops', 'bottoms', 'dresses', 'accessories'],
  topshop:        ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories'],

  // ── Sportswear & Athletic ──
  nike:           ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  adidas:         ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  'new balance':  ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  puma:           ['tops', 'bottoms', 'shoes', 'accessories'],
  'under armour': ['tops', 'bottoms', 'shoes', 'accessories'],
  reebok:         ['tops', 'bottoms', 'shoes', 'accessories'],
  asics:          ['shoes', 'tops', 'accessories'],
  'on running':   ['shoes', 'tops', 'accessories'],
  'hoka':         ['shoes', 'accessories'],
  saucony:        ['shoes', 'tops'],
  converse:       ['tops', 'shoes', 'accessories'],
  vans:           ['tops', 'shoes', 'accessories'],
  'jordan':       ['tops', 'bottoms', 'shoes', 'accessories'],

  // ── Outdoor & Active ──
  'the north face': ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  patagonia:      ['tops', 'bottoms', 'outerwear', 'accessories'],
  lululemon:      ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  salomon:        ['shoes', 'outerwear', 'accessories'],
  columbia:       ['tops', 'bottoms', 'outerwear', 'shoes'],
  'arc\'teryx':   ['outerwear', 'tops', 'bottoms', 'accessories'],

  // ── Denim & Casual ──
  "levi's":       ['tops', 'bottoms', 'outerwear', 'accessories'],
  carhartt:       ['tops', 'bottoms', 'outerwear', 'accessories'],
  gap:            ['tops', 'bottoms', 'outerwear', 'dresses', 'accessories'],
  'banana republic': ['tops', 'bottoms', 'outerwear', 'dresses'],
  'old navy':     ['tops', 'bottoms', 'outerwear', 'dresses'],
  'j.crew':       ['tops', 'bottoms', 'outerwear', 'dresses', 'accessories'],
  'ralph lauren': ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  'tommy hilfiger': ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  'calvin klein': ['tops', 'bottoms', 'outerwear', 'accessories'],
  'hugo boss':    ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],

  // ── Department Store Brands ──
  nordstrom:      ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  anthropologie:  ['tops', 'bottoms', 'dresses', 'accessories'],
  'free people':  ['tops', 'dresses', 'outerwear', 'bottoms'],
  reformation:    ['dresses', 'tops', 'bottoms'],
  aritzia:        ['tops', 'bottoms', 'outerwear', 'dresses'],
  revolve:        ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories'],
  everlane:       ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  abercrombie:    ['tops', 'bottoms', 'outerwear', 'dresses', 'accessories'],
  'american eagle': ['tops', 'bottoms', 'outerwear', 'accessories'],
  hollister:      ['tops', 'bottoms', 'outerwear', 'accessories'],

  // ── Boots & Footwear ──
  'dr. martens':  ['shoes'],
  birkenstock:    ['shoes'],
  crocs:          ['shoes'],
  timberland:     ['shoes', 'outerwear'],
  'steve madden': ['shoes', 'accessories'],
  allbirds:       ['shoes'],
  clarks:         ['shoes'],

  // ── Eyewear ──
  'ray-ban':      ['accessories'],
  oakley:         ['accessories'],

  // ── Jewelry & Accessories ──
  pandora:        ['accessories'],
  mejuri:         ['accessories'],
  'tiffany & co': ['accessories'],
  cartier:        ['accessories'],
  swarovski:      ['accessories'],
  kendra_scott:   ['accessories'],

  // ── Headwear ──
  'new era':      ['accessories'],

  // ── Streetwear ──
  supreme:        ['tops', 'outerwear', 'accessories'],
  palace:         ['tops', 'outerwear', 'accessories'],
  "stüssy":       ['tops', 'bottoms', 'outerwear', 'accessories'],
  'off-white':    ['tops', 'outerwear', 'shoes'],
  essentials:     ['tops', 'bottoms', 'outerwear'],
  'a bathing ape': ['tops', 'outerwear', 'shoes', 'accessories'],
  kith:           ['tops', 'bottoms', 'outerwear', 'shoes'],
  corteiz:        ['tops', 'bottoms', 'outerwear', 'accessories'],
  trapstar:       ['tops', 'outerwear', 'accessories'],
  'fear of god':  ['tops', 'bottoms', 'outerwear', 'shoes'],

  // ── Luxury ──
  gucci:          ['tops', 'shoes', 'accessories', 'outerwear'],
  prada:          ['shoes', 'accessories', 'tops', 'outerwear'],
  dior:           ['accessories', 'shoes', 'tops', 'outerwear'],
  'louis vuitton': ['accessories', 'shoes', 'tops'],
  balenciaga:     ['shoes', 'tops', 'outerwear', 'accessories'],
  'saint laurent': ['outerwear', 'shoes', 'tops', 'accessories'],
  versace:        ['tops', 'shoes', 'accessories', 'outerwear'],
  burberry:       ['outerwear', 'tops', 'accessories', 'shoes'],
  fendi:          ['accessories', 'shoes', 'tops'],
  givenchy:       ['tops', 'shoes', 'accessories'],
  valentino:      ['shoes', 'tops', 'accessories'],
  'alexander mcqueen': ['shoes', 'tops', 'accessories'],
  'bottega veneta': ['accessories', 'shoes'],
  celine:         ['accessories', 'shoes', 'tops'],
  loewe:          ['accessories', 'shoes'],
  moncler:        ['outerwear', 'tops', 'accessories'],
  'stone island':  ['outerwear', 'tops', 'bottoms'],
  'acne studios':  ['tops', 'bottoms', 'outerwear', 'accessories'],
  'ami paris':     ['tops', 'outerwear', 'accessories'],
  'jacquemus':     ['tops', 'dresses', 'accessories'],
  'rick owens':    ['tops', 'outerwear', 'shoes'],
  'maison margiela': ['tops', 'shoes', 'accessories'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Support batch param to process a slice of jobs (0-indexed batch number)
    let batchNumber = 0;
    let batchTotal = 1;
    try {
      const body = await req.json();
      batchNumber = body.batch ?? 0;
      batchTotal = body.totalBatches ?? 1;
    } catch { /* no body = run all */ }

    // Build all jobs
    const allJobs: { brand: string; category: string }[] = [];
    for (const [brand, categories] of Object.entries(BRAND_CATEGORIES)) {
      for (const category of categories) {
        allJobs.push({ brand, category });
      }
    }

    // Slice for this batch
    const jobsPerBatch = Math.ceil(allJobs.length / batchTotal);
    const start = batchNumber * jobsPerBatch;
    const jobs = allJobs.slice(start, start + jobsPerBatch);

    console.log(`[scrape-all] Batch ${batchNumber + 1}/${batchTotal}: ${jobs.length} jobs (of ${allJobs.length} total)`);

    const results: { brand: string; category: string; inserted: number; error?: string }[] = [];
    let totalInserted = 0;

    // Process in batches of 3 to avoid overwhelming the function
    const BATCH_SIZE = 3;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (job) => {
          try {
            const resp = await fetch(`${SUPABASE_URL}/functions/v1/scrape-products`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ brand: job.brand, category: job.category }),
            });

            const data = await resp.json();
            const inserted = data.inserted || 0;
            totalInserted += inserted;
            console.log(`[scrape-all] ${job.brand}/${job.category}: +${inserted}`);
            return { brand: job.brand, category: job.category, inserted };
          } catch (err: any) {
            console.warn(`[scrape-all] ${job.brand}/${job.category} failed: ${err.message}`);
            return { brand: job.brand, category: job.category, inserted: 0, error: err.message };
          }
        })
      );

      for (const r of batchResults) {
        if (r.status === 'fulfilled') results.push(r.value);
        else results.push({ brand: '?', category: '?', inserted: 0, error: String(r.reason) });
      }

      // Brief pause between batches
      if (i + BATCH_SIZE < jobs.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    console.log(`[scrape-all] Batch ${batchNumber + 1} done. Inserted: ${totalInserted}`);

    return new Response(JSON.stringify({
      success: true,
      batch: batchNumber,
      totalBatches: batchTotal,
      totalJobs: jobs.length,
      totalInserted,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[scrape-all] Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
