// Shared admin-auth gate for internal pipeline edge functions.
// Allows callers presenting `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.
// Used to lock down scraping, backfill, and curation endpoints that should
// never be reachable from anonymous external callers.

export function requireServiceRole(req: Request): { ok: true } | { ok: false; response: Response } {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!token || !expected || token !== expected) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders },
      ),
    };
  }
  return { ok: true };
}
