
-- Make daily_key NOT NULL with a default
ALTER TABLE public.tryon_usage ALTER COLUMN daily_key SET NOT NULL;
ALTER TABLE public.tryon_usage ALTER COLUMN daily_key SET DEFAULT to_char(now(), 'YYYY-MM-DD');

-- Drop old PK and create new one based on daily_key
ALTER TABLE public.tryon_usage DROP CONSTRAINT tryon_usage_pkey;
ALTER TABLE public.tryon_usage ADD PRIMARY KEY (user_id, daily_key);
