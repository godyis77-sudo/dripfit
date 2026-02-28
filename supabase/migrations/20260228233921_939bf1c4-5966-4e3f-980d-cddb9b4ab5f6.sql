
-- Unique constraints for deduplication
ALTER TABLE product_catalog
  ADD CONSTRAINT products_product_url_unique UNIQUE (product_url);

ALTER TABLE product_catalog
  ADD CONSTRAINT products_image_url_unique UNIQUE (image_url);

-- Index for brand+category lookups
CREATE INDEX IF NOT EXISTS idx_product_catalog_brand_category
  ON product_catalog (brand, category);

-- New columns for scraping metadata
ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS
  scraped_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS
  presentation TEXT
  CHECK (presentation IN ('ghost_mannequin', 'flat_lay', 'model_shot'));

ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS
  image_confidence NUMERIC(3,2)
  CHECK (image_confidence BETWEEN 0 AND 1);

ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS
  scrape_source TEXT;
