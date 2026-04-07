import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 backdrop-blur-sm active:scale-[0.97] active:transition-transform active:duration-75",
  {
    variants: {
      variant: {
        default: "btn-luxury shimmer-sweep",
        destructive: "bg-gradient-to-b from-destructive/90 to-destructive text-destructive-foreground shadow-[0_2px_0_0_hsl(0_50%_35%),0_4px_12px_-2px_hsl(0_0%_0%/0.2),inset_0_1px_0_hsl(0_60%_65%/0.35),inset_0_-1px_0_hsl(0_50%_35%/0.3)] hover:brightness-110 active:shadow-[0_0px_0_0_hsl(0_50%_35%),0_1px_4px_hsl(0_0%_0%/0.1),inset_0_1px_3px_hsl(0_0%_0%/0.08)] active:translate-y-[2px]",
        outline: "border border-border/60 bg-card/40 text-foreground backdrop-blur-md shadow-[0_2px_0_0_hsl(var(--border)/0.5),0_4px_12px_-2px_hsl(0_0%_0%/0.2),inset_0_1px_0_hsl(var(--surface-glass)/0.12),inset_0_-1px_0_hsl(0_0%_0%/0.04)] hover:border-primary/30 hover:shadow-[0_2px_0_0_hsl(var(--border)/0.5),0_6px_16px_-2px_hsl(0_0%_0%/0.25),inset_0_1px_0_hsl(var(--surface-glass)/0.18)] active:shadow-3d-pressed active:translate-y-[1px]",
        secondary: "bg-gradient-to-b from-secondary/90 to-secondary text-secondary-foreground border border-border/60 shadow-[0_2px_0_0_hsl(var(--border)/0.5),0_4px_12px_-2px_hsl(0_0%_0%/0.2),inset_0_1px_0_hsl(var(--surface-glass)/0.1),inset_0_-1px_0_hsl(0_0%_0%/0.04)] hover:bg-muted active:shadow-3d-pressed active:translate-y-[1px]",
        ghost: "hover:bg-muted/60 hover:text-foreground hover:backdrop-blur-md active:scale-[0.95]",
        link: "text-primary underline-offset-4 hover:underline",
        luxury: "btn-luxury text-primary-foreground font-bold tracking-wide shimmer-sweep",
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
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Ripple effect
      const button = e.currentTarget;
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        border-radius: 50%;
        background: hsl(var(--surface-glass) / 0.15);
        transform: scale(0);
        animation: ripple-expand 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        pointer-events: none;
        z-index: 1;
      `;
      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);

      onClick?.(e);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={asChild ? onClick : handleClick}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
