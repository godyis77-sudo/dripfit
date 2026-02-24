import * as React from "react";
import { motion } from "framer-motion";
import { Button, ButtonProps } from "./button";
import { cn } from "@/lib/utils";

/**
 * Button with haptic-style press feedback (scale 0.97) and minimum 44px touch target.
 */
const HapticButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div whileTap={{ scale: 0.97 }} transition={{ duration: 0.1, ease: "easeOut" }}>
        <Button
          ref={ref}
          className={cn("min-h-[44px] min-w-[44px]", className)}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    );
  }
);
HapticButton.displayName = "HapticButton";

export { HapticButton };
