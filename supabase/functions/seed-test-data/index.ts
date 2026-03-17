import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const userId = user.id;

    // 1. Update profile
    await serviceClient.from("profiles").update({
      display_name: "TestUser_QA",
      gender: "male",
      shopping_region: "US",
      instagram_handle: "@dripfit_tester",
    }).eq("user_id", userId);

    // 2. Insert body scan
    const { data: existingScan } = await supabase.from("body_scans").select("id").eq("user_id", userId).limit(1);
    if (!existingScan?.length) {
      await supabase.from("body_scans").insert({
        user_id: userId,
        height_cm: 178,
        shoulder_min: 44, shoulder_max: 46,
        chest_min: 96, chest_max: 100,
        waist_min: 82, waist_max: 86,
        hip_min: 96, hip_max: 100,
        inseam_min: 80, inseam_max: 82,
        sleeve_min: 62, sleeve_max: 64,
        bust_min: 0, bust_max: 0,
        confidence: "high",
        recommended_size: "M",
        front_photo_used: true,
        side_photo_used: true,
        reference_object: "credit_card",
      });
    }

    // 3. Insert wardrobe items
    const { data: existingWardrobe } = await supabase.from("clothing_wardrobe").select("id").eq("user_id", userId).limit(1);
    if (!existingWardrobe?.length) {
      const wardrobeItems = [
        { user_id: userId, image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", category: "top", brand: "Nike", retailer: "Nike", notes: "White essential tee" },
        { user_id: userId, image_url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400", category: "bottom", brand: "Levi's", retailer: "Nordstrom", notes: "511 slim jeans" },
        { user_id: userId, image_url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400", category: "outerwear", brand: "Zara", retailer: "Zara", notes: "Camel overcoat" },
        { user_id: userId, image_url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400", category: "top", brand: "Champion", retailer: "Urban Outfitters", notes: "Black hoodie" },
        { user_id: userId, image_url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400", category: "bottom", brand: "Nike", retailer: "Nike", notes: "Tech fleece joggers" },
      ];
      await supabase.from("clothing_wardrobe").insert(wardrobeItems);
    }

    // 4. Insert try-on posts (using placeholder images)
    const { data: existingPosts } = await supabase.from("tryon_posts").select("id").eq("user_id", userId).limit(1);
    if (!existingPosts?.length) {
      const tryonPosts = [
        {
          user_id: userId,
          user_photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
          clothing_photo_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
          result_photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
          caption: "Classic white tee — can't go wrong",
          is_public: true,
          clothing_category: "top",
          product_urls: ["https://www.nike.com/t/sportswear-mens-t-shirt"],
        },
        {
          user_id: userId,
          user_photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
          clothing_photo_url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400",
          result_photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
          caption: "Office ready?",
          is_public: true,
          clothing_category: "outerwear",
          product_urls: [],
        },
        {
          user_id: userId,
          user_photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
          clothing_photo_url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400",
          result_photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
          caption: null,
          is_public: false,
          clothing_category: "top",
          product_urls: [],
        },
      ];
      await supabase.from("tryon_posts").insert(tryonPosts);
    }

    // 5. Insert favorite retailers
    const { data: existingRetailers } = await supabase.from("user_favorite_retailers").select("id").eq("user_id", userId).limit(1);
    if (!existingRetailers?.length) {
      await supabase.from("user_favorite_retailers").insert([
        { user_id: userId, retailer_name: "Nike" },
        { user_id: userId, retailer_name: "Zara" },
        { user_id: userId, retailer_name: "Nordstrom" },
      ]);
    }

    // 6. Insert preferred brands
    const { data: existingBrands } = await supabase.from("user_preferred_brands").select("id").eq("user_id", userId).limit(1);
    if (!existingBrands?.length) {
      await supabase.from("user_preferred_brands").insert([
        { user_id: userId, brand_name: "Nike" },
        { user_id: userId, brand_name: "Zara" },
        { user_id: userId, brand_name: "Levi's" },
        { user_id: userId, brand_name: "Off-White" },
      ]);
    }

    // 7. Insert fit preference
    const { data: existingPrefs } = await supabase.from("user_preferences").select("id").eq("user_id", userId).limit(1);
    if (!existingPrefs?.length) {
      await supabase.from("user_preferences").insert({
        user_id: userId,
        fit_preference: "regular",
        calibration_brand: "Nike",
        calibration_size: "M",
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Test data seeded for user " + userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
