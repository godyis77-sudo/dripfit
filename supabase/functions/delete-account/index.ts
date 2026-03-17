import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { successResponse, errorResponse, getCorsHeaders } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", "AUTH_ERROR", 401, corsHeaders);
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
      return errorResponse("Unauthorized", "AUTH_ERROR", 401, corsHeaders);
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
      return errorResponse("Failed to delete account. Please try again.", "DELETE_ERROR", 500, corsHeaders);
    }

    return successResponse({ success: true }, 200, corsHeaders);
  } catch (err) {
    console.error("Delete account error:", err);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
