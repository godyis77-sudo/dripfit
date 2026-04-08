import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  customIcon?: React.ReactNode;
}

/**
 * Luxury empty state — vertically centered, glass card, serif headline, CTA.
 */
export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, className, customIcon }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className={cn("flex flex-col items-center justify-center py-20 px-8 text-center", className)}
  >
    {customIcon ? (
      <div className="mb-5">{customIcon}</div>
    ) : (
      <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-5">
        <Icon className="h-6 w-6 text-white/20" />
      </div>
    )}
    <h2 className="headline-editorial text-[20px] text-foreground mb-1.5">{title}</h2>
    <p className="text-[13px] text-white/40 max-w-[260px] mb-6 leading-relaxed">{description}</p>
    {actionLabel && onAction && (
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          onClick={onAction}
          variant="luxury"
          className="h-12 px-8 rounded-2xl text-[13px] font-bold w-full max-w-[260px] tracking-wide"
        >
          {actionLabel}
        </Button>
      </motion.div>
    )}
  </motion.div>
);
