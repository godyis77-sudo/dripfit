CREATE TABLE public.partnership_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  return_rate TEXT,
  message TEXT,
  source TEXT DEFAULT 'partnership_page',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partnership_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can submit a lead
CREATE POLICY "Anyone can submit partnership leads"
ON public.partnership_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read leads
CREATE POLICY "Admins can read partnership leads"
ON public.partnership_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));