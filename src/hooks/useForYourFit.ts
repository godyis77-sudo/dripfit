import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FitRecommendation {
  product_url: string;
  clothing_photo_url: string;
  engagement_count: number;
  category: string;
}

export function useForYourFit(userId?: string) {
  return useQuery({
    queryKey: ['for-your-fit', userId],
    queryFn: async (): Promise<FitRecommendation[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_fit_recommended_products', {
        p_user_id: userId,
        p_limit: 12,
      } as any);
      if (error) { console.error('Fit recs error:', error); return []; }
      return (data as unknown as FitRecommendation[]) || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
