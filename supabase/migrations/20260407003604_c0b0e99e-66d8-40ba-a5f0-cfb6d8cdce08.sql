CREATE OR REPLACE FUNCTION public.normalize_weekly_outfit_category(input_category text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  c text := lower(coalesce(input_category, ''));
BEGIN
  IF c = '' THEN
    RETURN NULL;
  ELSIF c LIKE '%shoe%' OR c LIKE '%sneaker%' OR c LIKE '%boot%' OR c LIKE '%heel%' OR c LIKE '%loafer%' OR c LIKE '%mule%' OR c LIKE '%sandal%' OR c LIKE '%slipper%' OR c LIKE '%flat%' THEN
    RETURN 'footwear';
  ELSIF c LIKE '%pant%' OR c LIKE '%jean%' OR c LIKE '%trouser%' OR c LIKE '%skirt%' OR c LIKE '%short%' OR c LIKE '%legging%' OR c LIKE '%bottom%' THEN
    RETURN 'bottom';
  ELSIF c LIKE '%dress%' OR c LIKE '%jumpsuit%' OR c LIKE '%romper%' THEN
    RETURN 'one_piece';
  ELSIF c LIKE '%jacket%' OR c LIKE '%coat%' OR c LIKE '%blazer%' OR c LIKE '%outerwear%' OR c LIKE '%cardigan%' THEN
    RETURN 'outerwear';
  ELSIF c LIKE '%shirt%' OR c LIKE '%tee%' OR c LIKE '%t-shirt%' OR c LIKE '%top%' OR c LIKE '%tank%' OR c LIKE '%blouse%' OR c LIKE '%sweater%' OR c LIKE '%hoodie%' OR c LIKE '%knit%' THEN
    RETURN 'top';
  ELSIF c LIKE '%hat%' OR c LIKE '%cap%' OR c LIKE '%beanie%' THEN
    RETURN 'headwear';
  ELSIF c LIKE '%bag%' OR c LIKE '%purse%' OR c LIKE '%tote%' THEN
    RETURN 'bag';
  ELSE
    RETURN c;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_outfit_item_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  normalized_category text;
BEGIN
  normalized_category := public.normalize_weekly_outfit_category(NEW.category);

  IF normalized_category IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.weekly_outfit_items
    WHERE outfit_id = NEW.outfit_id
      AND public.normalize_weekly_outfit_category(category) = normalized_category
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Duplicate category slot "%" in outfit %', normalized_category, NEW.outfit_id;
  END IF;

  RETURN NEW;
END;
$$;

DELETE FROM public.weekly_outfit_items
WHERE id IN (
  '70b8ada2-f4aa-48a9-91f6-af35c26fd960',
  '605a28cc-9b5f-4ca1-9e21-7d80f7d7cd70',
  '4ac7ee79-6e92-4670-8b33-40b09ea9f39b'
);