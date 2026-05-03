ALTER TABLE public.creator_leads
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS segment text;

CREATE OR REPLACE FUNCTION public.set_creator_lead_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.follower_count IS NULL THEN
    NEW.tier := NULL;
  ELSIF NEW.follower_count < 10000 THEN
    NEW.tier := 'nano';
  ELSIF NEW.follower_count < 50000 THEN
    NEW.tier := 'micro';
  ELSIF NEW.follower_count < 250000 THEN
    NEW.tier := 'mid';
  ELSE
    NEW.tier := 'macro';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_lead_tier ON public.creator_leads;
CREATE TRIGGER trg_creator_lead_tier
BEFORE INSERT OR UPDATE OF follower_count ON public.creator_leads
FOR EACH ROW
EXECUTE FUNCTION public.set_creator_lead_tier();

UPDATE public.creator_leads SET follower_count = follower_count WHERE follower_count IS NOT NULL;