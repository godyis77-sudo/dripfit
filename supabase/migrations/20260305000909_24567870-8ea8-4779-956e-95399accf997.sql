
-- Reclassify obviously women's products from unisex
UPDATE product_catalog SET gender = 'womens' WHERE gender = 'unisex' AND is_active = true AND (
  LOWER(name) LIKE '%women%' OR LOWER(name) LIKE '%girl%' OR LOWER(name) LIKE '%ladies%'
  OR LOWER(name) LIKE '%blouse%' OR LOWER(name) LIKE '%bikini%' OR LOWER(name) LIKE '%heels%'
  OR LOWER(name) LIKE '% bra %' OR LOWER(name) LIKE '%lingerie%'
  OR LOWER(name) LIKE '%maternity%' OR LOWER(name) LIKE '%bodysuit%'
  OR category IN ('dresses', 'dress', 'skirts', 'heels')
);

-- Reclassify obviously men's products from unisex
UPDATE product_catalog SET gender = 'mens' WHERE gender = 'unisex' AND is_active = true AND (
  LOWER(name) LIKE '%men''s%' OR LOWER(name) LIKE '% men %' OR LOWER(name) LIKE '%for men%'
  OR LOWER(name) LIKE '% boy %' OR LOWER(name) LIKE '%for boys%'
);

-- Retailer-based overrides for strongly gendered retailers
UPDATE product_catalog SET gender = 'womens' WHERE gender = 'unisex' AND is_active = true AND LOWER(retailer) IN ('revolve', 'prettylittlething', 'fashion nova', 'fashionnova');
UPDATE product_catalog SET gender = 'mens' WHERE gender = 'unisex' AND is_active = true AND LOWER(retailer) IN ('mr porter');
