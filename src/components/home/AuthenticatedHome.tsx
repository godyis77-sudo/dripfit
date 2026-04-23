import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, ArrowRight, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import SwipeFeedSection from '@/components/home/SwipeFeedSection';
import { TYPE, CARD, SPACING } from '@/lib/design-tokens';

const AuthenticatedHome = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { userGender } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;

  return (
    <div ref={ref} className="relative bg-background pb-safe-tab">
      {/* HEADER — editorial wordmark, single quiet caption */}
      <div className={`${SPACING.pagePx} pt-3 pb-3`}>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center gap-1.5"
        >
          <h1 className="font-display text-[24px] font-extrabold uppercase tracking-tight leading-none text-foreground">
            DRIPFIT <span className="text-primary text-[20px]">✔</span>
          </h1>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-foreground/50">
            Verified · 186 brands · 9,000+ pieces
          </p>
        </motion.div>
      </div>

      <div className={`${SPACING.pagePx}`}>
        {/* THE DROP · THIS WEEK — hero swipe */}
        <SwipeFeedSection gender={mappedGender} />

        {/* Divider */}
        <div className="border-t border-white/[0.06] my-3" />

        {/* THE DRAPE — Tier 1 editorial primary action */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={() => navigate('/tryon')}
          className="relative w-full mb-3 rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-md border border-white/[0.06] border-t-2 border-t-primary px-5 py-5 flex items-center justify-between active:scale-[0.97] transition-transform hover:bg-white/[0.05]"
        >
          <div className="text-left flex-1 min-w-0">
            <p className="font-serif text-[24px] font-bold italic text-foreground tracking-tight leading-tight">
              The Drape
            </p>
            <p className="font-sans text-[12px] text-muted-foreground mt-1">Infinite Try-On Studio</p>
            <span className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-[12px] font-bold tracking-wide">
              Enter <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="w-14 h-14 rounded-full bg-primary/[0.08] blur-xl pointer-events-none shrink-0 ml-2" aria-hidden />
        </motion.button>

        {/* COP or DROP — Tier 2 utility */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('/community')}
          className={`w-full mb-3 ${CARD.glass} px-5 py-4 flex items-center gap-3 active:scale-[0.97] transition-transform`}
        >
          <Flame className="h-4 w-4 text-primary shrink-0" />
          <div className="text-left flex-1 min-w-0">
            <p className="font-sans text-[15px] font-bold text-foreground leading-tight">COP or DROP</p>
            <p className="font-sans text-[12px] text-muted-foreground mt-0.5">Swipe fresh pieces · new daily</p>
          </div>
          <ChevronRight className="h-4 w-4 text-foreground/40 shrink-0" strokeWidth={2} />
        </motion.button>

        {/* Your Verified Size — Tier 3 contained row */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={() => navigate('/size-guide')}
          className="w-full mb-6 bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3 flex items-center justify-between active:scale-[0.97] transition-transform"
        >
          <div className="text-left flex flex-col gap-0">
            <span className="font-sans text-[13px] font-semibold text-foreground">Your Verified Size</span>
            <span className="font-sans text-[10px] text-muted-foreground">186 brands mapped</span>
          </div>
          <ChevronRight className="h-4 w-4 text-foreground/40 shrink-0" strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
});

AuthenticatedHome.displayName = 'AuthenticatedHome';

export default AuthenticatedHome;
