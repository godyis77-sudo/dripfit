ALTER TABLE public.product_catalog 
  ADD COLUMN IF NOT EXISTS fit_profile text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fabric_composition text[] DEFAULT '{}';