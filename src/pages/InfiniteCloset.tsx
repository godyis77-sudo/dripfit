import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Sparkles, Flame, Layers, Wand2, MessageSquare, ShoppingBag, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePageMeta } from '@/hooks/usePageMeta';
import { trackEvent } from '@/lib/analytics';
import PageHeader from '@/components/layout/PageHeader';
import BottomTabBar from '@/components/BottomTabBar';

interface StepDef {
  n: number;
  key: string;
  title: string;
  blurb: string;
  cta: string;
  to: string;
  icon: typeof Sparkles;
  count?: number;
  countLabel?: string;
}

const InfiniteCloset = () => {
  usePageMeta({
    title: 'The Infinite Closet — How DripFit Works',
    description: 'Discover drip, save it, build outfits, try on, post for community verdict, then buy. The Infinite Closet flow.',
    path: '/infinite-closet',
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  // Live counts for personalized step badges
  const { data: counts } = useQuery({
    queryKey: ['infinite-closet-counts', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [wardrobe, outfits, tryons, posts] = await Promise.all([
        supabase.from('clothing_wardrobe').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('outfits').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('tryon_posts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('tryon_posts').select('id', { count: 'exact', head: true }).eq('user_id', user!.id).eq('is_public', true),
      ]);
      return {
        wardrobe: wardrobe.count ?? 0,
        outfits: outfits.count ?? 0,
        tryons: tryons.count ?? 0,
        posts: posts.count ?? 0,
      };
    },
  });

  const steps: StepDef[] = [
    {
      n: 1, key: 'discover',
      title: 'Discover',
      blurb: 'Swipe through 9,000+ pieces. COP what you love, drop the rest.',
      cta: 'Open Closet Swipe', to: '/closet', icon: Sparkles,
    },
    {
      n: 2, key: 'closet',
      title: 'Your Closet',
      blurb: 'Everything you copped lives here — your personal infinite rack.',
      cta: 'View Closet', to: '/profile?tab=wardrobe', icon: Flame,
      count: counts?.wardrobe, countLabel: 'pieces',
    },
    {
      n: 3, key: 'build',
      title: 'Build an Outfit',
      blurb: 'Mix tops, bottoms, layers and shoes from your closet into a fit.',
      cta: 'Build Outfit', to: '/outfits', icon: Layers,
      count: counts?.outfits, countLabel: 'outfits',
    },
    {
      n: 4, key: 'tryon',
      title: 'Try It On',
      blurb: 'See it on your body before you commit. Photoreal AI try-on.',
      cta: 'Open Try-On Studio', to: '/tryon', icon: Wand2,
      count: counts?.tryons, countLabel: 'try-ons',
    },
    {
      n: 5, key: 'post',
      title: 'Post for Verdict',
      blurb: 'Share your look on THE DROP. Community votes COP or PASS.',
      cta: 'See THE DROP', to: '/style-check', icon: MessageSquare,
      count: counts?.posts, countLabel: 'posts',
    },
    {
      n: 6, key: 'buy',
      title: 'Buy with Confidence',
      blurb: 'High community score? Cop the real piece direct from the brand.',
      cta: 'Browse to Buy', to: '/browse/all', icon: ShoppingBag,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="The Infinite Closet" backTo="/home" />

      <div className="px-4 pt-2 max-w-md mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/20 bg-primary/[0.04] px-5 py-5 mb-4"
        >
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary/80 mb-2">
            How DripFit Works
          </p>
          <h2 className="font-serif text-[28px] font-bold italic leading-tight text-foreground tracking-tight">
            Discover. Try.<br />Verdict. Buy.
          </h2>
          <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
            One continuous loop — your closet keeps expanding, every fit gets verified,
            every purchase is intentional.
          </p>
          <button
            onClick={() => {
              trackEvent('infinite_closet_hero_start');
              navigate('/closet');
            }}
            className="mt-4 inline-flex items-center gap-2 px-5 h-10 rounded-full bg-primary text-primary-foreground text-[12px] font-bold tracking-wide active:scale-95 transition-transform"
          >
            Start the Loop <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>

        {/* Loop steps */}
        <div className="space-y-2.5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const hasCount = typeof s.count === 'number' && s.count > 0;
            return (
              <motion.button
                key={s.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => {
                  trackEvent('infinite_closet_step_click', { step: s.key });
                  navigate(s.to);
                }}
                className="relative w-full text-left rounded-2xl bg-card border border-border px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] hover:bg-card/80 transition-all"
              >
                {/* Step number ring */}
                <div className="relative shrink-0">
                  <div className="h-11 w-11 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {s.n}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-[14px] font-bold text-foreground leading-tight">
                      {s.title}
                    </p>
                    {hasCount && (
                      <span className="text-[10px] font-bold tracking-wide text-primary">
                        {s.count} {s.countLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                    {s.blurb}
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </motion.button>
            );
          })}
        </div>

        {/* Loop reminder */}
        <div className="mt-6 px-4 py-3 rounded-xl border border-dashed border-border text-center">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
            Then back to step 1
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            That's why it's infinite.
          </p>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default InfiniteCloset;
