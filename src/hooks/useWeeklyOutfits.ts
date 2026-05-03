import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WeeklyOutfitItem {
  id: string;
  outfit_id: string;
  product_id: string | null;
  product_name: string;
  brand: string | null;
  category: string | null;
  price_cents: number | null;
  currency: string | null;
  image_url: string | null;
  product_url: string | null;
  position: number;
}

export interface WeeklyOutfit {
  id: string;
  week_id: string;
  occasion: string;
  occasion_label: string;
  occasion_emoji: string | null;
  title: string;
  description: string | null;
  season: string | null;
  gender: string | null;
  sort_order: number;
  hero_image_url: string | null;
  items: WeeklyOutfitItem[];
  total_price_cents: number;
}

/** Returns ISO week string like "2026-W14" */
export function getCurrentWeekId(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
  const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getPreviousWeekId(weekId: string): string {
  const [year, wPart] = weekId.split('-W');
  const w = parseInt(wPart, 10);
  if (w <= 1) return `${parseInt(year) - 1}-W52`;
  return `${year}-W${String(w - 1).padStart(2, '0')}`;
}

async function fetchOutfits(weekId: string, gender?: string): Promise<WeeklyOutfit[]> {
  // Single round-trip: outfits with embedded items, ordered, gender-filtered at DB level.
  let query = supabase
    .from('weekly_outfits')
    .select('*, weekly_outfit_items(*)')
    .eq('week_id', weekId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(40);

  if (gender && gender !== 'all') {
    // Match exact gender or null (unisex / unspecified)
    query = query.or(`gender.eq.${gender},gender.is.null`);
  }

  const { data: outfits, error } = await query;
  if (error) throw error;
  if (!outfits || outfits.length === 0) return [];

  return outfits.map((o: any) => {
    const oItems = (o.weekly_outfit_items || []).slice().sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
    return {
      ...o,
      sort_order: o.sort_order ?? 0,
      items: oItems.map((i: any) => ({ ...i, position: i.position ?? 0 })),
      total_price_cents: oItems.reduce((sum: number, i: any) => sum + (i.price_cents ?? 0), 0),
    };
  });
}

export function useWeeklyOutfits(gender?: string) {
  const weekId = getCurrentWeekId();
  const waiting = gender === '__wait__';
  const normalizedGender = gender && gender !== 'all' ? gender : undefined;

  return useQuery({
    queryKey: ['weekly-outfits', weekId, waiting ? '__wait__' : (normalizedGender ?? 'all')],
    enabled: !waiting,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const hasUsableHero = (list: WeeklyOutfit[]) => list.some(o => o.hero_image_url);
      let results = await fetchOutfits(weekId, normalizedGender);
      // Walk back up to 4 prior weeks until we find outfits with at least one hero image.
      let cursor = weekId;
      for (let i = 0; i < 4 && (results.length === 0 || !hasUsableHero(results)); i++) {
        cursor = getPreviousWeekId(cursor);
        const prev = await fetchOutfits(cursor, normalizedGender);
        if (prev.length > 0 && hasUsableHero(prev)) {
          results = prev;
          break;
        }
      }
      return results;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
