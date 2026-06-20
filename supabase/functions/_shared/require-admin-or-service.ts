// Allow either service-role bearer OR an authenticated admin user JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function requireAdminOrService(
  req: Request,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (token && serviceKey && token === serviceKey) return { ok: true };

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  if (token && supabaseUrl && serviceKey) {
    try {
      const sb = createClient(supabaseUrl, serviceKey);
      const { data: userData } = await sb.auth.getUser(token);
      const uid = userData?.user?.id;
      if (uid) {
        const { data: isAdmin } = await sb.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        if (isAdmin === true) return { ok: true };
      }
    } catch (_) { /* fall through */ }
  }

  return {
    ok: false,
    response: new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: corsHeaders },
    ),
  };
}
