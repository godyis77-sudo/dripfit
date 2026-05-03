CREATE TABLE public.creator_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  audience_size TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit creator applications"
ON public.creator_leads FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view creator leads"
ON public.creator_leads FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage creator leads"
ON public.creator_leads FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));