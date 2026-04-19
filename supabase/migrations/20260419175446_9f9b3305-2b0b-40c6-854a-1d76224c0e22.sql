-- Clean up junk "brands" caused by Shopify vendor field misuse.
-- These are season/collection tags that the scraper mistakenly stored as brands.

-- Define junk brand names (season codes, collection tags, store names, etc.)
WITH junk_brands AS (
  SELECT unnest(ARRAY[
    'FW19','FW20','FW21','FW22','FW23','FW24','FW25','FW25 Other','FW24 Other','FW23 Other','FW22 Other','FW21 Other',
    'SS22','SS23','SS24','SS24 Other','SS25','SS25 Other','SS26','SS26 Other','PRE SS25','PRE FW25','PRE SS26',
    'BF24','BF25','SC23','SC24','SC25',
    'CARRYOVER','WHOLESALE EXCLUSIVE','Prestige Exclusive','Exclusives','LA Store',
    'Logo Pack','GIFT CARD','Womens 247','Womens FW24',
    'FEAR OF GOD ATHLETICS','Coperni Sandbox','DianaCorp','Daily Paper Worldwide','Custom Club',
    'ART THAT KILLS'
  ]) AS b
),
-- For each Shopify shop, find the dominant *real* (non-junk) brand
shop_real_brand AS (
  SELECT DISTINCT ON (scrape_source)
    scrape_source,
    brand AS real_brand
  FROM product_catalog
  WHERE scrape_source LIKE 'shopify:%'
    AND brand NOT IN (SELECT b FROM junk_brands)
    AND brand NOT IN (SELECT b FROM junk_brands WHERE b ~ '^(FW|SS|BF|SC|PRE)')
  ORDER BY scrape_source, (
    SELECT COUNT(*) FROM product_catalog pc2
    WHERE pc2.scrape_source = product_catalog.scrape_source
      AND pc2.brand = product_catalog.brand
  ) DESC
)
-- Reassign junk-branded rows to the dominant real brand for that shop
UPDATE product_catalog pc
SET brand = srb.real_brand,
    retailer = srb.real_brand
FROM shop_real_brand srb
WHERE pc.scrape_source = srb.scrape_source
  AND pc.brand IN (SELECT b FROM junk_brands);

-- Delete any remaining junk-branded rows that couldn't be reassigned
-- (e.g., shops with no real brand identified)
DELETE FROM product_catalog
WHERE brand IN (
  'FW19','FW20','FW21','FW22','FW23','FW24','FW25','FW25 Other','FW24 Other','FW23 Other','FW22 Other','FW21 Other',
  'SS22','SS23','SS24','SS24 Other','SS25','SS25 Other','SS26','SS26 Other','PRE SS25','PRE FW25','PRE SS26',
  'BF24','BF25','SC23','SC24','SC25',
  'CARRYOVER','WHOLESALE EXCLUSIVE','Prestige Exclusive','Exclusives','LA Store',
  'Logo Pack','GIFT CARD','Womens 247','Womens FW24',
  'FEAR OF GOD ATHLETICS','Coperni Sandbox','DianaCorp','Daily Paper Worldwide','Custom Club',
  'ART THAT KILLS'
);