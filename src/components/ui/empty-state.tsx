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
  /** Optional custom element to render instead of icon */
  customIcon?: React.ReactNode;
}

/**
 * Consistent empty state — vertically centered, muted gold icon, headline, body, CTA.
 */
export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, className, customIcon }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}
  >
    {customIcon ? (
      <div className="mb-4">{customIcon}</div>
    ) : (
      <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary/60" />
      </div>
    )}
    <h2 className="text-[18px] font-bold text-foreground mb-1">{title}</h2>
    <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5 leading-relaxed">{description}</p>
    {actionLabel && onAction && (
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          onClick={onAction}
          className="h-11 px-6 rounded-full btn-luxury text-primary-foreground text-sm font-bold w-full max-w-[260px]"
        >
          {actionLabel}
        </Button>
      </motion.div>
    )}
  </motion.div>
);
