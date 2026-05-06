-- Lock down tables that have RLS enabled but no policies. Service role
-- bypasses RLS so internal pipelines (definer functions, edge functions
-- using SUPABASE_SERVICE_ROLE_KEY) keep working. This explicitly denies
-- anon/authenticated access and silences the linter.

-- access_codes: only readable/writable via claim_founder_code() definer fn
CREATE POLICY "deny_all_anon_authenticated_select" ON public.access_codes
  FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_all_anon_authenticated_modify" ON public.access_codes
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- guest_sessions: only managed by edge functions via service role
CREATE POLICY "deny_all_anon_authenticated_select" ON public.guest_sessions
  FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_all_anon_authenticated_modify" ON public.guest_sessions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- scrape_runs: internal pipeline observability, service role only
CREATE POLICY "deny_all_anon_authenticated_select" ON public.scrape_runs
  FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_all_anon_authenticated_modify" ON public.scrape_runs
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);