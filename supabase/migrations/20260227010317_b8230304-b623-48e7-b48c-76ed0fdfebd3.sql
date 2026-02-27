
ALTER TABLE public.body_scans
  ADD COLUMN bust_min numeric DEFAULT 0,
  ADD COLUMN bust_max numeric DEFAULT 0,
  ADD COLUMN sleeve_min numeric DEFAULT 0,
  ADD COLUMN sleeve_max numeric DEFAULT 0;
