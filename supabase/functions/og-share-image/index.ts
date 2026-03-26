import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generates an HTML-based OG preview card for a try-on post.
 * Returns an HTML page with meta tags and a styled card that can be
 * screenshot-captured by social platforms or used as a share preview.
 *
 * Usage: GET /og-share-image?postId=<uuid>
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const postId = url.searchParams.get("postId");

  if (!postId) {
    return new Response("Missing postId", { status: 400, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch post
  const { data: post, error } = await supabaseAdmin
    .from("tryon_posts")
    .select("result_photo_url, caption, clothing_category, user_id, created_at")
    .eq("id", postId)
    .eq("is_public", true)
    .eq("moderation_status", "approved")
    .maybeSingle();

  if (error || !post) {
    return new Response("Post not found", { status: 404, headers: corsHeaders });
  }

  // Fetch profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("user_id", post.user_id)
    .maybeSingle();

  const displayName = profile?.display_name || "DripFit User";
  const caption = post.caption || "Check out this virtual try-on!";
  const category = post.clothing_category || "Style";
  const resultUrl = post.result_photo_url;

  // Build OG HTML card
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta property="og:title" content="${escapeHtml(displayName)} - ${escapeHtml(category)} Try-On"/>
  <meta property="og:description" content="${escapeHtml(caption.slice(0, 150))}"/>
  <meta property="og:image" content="${escapeHtml(resultUrl)}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:type" content="article"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeHtml(displayName)} - Virtual Try-On"/>
  <meta name="twitter:description" content="${escapeHtml(caption.slice(0, 150))}"/>
  <meta name="twitter:image" content="${escapeHtml(resultUrl)}"/>
  <title>${escapeHtml(displayName)} - DripFitCheck</title>
  <style>
    body { margin:0; background:#0a0a0a; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:system-ui,-apple-system,sans-serif; }
    .card { width:1200px; height:630px; background:linear-gradient(135deg,#0a0a0a,#1a1a2e); display:flex; overflow:hidden; border-radius:16px; }
    .img-side { width:55%; position:relative; }
    .img-side img { width:100%; height:100%; object-fit:cover; }
    .info-side { width:45%; padding:48px; display:flex; flex-direction:column; justify-content:center; color:#fff; }
    .badge { background:linear-gradient(135deg,#d4af37,#f5d56e); color:#000; padding:6px 16px; border-radius:20px; font-size:14px; font-weight:700; display:inline-block; margin-bottom:16px; width:fit-content; }
    .name { font-size:32px; font-weight:800; margin-bottom:8px; }
    .caption { font-size:18px; color:#aaa; line-height:1.5; margin-bottom:24px; }
    .brand { font-size:14px; color:#666; letter-spacing:2px; text-transform:uppercase; }
  </style>
</head>
<body>
  <div class="card">
    <div class="img-side"><img src="${escapeHtml(resultUrl)}" alt="Try-on result"/></div>
    <div class="info-side">
      <div class="badge">${escapeHtml(category)}</div>
      <div class="name">${escapeHtml(displayName)}</div>
      <div class="caption">${escapeHtml(caption.slice(0, 120))}</div>
      <div class="brand">DRIPFITCHECK</div>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
