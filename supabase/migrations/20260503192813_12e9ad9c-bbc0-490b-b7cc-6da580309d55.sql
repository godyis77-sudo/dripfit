
UPDATE public.product_catalog
SET is_active = false, updated_at = now()
WHERE id IN (
  'fb9ecf69-8de6-42c3-aa14-678c850d73bf',
  'c215138d-fb32-49a7-9635-32145df53495',
  'e80ededd-bbcc-4d98-8465-d4daa36036ed',
  '058efda0-aadc-481e-afa5-73801baf52ba'
);

DELETE FROM public.weekly_outfit_items
WHERE product_id IN (
  'fb9ecf69-8de6-42c3-aa14-678c850d73bf',
  'c215138d-fb32-49a7-9635-32145df53495',
  'e80ededd-bbcc-4d98-8465-d4daa36036ed',
  '058efda0-aadc-481e-afa5-73801baf52ba'
);
