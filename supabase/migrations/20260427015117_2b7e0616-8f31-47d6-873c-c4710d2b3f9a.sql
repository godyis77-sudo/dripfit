INSERT INTO public.background_categories (slug, name, icon, sort_order, is_seasonal)
VALUES ('editorial', 'Editorial', '✨', 0, false)
ON CONFLICT (slug) DO NOTHING;