/**
 * Gender-specific category visibility rules.
 * Categories listed here are HIDDEN for the specified gender.
 * Categories not listed are shown for all genders.
 */

// Categories that should NOT appear when "Men's" is selected
const WOMENS_ONLY_CATEGORIES = new Set([
  'dresses', 'dress', 'skirts', 'heels', 'jumpsuits',
]);

// Categories that should NOT appear when "Women's" is selected
// (currently none — all remaining categories have women's products)
const MENS_ONLY_CATEGORIES = new Set<string>([]);

/**
 * Returns true if the category should be visible for the given gender filter.
 * @param categoryKey - the category key (e.g. 'dresses', 'skirts')
 * @param gender - 'mens' | 'womens' | 'all' | null | undefined
 */
export function isCategoryVisibleForGender(
  categoryKey: string,
  gender: string | null | undefined,
): boolean {
  if (!gender || gender === 'all') return true;

  if (gender === 'mens') {
    return !WOMENS_ONLY_CATEGORIES.has(categoryKey);
  }

  if (gender === 'womens') {
    return !MENS_ONLY_CATEGORIES.has(categoryKey);
  }

  return true;
}
