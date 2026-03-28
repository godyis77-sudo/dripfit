
-- Deactivate non-wearable products: wallets, card holders, keychains, tote bags, pocket squares, gift cards, equipment, kids items, water bottles, basketballs (the ball itself)
UPDATE product_catalog SET is_active = false, updated_at = now()
WHERE is_active = true AND (
  -- Non-wearable accessories
  name ILIKE '%wallet%'
  OR name ILIKE '%card holder%'
  OR name ILIKE '%keychain%'
  OR name ILIKE '%tote bag%'
  OR name ILIKE '%pocket square%'
  OR name ILIKE '%gift card%'
  -- Kids/toddler items
  OR name ILIKE '%toddler%'
  OR name ILIKE '%infant%'
  OR name ILIKE '% little kids%'
  OR name ILIKE '% big kids%'
  -- Equipment & non-clothing
  OR name ILIKE '%massage gun%'
  OR name ILIKE '%hyperice%'
  OR name ILIKE '%water bottle%'
  OR name ILIKE '%nalgene%'
  OR (name ILIKE '% jug %' OR name ILIKE '% jug')
  OR name ILIKE '%soccer ball%'
  -- Basketball (the ball, not clothing)
  OR (name ILIKE '%basketball' AND name NOT ILIKE '%shoe%' AND name NOT ILIKE '%short%' AND name NOT ILIKE '%pant%' AND name NOT ILIKE '%jersey%' AND name NOT ILIKE '%t-shirt%' AND name NOT ILIKE '%hoodie%' AND name NOT ILIKE '%jacket%' AND name NOT ILIKE '%fleece%' AND name NOT ILIKE '%sock%' AND name NOT ILIKE '%tank%')
  -- Promotional/non-product pages
  OR name ILIKE '%get 10% off%'
  OR name ILIKE '%official:%'
);
