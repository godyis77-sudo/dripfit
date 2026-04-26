UPDATE public.weekly_outfits
SET is_hero = true
WHERE week_id = '2026-W17'
  AND is_active = true
  AND hero_image_url IS NULL;