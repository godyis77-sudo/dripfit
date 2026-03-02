
-- Drop old constraint and add expanded category list
ALTER TABLE public.brand_size_charts DROP CONSTRAINT brand_size_charts_category_check;

ALTER TABLE public.brand_size_charts ADD CONSTRAINT brand_size_charts_category_check
CHECK (category = ANY (ARRAY[
  'tops', 'bottoms', 'dresses', 'outerwear', 'footwear', 'activewear',
  'jeans', 'blazers', 'jackets', 'coats', 'hoodies', 'sweaters',
  'shirts', 't-shirts', 'pants', 'shorts', 'skirts', 'leggings',
  'swimwear', 'loungewear', 'underwear', 'accessories',
  'bags', 'hats', 'jewelry', 'watches', 'sunglasses', 'belts', 'scarves',
  'sneakers', 'boots', 'sandals', 'loafers', 'heels',
  'polos', 'vests', 'jumpsuits'
]));
