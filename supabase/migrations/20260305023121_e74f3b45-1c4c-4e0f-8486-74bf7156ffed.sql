
-- Reclassify misgendered activewear: ASOS women's article and Rhone crop top
UPDATE product_catalog
SET gender = 'womens'
WHERE category = 'activewear'
  AND gender = 'unisex'
  AND is_active = true
  AND (
    lower(name) LIKE '%seamless activewear%'
    OR lower(name) LIKE '%crop%'
  );
