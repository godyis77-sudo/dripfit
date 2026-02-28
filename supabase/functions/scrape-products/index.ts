import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, category, count = 6 } = await req.json();

    if (!brand || !category) {
      return new Response(JSON.stringify({ error: 'brand and category required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Generate ${count} real, currently available ${category} products from ${brand}. 

CRITICAL IMAGE REQUIREMENTS:
- Each image_url MUST show a SINGLE, CLEAR apparel item on a clean background (white, studio, or flat-lay)
- Do NOT use images showing models wearing full outfits — the image must isolate the individual product
- Do NOT use lifestyle/editorial images, runway shots, or collage images
- Prefer official product catalog / e-commerce style images (front-facing, well-lit, no distracting backgrounds)
- Use real product image URLs from the brand's official website or CDN

DESCRIPTION ACCURACY:
- The product name MUST accurately describe what is shown in the image (e.g., don't label a hoodie as a "jacket")
- Color in the name must match the actual product color in the image
- Tags must reflect the actual product style and category visible in the image

For each product return a JSON object with:
- name: accurate product name matching the image exactly
- image_url: a real product image URL showing a single clear apparel item
- product_url: the actual product page URL on the brand's official website
- price_cents: realistic price in USD cents
- tags: array of relevant tags like ["casual", "premium", "bestseller"]

Return ONLY a JSON array, no markdown.`;

    const response = await fetch('https://ai.lovable.dev/api/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a fashion product data generator. Return only valid JSON arrays. Every image_url must point to a clear, single-product e-commerce image — never lifestyle or multi-item photos. Product names must exactly describe the item shown in the image.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    let products: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        products = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      return new Response(JSON.stringify({ error: 'Failed to parse product data', raw: content }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate: filter out products with suspicious image URLs
    products = products.filter((p: any) => {
      if (!p.image_url || !p.name) return false;
      // Reject images that are clearly not product images
      const url = p.image_url.toLowerCase();
      if (url.includes('collage') || url.includes('runway') || url.includes('editorial')) return false;
      return true;
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const inserts = products.map((p: any) => ({
      brand,
      retailer: brand,
      category,
      name: p.name || `${brand} ${category}`,
      image_url: p.image_url || `https://placehold.co/400x400?text=${encodeURIComponent(brand)}`,
      product_url: p.product_url || null,
      price_cents: p.price_cents || null,
      currency: 'USD',
      tags: p.tags || [],
      is_active: true,
    }));

    const { data: inserted, error } = await supabase
      .from('product_catalog')
      .insert(inserts)
      .select('id, name');

    if (error) {
      console.error('Insert error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, count: inserted?.length || 0, products: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Scrape error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
