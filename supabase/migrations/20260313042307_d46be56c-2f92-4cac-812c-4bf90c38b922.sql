
-- Remap watches from jewelry → watches
UPDATE product_catalog
SET category = 'watches', updated_at = now()
WHERE is_active = true
  AND category = 'jewelry'
  AND (LOWER(name) LIKE '%watch%' OR LOWER(name) LIKE '%chronograph%' OR LOWER(name) LIKE '%timepiece%' OR LOWER(name) LIKE '%smartwatch%');

-- Deactivate listing/category pages that aren't real products
UPDATE product_catalog
SET is_active = false, updated_at = now()
WHERE is_active = true
  AND category IN ('jewelry', 'watches', 'accessories')
  AND LOWER(name) SIMILAR TO '%(men''s watches|women''s watches|watch straps|watch gifts|jewellery and accessories|jewelry under|fine jewelry|contemporary jewelry|gold plated & sterling|shop designer watches)%';
