import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-3d-gold hover:brightness-110 active:shadow-3d-gold-pressed active:translate-y-[2px]",
        destructive: "bg-destructive text-destructive-foreground shadow-[0_2px_0_0_hsl(0_50%_35%),0_4px_12px_-2px_hsl(0_0%_0%/0.2),inset_0_1px_0_hsl(0_60%_65%/0.3)] hover:brightness-110 active:shadow-[0_0px_0_0_hsl(0_50%_35%),0_1px_4px_hsl(0_0%_0%/0.1)] active:translate-y-[2px]",
        outline: "border border-border bg-card/50 text-foreground backdrop-blur-sm shadow-3d hover:border-primary/30 active:shadow-3d-pressed active:translate-y-[1px]",
        secondary: "bg-secondary text-secondary-foreground border border-border shadow-3d hover:bg-muted active:shadow-3d-pressed active:translate-y-[1px]",
        ghost: "hover:bg-muted hover:text-foreground active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
        luxury: "btn-luxury text-primary-foreground font-bold tracking-wide",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-13 px-8 py-4 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
