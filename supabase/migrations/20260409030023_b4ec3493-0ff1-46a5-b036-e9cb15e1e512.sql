
-- Create editorial templates table
CREATE TABLE public.outfit_editorial_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  occasion text NOT NULL,
  background_prompt text NOT NULL,
  model_prompt text NOT NULL,
  color_grade text,
  mood text,
  season text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.outfit_editorial_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can read active templates"
ON public.outfit_editorial_templates
FOR SELECT
TO public
USING (is_active = true);

-- Admin-only write
CREATE POLICY "Admins can manage templates"
ON public.outfit_editorial_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed templates
INSERT INTO public.outfit_editorial_templates (occasion, background_prompt, model_prompt, color_grade, mood, season) VALUES
('night_out', 'Upscale rooftop bar at night, city skyline bokeh lights, warm amber and gold tones, shallow depth of field', 'Model standing confidently at a railing, evening posture, looking away from camera, cinematic rim lighting', 'Rich amber highlights, deep chocolate shadows, film grain 10%', 'Arrival, confidence, belonging', null),
('beach_day', 'Mediterranean coastal terrace overlooking turquoise water, white linen curtains blowing, golden hour sunlight', 'Model leaning against a stone railing, relaxed posture, wind in hair, natural smile, sun-kissed skin', 'Warm golden highlights, soft teal shadows, bright and airy', 'Effortless, coastal, freedom', 'summer'),
('lunch_date', 'Parisian café terrace with marble tables, wrought iron chairs, dappled sunlight through trees, shallow DOF', 'Model seated at café table, crossed legs, one hand on espresso cup, editorial three-quarter pose', 'Soft cream highlights, sage green shadows, film grain 5%', 'Polished casual, intelligent, approachable', null),
('chill_day', 'Minimalist luxury apartment interior, concrete floors, large windows with city view, soft overcast light', 'Model on a low sofa, relaxed posture, legs tucked, reading position, natural and unposed', 'Neutral tones, soft contrast, warm whites', 'Intentional comfort, premium simplicity', null),
('office_flex', 'Modern glass office lobby with marble floors, architectural lines, morning light streaming through windows', 'Model walking through lobby carrying a structured bag, purposeful stride, shot from side angle', 'Cool blue-grey shadows, warm skin tones, crisp contrast', 'Authority, modern professional, fashion-forward', null),
('brunch_vibes', 'Garden courtyard with trailing ivy, stone archways, morning sunlight, linen tablecloth on round table', 'Model standing in archway, weight on one hip, relaxed editorial pose, soft smile, looking off-camera', 'Warm pastels, lavender shadows, soft bloom', 'Weekend polish, effortless chic', null);
