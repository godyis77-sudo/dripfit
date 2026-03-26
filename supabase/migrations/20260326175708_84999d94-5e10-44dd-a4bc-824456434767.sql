-- Fix NULL clothing_category values and widen constraint to include NULL
-- Step 1: Set NULL categories to 'other'
UPDATE tryon_posts SET clothing_category = 'other' WHERE clothing_category IS NULL;

-- Step 2: Fix any legacy values not in the allowed set
UPDATE tryon_posts SET clothing_category = 'other' WHERE clothing_category NOT IN ('tops', 'bottoms', 'outerwear', 'dress', 'jumpsuit', 'other');

-- Step 3: Drop old constraint and recreate with NOT NULL default
ALTER TABLE tryon_posts ALTER COLUMN clothing_category SET DEFAULT 'other';
ALTER TABLE tryon_posts ALTER COLUMN clothing_category SET NOT NULL;