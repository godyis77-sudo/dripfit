
-- Create community_votes table for persisting vote selections
CREATE TABLE public.community_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  vote_key TEXT NOT NULL CHECK (vote_key IN ('love', 'buy', 'keep_shopping')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, vote_key)
);

-- Enable RLS
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read vote counts
CREATE POLICY "Anyone can view votes"
  ON public.community_votes FOR SELECT
  USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "Users can insert own votes"
  ON public.community_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
  ON public.community_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_community_votes_post_id ON public.community_votes(post_id);
CREATE INDEX idx_community_votes_user_id ON public.community_votes(user_id);
