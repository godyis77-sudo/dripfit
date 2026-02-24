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
 * Network error with retry option.
 */
export const NetworkError = ({ onRetry, message = "Something went wrong. Check your connection.", className }: NetworkErrorProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}
  >
    <div className="h-12 w-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-3">
      <WifiOff className="h-5 w-5 text-destructive" />
    </div>
    <p className="text-[13px] text-muted-foreground mb-4 max-w-[240px]">{message}</p>
    <motion.div whileTap={{ scale: 0.97 }}>
      <Button variant="outline" onClick={onRetry} className="h-10 px-5 rounded-lg text-sm font-semibold min-h-[44px]">
        Try Again
      </Button>
    </motion.div>
  </motion.div>
);
