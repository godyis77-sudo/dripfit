
CREATE INDEX IF NOT EXISTS idx_product_catalog_active_conf
  ON public.product_catalog (is_active, image_confidence DESC NULLS LAST)
  WHERE image_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_catalog_brand_lower_cat_scraped
  ON public.product_catalog (lower(brand), category, scraped_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_catalog_active_created
  ON public.product_catalog (is_active, created_at);

DROP POLICY IF EXISTS "Anyone can insert waitlist signups" ON public.waitlist_signups;
CREATE POLICY "Anyone can insert waitlist signups"
  ON public.waitlist_signups FOR INSERT
  WITH CHECK (
    char_length(email) BETWEEN 3 AND 320
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

DROP POLICY IF EXISTS "Anyone can submit partnership leads" ON public.partnership_leads;
CREATE POLICY "Anyone can submit partnership leads"
  ON public.partnership_leads FOR INSERT
  WITH CHECK (
    char_length(coalesce(email,'')) BETWEEN 3 AND 320
    AND char_length(coalesce(company_name,'')) BETWEEN 1 AND 200
    AND char_length(coalesce(message,'')) <= 5000
  );

DROP POLICY IF EXISTS "Anyone can submit creator applications" ON public.creator_leads;
CREATE POLICY "Anyone can submit creator applications"
  ON public.creator_leads FOR INSERT
  WITH CHECK (
    char_length(coalesce(email,'')) BETWEEN 3 AND 320
    AND char_length(coalesce(name,'')) BETWEEN 1 AND 200
    AND char_length(coalesce(message,'')) <= 5000
  );

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_guest_sessions() FROM PUBLIC, anon, authenticated;
