import { WifiOff } from "lucide-react";
import { Button } from "./button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NetworkErrorProps {
  onRetry: () => void;
  message?: string;
  className?: string;
}

/**
 * Network error — consistent empty state pattern.
 */
export const NetworkError = ({ onRetry, message, className }: NetworkErrorProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}
  >
    <div className="h-12 w-12 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
      <WifiOff className="h-6 w-6 text-primary/50" />
    </div>
    <h2 className="text-[18px] font-bold text-foreground mb-1">Couldn't load</h2>
    <p className="text-[14px] text-muted-foreground max-w-[260px] mb-5">
      {message || 'Check your connection and try again.'}
    </p>
    <motion.div whileTap={{ scale: 0.97 }}>
      <Button
        variant="outline"
        onClick={onRetry}
        className="h-11 px-6 rounded-full text-sm font-bold min-h-[44px]"
      >
        Retry
      </Button>
    </motion.div>
  </motion.div>
);
