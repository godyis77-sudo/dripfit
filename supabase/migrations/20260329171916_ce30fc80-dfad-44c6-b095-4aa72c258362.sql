-- Fix Salomon tiny thumbnails: replace width=100 with width=720
UPDATE product_catalog
SET image_url = REPLACE(image_url, '&width=100', '&width=720'),
    updated_at = now()
WHERE is_active = true AND brand = 'Salomon' AND image_url LIKE '%&width=100%';

-- Fix Vuori tiny thumbnails: replace width=100 with width=720 and height=125 with height=900
UPDATE product_catalog
SET image_url = REPLACE(REPLACE(image_url, '&width=100', '&width=720'), '&height=125', '&height=900'),
    updated_at = now()
WHERE is_active = true AND brand = 'Vuori' AND (image_url LIKE '%width=100%' OR image_url LIKE '%height=125%');