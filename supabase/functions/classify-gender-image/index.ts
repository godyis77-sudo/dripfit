import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { successResponse, errorResponse, getCorsHeaders } from "../_shared/validation.ts";

const VALID_GENDERS = ["mens", "womens", "unisex"] as const;

interface ClassifyResult {
  id: string;
  name: string;
  old_gender: string;
  ai_gender: string;
  confidence: number;
  reason: string;
  agreed: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("LOVABLE_API_KEY not configured", "CONFIG_ERROR", 500, corsHeaders);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const batchSize = Math.min(body.batch_size ?? 10, 20);
    const dryRun = body.dry_run ?? true;
    const targetGender = body.target_gender;

    let query = supabase
      .from("product_catalog")
      .select("id, name, brand, retailer, category, image_url, gender, image_confidence, tags, product_url")
      .eq("is_active", true)
      .not("image_url", "is", null)
      .order("image_confidence", { ascending: false, nullsFirst: false })
      .limit(batchSize);

    if (targetGender) {
      query = query.eq("gender", targetGender);
    } else {
      query = query.eq("gender", "unisex");
    }

    query = query.not("tags", "cs", '{"gender_ai_verified"}');

    const { data: products, error } = await query;
    if (error) return errorResponse(error.message, "DB_ERROR", 500, corsHeaders);
    if (!products?.length) {
      return successResponse({ message: "No products to classify", results: [] }, 200, corsHeaders);
    }

    console.log(`Classifying gender for ${products.length} products (dry_run=${dryRun})...`);

    const results: ClassifyResult[] = [];

    for (let i = 0; i < products.length; i += 5) {
      const chunk = products.slice(i, i + 5);
      const settled = await Promise.allSettled(
        chunk.map(async (product) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const headResp = await fetch(product.image_url, {
              method: "HEAD", redirect: "follow", signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!headResp.ok) {
              return null;
            }

            const urlHint = product.product_url ? `\n- Product URL: "${product.product_url}" (check URL path for /women/, /men/, /womens/, /mens/ segments — retailers encode gender in their URL taxonomy)` : "";
            const prompt = `Look at this product image carefully. Your ONLY task is to determine the target gender audience.

Rules:
- "womens" if: the product is modeled on/designed for women, has feminine styling (dresses, heels, bikinis, bras, leggings, clutches, women's cuts)
- "mens" if: the product is modeled on/designed for men, has masculine styling (suits, boxers, men's cuts, ties, swim trunks)  
- "unisex" ONLY if the product is truly gender-neutral with NO gendered cues (basic sneakers, plain accessories, simple outerwear)
- IMPORTANT: If the product URL contains "/women/" or "women-clothing" or "women+apparel", it is almost certainly "womens"
- IMPORTANT: If the product URL contains "/men/" or "men-clothing" or "men+apparel", it is almost certainly "mens"

Product context:
- Name: "${product.name}"
- Brand: "${product.brand}"  
- Category: "${product.category}"
- Current gender: "${product.gender}"${urlHint}

Respond ONLY with valid JSON (no markdown):
{"gender": "mens/womens/unisex", "confidence": 0.0-1.0, "reason": "brief explanation"}`;

            const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [{
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: product.image_url } },
                  ],
                }],
              }),
            });

            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`AI ${response.status}: ${errText}`);
            }

            const data = await response.json();
            const raw = data.choices?.[0]?.message?.content ?? "";
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error(`No JSON: ${raw.slice(0, 100)}`);

            const parsed = JSON.parse(jsonMatch[0]);
            const aiGender = VALID_GENDERS.includes(parsed.gender) ? parsed.gender : "unisex";

            return {
              id: product.id,
              name: product.name,
              old_gender: product.gender,
              ai_gender: aiGender,
              confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
              reason: String(parsed.reason || ""),
              agreed: aiGender === product.gender,
            } as ClassifyResult;
          } catch (e) {
            console.error(`Error classifying ${product.id}:`, e);
            return null;
          }
        })
      );

      for (const s of settled) {
        if (s.status === "fulfilled" && s.value) {
          results.push(s.value);
        }
      }
    }

    let updated = 0;
    if (!dryRun) {
      for (const r of results) {
        if (!r.agreed && r.confidence >= 0.7) {
          const product = products.find(p => p.id === r.id);
          const existingTags: string[] = Array.isArray(product?.tags) ? product.tags : [];
          const newTags = [...new Set([...existingTags, "gender_ai_verified"])];
          
          await supabase
            .from("product_catalog")
            .update({ gender: r.ai_gender, tags: newTags })
            .eq("id", r.id);
          updated++;
        } else {
          const product = products.find(p => p.id === r.id);
          const existingTags: string[] = Array.isArray(product?.tags) ? product.tags : [];
          const newTags = [...new Set([...existingTags, "gender_ai_verified"])];
          
          await supabase
            .from("product_catalog")
            .update({ tags: newTags })
            .eq("id", r.id);
        }
      }
    }

    const disagreements = results.filter(r => !r.agreed);
    const accuracy = results.length > 0 
      ? ((results.length - disagreements.length) / results.length * 100).toFixed(1) 
      : "N/A";

    const summary = {
      processed: results.length,
      agreed: results.length - disagreements.length,
      disagreements: disagreements.length,
      accuracy_pct: accuracy,
      updated: dryRun ? 0 : updated,
      dry_run: dryRun,
      disagreement_details: disagreements.map(d => ({
        id: d.id,
        name: d.name.slice(0, 60),
        old: d.old_gender,
        ai: d.ai_gender,
        confidence: d.confidence,
        reason: d.reason,
      })),
      all_results: results.map(r => ({
        id: r.id,
        name: r.name.slice(0, 60),
        old: r.old_gender,
        ai: r.ai_gender,
        confidence: r.confidence,
        agreed: r.agreed,
      })),
    };

    console.log(`Gender classify: ${results.length} processed, ${accuracy}% agreement, ${disagreements.length} disagreements`);

    return successResponse(summary, 200, corsHeaders);
  } catch (e) {
    console.error("classify-gender-image error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
