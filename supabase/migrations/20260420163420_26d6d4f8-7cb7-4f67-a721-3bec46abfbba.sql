INSERT INTO public.background_categories (slug, name, icon, sort_order, is_seasonal)
VALUES
  ('beach-tropical', 'Beach & Tropical', '🏝️', 13, false),
  ('wilderness-forest', 'Wilderness & Forest', '🌲', 14, false),
  ('mountains-lakes', 'Mountains & Lakes', '🏔️', 15, false)
ON CONFLICT (slug) DO NOTHING;