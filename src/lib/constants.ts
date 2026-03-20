/** Shared constants used across multiple pages/components */

export const FIT_OPTIONS = [
  'oversized', 'boxy', 'relaxed fit', 'slim fit', 'regular fit',
  'cropped', 'tapered', 'drop shoulder', 'heavyweight', 'lightweight',
  'athletic fit', 'classic fit', 'skinny fit', 'loose fit',
  'straight fit', 'muscle fit', 'wide leg', 'fitted', 'tailored fit',
  'bootcut', 'flare', 'baggy', 'longline', 'high rise', 'mid rise', 'low rise',
] as const;

export type FitOption = typeof FIT_OPTIONS[number];

export const SORT_OPTIONS = [
  { key: 'default', label: 'Recommended' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
  { key: 'brand_az', label: 'Brand: A → Z' },
  { key: 'genre', label: 'Genre' },
] as const;

export type SortKey = typeof SORT_OPTIONS[number]['key'];
