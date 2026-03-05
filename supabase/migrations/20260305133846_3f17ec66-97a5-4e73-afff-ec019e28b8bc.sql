-- Fix women's products misclassified as unisex
UPDATE product_catalog
SET gender = 'womens'
WHERE is_active = true AND gender = 'unisex'
AND (
  LOWER(name) LIKE '%sports bra%' OR LOWER(name) LIKE '%sport bra%'
  OR LOWER(name) LIKE '%bralette%' OR LOWER(name) LIKE '%bikini%'
  OR LOWER(name) LIKE '%yoga pant%' OR LOWER(name) LIKE '%crop top%'
  OR LOWER(name) LIKE '%women''s%' OR LOWER(name) LIKE '%womens %'
  OR LOWER(name) LIKE '%for women%' OR LOWER(name) LIKE '%for her%'
  OR LOWER(name) LIKE '%legging%' OR LOWER(name) LIKE '%sports bras%'
  OR LOWER(name) LIKE '%tankini%' OR LOWER(name) LIKE '%romper%'
  OR LOWER(name) LIKE '%lingerie%' OR LOWER(name) LIKE '%maternity%'
  OR LOWER(name) LIKE '%camisole%' OR LOWER(name) LIKE '%plus-size sports%'
);

-- Fix men's products misclassified as unisex
UPDATE product_catalog
SET gender = 'mens'
WHERE is_active = true AND gender = 'unisex'
AND (
  LOWER(name) LIKE '%men''s%' OR LOWER(name) LIKE '%mens %'
  OR LOWER(name) LIKE '%for men%' OR LOWER(name) LIKE '%for him%'
  OR LOWER(name) LIKE '%boxer%' OR LOWER(name) LIKE '%men''s underwear%'
  OR LOWER(name) LIKE '%chino%' OR LOWER(name) LIKE '%dress shirt%'
  OR LOWER(name) LIKE '%tuxedo%' OR LOWER(name) LIKE '%waistcoat%'
)
AND NOT (
  LOWER(name) LIKE '%women%' OR LOWER(name) LIKE '%her%'
);