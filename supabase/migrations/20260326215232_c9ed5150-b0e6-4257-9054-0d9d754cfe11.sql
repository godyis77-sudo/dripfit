CREATE OR REPLACE FUNCTION public.get_filtered_catalog(p_categories text[] DEFAULT NULL::text[], p_brand text DEFAULT NULL::text, p_gender text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_fit_profile text DEFAULT NULL::text, p_retailer text DEFAULT NULL::text, p_price_min_cents integer DEFAULT NULL::integer, p_price_max_cents integer DEFAULT NULL::integer, p_min_confidence numeric DEFAULT 0.05, p_presentation text DEFAULT NULL::text, p_limit integer DEFAULT 200, p_offset integer DEFAULT 0)
 RETURNS SETOF product_catalog
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $$
  SELECT *
  FROM product_catalog
  WHERE is_active = true
    AND image_url IS NOT NULL
    AND image_confidence >= p_min_confidence
    AND (p_categories IS NULL OR category = ANY(p_categories))
    AND (p_brand IS NULL OR brand = p_brand)
    AND (p_gender IS NULL OR gender IN (p_gender, 'unisex'))
    AND (p_genre IS NULL OR style_genre = p_genre)
    AND (p_fit_profile IS NULL OR fit_profile @> ARRAY[p_fit_profile])
    AND (p_retailer IS NULL OR retailer = p_retailer)
    AND (p_price_min_cents IS NULL OR price_cents >= p_price_min_cents)
    AND (p_price_max_cents IS NULL OR price_cents <= p_price_max_cents)
    AND (p_presentation IS NULL OR presentation = p_presentation)
    AND image_url NOT ILIKE '%down_for_maintenance%'
    AND image_url NOT ILIKE '%placeholder%'
    AND image_url NOT ILIKE '%swatch%'
    AND image_url NOT ILIKE '%pixel%'
    AND image_url NOT ILIKE '%spacer%'
    AND image_url NOT ILIKE '%.gif%'
    AND image_url NOT ILIKE '%1x1%'
    AND image_url NOT ILIKE '%tracking%'
    AND image_url NOT ILIKE '%paymentmethods%'
    AND image_url NOT ILIKE '%klarna%'
    AND image_url NOT ILIKE '%afterpay%'
    AND image_url NOT ILIKE '%apple-pay%'
    AND image_url NOT ILIKE '%doubleclick%'
    AND image_url NOT ILIKE '%criteo%'
    AND image_url NOT ILIKE '%static.zara.net%'
    AND image_url NOT ILIKE '%captcha%'
    AND image_url NOT ILIKE '%badge%'
    AND image_url NOT ILIKE '%app-store%'
    AND image_url NOT ILIKE '%.svg%'
    AND image_url NOT ILIKE '%/icons/%'
    AND image_url NOT ILIKE '%logo%'
    AND image_url NOT ILIKE '%ogimage%'
    AND image_url NOT ILIKE '%googlesyndication%'
    AND image_url NOT ILIKE '%facebook.com/tr%'
  ORDER BY image_confidence DESC, id ASC
  LIMIT p_limit
  OFFSET p_offset;
$$;