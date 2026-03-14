import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "shimmer-sweep inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent text-primary-foreground hover:brightness-110 badge-gold-3d",
        secondary: "border-transparent bg-gradient-to-b from-secondary/80 to-secondary text-secondary-foreground shadow-3d hover:bg-secondary/80",
        destructive: "border-transparent bg-gradient-to-b from-destructive/90 to-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground shadow-3d",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
