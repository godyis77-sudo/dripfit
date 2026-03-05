
-- Reclassify bags that are clearly women's products from 'unisex' to 'womens'
UPDATE product_catalog
SET gender = 'womens'
WHERE category = 'bags'
  AND gender = 'unisex'
  AND is_active = true
  AND (
    -- Keywords indicating women's bags
    lower(name) LIKE '%handbag%'
    OR lower(name) LIKE '%tote bag%'
    OR lower(name) LIKE '%clutch%'
    OR lower(name) LIKE '%ruched%'
    OR lower(name) LIKE '%satin%'
    OR lower(name) LIKE '%mini bag%'
    OR lower(name) LIKE '%micro bag%'
    OR lower(name) LIKE '%luggage tote%'
    OR lower(name) LIKE '%chain bag%'
    OR lower(name) LIKE '%shoulder bag%'
    OR lower(name) LIKE '%hobo%'
    OR lower(name) LIKE '%bucket bag%'
    OR lower(name) LIKE '%evening bag%'
    OR lower(name) LIKE '%wristlet%'
    OR lower(name) LIKE '%coin purse%'
    OR lower(name) LIKE '%card case%'
    -- Image URLs showing women modeling (ASOS women's product images)
    OR lower(image_url) LIKE '%/products/asos-design-micro-ruched%'
    -- Brands/retailers with women's bag focus on unisex listings
    OR (lower(brand) = 'adidas' AND lower(name) LIKE '%handbag%')
    OR (lower(brand) = 'saks' AND lower(name) LIKE '%extra cut%')
  );

-- Also reclassify PASQ bags (women's brand)
UPDATE product_catalog
SET gender = 'womens'
WHERE category = 'bags'
  AND gender IN ('unisex', 'mens')
  AND is_active = true
  AND lower(name) LIKE '%pasq%';
