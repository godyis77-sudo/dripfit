import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user with anon client
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Use service role to delete user data and auth account
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete user data from all tables (order matters for foreign keys)
    const tables = [
      { table: "post_comments", col: "user_id" },
      { table: "tryon_ratings", col: "rater_user_id" },
      { table: "community_votes", col: "user_id" },
      { table: "tryon_posts", col: "user_id" },
      { table: "fit_feedback", col: "user_id" },
      { table: "saved_items", col: "user_id" },
      { table: "body_scans", col: "user_id" },
      { table: "clothing_wardrobe", col: "user_id" },
      { table: "user_favorite_retailers", col: "user_id" },
      { table: "user_preferred_brands", col: "user_id" },
      { table: "user_preferences", col: "user_id" },
      { table: "user_follows", col: "follower_id" },
      { table: "user_follows", col: "following_id" },
      { table: "user_subscriptions", col: "user_id" },
      { table: "size_recommendations_cache", col: "user_id" },
      { table: "brand_requests", col: "requested_by" },
      { table: "user_roles", col: "user_id" },
      { table: "profiles", col: "user_id" },
    ];

    for (const { table, col } of tables) {
      await supabaseAdmin.from(table).delete().eq(col, userId);
    }

    // Delete storage files (avatars + tryon-images)
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from("avatars")
      .list(userId);
    if (avatarFiles?.length) {
      await supabaseAdmin.storage
        .from("avatars")
        .remove(avatarFiles.map((f) => `${userId}/${f.name}`));
    }

    const { data: tryonFiles } = await supabaseAdmin.storage
      .from("tryon-images")
      .list(userId);
    if (tryonFiles?.length) {
      await supabaseAdmin.storage
        .from("tryon-images")
        .remove(tryonFiles.map((f) => `${userId}/${f.name}`));
    }

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Delete account error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
