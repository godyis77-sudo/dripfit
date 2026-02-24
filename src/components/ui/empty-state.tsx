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
}

/**
 * Styled empty state — never show blank screens.
 */
export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}
  >
    <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <h2 className="font-display text-base font-bold text-foreground mb-1">{title}</h2>
    <p className="text-[13px] text-muted-foreground max-w-[240px] mb-5">{description}</p>
    {actionLabel && onAction && (
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          onClick={onAction}
          className="h-11 px-6 rounded-lg btn-luxury text-primary-foreground text-sm font-bold"
        >
          {actionLabel}
        </Button>
      </motion.div>
    )}
  </motion.div>
);
