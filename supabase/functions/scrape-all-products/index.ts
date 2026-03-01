const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// All brand/category combos to scrape
const BRAND_CATEGORIES: Record<string, string[]> = {
  zara:           ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  hm:             ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  uniqlo:         ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  shein:          ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  nike:           ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  asos:           ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
  adidas:         ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  'new balance':  ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  converse:       ['tops', 'shoes', 'accessories'],
  vans:           ['tops', 'shoes', 'accessories'],
  puma:           ['tops', 'bottoms', 'shoes', 'accessories'],
  'the north face': ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  patagonia:      ['tops', 'bottoms', 'outerwear', 'accessories'],
  lululemon:      ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'],
  salomon:        ['shoes', 'outerwear', 'accessories'],
  "levi's":       ['tops', 'bottoms', 'outerwear', 'accessories'],
  carhartt:       ['tops', 'bottoms', 'outerwear', 'accessories'],
  'dr. martens':  ['shoes'],
  'ray-ban':      ['accessories'],
  oakley:         ['accessories'],
  pandora:        ['accessories'],
  mejuri:         ['accessories'],
  'tiffany & co': ['accessories'],
  cartier:        ['accessories'],
  'new era':      ['accessories'],
  supreme:        ['tops', 'outerwear', 'accessories'],
  palace:         ['tops', 'outerwear', 'accessories'],
  "stüssy":       ['tops', 'bottoms', 'outerwear', 'accessories'],
  'off-white':    ['tops', 'outerwear', 'shoes'],
  essentials:     ['tops', 'bottoms', 'outerwear'],
  gucci:          ['tops', 'shoes', 'accessories'],
  prada:          ['shoes', 'accessories'],
  dior:           ['accessories', 'shoes'],
  'louis vuitton': ['accessories', 'shoes'],
  balenciaga:     ['shoes', 'tops'],
  'saint laurent': ['outerwear', 'shoes'],
  versace:        ['tops', 'shoes', 'accessories'],
  burberry:       ['outerwear', 'tops', 'accessories'],
  'free people':  ['tops', 'dresses', 'outerwear'],
  reformation:    ['dresses', 'tops', 'bottoms'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Build all jobs
    const jobs: { brand: string; category: string }[] = [];
    for (const [brand, categories] of Object.entries(BRAND_CATEGORIES)) {
      for (const category of categories) {
        jobs.push({ brand, category });
      }
    }

    console.log(`[scrape-all] Starting ${jobs.length} scrape jobs`);

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
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log(`[scrape-all] Done. Total inserted: ${totalInserted}`);

    return new Response(JSON.stringify({
      success: true,
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
