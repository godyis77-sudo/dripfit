-- Deactivate dead/junk products: AI flagged failures, low-confidence garbage, and category-page screenshots
UPDATE public.product_catalog
SET is_active = false, updated_at = now()
WHERE is_active = true
  AND (
    'ai_failed' = ANY(tags)
    OR 'ai_invalid' = ANY(tags)
    OR 'junk_image' = ANY(tags)
    OR 'category_page' = ANY(tags)
    OR 'kids_product' = ANY(tags)
    OR image_confidence < 0.15
  );