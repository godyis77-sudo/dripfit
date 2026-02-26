CREATE POLICY "Users can update own wardrobe"
ON public.clothing_wardrobe
FOR UPDATE
USING (auth.uid() = user_id);