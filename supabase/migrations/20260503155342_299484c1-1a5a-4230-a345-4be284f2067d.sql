-- Add outreach tracking fields to creator_leads
ALTER TABLE public.creator_leads
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'inbound_form',
  ADD COLUMN IF NOT EXISTS handle TEXT,
  ADD COLUMN IF NOT EXISTS profile_url TEXT,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_creator_leads_status ON public.creator_leads(status);
CREATE INDEX IF NOT EXISTS idx_creator_leads_created_at ON public.creator_leads(created_at DESC);

-- Auto-update updated_at on changes
DROP TRIGGER IF EXISTS update_creator_leads_updated_at ON public.creator_leads;
CREATE TRIGGER update_creator_leads_updated_at
  BEFORE UPDATE ON public.creator_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Allow admins to update / delete leads (insert + select policies already exist)
DROP POLICY IF EXISTS "Admins can update creator leads" ON public.creator_leads;
CREATE POLICY "Admins can update creator leads"
ON public.creator_leads FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete creator leads" ON public.creator_leads;
CREATE POLICY "Admins can delete creator leads"
ON public.creator_leads FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Outreach activity log
CREATE TABLE IF NOT EXISTS public.creator_outreach_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.creator_leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'note', -- 'note' | 'email' | 'dm' | 'call' | 'status_change'
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_notes_lead_id ON public.creator_outreach_notes(lead_id, created_at DESC);

ALTER TABLE public.creator_outreach_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read outreach notes"
ON public.creator_outreach_notes FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can write outreach notes"
ON public.creator_outreach_notes FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = author_id);

CREATE POLICY "Admins can delete outreach notes"
ON public.creator_outreach_notes FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));