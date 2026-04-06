
-- Add hero_image_url to weekly_outfits
ALTER TABLE public.weekly_outfits ADD COLUMN hero_image_url text;

-- Create validation trigger to prevent duplicate categories within an outfit
CREATE OR REPLACE FUNCTION public.validate_outfit_item_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.weekly_outfit_items
    WHERE outfit_id = NEW.outfit_id
      AND category = NEW.category
      AND category IS NOT NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Duplicate category "%" in outfit %', NEW.category, NEW.outfit_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_outfit_item_category
  BEFORE INSERT OR UPDATE ON public.weekly_outfit_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_outfit_item_category();
