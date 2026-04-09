
-- Recategorize remaining real clothing from 'other' to correct categories
UPDATE product_catalog SET category = 'bottoms' WHERE id IN (
  '2a52f047-90de-44eb-a787-201e77df1c4d', -- VENICE COURT SHORTS
  'ef5ecf00-fffc-40bf-960a-d71a6c667cf0', -- Basketball Shorts
  '7a26ddcc-5fb4-41b6-98d5-ef0db9fc6821', -- WOMEN'S MA FLAMES SWEATPANT
  '87977c94-1b7d-45e0-a85a-8f27df9a854c'  -- Womens Sunfaded Wide Leg Sweatpant
) AND is_active = true;

-- Deactivate non-clothing
UPDATE product_catalog SET is_active = false WHERE id = '3bd736e5-32af-42fc-bbca-14535fa70cd6'; -- THOUGHT I WOULDN'T LIKE THAT? (unknown non-clothing)
