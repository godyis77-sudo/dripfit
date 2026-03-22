
-- Background categories (curated collection metadata)
CREATE TABLE public.background_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_seasonal BOOLEAN DEFAULT false,
  season_start DATE,
  season_end DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual backgrounds (curated collection)
CREATE TABLE public.backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES background_categories(id),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  source TEXT DEFAULT 'curated',
  source_id TEXT,
  photographer TEXT,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_backgrounds_category ON backgrounds(category_id);
CREATE INDEX idx_backgrounds_tags ON backgrounds USING GIN(tags);
CREATE INDEX idx_backgrounds_popular ON backgrounds(usage_count DESC);

-- User uploaded backgrounds
CREATE TABLE public.user_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_backgrounds_user ON user_backgrounds(user_id);

-- Saved composites (user's finished images)
CREATE TABLE public.saved_composites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tryon_result_id UUID,
  background_id UUID,
  background_source TEXT,
  storage_path TEXT NOT NULL,
  shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_composites_user ON saved_composites(user_id);

-- RLS
ALTER TABLE background_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON background_categories FOR SELECT USING (true);

ALTER TABLE backgrounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON backgrounds FOR SELECT USING (true);

ALTER TABLE user_backgrounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read" ON user_backgrounds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert" ON user_backgrounds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete" ON user_backgrounds FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE saved_composites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read" ON saved_composites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert" ON saved_composites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete" ON saved_composites FOR DELETE USING (auth.uid() = user_id);
