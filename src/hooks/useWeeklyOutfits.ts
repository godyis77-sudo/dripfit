import { useQuery } from '@tanstack/react-query';
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

async function fetchOutfits(weekId: string): Promise<WeeklyOutfit[]> {
  const { data: outfits, error: oErr } = await supabase
    .from('weekly_outfits')
    .select('*')
    .eq('week_id', weekId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (oErr) throw oErr;
  if (!outfits || outfits.length === 0) return [];

  const outfitIds = outfits.map(o => o.id);
  const { data: items, error: iErr } = await supabase
    .from('weekly_outfit_items')
    .select('*')
    .in('outfit_id', outfitIds)
    .order('position', { ascending: true });

  if (iErr) throw iErr;

  return outfits.map(o => {
    const oItems = (items || []).filter(i => i.outfit_id === o.id);
    return {
      ...o,
      sort_order: o.sort_order ?? 0,
      items: oItems.map(i => ({ ...i, position: i.position ?? 0 })),
      total_price_cents: oItems.reduce((sum, i) => sum + (i.price_cents ?? 0), 0),
    };
  });
}

export function useWeeklyOutfits(gender?: string) {
  const weekId = getCurrentWeekId();
  const waiting = gender === '__wait__';

  return useQuery({
    queryKey: ['weekly-outfits', weekId, waiting ? '__wait__' : (gender ?? 'all')],
    enabled: !waiting,
    queryFn: async () => {
      let results = await fetchOutfits(weekId);
      // Fallback to previous week if current week has no outfits OR no outfits with hero images yet
      const hasUsableHero = (list: WeeklyOutfit[]) => list.some(o => o.hero_image_url);
      if (results.length === 0 || !hasUsableHero(results)) {
        const prev = await fetchOutfits(getPreviousWeekId(weekId));
        // Prefer previous week if it actually has hero images
        if (prev.length > 0 && hasUsableHero(prev)) {
          results = prev;
        }
      }
      // Filter by gender
      if (gender && gender !== 'all') {
        results = results.filter(o => !o.gender || o.gender === gender);
      }
      return results;
    },
    staleTime: 10 * 60 * 1000,
  });
}
