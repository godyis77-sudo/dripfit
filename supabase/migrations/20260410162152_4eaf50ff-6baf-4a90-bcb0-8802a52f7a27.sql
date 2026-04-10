
-- Enable pg_net (pg_cron already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create scrape_runs table for tracking batch scrape jobs
CREATE TABLE public.scrape_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number integer NOT NULL DEFAULT 0,
  total_jobs integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scraping',
  post_process_at timestamp with time zone NOT NULL DEFAULT (now() + interval '2 minutes'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS (no policies = service-role only access)
ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;

-- Index for the cron job to find pending rows efficiently
CREATE INDEX idx_scrape_runs_pending ON public.scrape_runs (status, post_process_at)
  WHERE status = 'scraping';
