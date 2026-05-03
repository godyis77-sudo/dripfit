DELETE FROM public.weekly_outfit_items
WHERE outfit_id IN (
  '0f08adcd-7be8-4d81-a16f-0bcb6bc69dc2',
  '41ea36b3-fd24-42a7-832e-e9244f3077da',
  '805cb925-2dff-487d-aff0-7deb499b9738'
)
AND category IN ('skirts','pants','jeans','trousers','shorts');