-- Fix Gymshark blurry images: replace _32x thumbnails with _720x for proper resolution
UPDATE product_catalog
SET image_url = REPLACE(image_url, '_32x.', '_720x.'),
    updated_at = now()
WHERE is_active = true
  AND image_url LIKE '%_32x.%';