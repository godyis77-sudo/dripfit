export const WOMENS_LEANING = [
  'dress', 'skirt', 'heel', 'bustier', 'bralette',
  'bikini', 'swimsuit', 'romper', 'bodysuit',
  'blouse', 'maternity', 'lingerie', 'camisole',
  'sarong', 'corset', 'midi', 'maxi', 'jumpsuit',
];

export const MENS_LEANING = [
  'suit', 'tuxedo', 'chino', 'boxer',
  'brief', 'cufflink', 'waistcoat',
  'flat cap', 'dress shirt',
];

export function classifyGender(
  category: string,
  brand?: string,
  retailer?: string,
): 'mens' | 'womens' | 'unisex' {
  const cat = category?.toLowerCase() || '';

  if (WOMENS_LEANING.some(w => cat.includes(w))) return 'womens';
  if (MENS_LEANING.some(m => cat.includes(m))) return 'mens';
  return 'unisex';
}
