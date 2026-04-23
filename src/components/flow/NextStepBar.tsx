import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

export interface NextStepBarProps {
  /** Step number in the Infinite Closet loop (1-6). Optional — if provided, shown as small index. */
  step?: number;
  /** Short eyebrow label e.g. "NEXT STEP" */
  eyebrow?: string;
  /** Bold title of the suggested next action */
  title: string;
  /** Sub-line explaining the action */
  subtitle?: string;
  /** Where to go on click */
  to: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Analytics tag */
  trackId?: string;
  className?: string;
}

/**
 * NextStepBar — a contextual "do this next" CTA used to chain the Infinite
 * Closet flow (Discover → Closet → Outfit/Try-On → Post → Verdict → Buy).
 * Sits at the bottom of in-flow pages above the BottomTabBar.
 */
const NextStepBar = ({
  step,
  eyebrow = 'NEXT STEP',
  title,
  subtitle,
  to,
  icon: Icon,
  trackId,
  className,
}: NextStepBarProps) => {
  const navigate = useNavigate();
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      onClick={() => {
        if (trackId) trackEvent('next_step_bar_click', { id: trackId });
        navigate(to);
      }}
      className={cn(
        'w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left',
        'bg-white/[0.03] border border-white/[0.08] border-l-2 border-l-primary',
        'active:scale-[0.98] hover:bg-white/[0.05] transition-all',
        className,
      )}
    >
      {Icon && (
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary/80">
          {step ? `STEP ${step} · ` : ''}{eyebrow}
        </p>
        <p className="text-[14px] font-bold text-foreground leading-tight mt-0.5 truncate">
          {title}
        </p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
    </motion.button>
  );
};

export default NextStepBar;
