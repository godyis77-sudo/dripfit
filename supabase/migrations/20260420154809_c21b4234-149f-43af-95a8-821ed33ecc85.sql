-- Reclassify miscategorized footwear from accessories to proper shoe categories.
-- Prevents one outfit from getting two shoes (e.g. sneakers + a "hat" that's actually a slingback).
UPDATE public.product_catalog
SET category = 'heels'
WHERE id IN (
  '88355e45-430b-4662-b0ec-e85f23679c57',  -- Rothy's Almond Slingback Tawny
  '6630468b-b338-4014-8cbf-8087dd0b8bfb',  -- Rothy's Almond Slingback Conch
  'fc6680d6-d89e-4c38-a0f1-5709754d0f4e'   -- Rothy's Square Mary Jane Cream
);

UPDATE public.product_catalog
SET category = 'boots'
WHERE id = '8344df2f-1c87-488a-814a-38e1829db6e4';  -- Prada Boots was tagged 'bags'