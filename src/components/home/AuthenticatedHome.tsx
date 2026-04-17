import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Flame, ArrowRight, Ruler } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import SwipeFeedSection from '@/components/home/SwipeFeedSection';
import { TYPE, CARD, SPACING } from '@/lib/design-tokens';

const AuthenticatedHome = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { userGender } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;

  return (
    <div ref={ref} className="relative bg-background pb-safe-tab">
      {/* HEADER — compact 56px */}
      <div className={`${SPACING.pagePx} pt-3 pb-2`}>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center gap-1"
        >
          <div className="flex items-center gap-2">
            <h1 className={`${TYPE.brandMark} text-[20px] text-primary leading-none`}>DRIPFIT ✔</h1>
            <span className={TYPE.tagline + ' normal-case tracking-normal text-[11px]'}>
              · Verified. Ready to drip.
            </span>
          </div>
          <p className={TYPE.data + ' text-[10px]'}>
            9,000+ · 186 brands · 389 size charts
          </p>
        </motion.div>
      </div>

      <div className={`${SPACING.pagePx}`}>
        {/* THE DROP · THIS WEEK — hero swipe */}
        <SwipeFeedSection gender={mappedGender} />

        {/* Divider */}
        <div className="border-t border-white/[0.06] my-2" />

        {/* THE DRAPE — primary action */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={() => navigate('/tryon')}
          className={`w-full mb-3 ${CARD.glass} px-5 py-4 flex items-center gap-3 active:scale-[0.97] transition-transform`}
        >
          <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className={TYPE.headlineSm + ' text-[15px] leading-tight'}>THE DRAPE</p>
            <p className={TYPE.body + ' text-[12px] mt-0.5'}>Try any piece. On your body.</p>
          </div>
          <div className="flex items-center gap-1 text-primary text-[12px] font-bold tracking-wide shrink-0">
            Try it on <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </motion.button>

        {/* COP or DROP — compact */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('/community')}
          className={`w-full mb-3 ${CARD.glass} px-5 py-3.5 flex items-center gap-3 active:scale-[0.97] transition-transform`}
        >
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className={TYPE.headlineSm + ' text-[14px] leading-tight'}>COP or DROP</p>
            <p className={TYPE.body + ' text-[11px] mt-0.5'}>Swipe new drops.</p>
          </div>
          <span className={TYPE.dataGold + ' shrink-0 text-[10px]'}>NEW DROPS DAILY</span>
        </motion.button>

        {/* Your Verified Size — contained row */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={() => navigate('/size-guide')}
          className={`w-full mb-6 ${CARD.glass} px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform`}
        >
          <Ruler className="h-4 w-4 text-primary shrink-0" />
          <div className="text-left flex-1 min-w-0">
            <p className={TYPE.label + ' text-[11px] text-foreground'}>Your Verified Size</p>
            <p className={TYPE.data + ' text-[10px] mt-0.5'}>186 brands mapped</p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
        </motion.button>
      </div>
    </div>
  );
});

AuthenticatedHome.displayName = 'AuthenticatedHome';

export default AuthenticatedHome;
