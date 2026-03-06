export interface Post {
  id: string;
  user_id: string;
  result_photo_url: string;
  clothing_photo_url: string;
  caption: string | null;
  created_at: string;
  product_url?: string | null;
  product_urls?: string[] | null;
  clothing_category?: string | null;
  profile?: { display_name: string | null; avatar_url?: string | null };
  avg_style?: number;
  avg_color?: number;
  avg_buy?: number;
  avg_suitability?: number;
  rating_count?: number;
  match_score?: number;
  is_bottoms?: boolean;
}

export interface SeedPost {
  id: string;
  username: string;
  caption: string | null;
  image_url: string;
  like_count: number;
  created_at: string;
}

export interface Retailer {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string;
  category: string;
  is_active: boolean;
  gender_focus?: string;
}

export const VOTE_OPTIONS = [
  { key: 'buy_yes', label: 'Buy it', emoji: '🔥' },
  { key: 'buy_no', label: 'Pass', emoji: '👎' },
  { key: 'keep_shopping', label: 'Save it', emoji: '🛒' },
] as const;

export const FIT_OPTIONS = [
  { key: 'too_tight', label: 'Too small' },
  { key: 'perfect', label: 'Perfect' },
  { key: 'too_loose', label: 'Too big' },
] as const;

export const GENDER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'mens', label: "Men's" },
  { key: 'womens', label: "Women's" },
] as const;

export type GenderKey = typeof GENDER_OPTIONS[number]['key'];
export type FilterType = 'trending' | 'new' | 'similar' | 'shop' | 'following';
export type TrendingSort = 'hot' | 'love' | 'buy' | 'newest' | 'user';

export const RATING_LABELS = [
  { key: 'style_score', label: 'Style' },
  { key: 'color_score', label: 'Color' },
  { key: 'buy_score', label: 'Buy' },
  { key: 'suitability_score', label: 'Fit' },
] as const;

export const seedToPost = (s: SeedPost): Post => ({
  id: `seed-${s.id}`,
  user_id: '',
  result_photo_url: s.image_url,
  clothing_photo_url: '',
  caption: s.caption,
  created_at: s.created_at,
  profile: { display_name: s.username },
  avg_style: 0,
  avg_color: 0,
  avg_buy: 0,
  avg_suitability: 0,
  rating_count: s.like_count,
});

export const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || url === '') return false;
  if (url.includes('placeholder') || url.includes('undefined')) return false;
  return true;
};
